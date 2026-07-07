<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Self-service visitation requests submitted from the public /visit page.
     * A request stays "pending" until front-desk staff approve it (which
     * promotes it to an actual expected Visitor) or decline it.
     */
    public function up(): void
    {
        Schema::create('visitor_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact_person'); // The Eljin person being visited.
            $table->string('company')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('status')->default('pending'); // pending | approved | declined
            $table->foreignId('visitor_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_requests');
    }
};
