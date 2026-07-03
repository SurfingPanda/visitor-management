<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentReportController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'type' => $request->string('type')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $reports = IncidentReport::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('people_involved', 'like', "%{$search}%")
                        ->orWhere('reporter_name', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($filters['type'], ['incident', 'accident'], true),
                fn ($query) => $query->where('type', $filters['type'])
            )
            ->when(
                in_array($filters['status'], ['open', 'under_review', 'resolved'], true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('IncidentReports/Index', [
            'reports' => $reports,
            'filters' => $filters,
            'counts' => [
                'all' => IncidentReport::count(),
                'open' => IncidentReport::where('status', 'open')->count(),
                'under_review' => IncidentReport::where('status', 'under_review')->count(),
                'resolved' => IncidentReport::where('status', 'resolved')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:incident,accident'],
            'title' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'in:low,medium,high,critical'],
            'location' => ['nullable', 'string', 'max:255'],
            'people_involved' => ['nullable', 'string', 'max:255'],
            'witness' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'reported_by' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string', 'in:injury_first_aid,injury_medical,property_damage,equipment_failure,code_violation'],
        ]);

        // "Reported by" is free text; fall back to the logged-in user's name.
        $reporterName = $validated['reported_by'] ?? null;
        unset($validated['reported_by']);

        IncidentReport::create([
            ...$validated,
            'status' => 'open',
            'reported_by' => $request->user()->id,
            'reporter_name' => $reporterName ?: $request->user()->name,
        ]);

        return redirect()
            ->route('incident-reports.index')
            ->with('success', 'Report filed.');
    }

    public function update(Request $request, IncidentReport $incidentReport): RedirectResponse
    {
        // Supports both the status-only quick change and a full edit. Every field
        // uses "sometimes" so a partial payload (e.g. just status) still validates.
        $validated = $request->validate([
            'type' => ['sometimes', 'required', 'in:incident,accident'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'severity' => ['sometimes', 'required', 'in:low,medium,high,critical'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'people_involved' => ['sometimes', 'nullable', 'string', 'max:255'],
            'witness' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'reported_by' => ['sometimes', 'nullable', 'string', 'max:255'],
            'occurred_at' => ['sometimes', 'nullable', 'date'],
            'categories' => ['sometimes', 'nullable', 'array'],
            'categories.*' => ['string', 'in:injury_first_aid,injury_medical,property_damage,equipment_failure,code_violation'],
            'status' => ['sometimes', 'required', 'in:open,under_review,resolved'],
        ]);

        // A resolved report is locked for full edits; only a status change
        // (e.g. reopening it) is allowed while it stays resolved.
        $statusOnly = array_keys($validated) === ['status'];
        if (! $statusOnly && $incidentReport->status === 'resolved') {
            return back()->with(
                'error',
                'Resolved reports are locked. Reopen the report to edit it.'
            );
        }

        // "Reported by" is free text; keep the existing name when left blank.
        if (array_key_exists('reported_by', $validated)) {
            $name = $validated['reported_by'];
            unset($validated['reported_by']);
            $validated['reporter_name'] = $name ?: $incidentReport->reporter_name;
        }

        $incidentReport->update($validated);

        return back()->with(
            'success',
            $statusOnly ? 'Report status updated.' : 'Report updated.'
        );
    }
}
