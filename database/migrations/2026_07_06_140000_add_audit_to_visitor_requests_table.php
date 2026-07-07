<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Strengthen the audit trail: link approve/decline actions to the
     * authenticated user who performed them, and capture a decline reason.
     */
    public function up(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->foreignId('approved_by')->nullable()->after('approver_signature_path')->constrained('users')->nullOnDelete();
            $table->foreignId('declined_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            $table->string('decline_reason')->nullable()->after('declined_by');
        });
    }

    public function down(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropConstrainedForeignId('declined_by');
            $table->dropColumn('decline_reason');
        });
    }
};
