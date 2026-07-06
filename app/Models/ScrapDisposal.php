<?php

namespace App\Models;

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

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'disposal_date' => 'date',
        ];
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
