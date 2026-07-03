<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\BiometricDevice;
use App\Models\Employee;
use App\Models\Visitor;
use Illuminate\Support\Carbon;

class BiometricSyncService
{
    public function __construct(private ZktecoService $zk) {}

    /**
     * Pull a device, ingest any new attendance punches, and recompute who is
     * currently on-site. Returns a summary for display.
     *
     * Reading the whole attendance log over UDP can take minutes, so this is
     * meant to run without an execution-time limit (CLI command or a long
     * admin request).
     *
     * @return array{device: ?string, pulled: int, new: int, employees: int, on_site: int, checked_in_today: int, checked_out_today: int, unmatched_pins: array<int, string>}
     */
    public function sync(BiometricDevice $device, int $timeout = 120): array
    {
        @set_time_limit(0);

        $result = $this->zk->setTimeout($timeout)->pull($device);

        $imported = $this->importEmployees($device, $result['users'] ?? []);

        $records = $result['attendance'] ?? [];
        // Process oldest first so a day's punches read in order.
        usort($records, fn ($a, $b) => strcmp($a['timestamp'], $b['timestamp']));

        $new = 0;
        $unmatched = [];

        foreach ($records as $rec) {
            $pin = (string) $rec['id'];
            $recordedAt = $rec['timestamp'];

            $log = AttendanceLog::firstOrNew([
                'biometric_device_id' => $device->id,
                'pin' => $pin,
                'recorded_at' => $recordedAt,
            ]);

            if ($log->exists) {
                continue; // already ingested on a previous sync
            }

            $new++;
            $log->state = $rec['state'] ?? null;
            $log->type = $rec['type'] ?? null;

            // An enrolled employee takes priority over a visitor mapping.
            $employee = Employee::where('device_pin', $pin)->first();
            if ($employee) {
                $log->employee_id = $employee->id;
                $log->action = 'punch'; // in/out is derived per-day in recompute
            } else {
                $visitor = Visitor::where('device_pin', $pin)->first();
                if ($visitor) {
                    $log->visitor_id = $visitor->id;
                    // Visitors keep the simple toggle behaviour.
                    if ($visitor->status === 'checked_in') {
                        $visitor->recordCheckOut(Carbon::parse($recordedAt));
                        $log->action = 'checked_out';
                    } else {
                        $visitor->recordCheckIn(Carbon::parse($recordedAt));
                        $log->action = 'checked_in';
                    }
                } else {
                    $log->action = 'unmatched';
                    $unmatched[$pin] = true;
                }
            }

            $log->save();
        }

        $presence = $this->recomputeEmployeePresence();

        $device->update([
            'last_synced_at' => now(),
            'model' => $result['name'] ?? $device->model,
            'serial_number' => $result['serial'] ?? $device->serial_number,
        ]);

        return [
            'device' => $result['name'] ?? $device->name,
            'pulled' => count($records),
            'new' => $new,
            'employees' => $imported,
            'on_site' => $presence['on_site'],
            'checked_in_today' => $presence['checked_in_today'],
            'checked_out_today' => $presence['checked_out_today'],
            'unmatched_pins' => array_keys($unmatched),
        ];
    }

    /** Punch types the device uses for entry (check-in, overtime-in). */
    private const IN_TYPES = [0, 4];

    /**
     * Recompute each employee's on-site status from today's punches.
     *
     * The device records the direction of each punch in its `type` field
     * (0 = check-in, 1 = check-out, 4/5 = overtime in/out), so presence is
     * driven by the direction of the employee's latest punch today rather than
     * by guessing from parity. Device clock-glitch punches dated on other days
     * (e.g. year 2033) fall outside "today" and are excluded; presence does not
     * carry across days.
     *
     * @return array{on_site: int, checked_in_today: int, checked_out_today: int}
     */
    public function recomputeEmployeePresence(): array
    {
        // Device timestamps are in the device's local time; compare on the date
        // only (not against Carbon::now(), which is UTC and would drop the
        // afternoon's punches).
        $today = Carbon::today();

        $punchesByEmployee = AttendanceLog::query()
            ->whereNotNull('employee_id')
            ->whereDate('recorded_at', $today)
            ->orderBy('recorded_at')
            ->get(['employee_id', 'recorded_at', 'type'])
            ->groupBy('employee_id');

        $onSiteIds = [];
        $checkedInToday = 0;
        $checkedOutToday = 0;

        foreach ($punchesByEmployee as $employeeId => $punches) {
            $lastIn = null;
            $lastOut = null;
            foreach ($punches as $punch) {
                if (in_array((int) $punch->type, self::IN_TYPES, true)) {
                    $lastIn = $punch->recorded_at;
                } else {
                    $lastOut = $punch->recorded_at;
                }
            }

            $onSite = in_array((int) $punches->last()->type, self::IN_TYPES, true);

            Employee::whereKey($employeeId)->update([
                'status' => $onSite ? 'checked_in' : 'checked_out',
                'checked_in_at' => $lastIn,
                'checked_out_at' => $lastOut,
            ]);

            if ($lastIn) {
                $checkedInToday++;
            }
            if ($lastOut) {
                $checkedOutToday++;
            }
            if ($onSite) {
                $onSiteIds[] = $employeeId;
            }
        }

        // Reset anyone still flagged on-site who did not check in today.
        Employee::where('status', 'checked_in')
            ->when($onSiteIds, fn ($q) => $q->whereNotIn('id', $onSiteIds))
            ->update(['status' => 'checked_out']);

        return [
            'on_site' => count($onSiteIds),
            'checked_in_today' => $checkedInToday,
            'checked_out_today' => $checkedOutToday,
        ];
    }

    /**
     * Create or refresh Employee records from the device's enrolled users.
     *
     * @param  array<int, array>  $users
     */
    private function importEmployees(BiometricDevice $device, array $users): int
    {
        $count = 0;

        foreach ($users as $user) {
            $pin = trim((string) ($user['userid'] ?? ''));
            $name = trim((string) ($user['name'] ?? ''));

            if ($pin === '') {
                continue;
            }

            $employee = Employee::firstOrNew(['device_pin' => $pin]);
            $employee->name = $name !== '' ? $name : ('User '.$pin);
            $employee->role = (int) ($user['role'] ?? 0);
            $employee->biometric_device_id = $device->id;
            $employee->is_active = true;

            if (! $employee->exists) {
                $employee->status = 'checked_out';
            }

            $employee->save();
            $count++;
        }

        return $count;
    }
}
