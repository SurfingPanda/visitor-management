<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            // The appointment date the visitor intends to come. The issued badge
            // is valid up to and including this day, then the QR expires.
            $table->date('visit_date')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->dropColumn('visit_date');
        });
    }
};
