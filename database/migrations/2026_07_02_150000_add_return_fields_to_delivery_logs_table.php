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
        Schema::table('delivery_logs', function (Blueprint $table) {
            // Arrival back at plant + the load that came back.
            $table->timestamp('arrival_plant')->nullable()->after('returned_at');
            $table->unsignedInteger('ret_crates_big')->default(0)->after('arrival_plant');
            $table->unsignedInteger('ret_crates_small')->default(0)->after('ret_crates_big');
            $table->unsignedInteger('ret_box')->default(0)->after('ret_crates_small');
            $table->unsignedInteger('ret_bin')->default(0)->after('ret_box');
            $table->unsignedInteger('ret_empanada_box')->default(0)->after('ret_bin');
            $table->unsignedInteger('ret_trolley')->default(0)->after('ret_empanada_box');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_logs', function (Blueprint $table) {
            $table->dropColumn([
                'arrival_plant',
                'ret_crates_big',
                'ret_crates_small',
                'ret_box',
                'ret_bin',
                'ret_empanada_box',
                'ret_trolley',
            ]);
        });
    }
};
