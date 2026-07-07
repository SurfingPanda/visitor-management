<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScrapDisposal extends Model
{
    protected $fillable = [
        'reference_no',
        'category',
        'disposal_date',
        'method',
        'recipient',
        'amount',
        'notes',
        'recorded_by',
        'recorder_name',
    ];

    protected $appends = ['reference'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'disposal_date' => 'date',
        ];
    }

    /**
     * System reference code, e.g. SCR-0000000042 (distinct from the optional
     * user-entered reference_no). Derived from the primary key.
     */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => sprintf('SCR-%010d', $this->id ?? 0),
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(ScrapDisposalItem::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
