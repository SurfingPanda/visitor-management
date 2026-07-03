<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipment extends Model
{
    // "equipment" is uncountable — set the table explicitly so Eloquent
    // doesn't look for an "equipments" table.
    protected $table = 'equipment';

    protected $fillable = [
        'name',
        'quantity',
        'price',
        'image_path',
        'status',
        'disposed_by',
        'approved_by',
        'disposed_at',
        'notes',
        'registered_by',
        'registrant_name',
    ];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price' => 'decimal:2',
            'disposed_at' => 'date',
        ];
    }

    protected function imageUrl(): Attribute
    {
        // Root-relative (not absolute) so it resolves against whatever host the
        // app is served from — localhost:8000, a tunnel, LAN IP, or Hostinger —
        // rather than the hardcoded APP_URL host.
        return Attribute::get(
            fn () => $this->image_path ? '/storage/'.$this->image_path : null,
        );
    }

    public function registrant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }
}
