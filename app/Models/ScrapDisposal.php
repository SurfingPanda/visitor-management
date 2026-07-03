<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScrapDisposal extends Model
{
    protected $fillable = [
        'reference_no',
        'item',
        'category',
        'quantity',
        'unit',
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
            'quantity' => 'integer',
            'amount' => 'decimal:2',
            'disposal_date' => 'date',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
