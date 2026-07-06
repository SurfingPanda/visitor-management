<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierDeliveryItem extends Model
{
    protected $fillable = [
        'supplier_delivery_id',
        'name',
        'quantity',
        'uom',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(SupplierDelivery::class, 'supplier_delivery_id');
    }
}
