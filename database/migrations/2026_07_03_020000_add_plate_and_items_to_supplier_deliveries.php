<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_deliveries', function (Blueprint $table) {
            $table->string('plate_number')->nullable()->after('supplier_name');
            // Superseded by line items below.
            $table->dropColumn(['item_description', 'quantity']);
        });

        Schema::create('supplier_delivery_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_delivery_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('quantity')->default(1);
            // nullable so MariaDB doesn't attach ON UPDATE CURRENT_TIMESTAMP.
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('checked_out_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_delivery_items');

        Schema::table('supplier_deliveries', function (Blueprint $table) {
            $table->dropColumn('plate_number');
            $table->string('item_description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
        });
    }
};
