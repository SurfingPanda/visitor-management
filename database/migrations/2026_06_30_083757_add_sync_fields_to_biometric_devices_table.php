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
        Schema::table('biometric_devices', function (Blueprint $table) {
            $table->string('model')->nullable()->after('location');
            $table->string('serial_number')->nullable()->after('model');
            $table->timestamp('last_synced_at')->nullable()->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('biometric_devices', function (Blueprint $table) {
            $table->dropColumn(['model', 'serial_number', 'last_synced_at']);
        });
    }
};
