<?php

namespace App\Console\Commands;

use App\Models\VisitorRequest;
use Illuminate\Console\Command;

class PruneVisitorRequests extends Command
{
    protected $signature = 'visitor-requests:prune {--pending-days=7} {--purge-days=30}';

    protected $description = 'Auto-decline stale pending visitor requests and purge old ones, deleting their signature files.';

    public function handle(): int
    {
        $result = VisitorRequest::prune(
            (int) $this->option('pending-days'),
            (int) $this->option('purge-days'),
        );

        $this->info("Auto-declined {$result['declined']} stale pending request(s); purged {$result['purged']} old request(s).");

        return self::SUCCESS;
    }
}
