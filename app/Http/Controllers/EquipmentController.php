<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EquipmentController extends Controller
{
    /** Lifecycle states offered in the form / filter. */
    private const STATUSES = ['in_stock', 'under_repair', 'transferred', 'disposed'];

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'from' => $request->date('from')?->toDateString() ?? '',
            'to' => $request->date('to')?->toDateString() ?? '',
        ];

        $equipment = Equipment::query()
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('asset_tag', 'like', "%{$search}%")
                        ->orWhere('disposed_by', 'like', "%{$search}%")
                        ->orWhere('approved_by', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");

                    // Allow lookup by reference code, e.g. "EQP-0000000042" or
                    // just "42" — the numeric part maps to the primary key.
                    if (preg_match('/^(?:eqp)?-?0*(\d+)$/i', trim($search), $m)) {
                        $q->orWhere('id', (int) $m[1]);
                    }
                });
            })
            ->when(
                in_array($filters['status'], self::STATUSES, true),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->when(
                $filters['from'],
                fn ($query, $fromDate) => $query->whereDate('created_at', '>=', $fromDate)
            )
            ->when(
                $filters['to'],
                fn ($query, $toDate) => $query->whereDate('created_at', '<=', $toDate)
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Equipment/Index', [
            'equipment' => $equipment,
            'filters' => $filters,
            'statuses' => self::STATUSES,
            'count' => Equipment::count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateEquipment($request);

        $data['image_path'] = $request->hasFile('image')
            ? $request->file('image')->store('equipment-images', 'public')
            : null;
        unset($data['image']);

        $data['asset_form_image_path'] = $request->hasFile('asset_form_image')
            ? $request->file('asset_form_image')->store('equipment-asset-forms', 'public')
            : null;
        unset($data['asset_form_image']);

        Equipment::create([
            ...$data,
            'registered_by' => $request->user()->id,
            'registrant_name' => $request->user()->name,
        ]);

        return redirect()
            ->route('equipment.index')
            ->with('success', 'Equipment added.');
    }

    public function update(Request $request, Equipment $equipment): RedirectResponse
    {
        $data = $this->validateEquipment($request);

        if ($request->hasFile('image')) {
            if ($equipment->image_path) {
                Storage::disk('public')->delete($equipment->image_path);
            }
            $data['image_path'] = $request->file('image')->store('equipment-images', 'public');
        }
        unset($data['image']);

        if ($request->hasFile('asset_form_image')) {
            if ($equipment->asset_form_image_path) {
                Storage::disk('public')->delete($equipment->asset_form_image_path);
            }
            $data['asset_form_image_path'] = $request->file('asset_form_image')->store('equipment-asset-forms', 'public');
        }
        unset($data['asset_form_image']);

        $equipment->update($data);

        return back()->with('success', 'Equipment updated.');
    }

    public function destroy(Equipment $equipment): RedirectResponse
    {
        foreach ([$equipment->image_path, $equipment->asset_form_image_path] as $path) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }
        }

        $equipment->delete();

        return back()->with('success', 'Equipment removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateEquipment(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'asset_tag' => ['nullable', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'disposed_by' => ['nullable', 'string', 'max:255'],
            'approved_by' => ['nullable', 'string', 'max:255'],
            'disposed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
            // Both images are ≤ 10 MB; uploads are downscaled client-side.
            'image' => ['nullable', 'image', 'max:10240'],
            'asset_form_image' => ['nullable', 'image', 'max:10240'],
        ]);
    }
}
