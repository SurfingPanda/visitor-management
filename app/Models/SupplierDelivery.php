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

    protected $appends = ['dr_image_url', 'reference'];

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

    /**
     * Human-readable reference code, e.g. SUP-0000000042. Derived from the
     * primary key so it is stable and unique per record.
     */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => sprintf('SUP-%010d', $this->id ?? 0),
        );
    }

    protected function drImageUrl(): Attribute
    {
        // Gated, staff-only URL (root-relative). The image lives on the private
        // disk and is streamed through an auth-protected route, never /storage.
        return Attribute::get(
            fn () => $this->dr_image_path
                ? route('supplier-deliveries.dr-image', ['supplierDelivery' => $this->id], false)
                : null,
        );
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
