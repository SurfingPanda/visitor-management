<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricDevice extends Model
{
    protected $fillable = [
        'name',
        'ip_address',
        'port',
        'location',
        'is_active',
        'model',
        'serial_number',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }
}
