<?php

namespace App\Http\Controllers;

use App\Models\Visit;
use App\Models\Visitor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VisitorController extends Controller
{
    /**
     * Timezone used for human-facing exports. Timestamps are stored in UTC and
     * the browser renders them in local time, so the CSV is converted to match
     * what users see on screen.
     */
    private const DISPLAY_TZ = 'Asia/Manila';

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $visitors = $this->filteredQuery($filters)
            ->with('currentVisit')
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Visitors/Index', [
            'visitors' => $visitors,
            'filters' => $filters,
            'counts' => [
                'all' => Visitor::count(),
                'expected' => Visitor::where('status', 'expected')->count(),
                'checked_in' => Visitor::where('status', 'checked_in')->count(),
                'checked_out' => Visitor::where('status', 'checked_out')->count(),
            ],
        ]);
    }

    /**
     * Export the currently filtered visitor list as a CSV (opens in Excel).
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);

        $visitors = $this->filteredQuery($filters)
            ->orderByRaw('COALESCE(checked_in_at, created_at) DESC')
            ->get();

        $filename = 'visitors_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($visitors) {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM so Excel renders accented names correctly.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'DATE', 'NAME', 'PURPOSE', 'COMPANY', 'CONTACT No.', 'CHECK IN', 'CHECK OUT',
            ]);

            $tz = self::DISPLAY_TZ;

            foreach ($visitors as $v) {
                $date = $v->checked_in_at ?? $v->created_at;

                fputcsv($out, [
                    $date?->copy()->setTimezone($tz)->format('Y-m-d'),
                    $v->name,
                    $v->purpose,
                    $v->company,
                    $v->phone,
                    $v->checked_in_at?->copy()->setTimezone($tz)->format('g:i A'),
                    $v->checked_out_at?->copy()->setTimezone($tz)->format('g:i A'),
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Filters shared by the list view and the export.
     *
     * @return array{search: string, status: string, from: string, to: string}
     */
    private function filters(Request $request): array
    {
        return [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'from' => $request->date('from')?->toDateString() ?? '',
            'to' => $request->date('to')?->toDateString() ?? '',
        ];
    }

    /**
     * @param  array{search: string, status: string, from: string, to: string}  $filters
     */
    private function filteredQuery(array $filters): \Illuminate\Database\Eloquent\Builder
    {
        return Visitor::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company', 'like', "%{$search}%")
                        ->orWhere('host', 'like', "%{$search}%")
                        ->orWhere('badge_number', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($filters['status'], ['expected', 'checked_in', 'checked_out'], true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            // Match the visit date shown in the list: check-in date, or the
            // registration date for visitors not yet checked in.
            ->when(
                $filters['from'],
                fn ($query, $from) => $query->whereRaw(
                    'DATE(COALESCE(checked_in_at, created_at)) >= ?',
                    [$from]
                )
            )
            ->when(
                $filters['to'],
                fn ($query, $to) => $query->whereRaw(
                    'DATE(COALESCE(checked_in_at, created_at)) <= ?',
                    [$to]
                )
            );
    }

    public function badges(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $visitors = Visitor::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company', 'like', "%{$search}%")
                        ->orWhere('badge_number', 'like', "%{$search}%");
                });
            })
            ->with('currentVisit')
            ->latest('updated_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Visitors/Badges', [
            'visitors' => $visitors,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'host' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'companions' => ['nullable', 'integer', 'min:0', 'max:100'],
            'device_pin' => ['nullable', 'string', 'max:50'],
            'photo' => ['nullable', 'string'],
            'id_photo' => ['nullable', 'string'],
            'check_in_now' => ['boolean'],
        ]);

        // Arrival photos belong to the visit, so they are only captured when the
        // visitor is actually checked in now (an "expected" visitor has no visit
        // yet — they'll be photographed when they arrive at the gate). Stored to
        // disk up front so the atomic write below just references the paths.
        $checkInNow = $request->boolean('check_in_now');
        $photoPath = $checkInNow ? $this->storePhoto($validated['photo'] ?? null) : null;
        $idPhotoPath = $checkInNow ? $this->storePhoto($validated['id_photo'] ?? null) : null;

        $visitor = DB::transaction(function () use ($validated, $checkInNow, $photoPath, $idPhotoPath) {
            $visitor = Visitor::create([
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'company' => $validated['company'] ?? null,
                'host' => $validated['host'],
                'purpose' => $validated['purpose'] ?? null,
                'companions' => $validated['companions'] ?? 0,
                'device_pin' => $validated['device_pin'] ?? null,
                'qr_token' => (string) Str::ulid(),
                'status' => 'expected',
            ]);

            $visitor->update([
                'badge_number' => 'VIS-'.date('Y').'-'.str_pad((string) $visitor->id, 9, '0', STR_PAD_LEFT),
            ]);

            if ($checkInNow) {
                $visitor->recordCheckIn(null, $photoPath, $idPhotoPath);
            }

            return $visitor;
        });

        // Registration complete -> go print the badge (QR is on it).
        return redirect()
            ->route('visitors.badge', $visitor)
            ->with('success', "{$visitor->name} registered".($checkInNow ? ' and checked in.' : '.'));
    }

    public function show(Visitor $visitor): Response
    {
        $visitor->load('visits', 'currentVisit');

        return Inertia::render('Visitors/Show', [
            'visitor' => array_merge(
                $visitor->only([
                    'id', 'name', 'email', 'phone', 'company', 'host', 'purpose',
                    'companions', 'badge_number', 'device_pin', 'qr_token', 'status',
                    'checked_in_at', 'checked_out_at', 'created_at',
                ]),
                [
                    'photo_url' => $visitor->photo_url,
                    'id_photo_url' => $visitor->id_photo_url,
                ],
            ),
            'visits' => $visitor->visits->map(fn (Visit $v) => $v->only([
                'id', 'host', 'purpose', 'checked_in_at', 'checked_out_at',
            ])),
        ]);
    }

    public function update(Request $request, Visitor $visitor): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'host' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'companions' => ['nullable', 'integer', 'min:0', 'max:100'],
            'device_pin' => ['nullable', 'string', 'max:50'],
        ]);

        $visitor->update($validated);

        return back()->with('success', 'Visitor details updated.');
    }

    public function badge(Visitor $visitor): Response
    {
        return Inertia::render('Visitors/Badge', [
            'visitor' => array_merge(
                $visitor->only([
                    'id', 'name', 'company', 'host', 'purpose', 'visit_date',
                    'badge_number', 'qr_token', 'status', 'checked_in_at',
                ]),
                ['photo_url' => $visitor->photo_url],
            ),
        ]);
    }

    public function scan(): Response
    {
        return Inertia::render('Visitors/Scan');
    }

    /**
     * Stream a visitor's current arrival photo (face or ID) from the private
     * disk to authenticated Front Desk staff. Photos exist only for the open
     * visit and are purged on check-out, so this 404s once the visitor leaves.
     */
    public function photo(Visitor $visitor, string $which): StreamedResponse
    {
        $column = $which === 'id' ? 'id_photo_path' : 'photo_path';
        $path = $visitor->openVisit()?->{$column};

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Scan a badge QR (or type its code) to check a visitor in or out. The guard
     * picks the mode explicitly ('in' on arrival, 'out' on departure) so an
     * accidental double-scan is a no-op instead of flipping the visitor's state.
     */
    public function scanCheckout(Request $request): RedirectResponse
    {
        $code = trim($request->string('code')->toString());
        $mode = $request->string('mode')->toString() === 'out' ? 'out' : 'in';

        $visitor = Visitor::query()
            ->where('qr_token', $code)
            ->orWhere('badge_number', $code)
            ->first();

        if (! $visitor) {
            return back()->with('error', 'Badge not recognized. Please try again.');
        }

        if ($mode === 'out') {
            if ($visitor->status !== 'checked_in') {
                return back()->with('error', "{$visitor->name} is not currently on-site.");
            }

            $visitor->recordCheckOut();

            return back()->with('success', "{$visitor->name} checked out.");
        }

        // Check in.
        if ($visitor->status === 'checked_in') {
            return back()->with('error', "{$visitor->name} is already checked in.");
        }

        // A dated badge expires the day after its appointment — reject the scan.
        if ($visitor->isExpired()) {
            return back()->with(
                'error',
                "Badge expired. {$visitor->name}'s pass was only valid through ".
                    $visitor->visit_date->format('M j, Y').'. Please re-register at the front desk.'
            );
        }

        $visitor->recordCheckIn();

        return back()->with('success', "{$visitor->name} checked in.");
    }

    public function checkIn(Request $request, Visitor $visitor): RedirectResponse
    {
        $validated = $request->validate([
            'photo' => ['nullable', 'string'],
            'id_photo' => ['nullable', 'string'],
        ]);

        $visitor->recordCheckIn(
            null,
            $this->storePhoto($validated['photo'] ?? null),
            $this->storePhoto($validated['id_photo'] ?? null),
        );

        return back()->with('success', "{$visitor->name} checked in.");
    }

    public function checkOut(Visitor $visitor): RedirectResponse
    {
        $visitor->recordCheckOut();

        return back()->with('success', "{$visitor->name} checked out.");
    }

    /**
     * Persist a base64 data-URL photo to the private disk; return its path.
     * Face/ID photos are sensitive PII, so they never touch the world-readable
     * public disk — they're streamed back through the gated photo() route.
     */
    private function storePhoto(?string $dataUrl): ?string
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
        $path = 'visitor-photos/'.Str::ulid().'.'.$ext;

        Storage::disk('local')->put($path, $binary);

        return $path;
    }
}
