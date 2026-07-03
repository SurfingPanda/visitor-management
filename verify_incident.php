<?php
use App\Models\IncidentReport;
use App\Models\User;

$user = User::where('email', 'admin@visitor.test')->first();

$r = IncidentReport::create([
    'type' => 'accident',
    'title' => 'Slip on wet floor in lobby',
    'severity' => 'high',
    'location' => 'Main lobby',
    'people_involved' => 'Jane Doe (visitor)',
    'description' => 'Visitor slipped near reception; no serious injury.',
    'action_taken' => 'First aid applied, wet-floor sign placed.',
    'status' => 'open',
    'occurred_at' => now(),
    'reported_by' => $user->id,
    'reporter_name' => $user->name,
]);
echo "CREATED id={$r->id} occurred_at={$r->occurred_at}\n";

auth()->login($user);
$request = Illuminate\Http\Request::create('/incident-reports?status=open', 'GET');
app()->instance('request', $request);
$page = (new App\Http\Controllers\IncidentReportController())->index($request);
$props = (fn() => $this->props)->call($page);
echo "component=" . (fn() => $this->component)->call($page) . "\n";
echo "props=" . implode(',', array_keys($props)) . "\n";
echo "counts=" . json_encode($props['counts']) . "\n";
echo "first=" . ($props['reports']->items()[0]->title ?? 'NONE') . "\n";
echo "reporter=" . ($props['reports']->items()[0]->reporter_name ?? '') . "\n";

$r->delete();
echo "CLEANED UP\n";
