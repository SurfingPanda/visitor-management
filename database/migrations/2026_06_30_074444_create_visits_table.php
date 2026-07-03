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
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visitor_id')->constrained()->cascadeOnDelete();
            $table->string('host');                  // snapshot at time of visit
            $table->string('purpose')->nullable();
            // Nullable so MySQL does NOT add an implicit
            // "ON UPDATE CURRENT_TIMESTAMP" to the first timestamp column.
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->timestamps();

            $table->index(['visitor_id', 'checked_in_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
