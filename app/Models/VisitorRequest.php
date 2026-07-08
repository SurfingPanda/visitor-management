<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class VisitorRequest extends Model
{
    protected $fillable = [
        'reference',
        'name',
        'contact_person',
        'email',
        'visit_date',
        'company',
        'signature_path',
        'status',
        'approver_name',
        'approver_signature_path',
        'approved_by',
        'declined_by',
        'decline_reason',
        'visitor_id',
    ];

    protected $appends = ['signature_url', 'approver_signature_url'];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
        ];
    }

    /**
     * Assign a random, unguessable reference on creation so the public status
     * lookup can't be used to enumerate other visitors' requests.
     */
    protected static function booted(): void
    {
        static::creating(function (self $request) {
            if (empty($request->reference)) {
                $request->reference = self::generateReference();
            }
        });
    }

    /**
     * A random reference like REQ-7QK4M2XP (uppercase, no ambiguous 0/O/1/I/L).
     */
    public static function generateReference(): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $code = 'REQ-';
            for ($i = 0; $i < 8; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (static::where('reference', $code)->exists());

        return $code;
    }

    /**
     * Gated (staff-only) URL of the visitor's signature image, or null.
     * Signatures live on the private disk and are streamed through the app.
     */
    protected function signatureUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->signature_path
                ? route('visitor-requests.signature', ['visitorRequest' => $this->id, 'which' => 'visitor'])
                : null,
        );
    }

    /**
     * Gated (staff-only) URL of the approver's signature image, or null.
     */
    protected function approverSignatureUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->approver_signature_path
                ? route('visitor-requests.signature', ['visitorRequest' => $this->id, 'which' => 'approver'])
                : null,
        );
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function decliner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declined_by');
    }

    /**
     * Retention housekeeping, shared by the scheduled command and the manual
     * "Clean up" action: auto-decline stale pending requests (dropping their
     * signature) and purge rows older than the cutoff along with their files.
     *
     * @return array{declined: int, purged: int}
     */
    public static function prune(int $pendingDays, int $purgeDays): array
    {
        $declined = 0;
        static::query()
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subDays($pendingDays))
            ->chunkById(200, function ($requests) use (&$declined) {
                foreach ($requests as $request) {
                    if ($request->signature_path) {
                        Storage::disk('local')->delete($request->signature_path);
                        $request->signature_path = null;
                    }
                    $request->status = 'declined';
                    $request->save();
                    $declined++;
                }
            });

        $purged = 0;
        static::query()
            ->where('created_at', '<', now()->subDays($purgeDays))
            ->chunkById(200, function ($requests) use (&$purged) {
                foreach ($requests as $request) {
                    foreach ([$request->signature_path, $request->approver_signature_path] as $path) {
                        if ($path) {
                            Storage::disk('local')->delete($path);
                        }
                    }
                    $request->delete();
                    $purged++;
                }
            });

        return ['declined' => $declined, 'purged' => $purged];
    }
}
