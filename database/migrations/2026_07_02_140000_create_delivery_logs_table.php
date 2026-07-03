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
        Schema::create('delivery_logs', function (Blueprint $table) {
            $table->id();
            $table->string('plate_number');               // vehicle plate
            $table->string('route')->nullable();          // delivery route
            $table->string('driver')->nullable();         // driver / dispatcher
            $table->string('helper')->nullable();
            // Load counts going out.
            $table->unsignedInteger('crates_big')->default(0);
            $table->unsignedInteger('crates_small')->default(0);
            $table->unsignedInteger('box')->default(0);
            $table->unsignedInteger('bin')->default(0);
            $table->unsignedInteger('empanada_box')->default(0);
            $table->unsignedInteger('trolley')->default(0);
            $table->enum('status', ['out', 'returned'])
                ->default('out')
                ->index();
            // Nullable timestamps to avoid MariaDB's implicit ON UPDATE CURRENT_TIMESTAMP.
            $table->timestamp('delivery_out')->nullable(); // dispatch time
            $table->timestamp('returned_at')->nullable();
            $table->string('returned_remarks')->nullable();
            $table->foreignId('logged_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('logger_name')->nullable();    // snapshot of the staff who logged it
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_logs');
    }
};
