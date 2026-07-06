<?php

namespace App\Http\Controllers;

use App\Models\ScrapDisposal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ScrapDisposalController extends Controller
{
    /** Disposal methods offered in the form / filter. */
    private const METHODS = ['sold', 'recycled', 'hauled', 'discarded'];

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'method' => $request->string('method')->toString(),
            'from' => $request->date('from')?->toDateString() ?? '',
            'to' => $request->date('to')?->toDateString() ?? '',
        ];

        $disposals = ScrapDisposal::query()
            ->with('items')
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('reference_no', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('recipient', 'like', "%{$search}%")
                        ->orWhereHas('items', fn ($i) => $i->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(
                in_array($filters['method'], self::METHODS, true),
                fn ($query) => $query->where('method', $filters['method'])
            )
            ->when(
                $filters['from'],
                fn ($query, $fromDate) => $query->whereDate('disposal_date', '>=', $fromDate)
            )
            ->when(
                $filters['to'],
                fn ($query, $toDate) => $query->whereDate('disposal_date', '<=', $toDate)
            )
            ->orderByRaw('COALESCE(disposal_date, created_at) DESC')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('ScrapDisposals/Index', [
            'disposals' => $disposals,
            'filters' => $filters,
            'methods' => self::METHODS,
            'count' => ScrapDisposal::count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateDisposal($request);
        $items = $data['items'];
        unset($data['items']);

        $disposal = ScrapDisposal::create([
            ...$data,
            'recorded_by' => $request->user()->id,
            'recorder_name' => $request->user()->name,
        ]);

        $disposal->items()->createMany($items);

        return redirect()
            ->route('scrap-disposals.index')
            ->with('success', 'Scrap disposal recorded.');
    }

    public function update(Request $request, ScrapDisposal $scrapDisposal): RedirectResponse
    {
        $data = $this->validateDisposal($request);
        $items = $data['items'];
        unset($data['items']);

        $scrapDisposal->update($data);

        // Replace the item list wholesale — simplest correct sync for a small set.
        $scrapDisposal->items()->delete();
        $scrapDisposal->items()->createMany($items);

        return back()->with('success', 'Scrap disposal updated.');
    }

    public function destroy(ScrapDisposal $scrapDisposal): RedirectResponse
    {
        $scrapDisposal->delete();

        return back()->with('success', 'Scrap disposal removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateDisposal(Request $request): array
    {
        return $request->validate([
            'reference_no' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'disposal_date' => ['nullable', 'date'],
            'method' => ['required', Rule::in(self::METHODS)],
            'recipient' => ['nullable', 'string', 'max:255'],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'notes' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'items.*.uom' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
