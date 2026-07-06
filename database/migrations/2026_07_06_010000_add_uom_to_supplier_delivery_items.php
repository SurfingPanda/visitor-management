<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_delivery_items', function (Blueprint $table) {
            // Unit of measure (pcs, box, kg, L, …) captured per line item.
            $table->string('uom')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_delivery_items', function (Blueprint $table) {
            $table->dropColumn('uom');
        });
    }
};
