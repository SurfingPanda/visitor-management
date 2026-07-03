<?php

namespace App\Console\Commands;

use App\Models\BiometricDevice;
use App\Services\BiometricSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncBiometricDevices extends Command
{
    protected $signature = 'biometric:sync
        {device? : Device id to sync (defaults to all active devices)}
        {--timeout=120 : Socket receive timeout in seconds}';

    protected $description = 'Pull attendance from biometric device(s) and update on-site status';

    public function handle(BiometricSyncService $sync): int
    {
        $devices = $this->argument('device')
            ? BiometricDevice::whereKey($this->argument('device'))->get()
            : BiometricDevice::where('is_active', true)->get();

        if ($devices->isEmpty()) {
            $this->warn('No matching active devices.');

            return self::SUCCESS;
        }

        $timeout = (int) $this->option('timeout');
        $failed = false;

        foreach ($devices as $device) {
            $this->info("Syncing {$device->name} ({$device->ip_address}) — this can take a few minutes…");

            try {
                $s = $sync->sync($device, $timeout);
            } catch (Throwable $e) {
                $this->error("  Failed: {$e->getMessage()}");
                $failed = true;

                continue;
            }

            $this->line("  Pulled {$s['pulled']} punch(es), {$s['new']} new; {$s['employees']} employee(s) refreshed.");
            $this->line("  On-site now: {$s['on_site']} | In today: {$s['checked_in_today']} | Out today: {$s['checked_out_today']}");
            if ($s['unmatched_pins']) {
                $this->warn('  Unmatched PINs: '.implode(', ', $s['unmatched_pins']));
            }
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
