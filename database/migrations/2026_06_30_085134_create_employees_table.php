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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('biometric_device_id')->nullable()->constrained()->nullOnDelete();
            $table->string('device_pin')->unique();   // enrolled device user id
            $table->string('name');
            $table->unsignedTinyInteger('role')->default(0);
            $table->enum('status', ['checked_in', 'checked_out'])->default('checked_out')->index();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
