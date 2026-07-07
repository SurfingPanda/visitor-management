<?php

namespace App\Support;

/**
 * Single source of truth for grantable access modules.
 *
 * Each module maps to the route-name prefixes it gates. Dashboard, Settings,
 * Profile and Team (admin-only) are intentionally NOT here — Dashboard is the
 * shared landing page, and the others are governed separately.
 */
class Modules
{
    /**
     * Each entry maps a module to the route-name prefixes it gates. An optional
     * `writePrefixes` list marks the routes that mutate data: for such modules
     * the plain grant is view-only, and a separate write grant is required to
     * reach those routes. Modules without `writePrefixes` are all-or-nothing
     * (a grant means full read+write, unchanged).
     *
     * @var array<string, array{label: string, prefixes: list<string>, writePrefixes?: list<string>}>
     */
    public const LIST = [
        'reports' => [
            'label' => 'Reports',
            'prefixes' => ['reports.'],
        ],
        'front_desk' => [
            'label' => 'Front Desk (Visitors, Scan, Badges)',
            'prefixes' => ['visitors.', 'badges.', 'visitor-requests.'],
        ],
        'incidents' => [
            'label' => 'Incident & Accident Reports',
            'prefixes' => ['incident-reports.', 'emergency-roster.'],
            'writePrefixes' => ['incident-reports.store', 'incident-reports.update'],
        ],
        'delivery_logs' => [
            'label' => 'Delivery Log',
            'prefixes' => ['delivery-logs.'],
        ],
        'supplier_deliveries' => [
            'label' => 'Supplier Delivery',
            'prefixes' => ['supplier-deliveries.'],
        ],
        'vehicles' => [
            'label' => 'Vehicles',
            'prefixes' => ['vehicles.', 'trips.'],
        ],
        'drivers' => [
            'label' => 'Drivers',
            'prefixes' => ['drivers.'],
        ],
        'helpers' => [
            'label' => 'Helpers',
            'prefixes' => ['helpers.'],
        ],
        'equipment' => [
            'label' => 'Equipment Inventory',
            'prefixes' => ['equipment.'],
        ],
        'scrap_disposal' => [
            'label' => 'Scrap Disposal',
            'prefixes' => ['scrap-disposals.'],
        ],
    ];

    /**
     * All module keys.
     *
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::LIST);
    }

    /**
     * Module keys that split view vs write (i.e. declare `writePrefixes`).
     *
     * @return list<string>
     */
    public static function writableKeys(): array
    {
        $out = [];
        foreach (self::LIST as $key => $def) {
            if (! empty($def['writePrefixes'])) {
                $out[] = $key;
            }
        }

        return $out;
    }

    /**
     * Key + label pairs for the UI. `writable` flags modules that expose a
     * separate write grant on top of view access.
     *
     * @return list<array{key: string, label: string, writable: bool}>
     */
    public static function options(): array
    {
        $out = [];
        foreach (self::LIST as $key => $def) {
            $out[] = [
                'key' => $key,
                'label' => $def['label'],
                'writable' => ! empty($def['writePrefixes']),
            ];
        }

        return $out;
    }

    /**
     * Which module (if any) a route name belongs to.
     */
    public static function forRoute(?string $routeName): ?string
    {
        if (! $routeName) {
            return null;
        }

        foreach (self::LIST as $key => $def) {
            foreach ($def['prefixes'] as $prefix) {
                if (str_starts_with($routeName, $prefix)) {
                    return $key;
                }
            }
        }

        return null;
    }

    /**
     * Which module (if any) a route mutates — i.e. requires write access for.
     * Returns null for read routes and for modules without a view/write split.
     */
    public static function forWriteRoute(?string $routeName): ?string
    {
        if (! $routeName) {
            return null;
        }

        foreach (self::LIST as $key => $def) {
            foreach ($def['writePrefixes'] ?? [] as $prefix) {
                if (str_starts_with($routeName, $prefix)) {
                    return $key;
                }
            }
        }

        return null;
    }
}
