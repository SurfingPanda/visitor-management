<?php

namespace App\Http\Controllers;

use App\Models\BiometricDevice;
use App\Services\BiometricSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class BiometricDeviceController extends Controller
{
    /**
     * Pull attendance events from the device and update employee / visitor
     * presence (matched by device PIN).
     *
     * Note: reading the full attendance log over UDP can take minutes. For a
     * hands-off refresh, run `php artisan biometric:sync` (optionally on a
     * schedule) instead of relying on this request.
     */
    public function sync(BiometricDevice $biometricDevice, BiometricSyncService $sync): JsonResponse
    {
        @set_time_limit(0);

        try {
            $summary = $sync->sync($biometricDevice);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Could not reach device: '.$e->getMessage(),
            ]);
        }

        $parts = [];
        if ($summary['employees']) {
            $parts[] = "{$summary['employees']} employee(s) synced";
        }
        $parts[] = $summary['new'] === 0
            ? 'no new attendance events'
            : "{$summary['new']} new event(s)"
                .(count($summary['unmatched_pins']) ? ', '.count($summary['unmatched_pins']).' unmatched' : '');
        $parts[] = "{$summary['on_site']} on-site now";

        return response()->json([
            'ok' => true,
            'pulled' => $summary['pulled'],
            'new' => $summary['new'],
            'employees' => $summary['employees'],
            'on_site' => $summary['on_site'],
            'checked_in_today' => $summary['checked_in_today'],
            'checked_out_today' => $summary['checked_out_today'],
            'unmatched_pins' => $summary['unmatched_pins'],
            'device' => $summary['device'],
            'message' => 'Connected — '.implode('; ', $parts).'.',
            'last_synced_at' => now()->toTimeString(),
        ]);
    }

    /**
     * Check whether the device is reachable on the network.
     * Prefers a TCP connect to the configured port; falls back to ICMP ping.
     */
    public function test(BiometricDevice $biometricDevice): JsonResponse
    {
        $start = microtime(true);
        $reachable = false;
        $detail = '';

        if ($biometricDevice->port) {
            $errno = 0;
            $errstr = '';
            $conn = @fsockopen(
                $biometricDevice->ip_address,
                $biometricDevice->port,
                $errno,
                $errstr,
                3,
            );

            if ($conn) {
                $reachable = true;
                fclose($conn);
            } else {
                $detail = $errstr ?: 'Connection refused or timed out';
            }
        } else {
            $ip = escapeshellarg($biometricDevice->ip_address);
            $cmd = PHP_OS_FAMILY === 'Windows'
                ? "ping -n 1 -w 3000 {$ip}"
                : "ping -c 1 -W 3 {$ip}";

            @exec($cmd, $output, $code);
            $reachable = $code === 0;
            $detail = $reachable ? '' : 'Host did not respond to ping';
        }

        $ms = (int) round((microtime(true) - $start) * 1000);

        return response()->json([
            'reachable' => $reachable,
            'latency_ms' => $ms,
            'message' => $reachable
                ? "Reachable in {$ms} ms"
                : ($detail ?: 'Unreachable'),
            'checked_at' => now()->toTimeString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'ip_address' => ['required', 'ip', Rule::unique('biometric_devices', 'ip_address')],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        BiometricDevice::create([
            ...$validated,
            'is_active' => true,
        ]);

        return back()->with('success', "Device “{$validated['name']}” added.");
    }

    public function update(Request $request, BiometricDevice $biometricDevice): RedirectResponse
    {
        $biometricDevice->update([
            'is_active' => $request->boolean('is_active'),
        ]);

        return back()->with(
            'success',
            "{$biometricDevice->name} ".($biometricDevice->is_active ? 'enabled.' : 'disabled.')
        );
    }

    public function destroy(BiometricDevice $biometricDevice): RedirectResponse
    {
        $name = $biometricDevice->name;
        $biometricDevice->delete();

        return back()->with('success', "Device “{$name}” removed.");
    }
}
