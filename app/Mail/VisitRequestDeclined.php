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
 * Sent to the visitor when their request is declined, with the reason (if any).
 * Queued so a mail hiccup retries in the background.
 */
class VisitRequestDeclined extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public VisitorRequest $visitorRequest) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Update on your visit request — '.$this->visitorRequest->reference,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.visit-request.declined',
            with: [
                'name' => $this->visitorRequest->name,
                'reference' => $this->visitorRequest->reference,
                'reason' => $this->visitorRequest->decline_reason,
                'statusUrl' => route('visit.status', ['ref' => $this->visitorRequest->reference]),
            ],
        );
    }
}
