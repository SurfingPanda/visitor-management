@component('mail::message')
# You're approved ✅

Hi {{ $name }},

Good news — your visit request **{{ $reference }}** to **Eljin Corporation** has been **approved**.

Tap the button below to view and download your visitor pass. Bring it with you and present the QR code at the front desk when you arrive.

@component('mail::button', ['url' => $statusUrl, 'color' => 'success'])
View & download my pass
@endcomponent

If the button doesn't work, copy and paste this link into your browser:

{{ $statusUrl }}

Thanks,<br>
{{ config('app.name') }}
@endcomponent
