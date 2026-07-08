<?php

namespace App\Http\Middleware;

use App\Models\DeliveryLog;
use App\Models\IncidentReport;
use App\Models\PackageDelivery;
use App\Models\SupplierDelivery;
use App\Models\User;
use App\Models\VisitorRequest;
use App\Support\Modules;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                // Effective module keys the current user can reach (all for admins).
                'modules' => $request->user()
                    ? ($request->user()->is_admin
                        ? Modules::keys()
                        : ($request->user()->module_access ?? []))
                    : [],
                // Modules the current user may write to (all writable ones for
                // admins). Read routes ignore this; write-gated pages use it to
                // hide create/edit controls.
                'moduleWrite' => $request->user()
                    ? ($request->user()->is_admin
                        ? Modules::writableKeys()
                        : ($request->user()->module_write ?? []))
                    : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            // Per-module "needs attention" counts for the sidebar badges. Only
            // computed for modules the user can reach; zero counts are dropped
            // so the frontend shows a badge only when there's a backlog.
            'navBadges' => $request->user() ? $this->navBadges($request->user()) : [],
        ];
    }

    /**
     * Pending / action-needed counts keyed by sidebar badge id.
     *
     * @return array<string, int>
     */
    private function navBadges(User $user): array
    {
        $badges = [];

        if ($user->canAccessModule('front_desk')) {
            $badges['requests'] = VisitorRequest::where('status', 'pending')->count();
            $badges['packages'] = PackageDelivery::where('status', 'pending')->count();
        }

        if ($user->canAccessModule('supplier_deliveries')) {
            $badges['supplier_deliveries'] = SupplierDelivery::where('status', 'checked_in')->count();
        }

        if ($user->canAccessModule('delivery_logs')) {
            $badges['delivery_logs'] = DeliveryLog::where('status', 'out')->count();
        }

        if ($user->canAccessModule('incidents')) {
            $badges['incidents'] = IncidentReport::where('status', 'open')->count();
        }

        // Drop zeros — a badge only shows when there's something to act on.
        return array_filter($badges);
    }
}
