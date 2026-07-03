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
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('price', 12, 2)->nullable();
            $table->string('image_path')->nullable();
            $table->string('status')->default('in_stock'); // in_stock | disposed
            $table->string('disposed_by')->nullable();
            $table->string('approved_by')->nullable();
            // nullable so MariaDB doesn't attach ON UPDATE CURRENT_TIMESTAMP.
            $table->date('disposed_at')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('registrant_name')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
