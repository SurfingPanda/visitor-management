<?php

namespace App\Http\Controllers;

use App\Mail\VisitRequestApproved;
use App\Mail\VisitRequestDeclined;
use App\Models\Visitor;
use App\Models\VisitorRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VisitorRequestController extends Controller
{
    /**
     * Public, unauthenticated self-registration page. Visitors fill in their
     * details and a signature; the request lands in the staff queue as pending.
     */
    public function create(): Response
    {
        return Inertia::render('Public/VisitorRequest');
    }

    /**
     * Public status lookup. A visitor enters their reference (e.g. REQ-0000000042
     * or just the number) to see where their request stands.
     */
    public function status(Request $request): Response
    {
        $query = trim($request->string('ref')->toString());
        $result = null;

        if ($query !== '') {
            // Exact (case-insensitive) match on the random reference only — no
            // numeric lookup, so requests can't be enumerated.
            $found = VisitorRequest::with('visitor:id,qr_token,badge_number')
                ->whereRaw('UPPER(reference) = ?', [strtoupper($query)])
                ->first();

            $result = $found
                ? [
                    'found' => true,
                    'reference' => $found->reference,
                    'name' => $found->name,
                    'company' => $found->company,
                    'contact_person' => $found->contact_person,
                    'status' => $found->status,
                    'created_at' => $found->created_at,
                    'decline_reason' => $found->decline_reason,
                    'signature_url' => $found->signature_path
                        ? route('visit.signature', ['reference' => $found->reference, 'which' => 'visitor'])
                        : null,
                    'approver_name' => $found->approver_name,
                    'approver_signature_url' => $found->approver_signature_path
                        ? route('visit.signature', ['reference' => $found->reference, 'which' => 'approver'])
                        : null,
                    'qr_token' => $found->visitor?->qr_token,
                    'badge_number' => $found->visitor?->badge_number,
                ]
                : ['found' => false];
        }

        return Inertia::render('Public/VisitorStatus', [
            'query' => $query,
            'result' => $result,
        ]);
    }

    /**
     * Store a public visitation request (pending staff approval).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'signature' => ['required', 'string'],
        ]);

        $company = $validated['company'] ?? null;

        // Dedupe: if an identical request is already pending, point the visitor
        // at it instead of piling up duplicates (double-submit, refresh, spam).
        $existing = VisitorRequest::query()
            ->where('status', 'pending')
            ->where('name', $validated['name'])
            ->where('contact_person', $validated['contact_person'])
            ->when($company !== null, fn ($q) => $q->where('company', $company))
            ->when($company === null, fn ($q) => $q->whereNull('company'))
            ->first();

        if ($existing) {
            return back()->with(
                'success',
                "You already have a pending request ({$existing->reference}). Please proceed to the front desk."
            );
        }

        $signaturePath = $this->storeSignature($validated['signature']);

        if (! $signaturePath) {
            return back()
                ->withErrors(['signature' => 'Please provide your signature before submitting.'])
                ->withInput();
        }

        $visitorRequest = VisitorRequest::create([
            'name' => $validated['name'],
            'contact_person' => $validated['contact_person'],
            'email' => $validated['email'],
            'company' => $company,
            'signature_path' => $signaturePath,
            'status' => 'pending',
        ]);

        return back()->with(
            'success',
            "Request submitted! Your reference is {$visitorRequest->reference}. Please proceed to the front desk."
        );
    }

    /**
     * Staff queue of self-service requests (Front Desk module).
     */
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: 'pending';

        $requests = VisitorRequest::query()
            ->with([
                'visitor:id,qr_token,badge_number',
                'approver:id,name',
                'decliner:id,name',
            ])
            ->when(
                in_array($status, ['pending', 'approved', 'declined'], true),
                fn ($query) => $query->where('status', $status)
            )
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('VisitorRequests/Index', [
            'requests' => $requests,
            'filters' => ['status' => $status],
            'counts' => [
                'pending' => VisitorRequest::where('status', 'pending')->count(),
                'approved' => VisitorRequest::where('status', 'approved')->count(),
                'declined' => VisitorRequest::where('status', 'declined')->count(),
            ],
        ]);
    }

    /**
     * Approve a request: the approver signs off (name + signature), and the
     * request is promoted to an "expected" Visitor the front desk can later
     * check in, mirroring VisitorController@store.
     */
    public function approve(Request $request, VisitorRequest $visitorRequest): RedirectResponse
    {
        if ($visitorRequest->status === 'approved') {
            return back()->with('error', "{$visitorRequest->name} is already approved.");
        }

        $validated = $request->validate([
            'approver_name' => ['nullable', 'string', 'max:255'],
            'approver_signature' => ['required', 'string'],
        ]);

        // Name is a display convenience (prefilled on the form); the trustworthy
        // audit link is the authenticated user id stored in approved_by.
        $approverName = trim($validated['approver_name'] ?? '') ?: $request->user()->name;

        $signaturePath = $this->storeSignature($validated['approver_signature']);

        if (! $signaturePath) {
            return back()->withErrors([
                'approver_signature' => 'Please provide your signature to approve.',
            ]);
        }

        DB::transaction(function () use ($visitorRequest, $approverName, $signaturePath, $request) {
            $visitor = Visitor::create([
                'name' => $visitorRequest->name,
                'company' => $visitorRequest->company,
                'host' => $visitorRequest->contact_person,
                'qr_token' => (string) Str::ulid(),
                'status' => 'expected',
            ]);

            $visitor->update([
                'badge_number' => 'VIS-'.date('Y').'-'.str_pad((string) $visitor->id, 9, '0', STR_PAD_LEFT),
            ]);

            $visitorRequest->update([
                'status' => 'approved',
                'approver_name' => $approverName,
                'approver_signature_path' => $signaturePath,
                'approved_by' => $request->user()->id,
                'visitor_id' => $visitor->id,
            ]);
        });

        // Notify the visitor with a link back to their pass (queued).
        if ($visitorRequest->email) {
            Mail::to($visitorRequest->email)->queue(new VisitRequestApproved($visitorRequest));
        }

        return back()->with('success', "{$visitorRequest->name} approved and added as an expected visitor.");
    }

    /**
     * Manual retention clean-up (admin-triggered from the Requests page): the
     * same housekeeping the scheduled command runs.
     */
    public function prune(): RedirectResponse
    {
        $result = VisitorRequest::prune(7, 30);

        if ($result['declined'] === 0 && $result['purged'] === 0) {
            return back()->with('success', 'Nothing to clean up — all requests are current.');
        }

        return back()->with(
            'success',
            "Clean-up done: {$result['declined']} stale request(s) declined, {$result['purged']} old record(s) removed."
        );
    }

    /**
     * Decline a request (kept for the record, no visitor created). Captures an
     * optional reason and the user who declined it for the audit trail.
     */
    public function decline(Request $request, VisitorRequest $visitorRequest): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $visitorRequest->update([
            'status' => 'declined',
            'decline_reason' => $validated['reason'] ?? null,
            'declined_by' => $request->user()->id,
        ]);

        // Notify the visitor their request was not approved (queued).
        if ($visitorRequest->email) {
            Mail::to($visitorRequest->email)->queue(new VisitRequestDeclined($visitorRequest));
        }

        return back()->with('success', "{$visitorRequest->name}'s request was declined.");
    }

    /**
     * Remove a request and its signature images.
     */
    public function destroy(VisitorRequest $visitorRequest): RedirectResponse
    {
        foreach ([$visitorRequest->signature_path, $visitorRequest->approver_signature_path] as $path) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
        }

        $visitorRequest->delete();

        return back()->with('success', 'Request removed.');
    }

    /**
     * Stream a signature image to authenticated Front Desk staff.
     */
    public function signature(VisitorRequest $visitorRequest, string $which): StreamedResponse
    {
        return $this->streamSignature($visitorRequest, $which);
    }

    /**
     * Stream a signature image to the visitor themselves, scoped by their
     * random reference — no other request's files are reachable this way.
     */
    public function publicSignature(string $reference, string $which): StreamedResponse
    {
        $visitorRequest = VisitorRequest::query()
            ->whereRaw('UPPER(reference) = ?', [strtoupper($reference)])
            ->firstOrFail();

        return $this->streamSignature($visitorRequest, $which);
    }

    /**
     * Stream a signature from the private disk, or 404 if missing.
     */
    private function streamSignature(VisitorRequest $visitorRequest, string $which): StreamedResponse
    {
        $path = $which === 'approver'
            ? $visitorRequest->approver_signature_path
            : $visitorRequest->signature_path;

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Persist a base64 data-URL signature to the private disk; return its path.
     */
    private function storeSignature(?string $dataUrl): ?string
    {
        if (! $dataUrl || ! str_starts_with($dataUrl, 'data:image')) {
            return null;
        }

        [$meta, $content] = explode(',', $dataUrl, 2);
        $binary = base64_decode($content, true);

        if ($binary === false) {
            return null;
        }

        $ext = str_contains($meta, 'png') ? 'png' : 'jpg';
        $path = 'visitor-signatures/'.Str::ulid().'.'.$ext;

        Storage::disk('local')->put($path, $binary);

        return $path;
    }
}
