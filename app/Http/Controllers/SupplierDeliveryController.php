<?php

namespace App\Http\Controllers;

use App\Models\SupplierDelivery;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupplierDeliveryController extends Controller
{
    /**
     * Timezone for human-facing exports. Timestamps are stored in UTC and the
     * browser renders them locally, so exports are converted to match the screen.
     */
    private const DISPLAY_TZ = 'Asia/Manila';

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $deliveries = $this->filteredQuery($filters)
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('SupplierDeliveries/Index', [
            'deliveries' => $deliveries,
            'filters' => $filters,
            'count' => SupplierDelivery::count(),
        ]);
    }

    /**
     * Export the filtered deliveries as a CSV (opens in Excel).
     */
    public function export(Request $request): StreamedResponse
    {
        $deliveries = $this->filteredQuery($this->filters($request))->get();
        $filename = 'supplier_deliveries_'.now()->format('Y-m-d_His').'.csv';
        $tz = self::DISPLAY_TZ;

        return response()->streamDownload(function () use ($deliveries, $tz) {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM so Excel renders accented text correctly.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'DELIVERY DATE', 'SUPPLIER', 'PLATE NO.', 'DR #', 'ITEMS', 'QTY',
                'RECEIVED BY', 'STATUS', 'CHECKED IN', 'CHECKED OUT',
            ]);

            foreach ($deliveries as $d) {
                fputcsv($out, [
                    $d->delivery_date?->format('Y-m-d'),
                    $d->supplier_name,
                    $d->plate_number,
                    $d->dr_number,
                    $d->items->map(fn ($i) => $i->name.' x'.$i->quantity.($i->uom ? ' '.$i->uom : ''))->implode('; '),
                    $d->items->sum('quantity'),
                    $d->received_by,
                    $this->statusLabel($d->status),
                    $d->checked_in_at?->copy()->setTimezone($tz)->format('Y-m-d g:i A'),
                    $d->checked_out_at?->copy()->setTimezone($tz)->format('Y-m-d g:i A'),
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Printable report of the filtered deliveries (browser "Save as PDF").
     */
    public function printable(Request $request): ViewContract
    {
        $filters = $this->filters($request);

        return view('supplier-deliveries.print', [
            'deliveries' => $this->filteredQuery($filters)->get(),
            'filters' => $filters,
            'tz' => self::DISPLAY_TZ,
            'generatedAt' => now()->setTimezone(self::DISPLAY_TZ),
        ]);
    }

    /**
     * @return array{search: string, from: string, to: string}
     */
    private function filters(Request $request): array
    {
        return [
            'search' => $request->string('search')->toString(),
            'from' => $request->date('from')?->toDateString() ?? '',
            'to' => $request->date('to')?->toDateString() ?? '',
        ];
    }

    /**
     * @param  array{search: string, from: string, to: string}  $filters
     */
    private function filteredQuery(array $filters): Builder
    {
        return SupplierDelivery::query()
            ->with('items')
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('supplier_name', 'like', "%{$search}%")
                        ->orWhere('plate_number', 'like', "%{$search}%")
                        ->orWhere('dr_number', 'like', "%{$search}%")
                        ->orWhere('received_by', 'like', "%{$search}%")
                        ->orWhereHas('items', fn ($i) => $i->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(
                $filters['from'],
                fn ($query, $fromDate) => $query->whereDate('delivery_date', '>=', $fromDate)
            )
            ->when(
                $filters['to'],
                fn ($query, $toDate) => $query->whereDate('delivery_date', '<=', $toDate)
            )
            ->orderByRaw('COALESCE(delivery_date, created_at) DESC');
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'checked_in' => 'On site',
            'checked_out' => 'Checked out',
            default => (string) $status,
        };
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateDelivery($request);
        $items = $data['items'];
        unset($data['items']);

        $data['dr_image_path'] = $request->hasFile('dr_image')
            ? $request->file('dr_image')->store('supplier-deliveries', 'public')
            : null;
        unset($data['dr_image']);

        $delivery = SupplierDelivery::create([
            ...$data,
            // Logging a delivery checks the supplier in on arrival.
            'status' => 'checked_in',
            'checked_in_at' => now(),
            'recorded_by' => $request->user()->id,
            'recorder_name' => $request->user()->name,
        ]);

        $delivery->items()->createMany($items);

        return redirect()
            ->route('supplier-deliveries.index')
            ->with('success', 'Supplier delivery logged and checked in.');
    }

    public function update(Request $request, SupplierDelivery $supplierDelivery): RedirectResponse
    {
        $data = $this->validateDelivery($request);
        $items = $data['items'];
        unset($data['items']);

        if ($request->hasFile('dr_image')) {
            if ($supplierDelivery->dr_image_path) {
                Storage::disk('public')->delete($supplierDelivery->dr_image_path);
            }
            $data['dr_image_path'] = $request->file('dr_image')->store('supplier-deliveries', 'public');
        }
        unset($data['dr_image']);

        $supplierDelivery->update($data);

        // Replace the item list wholesale — simplest correct sync for a small set.
        $supplierDelivery->items()->delete();
        $supplierDelivery->items()->createMany($items);

        return back()->with('success', 'Supplier delivery updated.');
    }

    public function checkOut(SupplierDelivery $supplierDelivery): RedirectResponse
    {
        if ($supplierDelivery->status === 'checked_out') {
            return back()->with('error', "{$supplierDelivery->supplier_name} is already checked out.");
        }

        $supplierDelivery->update([
            'status' => 'checked_out',
            'checked_out_at' => now(),
        ]);

        return back()->with('success', "{$supplierDelivery->supplier_name} checked out.");
    }

    public function destroy(SupplierDelivery $supplierDelivery): RedirectResponse
    {
        if ($supplierDelivery->dr_image_path) {
            Storage::disk('public')->delete($supplierDelivery->dr_image_path);
        }

        $supplierDelivery->delete();

        return back()->with('success', 'Supplier delivery removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateDelivery(Request $request): array
    {
        return $request->validate([
            'supplier_name' => ['required', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:255'],
            'dr_number' => ['nullable', 'string', 'max:255'],
            'delivery_date' => ['nullable', 'date'],
            'received_by' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
            'dr_image' => ['nullable', 'image', 'max:10240'], // ≤ 10 MB (downscaled client-side)
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'items.*.uom' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
