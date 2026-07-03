<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\Vehicle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    /** Vehicle types offered in the form / filter. */
    private const TYPES = ['car', 'motorcycle', 'suv', 'van', 'truck', 'other'];

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'type' => $request->string('type')->toString(),
        ];

        $vehicles = Vehicle::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('plate_number', 'like', "%{$search}%")
                        ->orWhere('make_model', 'like', "%{$search}%")
                        ->orWhere('color', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($filters['type'], self::TYPES, true),
                fn ($query) => $query->where('type', $filters['type'])
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Vehicles/Index', [
            'vehicles' => $vehicles,
            'filters' => $filters,
            'types' => self::TYPES,
            'count' => Vehicle::count(),
        ]);
    }

    public function show(Vehicle $vehicle): Response
    {
        // Trips scheduled/logged directly against the vehicle.
        $nativeTrips = $vehicle->trips()->get()->map(fn ($t) => [
            'id' => $t->id,
            'source' => 'trip',
            'destination' => $t->destination,
            'purpose' => $t->purpose,
            'driver_name' => $t->driver_name,
            'departure_at' => $t->departure_at?->toIso8601String(),
            'return_at' => $t->return_at?->toIso8601String(),
            'status' => $t->status,
            'notes' => $t->notes,
            'sort_at' => ($t->departure_at ?? $t->created_at)->timestamp,
        ]);

        // Deliveries logged for this plate are trips this vehicle took. Map them
        // into the same shape so they show in the history (read-only here — they
        // are managed from the Delivery Log).
        $deliveryTrips = DeliveryLog::query()
            ->where('plate_number', $vehicle->plate_number)
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'source' => 'delivery',
                'destination' => $d->route ?: 'Delivery run',
                'purpose' => 'Delivery',
                'driver_name' => $d->driver,
                'departure_at' => $d->delivery_out?->toIso8601String(),
                'return_at' => $d->arrival_plant?->toIso8601String(),
                'status' => $d->status === 'returned' ? 'completed' : 'ongoing',
                'notes' => $d->returned_remarks,
                'sort_at' => ($d->delivery_out ?? $d->created_at)->timestamp,
            ]);

        $trips = $nativeTrips
            ->concat($deliveryTrips)
            ->sortByDesc('sort_at')
            ->values()
            ->map(function ($t) {
                unset($t['sort_at']);

                return $t;
            });

        $statuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];

        return Inertia::render('Vehicles/Show', [
            'vehicle' => $vehicle,
            'trips' => $trips,
            'statuses' => $statuses,
            'counts' => [
                'all' => $trips->count(),
                'scheduled' => $trips->where('status', 'scheduled')->count(),
                'ongoing' => $trips->where('status', 'ongoing')->count(),
                'completed' => $trips->where('status', 'completed')->count(),
                'cancelled' => $trips->where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateVehicle($request);

        Vehicle::create([
            ...$validated,
            'registered_by' => $request->user()->id,
            'registrant_name' => $request->user()->name,
        ]);

        return redirect()
            ->route('vehicles.index')
            ->with('success', 'Vehicle registered.');
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $vehicle->update($this->validateVehicle($request, $vehicle));

        return back()->with('success', 'Vehicle updated.');
    }

    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        $vehicle->delete();

        return back()->with('success', 'Vehicle removed.');
    }

    /**
     * Validate and normalize the vehicle payload. Plate numbers are stored
     * upper-cased and must be unique (ignoring the record being edited).
     *
     * @return array<string, mixed>
     */
    private function validateVehicle(Request $request, ?Vehicle $vehicle = null): array
    {
        $request->merge([
            'plate_number' => strtoupper(trim($request->string('plate_number')->toString())),
        ]);

        $validated = $request->validate([
            'plate_number' => [
                'required', 'string', 'max:255',
                Rule::unique('vehicles', 'plate_number')->ignore($vehicle?->id),
            ],
            'type' => ['required', Rule::in(self::TYPES)],
            'make_model' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        return $validated;
    }
}
