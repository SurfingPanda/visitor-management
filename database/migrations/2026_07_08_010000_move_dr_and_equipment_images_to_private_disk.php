<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Supplier DR images and equipment images/asset-forms used to live on the
 * world-readable `public` disk. They can contain sensitive business info
 * (receipts, prices, signatures), so they're moving to the private `local`
 * disk behind gated streaming routes. Relocate any existing files so they
 * keep resolving after the change.
 */
return new class extends Migration
{
    /** table => image path columns */
    private array $map = [
        'supplier_deliveries' => ['dr_image_path'],
        'equipment' => ['image_path', 'asset_form_image_path'],
    ];

    public function up(): void
    {
        $this->relocate('public', 'local');
    }

    public function down(): void
    {
        $this->relocate('local', 'public');
    }

    private function relocate(string $from, string $to): void
    {
        foreach ($this->map as $table => $columns) {
            foreach (DB::table($table)->get($columns) as $row) {
                foreach ($columns as $col) {
                    $path = $row->{$col} ?? null;
                    if ($path
                        && Storage::disk($from)->exists($path)
                        && ! Storage::disk($to)->exists($path)) {
                        Storage::disk($to)->put($path, Storage::disk($from)->get($path));
                        Storage::disk($from)->delete($path);
                    }
                }
            }
        }
    }
};
