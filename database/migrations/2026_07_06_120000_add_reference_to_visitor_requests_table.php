<?php

use App\Models\VisitorRequest;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replace the guessable sequential reference (derived from the id) with a
     * stored random, unguessable code so visitors can't enumerate other
     * requests via the public status lookup.
     */
    public function up(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->string('reference')->nullable()->unique()->after('id');
        });

        // Backfill existing rows with random codes.
        VisitorRequest::whereNull('reference')->get()->each(function (VisitorRequest $r) {
            $r->reference = VisitorRequest::generateReference();
            $r->save();
        });
    }

    public function down(): void
    {
        Schema::table('visitor_requests', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
        });
    }
};
