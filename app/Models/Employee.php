<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Employee extends Model
{
    protected $fillable = [
        'biometric_device_id',
        'device_pin',
        'name',
        'role',
        'status',
        'checked_in_at',
        'checked_out_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function recordCheckIn(?Carbon $at = null): void
    {
        $at ??= Carbon::now();
        $this->update([
            'status' => 'checked_in',
            'checked_in_at' => $at,
            'checked_out_at' => null,
        ]);
    }

    public function recordCheckOut(?Carbon $at = null): void
    {
        $at ??= Carbon::now();
        $this->update([
            'status' => 'checked_out',
            'checked_out_at' => $at,
        ]);
    }
}
