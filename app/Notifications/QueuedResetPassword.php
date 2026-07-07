<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * The framework's password-reset notification, but queued — so a transient
 * SMTP/DNS blip retries in the background instead of 500-ing the request that
 * triggered it. Requires a running queue worker to actually deliver.
 */
class QueuedResetPassword extends ResetPassword implements ShouldQueue
{
    use Queueable;
}
