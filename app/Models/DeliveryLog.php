<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryLog extends Model
{
    /**
     * Expose the derived reference code to arrays/JSON (Inertia props).
     *
     * @var list<string>
     */
    protected $appends = ['reference'];

    protected $fillable = [
        'plate_number',
        'route',
        'driver',
        'helper',
        'driver_id',
        'helper_id',
        'crates_big',
        'crates_small',
        'box',
        'bin',
        'empanada_box',
        'trolley',
        'status',
        'delivery_out',
        'returned_at',
        'returned_remarks',
        'arrival_plant',
        'ret_crates_big',
        'ret_crates_small',
        'ret_box',
        'ret_bin',
        'ret_empanada_box',
        'ret_trolley',
        'logged_by',
        'logger_name',
    ];

    protected function casts(): array
    {
        return [
            'delivery_out' => 'datetime',
            'returned_at' => 'datetime',
            'arrival_plant' => 'datetime',
            'crates_big' => 'integer',
            'crates_small' => 'integer',
            'box' => 'integer',
            'bin' => 'integer',
            'empanada_box' => 'integer',
            'trolley' => 'integer',
            'ret_crates_big' => 'integer',
            'ret_crates_small' => 'integer',
            'ret_box' => 'integer',
            'ret_bin' => 'integer',
            'ret_empanada_box' => 'integer',
            'ret_trolley' => 'integer',
            'driver_id' => 'integer',
            'helper_id' => 'integer',
        ];
    }

    /**
     * Human-readable reference code, e.g. DEL-0000000042. Derived from the
     * primary key so it is stable and unique per record.
     */
    protected function reference(): Attribute
    {
        return Attribute::make(
            get: fn () => sprintf('DEL-%010d', $this->id ?? 0),
        );
    }

    public function logger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }

    public function driverRecord(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function helperRecord(): BelongsTo
    {
        return $this->belongsTo(Helper::class, 'helper_id');
    }
}
