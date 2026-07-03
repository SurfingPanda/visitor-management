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
        Schema::create('scrap_disposals', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no')->nullable();
            $table->string('item');
            $table->string('category')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit')->nullable();
            $table->date('disposal_date')->nullable();
            $table->string('method')->default('discarded'); // sold | recycled | hauled | discarded
            $table->string('recipient')->nullable();         // buyer / hauler
            $table->decimal('amount', 12, 2)->nullable();    // value recovered if sold
            $table->string('notes')->nullable();
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
        Schema::dropIfExists('scrap_disposals');
    }
};
