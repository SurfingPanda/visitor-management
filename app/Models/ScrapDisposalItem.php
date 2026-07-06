<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScrapDisposalItem extends Model
{
    protected $fillable = [
        'scrap_disposal_id',
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

    public function disposal(): BelongsTo
    {
        return $this->belongsTo(ScrapDisposal::class, 'scrap_disposal_id');
    }
}
