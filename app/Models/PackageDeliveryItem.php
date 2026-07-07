<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageDeliveryItem extends Model
{
    protected $fillable = [
        'package_delivery_id',
        'tracking_number',
        'courier',
        'sender',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(PackageDelivery::class, 'package_delivery_id');
    }
}
