<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_deliveries', function (Blueprint $table) {
            $table->id();
            $table->string('courier')->nullable();          // e.g. J&T, LBC, Grab
            $table->string('rider_name')->nullable();        // delivery rider who dropped it off
            $table->string('tracking_number')->nullable();   // package / tracking no.
            $table->string('recipient_name');                // employee the parcel is for
            $table->string('recipient_department')->nullable();
            $table->string('sender')->nullable();
            $table->string('notes')->nullable();
            $table->string('status')->default('pending');    // pending | received

            // Nullable dateTime (not timestamp) to dodge MariaDB's ON UPDATE trap.
            $table->dateTime('received_at')->nullable();
            $table->string('received_by_name')->nullable();  // who actually signed for it
            $table->string('received_signature_path')->nullable(); // private disk

            $table->foreignId('logged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('logger_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_deliveries');
    }
};
