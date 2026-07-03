<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierDelivery extends Model
{
    protected $fillable = [
        'supplier_name',
        'plate_number',
        'dr_number',
        'delivery_date',
        'checked_in_at',
        'checked_out_at',
        'amount',
        'received_by',
        'status',
        'notes',
        'dr_image_path',
        'recorded_by',
        'recorder_name',
    ];

    protected $appends = ['dr_image_url'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'delivery_date' => 'date',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SupplierDeliveryItem::class);
    }

    protected function drImageUrl(): Attribute
    {
        // Root-relative so it resolves against whatever host serves the app.
        return Attribute::get(
            fn () => $this->dr_image_path ? '/storage/'.$this->dr_image_path : null,
        );
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
