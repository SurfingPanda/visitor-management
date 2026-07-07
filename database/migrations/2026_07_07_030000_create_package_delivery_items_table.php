<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A drop-off can now hold several parcels; each keeps its own tracking
        // number, courier, and sender. Recipient/rider/signature stay on the
        // parent since the whole batch is handed over (and signed for) at once.
        Schema::create('package_delivery_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_delivery_id')->constrained()->cascadeOnDelete();
            $table->string('tracking_number')->nullable();
            $table->string('courier')->nullable();
            $table->string('sender')->nullable();
            $table->timestamps();
        });

        // Migrate each existing single-parcel record into one item so nothing
        // is lost when the per-parcel columns are dropped below.
        $now = now();
        DB::table('package_deliveries')
            ->select('id', 'courier', 'tracking_number', 'sender')
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($now) {
                $items = $rows->map(fn ($r) => [
                    'package_delivery_id' => $r->id,
                    'tracking_number' => $r->tracking_number,
                    'courier' => $r->courier,
                    'sender' => $r->sender,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                if ($items) {
                    DB::table('package_delivery_items')->insert($items);
                }
            });

        Schema::table('package_deliveries', function (Blueprint $table) {
            $table->dropColumn(['courier', 'tracking_number', 'sender']);
        });
    }

    public function down(): void
    {
        Schema::table('package_deliveries', function (Blueprint $table) {
            $table->string('courier')->nullable()->after('id');
            $table->string('tracking_number')->nullable()->after('rider_name');
            $table->string('sender')->nullable()->after('recipient_department');
        });

        // Best-effort restore: fold the first item back onto the parent.
        DB::table('package_delivery_items')
            ->orderBy('package_delivery_id')
            ->orderBy('id')
            ->get()
            ->groupBy('package_delivery_id')
            ->each(function ($items, $deliveryId) {
                $first = $items->first();
                DB::table('package_deliveries')->where('id', $deliveryId)->update([
                    'courier' => $first->courier,
                    'tracking_number' => $first->tracking_number,
                    'sender' => $first->sender,
                ]);
            });

        Schema::dropIfExists('package_delivery_items');
    }
};
