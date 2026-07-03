<?php

namespace App\Services;

use RuntimeException;
use Rats\Zkteco\Lib\Helper\Util;

/**
 * Minimal TCP client for ZKTeco devices.
 *
 * The popular `rats/zkteco` package talks UDP only, which drops packets on
 * large transfers (a multi-MB attendance log never completes). This client
 * speaks the same ZK command protocol but over TCP, which guarantees the full
 * payload arrives. It reuses Util::createHeader() for packet/checksum building
 * and mirrors the vendor's user/attendance record parsing.
 *
 * Read-only: connect, read users, read attendance, device name/serial/time,
 * exit. It never writes, clears, disables, or powers off the device.
 */
class TcpZkClient
{
    /** ZK-over-TCP framing magic: bytes 50 50 82 7d, then uint32-LE length. */
    private const TOP_1 = 0x5050;
    private const TOP_2 = 0x7d82;

    private $socket = null;
    private string $buffer = '';
    private string $lastReply = '';
    private int $sessionId = 0;

    public function __construct(
        private string $ip,
        private int $port = 4370,
        private int $timeout = 120,
    ) {}

    public function connect(): bool
    {
        $this->socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        if ($this->socket === false) {
            throw new RuntimeException('Could not create TCP socket.');
        }

        $tv = ['sec' => $this->timeout, 'usec' => 0];
        socket_set_option($this->socket, SOL_SOCKET, SO_RCVTIMEO, $tv);
        socket_set_option($this->socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => 10, 'usec' => 0]);

        if (! @socket_connect($this->socket, $this->ip, $this->port)) {
            $err = socket_strerror(socket_last_error($this->socket));
            throw new RuntimeException("TCP connect to {$this->ip}:{$this->port} failed: {$err}");
        }

        $reply = $this->send(Util::CMD_CONNECT);
        if ($reply === false || strlen($reply) < 8) {
            return false;
        }

        $this->sessionId = $this->word($reply, 4); // session id at offset 4
        $cmd = $this->word($reply, 0);

        return $cmd === Util::CMD_ACK_OK || $cmd === Util::CMD_ACK_UNAUTH;
    }

    public function disconnect(): void
    {
        try {
            if ($this->socket) {
                $this->send(Util::CMD_EXIT);
            }
        } catch (\Throwable) {
            // best-effort
        } finally {
            if ($this->socket) {
                @socket_close($this->socket);
                $this->socket = null;
            }
        }
    }

    /**
     * @return array<string, array{uid:int, userid:string, name:string, role:int, password:string, cardno:string}>
     */
    public function getUser(): array
    {
        $data = $this->readBulk(Util::CMD_USER_TEMP_RRQ, chr(Util::FCT_USER));

        $users = [];
        if ($data === '') {
            return $users;
        }

        $userData = substr($data, 11);
        while (strlen($userData) > 72) {
            $u = unpack('H144', substr($userData, 0, 72));

            $uid = hexdec(substr($u[1], 2, 2)) + (hexdec(substr($u[1], 4, 2)) * 256);
            $role = hexdec(substr($u[1], 6, 2));
            $password = explode(chr(0), hex2bin(substr($u[1], 8, 16)), 2)[0];
            $name = explode(chr(0), hex2bin(substr($u[1], 24, 74)), 3)[0];
            $cardno = str_pad(
                (string) hexdec(substr($u[1], 78, 2).substr($u[1], 76, 2).substr($u[1], 74, 2).substr($u[1], 72, 2)),
                11,
                '0',
                STR_PAD_LEFT,
            );
            $userid = explode(chr(0), hex2bin(substr($u[1], 98, 72)), 2)[0];

            if ($name === '') {
                $name = $userid;
            }

            if ($userid !== '') {
                $users[$userid] = [
                    'uid' => $uid,
                    'userid' => $userid,
                    'name' => $name,
                    'role' => (int) $role,
                    'password' => $password,
                    'cardno' => $cardno,
                ];
            }

            $userData = substr($userData, 72);
        }

        return $users;
    }

    /**
     * @return array<int, array{uid:int, id:string, state:int, timestamp:string, type:int}>
     */
    public function getAttendance(): array
    {
        $data = $this->readBulk(Util::CMD_ATT_LOG_RRQ, '');

        $attendance = [];
        if ($data === '') {
            return $attendance;
        }

        $attData = substr($data, 10);
        while (strlen($attData) > 40) {
            $u = unpack('H78', substr($attData, 0, 39));

            $uid = hexdec(substr($u[1], 4, 2)) + (hexdec(substr($u[1], 6, 2)) * 256);
            $id = str_replace(chr(0), '', hex2bin(substr($u[1], 8, 18)));
            $state = hexdec(substr($u[1], 56, 2));
            $timestamp = Util::decodeTime(hexdec(Util::reverseHex(substr($u[1], 58, 8))));
            $type = hexdec(Util::reverseHex(substr($u[1], 66, 2)));

            $attendance[] = [
                'uid' => $uid,
                'id' => $id,
                'state' => $state,
                'timestamp' => $timestamp,
                'type' => $type,
            ];

            $attData = substr($attData, 40);
        }

        return $attendance;
    }

    public function deviceName(): ?string
    {
        return $this->deviceParam('~DeviceName');
    }

    public function serialNumber(): ?string
    {
        return $this->deviceParam('~SerialNumber');
    }

    public function getTime(): ?string
    {
        $reply = $this->send(Util::CMD_GET_TIME);
        if ($reply === false || strlen($reply) <= 8) {
            return null;
        }
        $payload = substr($reply, 8);

        return Util::decodeTime(hexdec(Util::reverseHex(bin2hex($payload))));
    }

    /* ---------------- protocol internals ---------------- */

    private function deviceParam(string $name): ?string
    {
        $reply = $this->send(Util::CMD_DEVICE, $name);
        if ($reply === false || strlen($reply) <= 8) {
            return null;
        }

        $value = trim(str_replace(chr(0), '', substr($reply, 8)));

        return $value === '' ? null : $value;
    }

    /**
     * Send a command and return the ZK reply packet (or false).
     */
    private function send(int $command, string $data = ''): string|false
    {
        $replyId = strlen($this->lastReply) >= 8
            ? $this->word($this->lastReply, 6)
            : Util::USHRT_MAX - 1;

        $packet = Util::createHeader($command, 0, $this->sessionId, $replyId, $data);
        $top = pack('vvV', self::TOP_1, self::TOP_2, strlen($packet));

        $this->writeAll($top.$packet);

        $reply = $this->readFrame();
        $this->lastReply = $reply;

        return $reply;
    }

    /**
     * Issue a data request and return the reassembled buffer, prefixed with 8
     * padding bytes so the vendor-style record offsets (10/11) line up.
     */
    private function readBulk(int $command, string $data): string
    {
        $reply = $this->send($command, $data);
        if ($reply === false) {
            return '';
        }

        $cmd = $this->word($reply, 0);

        if ($cmd === Util::CMD_PREPARE_DATA) {
            $size = $this->dword($reply, 8);
            $payload = $this->readChunks($size);

            return str_repeat("\0", 8).$payload;
        }

        if ($cmd === Util::CMD_DATA) {
            return str_repeat("\0", 8).substr($reply, 8);
        }

        return '';
    }

    private function readChunks(int $size): string
    {
        // Read data frames until the device sends its terminating CMD_ACK_OK.
        // We must consume that trailing ACK so the TCP stream stays aligned for
        // the next command — stopping merely at `size` bytes leaves it behind.
        $payload = '';
        while (true) {
            $frame = $this->readFrame();
            $cmd = $this->word($frame, 0);

            if ($cmd === Util::CMD_ACK_OK) {
                break;
            }

            if ($cmd === Util::CMD_PREPARE_DATA) {
                continue; // stray/duplicate prepare — ignore
            }

            // CMD_DATA (and any data-bearing frame): strip the 8-byte ZK header.
            $payload .= substr($frame, 8);

            // Safety valve against a missing ACK on a malformed stream.
            if ($size > 0 && strlen($payload) > $size + 1032) {
                break;
            }
        }

        return $payload;
    }

    /**
     * Read one TCP-framed ZK packet: 8-byte top header, then `size` bytes.
     */
    private function readFrame(): string
    {
        $header = $this->readExact(8);
        $top = unpack('vm1/vm2/Vsize', $header);

        if ($top['m1'] !== self::TOP_1 || $top['m2'] !== self::TOP_2) {
            throw new RuntimeException('Unexpected TCP framing from device.');
        }

        return $this->readExact($top['size']);
    }

    /**
     * Read exactly $length bytes, buffering across recv() boundaries.
     */
    private function readExact(int $length): string
    {
        while (strlen($this->buffer) < $length) {
            $chunk = '';
            $read = @socket_recv($this->socket, $chunk, 8192, 0);

            if ($read === false || $read === 0) {
                $err = socket_strerror(socket_last_error($this->socket));
                throw new RuntimeException("Device read failed/timed out: {$err}");
            }

            $this->buffer .= $chunk;
        }

        $out = substr($this->buffer, 0, $length);
        $this->buffer = substr($this->buffer, $length);

        return $out;
    }

    private function writeAll(string $data): void
    {
        $total = strlen($data);
        $sent = 0;
        while ($sent < $total) {
            $n = @socket_write($this->socket, substr($data, $sent), $total - $sent);
            if ($n === false) {
                $err = socket_strerror(socket_last_error($this->socket));
                throw new RuntimeException("Device write failed: {$err}");
            }
            $sent += $n;
        }
    }

    /** uint16 LE at offset. */
    private function word(string $buf, int $offset): int
    {
        return unpack('v', substr($buf, $offset, 2))[1];
    }

    /** uint32 LE at offset. */
    private function dword(string $buf, int $offset): int
    {
        return unpack('V', substr($buf, $offset, 4))[1];
    }
}
