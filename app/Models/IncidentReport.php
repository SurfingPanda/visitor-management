<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentReport extends Model
{
    /** @use HasFactory<\Database\Factories\IncidentReportFactory> */
    use HasFactory;

    protected $fillable = [
        'type',
        'title',
        'severity',
        'location',
        'people_involved',
        'witness',
        'description',
        'action_taken',
        'categories',
        'status',
        'occurred_at',
        'reported_by',
        'reporter_name',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'categories' => 'array',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
