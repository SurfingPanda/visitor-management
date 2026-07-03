<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Check-in/out is the supplier's site arrival/departure — one per delivery,
        // not per item.
        Schema::table('supplier_deliveries', function (Blueprint $table) {
            // nullable so MariaDB doesn't attach ON UPDATE CURRENT_TIMESTAMP.
            $table->dateTime('checked_in_at')->nullable()->after('delivery_date');
            $table->dateTime('checked_out_at')->nullable()->after('checked_in_at');
        });

        Schema::table('supplier_delivery_items', function (Blueprint $table) {
            $table->dropColumn(['checked_in_at', 'checked_out_at']);
        });
    }

    public function down(): void
    {
        Schema::table('supplier_deliveries', function (Blueprint $table) {
            $table->dropColumn(['checked_in_at', 'checked_out_at']);
        });

        Schema::table('supplier_delivery_items', function (Blueprint $table) {
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('checked_out_at')->nullable();
        });
    }
};
