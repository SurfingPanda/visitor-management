<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Visitor;
use Inertia\Inertia;
use Inertia\Response;

class EmergencyRosterController extends Controller
{
    /**
     * A real-time list of everyone currently inside the building — visitors
     * (plus the people with them) and on-site employees — for evacuation
     * headcounts and drills.
     */
    public function index(): Response
    {
        $visitors = Visitor::query()
            ->where('status', 'checked_in')
            ->orderBy('checked_in_at')
            ->get(['id', 'name', 'company', 'host', 'purpose', 'companions', 'checked_in_at']);

        $employees = Employee::query()
            ->where('status', 'checked_in')
            ->orderBy('checked_in_at')
            ->get(['id', 'name', 'device_pin', 'checked_in_at']);

        $companions = (int) $visitors->sum('companions');

        return Inertia::render('EmergencyRoster/Index', [
            'visitors' => $visitors,
            'employees' => $employees,
            'counts' => [
                'visitors' => $visitors->count(),
                'companions' => $companions,
                'employees' => $employees->count(),
                'total' => $visitors->count() + $companions + $employees->count(),
            ],
            'generatedAt' => now()->toIso8601String(),
        ]);
    }
}
