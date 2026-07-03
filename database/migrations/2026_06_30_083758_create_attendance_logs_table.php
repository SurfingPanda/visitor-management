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
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('biometric_device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('visitor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('pin');
            // Nullable to avoid MySQL's implicit ON UPDATE CURRENT_TIMESTAMP.
            $table->timestamp('recorded_at')->nullable();
            $table->unsignedTinyInteger('state')->nullable();
            $table->unsignedTinyInteger('type')->nullable();
            $table->string('action')->nullable(); // checked_in | checked_out | unmatched
            $table->timestamps();

            // Each device event is processed once.
            $table->unique(['biometric_device_id', 'pin', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
