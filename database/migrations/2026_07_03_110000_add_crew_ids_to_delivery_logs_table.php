<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('delivery_logs', function (Blueprint $table) {
            // Link a log to registered crew where possible; the existing
            // driver/helper name strings stay as the display snapshot so old
            // rows and ad-hoc (unregistered) names are never lost.
            $table->foreignId('driver_id')->nullable()->after('helper')
                ->constrained('drivers')->nullOnDelete();
            $table->foreignId('helper_id')->nullable()->after('driver_id')
                ->constrained('helpers')->nullOnDelete();
        });

        // Best-effort backfill: link historical logs to a registry row when the
        // name matches exactly and is unambiguous (only one person by that name).
        $this->backfill('delivery_logs', 'driver', 'driver_id', 'drivers');
        $this->backfill('delivery_logs', 'helper', 'helper_id', 'helpers');
    }

    /**
     * Set <fkColumn> on <logTable> for each row whose <nameColumn> matches
     * exactly one row in <registryTable>.name.
     */
    private function backfill(string $logTable, string $nameColumn, string $fkColumn, string $registryTable): void
    {
        $names = DB::table($logTable)
            ->whereNotNull($nameColumn)
            ->where($nameColumn, '!=', '')
            ->distinct()
            ->pluck($nameColumn);

        foreach ($names as $name) {
            $ids = DB::table($registryTable)->where('name', $name)->pluck('id');

            // Only link when the name resolves to a single registry row.
            if ($ids->count() === 1) {
                DB::table($logTable)
                    ->where($nameColumn, $name)
                    ->update([$fkColumn => $ids->first()]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('driver_id');
            $table->dropConstrainedForeignId('helper_id');
        });
    }
};
