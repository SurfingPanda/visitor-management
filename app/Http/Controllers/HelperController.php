<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\Helper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class HelperController extends Controller
{
    /** Helper statuses offered in the form / filter. */
    private const STATUSES = ['active', 'inactive'];

    /** Load-count columns summed into the per-helper totals. */
    private const ITEMS = ['crates_big', 'crates_small', 'box', 'bin', 'empanada_box', 'trolley'];

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $helpers = Helper::query()
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

        return Inertia::render('Helpers/Index', [
            'helpers' => $helpers,
            'filters' => $filters,
            'statuses' => self::STATUSES,
            'count' => Helper::count(),
        ]);
    }

    public function show(Helper $helper): Response
    {
        // Deliveries credited to this helper: linked by id, plus legacy rows
        // that were never linked but carry this exact name (unambiguous match).
        $deliveries = DeliveryLog::query()
            ->where(function ($q) use ($helper) {
                $q->where('helper_id', $helper->id)
                    ->orWhere(function ($q2) use ($helper) {
                        $q2->whereNull('helper_id')->where('helper', $helper->name);
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
                'driver' => $d->driver,
                'load' => $load,
                'missing' => $d->status === 'returned' ? $short : null,
                'status' => $d->status,
                'delivery_out' => $d->delivery_out?->toIso8601String(),
                'returned_at' => $d->returned_at?->toIso8601String(),
                'linked' => $d->helper_id !== null,
            ];
        });

        return Inertia::render('Helpers/Show', [
            'helper' => $helper,
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
        $validated = $this->validateHelper($request);

        Helper::create([
            ...$validated,
            'registered_by' => $request->user()->id,
            'registrant_name' => $request->user()->name,
        ]);

        return redirect()
            ->route('helpers.index')
            ->with('success', 'Helper registered.');
    }

    public function update(Request $request, Helper $helper): RedirectResponse
    {
        $helper->update($this->validateHelper($request, $helper));

        return back()->with('success', 'Helper updated.');
    }

    public function destroy(Helper $helper): RedirectResponse
    {
        $helper->delete();

        return back()->with('success', 'Helper removed.');
    }

    /**
     * Validate and normalize the helper payload. License numbers are unique
     * when present (ignoring the record being edited).
     *
     * @return array<string, mixed>
     */
    private function validateHelper(Request $request, ?Helper $helper = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'license_number' => [
                'nullable', 'string', 'max:255',
                Rule::unique('helpers', 'license_number')->ignore($helper?->id),
            ],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
