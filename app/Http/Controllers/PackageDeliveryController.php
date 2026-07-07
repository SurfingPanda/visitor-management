<?php

namespace App\Http\Controllers;

use App\Models\PackageDelivery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PackageDeliveryController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $deliveries = PackageDelivery::query()
            ->with('items')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('recipient_name', 'like', "%{$search}%")
                        ->orWhere('rider_name', 'like', "%{$search}%")
                        ->orWhereHas('items', function ($i) use ($search) {
                            $i->where('tracking_number', 'like', "%{$search}%")
                                ->orWhere('courier', 'like', "%{$search}%")
                                ->orWhere('sender', 'like', "%{$search}%");
                        });

                    // Allow lookup by reference code, e.g. "PKG-0000000042" or "42".
                    if (preg_match('/^(?:pkg)?-?0*(\d+)$/i', trim($search), $m)) {
                        $q->orWhere('id', (int) $m[1]);
                    }
                });
            })
            ->when(
                in_array($status, ['pending', 'received'], true),
                fn ($query) => $query->where('status', $status)
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('PackageDeliveries/Index', [
            'deliveries' => $deliveries,
            'filters' => ['search' => $search, 'status' => $status],
            'counts' => [
                'all' => PackageDelivery::count(),
                'pending' => PackageDelivery::where('status', 'pending')->count(),
                'received' => PackageDelivery::where('status', 'received')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateDelivery($request);
        $items = $data['items'];
        unset($data['items']);

        DB::transaction(function () use ($data, $items, $request) {
            $delivery = PackageDelivery::create([
                ...$data,
                'status' => 'pending',
                'logged_by' => $request->user()->id,
                'logger_name' => $request->user()->name,
            ]);

            $delivery->items()->createMany($items);
        });

        return redirect()
            ->route('package-deliveries.index')
            ->with('success', 'Package logged.');
    }

    public function update(Request $request, PackageDelivery $packageDelivery): RedirectResponse
    {
        $data = $this->validateDelivery($request);
        $items = $data['items'];
        unset($data['items']);

        DB::transaction(function () use ($packageDelivery, $data, $items) {
            $packageDelivery->update($data);

            // Replace the parcel list wholesale — simplest correct sync.
            $packageDelivery->items()->delete();
            $packageDelivery->items()->createMany($items);
        });

        return back()->with('success', 'Package updated.');
    }

    /**
     * Record that the recipient has claimed the package: capture their signature
     * (required) and stamp the receipt time.
     */
    public function markReceived(Request $request, PackageDelivery $packageDelivery): RedirectResponse
    {
        if ($packageDelivery->status === 'received') {
            return back()->with('error', 'This drop-off was already received.');
        }

        $validated = $request->validate([
            'received_by_name' => ['nullable', 'string', 'max:255'],
            'signature' => ['required', 'string'],
        ]);

        $signaturePath = $this->storeSignature($validated['signature']);

        if (! $signaturePath) {
            return back()->withErrors([
                'signature' => 'Please capture a signature to confirm receipt.',
            ]);
        }

        $packageDelivery->update([
            'status' => 'received',
            'received_at' => Carbon::now(),
            'received_by_name' => trim($validated['received_by_name'] ?? '') ?: $packageDelivery->recipient_name,
            'received_signature_path' => $signaturePath,
        ]);

        return back()->with('success', "{$packageDelivery->recipient_name}'s package(s) marked as received.");
    }

    public function destroy(PackageDelivery $packageDelivery): RedirectResponse
    {
        if ($packageDelivery->received_signature_path) {
            Storage::disk('local')->delete($packageDelivery->received_signature_path);
        }

        $packageDelivery->delete();

        return back()->with('success', 'Package record removed.');
    }

    /**
     * Stream the receipt signature from the private disk to authenticated staff.
     */
    public function signature(PackageDelivery $packageDelivery): StreamedResponse
    {
        $path = $packageDelivery->received_signature_path;

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateDelivery(Request $request): array
    {
        return $request->validate([
            'recipient_name' => ['required', 'string', 'max:255'],
            'recipient_department' => ['nullable', 'string', 'max:255'],
            'rider_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.tracking_number' => ['nullable', 'string', 'max:255'],
            'items.*.courier' => ['nullable', 'string', 'max:255'],
            'items.*.sender' => ['nullable', 'string', 'max:255'],
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
        $path = 'package-signatures/'.Str::ulid().'.'.$ext;

        Storage::disk('local')->put($path, $binary);

        return $path;
    }
}
