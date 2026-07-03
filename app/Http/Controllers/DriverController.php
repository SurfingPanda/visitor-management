<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\Driver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DriverController extends Controller
{
    /** Driver statuses offered in the form / filter. */
    private const STATUSES = ['active', 'inactive'];

    /** Load-count columns summed into the per-driver totals. */
    private const ITEMS = ['crates_big', 'crates_small', 'box', 'bin', 'empanada_box', 'trolley'];

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $drivers = Driver::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('license_number', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($filters['status'], self::STATUSES, true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Drivers/Index', [
            'drivers' => $drivers,
            'filters' => $filters,
            'statuses' => self::STATUSES,
            'count' => Driver::count(),
        ]);
    }

    public function show(Driver $driver): Response
    {
        // Deliveries credited to this driver: linked by id, plus legacy rows
        // that were never linked but carry this exact name (unambiguous match).
        $deliveries = DeliveryLog::query()
            ->where(function ($q) use ($driver) {
                $q->where('driver_id', $driver->id)
                    ->orWhere(function ($q2) use ($driver) {
                        $q2->whereNull('driver_id')->where('driver', $driver->name);
                    });
            })
            ->latest('delivery_out')
            ->latest('id')
            ->get();

        $dispatched = 0;
        $missing = 0;

        $rows = $deliveries->map(function (DeliveryLog $d) use (&$dispatched, &$missing) {
            $load = 0;
            $short = 0;
            foreach (self::ITEMS as $field) {
                $out = (int) ($d->$field ?? 0);
                $load += $out;
                if ($d->status === 'returned') {
                    $short += max(0, $out - (int) ($d->{'ret_'.$field} ?? 0));
                }
            }
            $dispatched += $load;
            $missing += $short;

            return [
                'id' => $d->id,
                'plate_number' => $d->plate_number,
                'route' => $d->route,
                'helper' => $d->helper,
                'load' => $load,
                'missing' => $d->status === 'returned' ? $short : null,
                'status' => $d->status,
                'delivery_out' => $d->delivery_out?->toIso8601String(),
                'returned_at' => $d->returned_at?->toIso8601String(),
                'linked' => $d->driver_id !== null,
            ];
        });

        return Inertia::render('Drivers/Show', [
            'driver' => $driver,
            'deliveries' => $rows,
            'stats' => [
                'total' => $deliveries->count(),
                'out' => $deliveries->where('status', 'out')->count(),
                'returned' => $deliveries->where('status', 'returned')->count(),
                'dispatched' => $dispatched,
                'missing' => $missing,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateDriver($request);

        Driver::create([
            ...$validated,
            'registered_by' => $request->user()->id,
            'registrant_name' => $request->user()->name,
        ]);

        return redirect()
            ->route('drivers.index')
            ->with('success', 'Driver registered.');
    }

    public function update(Request $request, Driver $driver): RedirectResponse
    {
        $driver->update($this->validateDriver($request, $driver));

        return back()->with('success', 'Driver updated.');
    }

    public function destroy(Driver $driver): RedirectResponse
    {
        $driver->delete();

        return back()->with('success', 'Driver removed.');
    }

    /**
     * Validate and normalize the driver payload. License numbers are unique
     * when present (ignoring the record being edited).
     *
     * @return array<string, mixed>
     */
    private function validateDriver(Request $request, ?Driver $driver = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'license_number' => [
                'nullable', 'string', 'max:255',
                Rule::unique('drivers', 'license_number')->ignore($driver?->id),
            ],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
