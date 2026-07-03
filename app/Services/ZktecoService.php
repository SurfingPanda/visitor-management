<?php

namespace App\Services;

use App\Models\BiometricDevice;
use RuntimeException;

class ZktecoService
{
    /**
     * @param  int  $timeout  Seconds to wait for the device to respond.
     */
    public function __construct(private int $timeout = 5) {}

    /**
     * Override the socket receive timeout. Pulling a full attendance log over
     * UDP can take much longer than a reachability check, so callers that read
     * attendance should raise this well above the default.
     */
    public function setTimeout(int $seconds): self
    {
        $this->timeout = max(1, $seconds);

        return $this;
    }

    /**
     * Connect to a device (over TCP) and pull its attendance log + identity.
     *
     * TCP is used instead of the library's UDP because large attendance logs
     * (multiple MB) drop packets over UDP and never transfer completely.
     *
     * @return array{name: ?string, serial: ?string, time: ?string, users: array<int, array>, attendance: array<int, array>}
     */
    public function pull(BiometricDevice $device): array
    {
        $zk = new TcpZkClient(
            $device->ip_address,
            $device->port ?: 4370,
            $this->timeout,
        );

        if (! $zk->connect()) {
            throw new RuntimeException('No response from the device on TCP '.($device->port ?: 4370).'.');
        }

        try {
            $users = array_map(function (array $u) {
                $u['name'] = $this->utf8($u['name'] ?? '');
                $u['userid'] = $this->utf8((string) ($u['userid'] ?? ''));

                return $u;
            }, $zk->getUser() ?: []);

            return [
                'name' => $this->clean($zk->deviceName()),
                'serial' => $this->clean($zk->serialNumber()),
                'time' => $this->stringify($zk->getTime()),
                'users' => $users,
                'attendance' => $zk->getAttendance() ?: [],
            ];
        } finally {
            $zk->disconnect();
        }
    }

    /**
     * ZKTeco devices return strings in a legacy encoding (often Windows-1252
     * for Latin names). Coerce to valid UTF-8 so JSON encoding never fails.
     */
    private function utf8(string $value): string
    {
        if ($value === '' || mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
    }

    /**
     * Device fields come back like "~DeviceName=K14/ID " — keep the value.
     */
    private function clean(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        if (str_contains($value, '=')) {
            $value = explode('=', $value, 2)[1];
        }

        return $this->utf8(trim($value)) ?: null;
    }

    private function stringify(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? trim($value) : null;
    }
}
