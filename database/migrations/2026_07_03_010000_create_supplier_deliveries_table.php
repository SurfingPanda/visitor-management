<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('supplier_deliveries', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_name');
            $table->string('dr_number')->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('item_description')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('received_by')->nullable();
            $table->string('status')->default('pending'); // pending | received
            $table->string('notes')->nullable();
            $table->string('dr_image_path')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorder_name')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_deliveries');
    }
};
