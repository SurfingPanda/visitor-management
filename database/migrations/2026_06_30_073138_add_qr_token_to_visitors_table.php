<?php

use App\Models\Visitor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->string('qr_token', 40)->nullable()->unique()->after('badge_number');
        });

        // Backfill tokens for any existing visitors.
        Visitor::whereNull('qr_token')->get()->each(function (Visitor $visitor) {
            $visitor->update(['qr_token' => (string) Str::ulid()]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
            $table->dropColumn('qr_token');
        });
    }
};
