<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Trip extends Model
{
    protected $fillable = [
        'vehicle_id',
        'destination',
        'purpose',
        'driver_name',
        'departure_at',
        'return_at',
        'status',
        'notes',
        'recorded_by',
        'recorder_name',
    ];

    protected function casts(): array
    {
        return [
            'departure_at' => 'datetime',
            'return_at' => 'datetime',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
