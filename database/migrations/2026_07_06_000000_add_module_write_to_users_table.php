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
        Schema::table('users', function (Blueprint $table) {
            // Subset of granted modules a non-admin may also write to (create/
            // edit). Only meaningful for modules that split view vs write
            // (see App\Support\Modules writePrefixes). Admins bypass this.
            $table->json('module_write')->nullable()->after('module_access');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('module_write');
        });
    }
};
