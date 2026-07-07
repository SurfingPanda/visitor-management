@component('mail::message')
# Visit request update

Hi {{ $name }},

We're writing about your visit request **{{ $reference }}** to **Eljin Corporation**. Unfortunately, it was **not approved** at this time.

@if ($reason)
**Reason:** {{ $reason }}
@endif

If you believe this is a mistake, please contact the front desk.

@component('mail::button', ['url' => $statusUrl])
View request status
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent
