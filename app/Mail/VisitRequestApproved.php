<?php

namespace App\Mail;

use App\Models\VisitorRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to the visitor when their request is approved. Links back to the public
 * status page where they can view and download their visitor pass (PNG/PDF).
 * Queued so a mail hiccup retries in the background.
 */
class VisitRequestApproved extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public VisitorRequest $visitorRequest) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your visit request is approved — '.$this->visitorRequest->reference,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.visit-request.approved',
            with: [
                'name' => $this->visitorRequest->name,
                'reference' => $this->visitorRequest->reference,
                // Absolute URL from APP_URL (queued jobs have no request host).
                'statusUrl' => route('visit.status', ['ref' => $this->visitorRequest->reference]),
            ],
        );
    }
}
