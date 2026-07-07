<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            // Where approval/decline notifications are sent. Nullable so existing
            // rows (and any created before this field) remain valid.
            $table->string('email')->nullable()->after('contact_person');
        });
    }

    public function down(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
