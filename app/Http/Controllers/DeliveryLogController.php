<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\Driver;
use App\Models\Helper;
use App\Models\Vehicle;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeliveryLogController extends Controller
{
    /** Timezone for human-facing exports (timestamps are stored in UTC). */
    private const DISPLAY_TZ = 'Asia/Manila';

    /** Load item columns → human labels, in display order. */
    private const ITEMS = [
        'crates_big' => 'crates (big)',
        'crates_small' => 'crates (small)',
        'box' => 'box',
        'bin' => 'bin',
        'empanada_box' => 'empanada box',
        'trolley' => 'trolley',
    ];

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $deliveries = $this->filteredQuery($filters)
            ->paginate(10)
            ->withQueryString();

        // Distinct plates and routes for the filter dropdowns.
        $plates = DeliveryLog::query()
            ->whereNotNull('plate_number')
            ->where('plate_number', '!=', '')
            ->distinct()
            ->orderBy('plate_number')
            ->pluck('plate_number');

        $routes = DeliveryLog::query()
            ->whereNotNull('route')
            ->where('route', '!=', '')
            ->distinct()
            ->orderBy('route')
            ->pluck('route');

        // Plate suggestions for the "Log a delivery" input: registered vehicles
        // first (with make/type/owner detail), then any plate already used in a
        // delivery that isn't a registered vehicle.
        $registeredPlates = [];
        $vehicleSuggestions = Vehicle::query()
            ->orderBy('plate_number')
            ->get(['plate_number', 'make_model', 'type'])
            ->map(function ($v) use (&$registeredPlates) {
                $registeredPlates[] = $v->plate_number;

                // Skip make/model when it just duplicates the type (e.g. "Truck" / "truck").
                $makeModel = $v->make_model;
                if ($makeModel !== null && strcasecmp(trim($makeModel), trim($v->type)) === 0) {
                    $makeModel = null;
                }

                $detail = collect([$makeModel, ucfirst($v->type)])
                    ->filter()
                    ->join(' · ');

                return [
                    'plate' => $v->plate_number,
                    'detail' => $detail ?: 'Registered vehicle',
                    'source' => 'vehicle',
                ];
            });

        $deliveryOnlySuggestions = $plates
            ->reject(fn ($p) => in_array($p, $registeredPlates, true))
            ->map(fn ($p) => [
                'plate' => $p,
                'detail' => 'Previous delivery',
                'source' => 'delivery',
            ]);

        $plateSuggestions = $vehicleSuggestions
            ->concat($deliveryOnlySuggestions)
            ->values();

        return Inertia::render('DeliveryLogs/Index', [
            'deliveries' => $deliveries,
            'filters' => $filters,
            'plates' => $plates,
            'plateSuggestions' => $plateSuggestions,
            'driverSuggestions' => $this->crewSuggestions(Driver::query()),
            'helperSuggestions' => $this->crewSuggestions(Helper::query()),
            'routes' => $routes,
            'counts' => [
                'all' => DeliveryLog::count(),
                'out' => DeliveryLog::where('status', 'out')->count(),
                'returned' => DeliveryLog::where('status', 'returned')->count(),
            ],
        ]);
    }

    /**
     * Active crew (drivers or helpers) as type-ahead suggestions for the log
     * form: [{ id, name, detail }].
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string, detail: ?string}>
     */
    private function crewSuggestions(Builder $query)
    {
        return $query
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'license_number', 'phone'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'detail' => $p->license_number ?: $p->phone ?: null,
            ])
            ->values();
    }

    /**
     * Export the filtered delivery logs as a CSV (opens in Excel).
     */
    public function export(Request $request): StreamedResponse
    {
        $rows = $this->rows($this->filteredQuery($this->filters($request))->get());
        $filename = 'delivery_logs_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM so Excel renders correctly.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'ID #', 'OUT', 'PLATE', 'ROUTE', 'DRIVER', 'HELPER', 'LOAD', 'MISSING',
                'STATUS', 'RETURNED', 'REMARKS',
            ]);

            foreach ($rows as $r) {
                fputcsv($out, [
                    $r['ref'], $r['out'], $r['plate'], $r['route'], $r['driver'], $r['helper'],
                    $r['load'], $r['missing'], $r['status'], $r['returned'], $r['remarks'],
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Printable report of the filtered delivery logs (browser "Save as PDF").
     */
    public function printable(Request $request): ViewContract
    {
        $filters = $this->filters($request);

        return view('delivery-logs.print', [
            'rows' => $this->rows($this->filteredQuery($filters)->get()),
            'filters' => $filters,
            'generatedAt' => now()->setTimezone(self::DISPLAY_TZ),
        ]);
    }

    /**
     * @return array{search: string, status: string, plate: string, route: string, from: string, to: string}
     */
    private function filters(Request $request): array
    {
        return [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'plate' => $request->string('plate')->toString(),
            'route' => $request->string('route')->toString(),
            'from' => $request->date('from')?->toDateString() ?? '',
            'to' => $request->date('to')?->toDateString() ?? '',
        ];
    }

    /**
     * @param  array{search: string, status: string, plate: string, route: string, from: string, to: string}  $filters
     */
    private function filteredQuery(array $filters): Builder
    {
        return DeliveryLog::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('plate_number', 'like', "%{$search}%")
                        ->orWhere('route', 'like', "%{$search}%")
                        ->orWhere('driver', 'like', "%{$search}%")
                        ->orWhere('helper', 'like', "%{$search}%");

                    // Allow lookup by reference code, e.g. "DEL-0000000042" or
                    // just "42" — the numeric part maps to the primary key.
                    if (preg_match('/^(?:del)?-?0*(\d+)$/i', trim($search), $m)) {
                        $q->orWhere('id', (int) $m[1]);
                    }
                });
            })
            ->when(
                in_array($filters['status'], ['out', 'returned'], true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->when(
                $filters['plate'],
                fn ($query, $plate) => $query->where('plate_number', $plate)
            )
            ->when(
                $filters['route'],
                fn ($query, $route) => $query->where('route', $route)
            )
            ->when(
                $filters['from'],
                fn ($query, $from) => $query->whereDate('delivery_out', '>=', $from)
            )
            ->when(
                $filters['to'],
                fn ($query, $to) => $query->whereDate('delivery_out', '<=', $to)
            )
            ->latest('delivery_out')
            ->latest('id');
    }

    /**
     * Turn the delivery models into display-ready rows shared by the CSV
     * export and the print view.
     *
     * @param  \Illuminate\Support\Collection<int, DeliveryLog>  $deliveries
     * @return list<array<string, string>>
     */
    private function rows($deliveries): array
    {
        $tz = self::DISPLAY_TZ;

        return $deliveries->map(fn (DeliveryLog $d) => [
            'ref' => $d->reference,
            'out' => $d->delivery_out?->copy()->setTimezone($tz)->format('M j, Y g:i A') ?? '',
            'plate' => $d->plate_number ?? '',
            'route' => $d->route ?? '',
            'driver' => $d->driver ?? '',
            'helper' => $d->helper ?? '',
            'load' => $this->loadSummary($d),
            'missing' => $this->missingSummary($d),
            'status' => $d->status === 'returned' ? 'Returned' : 'On the road',
            'returned' => $d->returned_at?->copy()->setTimezone($tz)->format('M j, Y g:i A') ?? '',
            'remarks' => $d->returned_remarks ?? '',
        ])->all();
    }

    private function loadSummary(DeliveryLog $d): string
    {
        $parts = [];
        foreach (self::ITEMS as $field => $label) {
            if (($d->$field ?? 0) > 0) {
                $parts[] = "{$d->$field} {$label}";
            }
        }

        return implode(' · ', $parts) ?: '—';
    }

    private function missingSummary(DeliveryLog $d): string
    {
        if ($d->status !== 'returned') {
            return '';
        }

        $parts = [];
        foreach (self::ITEMS as $field => $label) {
            $short = ($d->$field ?? 0) - ($d->{'ret_'.$field} ?? 0);
            if ($short > 0) {
                $parts[] = "{$short} {$label}";
            }
        }

        return implode(' · ', $parts);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'plate_number' => ['required', 'string', 'max:255'],
            'route' => ['nullable', 'string', 'max:255'],
            'driver' => ['nullable', 'string', 'max:255'],
            'helper' => ['nullable', 'string', 'max:255'],
            'driver_id' => ['nullable', 'integer', 'exists:drivers,id'],
            'helper_id' => ['nullable', 'integer', 'exists:helpers,id'],
            'crates_big' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'crates_small' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'bin' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'empanada_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'trolley' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'delivery_out' => ['nullable', 'date'],
        ]);

        $validated = $this->withCrewSnapshots($validated);

        DeliveryLog::create([
            ...$validated,
            'crates_big' => $validated['crates_big'] ?? 0,
            'crates_small' => $validated['crates_small'] ?? 0,
            'box' => $validated['box'] ?? 0,
            'bin' => $validated['bin'] ?? 0,
            'empanada_box' => $validated['empanada_box'] ?? 0,
            'trolley' => $validated['trolley'] ?? 0,
            'delivery_out' => $validated['delivery_out'] ?? now(),
            'status' => 'out',
            'logged_by' => $request->user()->id,
            'logger_name' => $request->user()->name,
        ]);

        return redirect()
            ->route('delivery-logs.index')
            ->with('success', 'Delivery dispatched.');
    }

    public function markReturned(Request $request, DeliveryLog $deliveryLog): RedirectResponse
    {
        $validated = $request->validate([
            'returned_remarks' => ['nullable', 'string', 'max:255'],
            'arrival_plant' => ['nullable', 'date'],
            'ret_crates_big' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_crates_small' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_bin' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_empanada_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_trolley' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);

        $deliveryLog->update([
            'status' => 'returned',
            'returned_at' => Carbon::now(),
            'returned_remarks' => $validated['returned_remarks'] ?? null,
            'arrival_plant' => $validated['arrival_plant'] ?? now(),
            'ret_crates_big' => $validated['ret_crates_big'] ?? 0,
            'ret_crates_small' => $validated['ret_crates_small'] ?? 0,
            'ret_box' => $validated['ret_box'] ?? 0,
            'ret_bin' => $validated['ret_bin'] ?? 0,
            'ret_empanada_box' => $validated['ret_empanada_box'] ?? 0,
            'ret_trolley' => $validated['ret_trolley'] ?? 0,
        ]);

        return back()->with('success', 'Marked as returned.');
    }

    public function update(Request $request, DeliveryLog $deliveryLog): RedirectResponse
    {
        $validated = $request->validate([
            'plate_number' => ['required', 'string', 'max:255'],
            'route' => ['nullable', 'string', 'max:255'],
            'driver' => ['nullable', 'string', 'max:255'],
            'helper' => ['nullable', 'string', 'max:255'],
            'driver_id' => ['nullable', 'integer', 'exists:drivers,id'],
            'helper_id' => ['nullable', 'integer', 'exists:helpers,id'],
            'crates_big' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'crates_small' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'bin' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'empanada_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'trolley' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'delivery_out' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['out', 'returned'])],
            'arrival_plant' => ['nullable', 'date'],
            'ret_crates_big' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_crates_small' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_bin' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_empanada_box' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'ret_trolley' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'returned_remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $counts = [
            'crates_big', 'crates_small', 'box', 'bin', 'empanada_box', 'trolley',
            'ret_crates_big', 'ret_crates_small', 'ret_box', 'ret_bin', 'ret_empanada_box', 'ret_trolley',
        ];
        foreach ($counts as $c) {
            $validated[$c] = $validated[$c] ?? 0;
        }

        // Keep the returned timestamp coherent with the status.
        if ($validated['status'] === 'returned') {
            $validated['returned_at'] = $deliveryLog->returned_at ?? now();
            $validated['arrival_plant'] = $validated['arrival_plant'] ?? $deliveryLog->arrival_plant ?? now();
        } else {
            // Back on the road: clear the return snapshot.
            $validated['returned_at'] = null;
            $validated['arrival_plant'] = null;
        }

        $validated = $this->withCrewSnapshots($validated);

        $deliveryLog->update($validated);

        return back()->with('success', 'Delivery updated.');
    }

    /**
     * When crew is picked from the registry, keep the stored name snapshot in
     * sync with the linked record so the FK and the display name never diverge.
     * A blank id (ad-hoc / unregistered name) leaves the typed name as-is.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function withCrewSnapshots(array $validated): array
    {
        if (! empty($validated['driver_id'])) {
            $validated['driver'] = Driver::whereKey($validated['driver_id'])->value('name')
                ?? ($validated['driver'] ?? null);
        }

        if (! empty($validated['helper_id'])) {
            $validated['helper'] = Helper::whereKey($validated['helper_id'])->value('name')
                ?? ($validated['helper'] ?? null);
        }

        return $validated;
    }

    public function destroy(DeliveryLog $deliveryLog): RedirectResponse
    {
        $deliveryLog->delete();

        return back()->with('success', 'Delivery record removed.');
    }
}
