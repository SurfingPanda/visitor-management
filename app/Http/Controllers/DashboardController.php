<?php

namespace App\Http\Controllers;

use App\Models\DeliveryLog;
use App\Models\Visit;
use App\Models\Visitor;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $now = Carbon::now();

        $checkedInToday = Visit::whereDate('checked_in_at', $today)->count();
        $checkedInYesterday = Visit::whereDate('checked_in_at', $yesterday)->count();

        $stats = [
            'on_site' => Visitor::where('status', 'checked_in')->count(),
            'expected' => Visitor::where('status', 'expected')->count(),
            'checked_in_today' => $checkedInToday,
            'checked_out_today' => Visit::whereDate('checked_out_at', $today)->count(),
            'change_pct' => $checkedInYesterday > 0
                ? (int) round((($checkedInToday - $checkedInYesterday) / $checkedInYesterday) * 100)
                : null,
        ];

        // 7-day check-in trend (used by the line chart + the Checked-In sparkline).
        $trend = collect(range(6, 0))->map(function (int $daysAgo) {
            $date = Carbon::today()->subDays($daysAgo);

            return [
                'label' => $date->format('D'),
                'date' => $date->format('M j'),
                'count' => Visit::whereDate('checked_in_at', $date)->count(),
            ];
        })->values();

        // Per-card 7-day sparklines, each representing its own metric so a card's
        // mini-line actually matches its number. Expected is a forward-looking
        // status with no meaningful daily history, so it gets no sparkline.
        $days = collect(range(6, 0))->map(fn (int $d) => Carbon::today()->subDays($d));
        $sparks = [
            'checked_in' => $trend->pluck('count')->all(),
            'checked_out' => $days
                ->map(fn (Carbon $date) => Visit::whereDate('checked_out_at', $date)->count())
                ->all(),
            // End-of-day occupancy: checked in by day's end and not yet out.
            'on_site' => $days
                ->map(function (Carbon $date) {
                    $end = $date->copy()->endOfDay();

                    return Visit::where('checked_in_at', '<=', $end)
                        ->where(function ($q) use ($end) {
                            $q->whereNull('checked_out_at')
                                ->orWhere('checked_out_at', '>', $end);
                        })
                        ->count();
                })
                ->all(),
        ];

        $recent = Visitor::latest('updated_at')
            ->take(6)
            ->get([
                'id', 'name', 'company', 'host', 'purpose',
                'badge_number', 'status', 'checked_in_at', 'checked_out_at',
            ]);

        // Activity feed: most recent check-in / check-out events.
        $activity = collect();
        foreach (Visit::with('visitor')->latest('updated_at')->take(10)->get() as $visit) {
            if ($visit->checked_in_at) {
                $activity->push([
                    'type' => 'in',
                    'name' => $visit->visitor?->name ?? 'Visitor',
                    'detail' => $visit->host,
                    'at' => $visit->checked_in_at,
                ]);
            }
            if ($visit->checked_out_at) {
                $activity->push([
                    'type' => 'out',
                    'name' => $visit->visitor?->name ?? 'Visitor',
                    'detail' => $visit->host,
                    'at' => $visit->checked_out_at,
                ]);
            }
        }
        $activity = $activity
            ->sortByDesc('at')
            ->take(6)
            ->map(fn ($e) => [
                'type' => $e['type'],
                'name' => $e['name'],
                'detail' => $e['detail'],
                'time' => Carbon::parse($e['at'])->format('h:i A'),
            ])
            ->values();

        // Visitors by purpose (top 4 + "Others").
        $purposeRows = Visit::selectRaw('COALESCE(NULLIF(purpose, ""), "Other") as label, COUNT(*) as count')
            ->groupBy('label')
            ->orderByDesc('count')
            ->get();
        $purposeTotal = max(1, $purposeRows->sum('count'));
        $top = $purposeRows->take(4);
        $othersCount = $purposeRows->slice(4)->sum('count');
        $byPurpose = $top->map(fn ($r) => [
            'label' => $r->label,
            'count' => (int) $r->count,
            'pct' => (int) round($r->count / $purposeTotal * 100),
        ])->values()->all();
        if ($othersCount > 0) {
            $byPurpose[] = [
                'label' => 'Others',
                'count' => (int) $othersCount,
                'pct' => (int) round($othersCount / $purposeTotal * 100),
            ];
        }

        // On-site summary.
        $onSiteVisitors = Visitor::where('status', 'checked_in')->pluck('checked_in_at');
        $longest = $onSiteVisitors
            ->map(fn ($t) => $t ? Carbon::parse($t)->diffInMinutes($now) : 0)
            ->max() ?? 0;
        $avg = (int) round(
            Visit::whereNotNull('checked_out_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, checked_in_at, checked_out_at)) as a')
                ->value('a') ?? 0
        );

        // ---- Delivery Log ----
        $itemKeys = ['crates_big', 'crates_small', 'box', 'bin', 'empanada_box', 'trolley'];
        $missingItems = 0;
        $shortDeliveries = 0;
        foreach (DeliveryLog::where('status', 'returned')->get() as $d) {
            $short = 0;
            foreach ($itemKeys as $k) {
                $short += max(0, (int) $d->{$k} - (int) $d->{"ret_{$k}"});
            }
            $missingItems += $short;
            if ($short > 0) {
                $shortDeliveries++;
            }
        }

        $recentDeliveries = DeliveryLog::latest('delivery_out')
            ->latest('id')
            ->take(5)
            ->get(['id', 'plate_number', 'route', 'driver', 'status', 'delivery_out', 'returned_at'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'plate_number' => $d->plate_number,
                'route' => $d->route,
                'driver' => $d->driver,
                'status' => $d->status,
                'delivery_out' => $d->delivery_out,
                'returned_at' => $d->returned_at,
            ]);

        $delivery = [
            'on_the_road' => DeliveryLog::where('status', 'out')
                ->whereDate('delivery_out', $today)
                ->count(),
            'dispatched_today' => DeliveryLog::whereDate('delivery_out', $today)->count(),
            'returned_today' => DeliveryLog::whereDate('returned_at', $today)->count(),
            'missing_items' => $missingItems,
            'short_deliveries' => $shortDeliveries,
            'recent' => $recentDeliveries,
        ];

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'trend' => $trend,
            'sparks' => $sparks,
            'recentVisitors' => $recent,
            'activity' => $activity,
            'byPurpose' => $byPurpose,
            'onsiteSummary' => [
                'on_site' => $stats['on_site'],
                'longest_minutes' => (int) $longest,
                'avg_minutes' => $avg,
            ],
            'delivery' => $delivery,
        ]);
    }
}
