<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class Visitor extends Model
{
    /** @use HasFactory<\Database\Factories\VisitorFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'company',
        'host',
        'purpose',
        'companions',
        'photo_path',
        'badge_number',
        'device_pin',
        'qr_token',
        'status',
        'checked_in_at',
        'checked_out_at',
    ];

    protected $appends = ['photo_url', 'id_photo_url'];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'companions' => 'integer',
        ];
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class)->latest('checked_in_at');
    }

    /**
     * The currently open visit as an eager-loadable relation (drives the
     * live on-site photos shown in lists without an N+1).
     */
    public function currentVisit(): HasOne
    {
        return $this->hasOne(Visit::class)
            ->whereNull('checked_out_at')
            ->latest('checked_in_at');
    }

    /**
     * The currently open visit (checked in, not yet out), if any.
     */
    public function openVisit(): ?Visit
    {
        return $this->visits()->whereNull('checked_out_at')->first();
    }

    /**
     * Open a new visit and mark the visitor on-site.
     */
    public function recordCheckIn(
        ?Carbon $at = null,
        ?string $photoPath = null,
        ?string $idPhotoPath = null,
    ): void {
        $at ??= Carbon::now();

        $this->visits()->create([
            'host' => $this->host,
            'purpose' => $this->purpose,
            'photo_path' => $photoPath,
            'id_photo_path' => $idPhotoPath,
            'checked_in_at' => $at,
        ]);

        $this->update([
            'status' => 'checked_in',
            'checked_in_at' => $at,
            'checked_out_at' => null,
        ]);
    }

    /**
     * Close the open visit and mark the visitor checked out. The arrival photos
     * are sensitive PII, so they are purged from disk on checkout.
     */
    public function recordCheckOut(?Carbon $at = null): void
    {
        $at ??= Carbon::now();

        $visit = $this->openVisit();
        if ($visit) {
            foreach ([$visit->photo_path, $visit->id_photo_path] as $path) {
                if ($path) {
                    Storage::disk('local')->delete($path);
                }
            }

            $visit->update([
                'checked_out_at' => $at,
                'photo_path' => null,
                'id_photo_path' => null,
            ]);
        }

        $this->update([
            'status' => 'checked_out',
            'checked_out_at' => $at,
        ]);
    }

    protected function photoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->currentVisitPhotoUrl('photo_path'));
    }

    protected function idPhotoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->currentVisitPhotoUrl('id_photo_path'));
    }

    /**
     * URL of a photo on the current (open) visit, or null when off-site.
     * Uses the eager-loaded currentVisit relation when available.
     */
    private function currentVisitPhotoUrl(string $column): ?string
    {
        $visit = $this->relationLoaded('currentVisit')
            ? $this->getRelation('currentVisit')
            : $this->openVisit();

        $path = $visit?->{$column};

        if (! $path) {
            return null;
        }

        // Face/ID photos live on the private disk; serve them through the gated
        // photo() route rather than a world-readable /storage URL.
        return route('visitors.photo', [
            'visitor' => $this->id,
            'which' => $column === 'id_photo_path' ? 'id' : 'face',
        ]);
    }
}
