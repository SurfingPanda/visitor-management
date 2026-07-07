<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    /**
     * Signatures are sensitive PII, so they move off the world-readable public
     * disk to the private disk (served through gated app routes instead).
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

        foreach ($source->files('visitor-signatures') as $file) {
            if (! $target->exists($file)) {
                $target->put($file, $source->get($file));
            }
            $source->delete($file);
        }
    }
};
