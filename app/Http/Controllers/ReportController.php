<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\IncidentReport;
use App\Models\ScrapDisposal;
use App\Models\SupplierDelivery;
use App\Models\SupplierDeliveryItem;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);

        $base = fn () => Visit::whereBetween('checked_in_at', [$from, $to]);

        $total = $base()->count();
        $unique = $base()->distinct('visitor_id')->count('visitor_id');

        $avgMinutes = (int) round(
            $base()
                ->whereNotNull('checked_out_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, checked_in_at, checked_out_at)) as a')
                ->value('a') ?? 0
        );

        // Visits per day across the range (zero-filled).
        $perDay = $base()
            ->selectRaw('DATE(checked_in_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $daily = [];
        for ($cursor = $from->copy(); $cursor <= $to; $cursor->addDay()) {
            $key = $cursor->toDateString();
            $daily[] = [
                'date' => $key,
                'label' => $cursor->format('M j'),
                'count' => (int) ($perDay[$key] ?? 0),
            ];
        }

        $busiest = collect($daily)->sortByDesc('count')->first();

        $byPurpose = $base()
            ->selectRaw('COALESCE(NULLIF(purpose, ""), "Unspecified") as label, COUNT(*) as count')
            ->groupBy('label')
            ->orderByDesc('count')
            ->get();

        $topHosts = $base()
            ->selectRaw('host, COUNT(*) as count')
            ->groupBy('host')
            ->orderByDesc('count')
            ->limit(8)
            ->get();

        // ---- Delivery Log (by dispatch time) ----
        $deliveryBase = fn () => DeliveryLog::whereBetween('delivery_out', [$from, $to]);

        $itemKeys = ['crates_big', 'crates_small', 'box', 'bin', 'empanada_box', 'trolley'];
        $returnedDeliveries = (clone $deliveryBase())->where('status', 'returned')->get();

        $missingItems = 0;
        $shortDeliveries = 0;
        foreach ($returnedDeliveries as $d) {
            $short = 0;
            foreach ($itemKeys as $k) {
                $short += max(0, (int) $d->{$k} - (int) $d->{"ret_{$k}"});
            }
            $missingItems += $short;
            if ($short > 0) {
                $shortDeliveries++;
            }
        }

        $delivery = [
            'total' => (clone $deliveryBase())->count(),
            'out' => (clone $deliveryBase())->where('status', 'out')->count(),
            'returned' => (clone $deliveryBase())->where('status', 'returned')->count(),
            'missing_items' => $missingItems,
            'short_deliveries' => $shortDeliveries,
            'by_route' => (clone $deliveryBase())
                ->selectRaw('COALESCE(NULLIF(route, ""), "Unspecified") as label, COUNT(*) as count')
                ->groupBy('label')
                ->orderByDesc('count')
                ->limit(8)
                ->get(),
        ];

        // ---- Incident & Accident Reports (by occurrence, falling back to filing date) ----
        $incidentBase = fn () => IncidentReport::whereRaw(
            'COALESCE(occurred_at, created_at) BETWEEN ? AND ?',
            [$from, $to]
        );

        $categoryLabels = [
            'injury_first_aid' => 'Injury – First Aid',
            'injury_medical' => 'Injury – Medical / Emergency',
            'property_damage' => 'Property Damage',
            'equipment_failure' => 'Equipment Failure / Breakdown',
            'code_violation' => 'Code of Conduct Violation',
        ];
        $categoryCounts = array_fill_keys(array_keys($categoryLabels), 0);
        foreach ((clone $incidentBase())->pluck('categories') as $cats) {
            foreach ((array) ($cats ?? []) as $key) {
                if (array_key_exists($key, $categoryCounts)) {
                    $categoryCounts[$key]++;
                }
            }
        }
        $byCategory = collect($categoryLabels)
            ->map(fn ($label, $key) => ['label' => $label, 'count' => $categoryCounts[$key]])
            ->filter(fn ($row) => $row['count'] > 0)
            ->sortByDesc('count')
            ->values();

        $countByColumn = fn ($column) => (clone $incidentBase())
            ->selectRaw("{$column} as label, COUNT(*) as count")
            ->groupBy($column)
            ->pluck('count', 'label');

        $byStatus = $countByColumn('status');
        $bySeverity = $countByColumn('severity');

        $incidents = [
            'total' => (clone $incidentBase())->count(),
            'incident' => (clone $incidentBase())->where('type', 'incident')->count(),
            'accident' => (clone $incidentBase())->where('type', 'accident')->count(),
            'open' => (int) ($byStatus['open'] ?? 0),
            'under_review' => (int) ($byStatus['under_review'] ?? 0),
            'resolved' => (int) ($byStatus['resolved'] ?? 0),
            'by_severity' => collect(['low', 'medium', 'high', 'critical'])
                ->map(fn ($s) => ['label' => ucfirst($s), 'count' => (int) ($bySeverity[$s] ?? 0)])
                ->filter(fn ($row) => $row['count'] > 0)
                ->values(),
            'by_category' => $byCategory,
        ];

        // ---- Supplier Delivery (by delivery date, falling back to logged date) ----
        $supplierBase = fn () => SupplierDelivery::whereRaw(
            'COALESCE(delivery_date, created_at) BETWEEN ? AND ?',
            [$from, $to]
        );

        $supplierIds = (clone $supplierBase())->pluck('id');
        $supplierItems = (int) SupplierDeliveryItem::whereIn('supplier_delivery_id', $supplierIds)->sum('quantity');
        $onSite = (clone $supplierBase())->where('status', 'checked_in')->count();
        $checkedOut = (clone $supplierBase())->where('status', 'checked_out')->count();

        $supplier = [
            'total' => (clone $supplierBase())->count(),
            'on_site' => $onSite,
            'checked_out' => $checkedOut,
            'items' => $supplierItems,
            'top_suppliers' => (clone $supplierBase())
                ->selectRaw('supplier_name as label, COUNT(*) as count')
                ->groupBy('supplier_name')
                ->orderByDesc('count')
                ->limit(8)
                ->get(),
            'by_status' => collect([
                ['label' => 'On site', 'count' => $onSite],
                ['label' => 'Checked out', 'count' => $checkedOut],
            ])->filter(fn ($row) => $row['count'] > 0)->values(),
        ];

        // ---- Scrap Disposal (by disposal date, falling back to logged date) ----
        $scrapBase = fn () => ScrapDisposal::whereRaw(
            'COALESCE(disposal_date, created_at) BETWEEN ? AND ?',
            [$from, $to]
        );

        $scrapMethods = ['sold', 'recycled', 'hauled', 'discarded'];
        $scrapByMethod = (clone $scrapBase())
            ->selectRaw('method, COUNT(*) as count')
            ->groupBy('method')
            ->pluck('count', 'method');

        $scrap = [
            'total' => (clone $scrapBase())->count(),
            'qty' => (int) (clone $scrapBase())->sum('quantity'),
            'amount' => (float) (clone $scrapBase())->sum('amount'),
            'by_method' => collect($scrapMethods)
                ->map(fn ($m) => ['label' => ucfirst($m), 'count' => (int) ($scrapByMethod[$m] ?? 0)])
                ->filter(fn ($row) => $row['count'] > 0)
                ->values(),
            'by_category' => (clone $scrapBase())
                ->selectRaw('COALESCE(NULLIF(category, ""), "Uncategorized") as label, COUNT(*) as count')
                ->groupBy('label')
                ->orderByDesc('count')
                ->limit(8)
                ->get(),
        ];

        return Inertia::render('Reports/Index', [
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'stats' => [
                'total' => $total,
                'unique' => $unique,
                'avg_minutes' => $avgMinutes,
                'busiest' => $busiest && $busiest['count'] > 0 ? $busiest : null,
            ],
            'daily' => $daily,
            'byPurpose' => $byPurpose,
            'topHosts' => $topHosts,
            'delivery' => $delivery,
            'incidents' => $incidents,
            'supplier' => $supplier,
            'scrap' => $scrap,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range($request);

        $filename = "visitors_{$from->toDateString()}_to_{$to->toDateString()}.csv";

        $visits = Visit::with('visitor')
            ->whereBetween('checked_in_at', [$from, $to])
            ->orderBy('checked_in_at')
            ->get();

        return response()->streamDownload(function () use ($visits) {
            $out = fopen('php://output', 'w');

            fputcsv($out, [
                'Visitor', 'Company', 'Host', 'Purpose', 'Badge',
                'Checked in', 'Checked out', 'Duration (min)',
            ]);

            foreach ($visits as $visit) {
                $duration = $visit->checked_out_at
                    ? $visit->checked_in_at->diffInMinutes($visit->checked_out_at)
                    : '';

                fputcsv($out, [
                    $visit->visitor?->name,
                    $visit->visitor?->company,
                    $visit->host,
                    $visit->purpose,
                    $visit->visitor?->badge_number,
                    optional($visit->checked_in_at)->toDateTimeString(),
                    optional($visit->checked_out_at)->toDateTimeString(),
                    $duration,
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Resolve the requested date range (defaults to the last 30 days).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(Request $request): array
    {
        $to = $request->date('to')?->endOfDay() ?? Carbon::today()->endOfDay();
        $from = $request->date('from')?->startOfDay()
            ?? $to->copy()->subDays(29)->startOfDay();

        // Guard against an inverted range.
        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        return [$from, $to];
    }
}
