<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    /**
     * Visitor face/ID photos are sensitive PII, so they move off the
     * world-readable public disk to the private disk (served through the gated
     * visitors.photo route instead), matching how signatures are handled.
     */
    public function up(): void
    {
        $this->moveAll('public', 'local');
    }

    public function down(): void
    {
        $this->moveAll('local', 'public');
    }

    private function moveAll(string $from, string $to): void
    {
        $source = Storage::disk($from);
        $target = Storage::disk($to);

        foreach ($source->files('visitor-photos') as $file) {
            if (! $target->exists($file)) {
                $target->put($file, $source->get($file));
            }
            $source->delete($file);
        }
    }
};
