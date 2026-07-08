<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            // Appointment date carried over from the approved request. The badge
            // QR is valid through this day; a scan afterwards is rejected as
            // expired. Null (walk-ins registered at the desk) never expires.
            $table->date('visit_date')->nullable()->after('purpose');
        });
    }

    public function down(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->dropColumn('visit_date');
        });
    }
};
