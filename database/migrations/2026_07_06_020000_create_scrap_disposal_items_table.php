<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scrap_disposal_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scrap_disposal_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('name');
            $table->integer('quantity')->default(0);
            $table->string('uom')->nullable();
            $table->timestamps();
        });

        // Migrate each existing single-item disposal into one child row so no
        // data is lost when the item columns are dropped below.
        DB::table('scrap_disposals')->orderBy('id')->each(function ($d) {
            DB::table('scrap_disposal_items')->insert([
                'scrap_disposal_id' => $d->id,
                'name' => $d->item,
                'quantity' => $d->quantity ?? 0,
                'uom' => $d->unit,
                'created_at' => $d->created_at,
                'updated_at' => $d->updated_at,
            ]);
        });

        Schema::table('scrap_disposals', function (Blueprint $table) {
            $table->dropColumn(['item', 'quantity', 'unit']);
        });
    }

    public function down(): void
    {
        Schema::table('scrap_disposals', function (Blueprint $table) {
            $table->string('item')->nullable()->after('reference_no');
            $table->integer('quantity')->default(0)->after('category');
            $table->string('unit')->nullable()->after('quantity');
        });

        // Fold the first item of each disposal back into the parent columns.
        DB::table('scrap_disposal_items')
            ->orderBy('scrap_disposal_id')
            ->orderBy('id')
            ->get()
            ->groupBy('scrap_disposal_id')
            ->each(function ($items, $disposalId) {
                $first = $items->first();
                DB::table('scrap_disposals')->where('id', $disposalId)->update([
                    'item' => $first->name,
                    'quantity' => $first->quantity,
                    'unit' => $first->uom,
                ]);
            });

        Schema::dropIfExists('scrap_disposal_items');
    }
};
