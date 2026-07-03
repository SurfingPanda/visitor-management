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
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->string('destination');
            $table->string('purpose')->nullable();
            $table->string('driver_name')->nullable();
            // All timestamp columns are nullable to avoid MariaDB's implicit
            // ON UPDATE CURRENT_TIMESTAMP on the first NOT NULL timestamp.
            $table->dateTime('departure_at')->nullable();
            $table->dateTime('return_at')->nullable();
            $table->string('status')->default('scheduled'); // scheduled|ongoing|completed|cancelled
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
        Schema::dropIfExists('trips');
    }
};
