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
        Schema::table('visits', function (Blueprint $table) {
            // Per-visit arrival photos captured at check-in. Both optional and
            // purged when the visitor checks out.
            $table->string('photo_path')->nullable()->after('purpose');
            $table->string('id_photo_path')->nullable()->after('photo_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['photo_path', 'id_photo_path']);
        });
    }
};
