<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\Vehicle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TripController extends Controller
{
    /** Trip lifecycle states. */
    private const STATUSES = ['scheduled', 'ongoing', 'completed', 'cancelled'];

    public function store(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $validated = $this->validateTrip($request);

        $vehicle->trips()->create([
            ...$validated,
            'recorded_by' => $request->user()->id,
            'recorder_name' => $request->user()->name,
        ]);

        return back()->with('success', 'Trip added.');
    }

    public function update(Request $request, Trip $trip): RedirectResponse
    {
        $trip->update($this->validateTrip($request));

        return back()->with('success', 'Trip updated.');
    }

    public function destroy(Trip $trip): RedirectResponse
    {
        $trip->delete();

        return back()->with('success', 'Trip removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateTrip(Request $request): array
    {
        return $request->validate([
            'destination' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'departure_at' => ['nullable', 'date'],
            'return_at' => ['nullable', 'date', 'after_or_equal:departure_at'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
