<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentReport extends Model
{
    /** @use HasFactory<\Database\Factories\IncidentReportFactory> */
    use HasFactory;

    /**
     * Expose the derived reference code to arrays/JSON (Inertia props).
     *
     * @var list<string>
     */
    protected $appends = ['reference'];

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

    /**
     * Human-readable reference code, e.g. INC-000000042 (ACC- for accidents).
     * Derived from the primary key so it is stable and unique per record.
     */
    protected function reference(): Attribute
    {
        return Attribute::make(
            get: fn () => sprintf(
                '%s-%09d',
                $this->type === 'accident' ? 'ACC' : 'INC',
                $this->id ?? 0,
            ),
        );
    }
}
