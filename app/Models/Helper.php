<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Helper extends Model
{
    protected $fillable = [
        'name',
        'license_number',
        'phone',
        'email',
        'address',
        'status',
        'notes',
        'registered_by',
        'registrant_name',
    ];

    public function registrant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }
}
