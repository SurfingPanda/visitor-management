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
     * @var array<string, array{label: string, prefixes: list<string>}>
     */
    public const LIST = [
        'reports' => [
            'label' => 'Reports',
            'prefixes' => ['reports.'],
        ],
        'front_desk' => [
            'label' => 'Front Desk (Visitors, Scan, Badges)',
            'prefixes' => ['visitors.', 'badges.'],
        ],
        'incidents' => [
            'label' => 'Incident & Accident Reports',
            'prefixes' => ['incident-reports.', 'emergency-roster.'],
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
     * Key + label pairs for the UI.
     *
     * @return list<array{key: string, label: string}>
     */
    public static function options(): array
    {
        $out = [];
        foreach (self::LIST as $key => $def) {
            $out[] = ['key' => $key, 'label' => $def['label']];
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
}
