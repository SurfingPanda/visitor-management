<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageDelivery extends Model
{
    protected $fillable = [
        'courier',
        'rider_name',
        'tracking_number',
        'recipient_name',
        'recipient_department',
        'sender',
        'notes',
        'status',
        'received_at',
        'received_by_name',
        'received_signature_path',
        'logged_by',
        'logger_name',
    ];

    protected $appends = ['reference', 'received_signature_url'];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
        ];
    }

    /**
     * Human-readable reference code, e.g. PKG-0000000042. Derived from the
     * primary key so it is stable and unique per record.
     */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => sprintf('PKG-%010d', $this->id ?? 0),
        );
    }

    /**
     * Gated (staff-only) URL of the recipient's signature, or null. Signatures
     * live on the private disk and are streamed through the app, never /storage.
     */
    protected function receivedSignatureUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->received_signature_path
                ? route('package-deliveries.signature', ['packageDelivery' => $this->id])
                : null,
        );
    }

    public function logger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
