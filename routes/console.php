<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Keep visitor requests tidy: decline stale pendings, purge old rows + signatures.
Schedule::command('visitor-requests:prune')->dailyAt('02:00');
