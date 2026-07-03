<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $fillable = [
        'biometric_device_id',
        'visitor_id',
        'employee_id',
        'pin',
        'recorded_at',
        'state',
        'type',
        'action',
    ];

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(BiometricDevice::class, 'biometric_device_id');
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
