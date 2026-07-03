<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    protected $fillable = [
        'plate_number',
        'type',
        'make_model',
        'color',
        'notes',
        'registered_by',
        'registrant_name',
    ];

    public function registrant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }
}
