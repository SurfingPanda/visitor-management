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
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['incident', 'accident'])
                ->default('incident')
                ->index();
            $table->string('title');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])
                ->default('low')
                ->index();
            $table->string('location')->nullable();
            $table->string('people_involved')->nullable();
            $table->text('description');
            $table->text('action_taken')->nullable();
            $table->json('categories')->nullable(); // classification checkboxes
            $table->enum('status', ['open', 'under_review', 'resolved'])
                ->default('open')
                ->index();
            // Nullable timestamp — avoids the MariaDB "first NOT-NULL timestamp
            // gets ON UPDATE CURRENT_TIMESTAMP" gotcha.
            $table->timestamp('occurred_at')->nullable();
            $table->foreignId('reported_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('reporter_name')->nullable(); // snapshot at time of filing
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};
