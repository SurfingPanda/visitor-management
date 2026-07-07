<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Captured when a staff member approves a request: their name and a drawn
     * signature, shown on the issued visitor pass alongside the QR code.
     */
    public function up(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->string('approver_name')->nullable()->after('status');
            $table->string('approver_signature_path')->nullable()->after('approver_name');
        });
    }

    public function down(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->dropColumn(['approver_name', 'approver_signature_path']);
        });
    }
};
