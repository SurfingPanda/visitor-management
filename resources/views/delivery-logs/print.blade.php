<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Delivery Log</title>
    <style>
        @page { size: A4 landscape; margin: 12mm; }

        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            color: #1f2937;
            font-size: 12px;
            background: #f1f5f9;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .sheet {
            max-width: 1040px;
            margin: 24px auto;
            background: #fff;
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
        }

        .brand {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 14px;
        }
        .brand-logo img { height: 56px; width: auto; display: block; }
        .brand-co { text-align: right; line-height: 1.35; font-size: 11px; color: #374151; white-space: nowrap; }
        .brand-co .co-name { font-weight: 700; font-size: 14px; letter-spacing: .4px; color: #111827; }
        .brand-co .co-phone { font-weight: 700; margin-top: 4px; }

        .head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }
        h1 { margin: 0; font-size: 20px; color: #111827; letter-spacing: .2px; }
        .sub { margin-top: 4px; color: #6b7280; font-size: 12px; }
        .meta { text-align: right; color: #6b7280; font-size: 11px; white-space: nowrap; }
        .count { color: #111827; font-weight: 700; font-size: 12px; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #9ca3af; }
        thead th {
            text-align: left;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: #1f2937;
            background: #e5e7eb;
            padding: 8px 9px;
            border: 1px solid #9ca3af;
        }
        tbody td {
            padding: 8px 9px;
            border: 1px solid #cbd1d8;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        tbody tr:nth-child(even) { background: #f6f7f9; }
        .strong { font-weight: 600; color: #111827; }
        .muted { color: #6b7280; font-size: 10.5px; }
        .miss { color: #b91c1c; }
        .empty { text-align: center; color: #9ca3af; padding: 44px 0; }

        .toolbar { max-width: 1040px; margin: 24px auto -8px; }
        .btn {
            font: inherit;
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            background: #111827;
            border: none;
            border-radius: 8px;
            padding: 9px 18px;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,.08);
        }
        .btn:hover { background: #374151; }

        .foot {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid #eef0f3;
            color: #9ca3af;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
        }

        @media print {
            body { background: #fff; }
            .sheet { max-width: none; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
            .toolbar { display: none; }
            thead { display: table-header-group; }
            tbody tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    @php
        $rangeLabel = null;
        if ($filters['from'] && $filters['to']) {
            $rangeLabel = \Illuminate\Support\Carbon::parse($filters['from'])->format('M j, Y')
                . ' – ' . \Illuminate\Support\Carbon::parse($filters['to'])->format('M j, Y');
        } elseif ($filters['from']) {
            $rangeLabel = 'From ' . \Illuminate\Support\Carbon::parse($filters['from'])->format('M j, Y');
        } elseif ($filters['to']) {
            $rangeLabel = 'Until ' . \Illuminate\Support\Carbon::parse($filters['to'])->format('M j, Y');
        }

        $chips = [];
        if ($filters['status'] === 'out') { $chips[] = 'On the road'; }
        if ($filters['status'] === 'returned') { $chips[] = 'Returned'; }
        if ($filters['plate']) { $chips[] = 'Plate ' . $filters['plate']; }
        if ($filters['route']) { $chips[] = 'Route ' . $filters['route']; }
        if ($filters['search']) { $chips[] = 'Search “' . $filters['search'] . '”'; }
    @endphp

    <div class="toolbar">
        <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="sheet">
        <div class="brand">
            <div class="brand-logo">
                <img src="{{ asset('logo_main.webp') }}" alt="Eljin Corp">
            </div>
            <div class="brand-co">
                <div class="co-name">ELJIN CORPORATION</div>
                <div>Sta. Rosa Road Zone 2</div>
                <div>Brgy Maliwalo, City of Tarlac 2300</div>
                <div class="co-phone">(+63) 045-982-3481</div>
            </div>
        </div>

        <div class="head">
            <div>
                <h1>Delivery Log</h1>
                <div class="sub">
                    {{ $rangeLabel ?? 'All deliveries' }}
                    @if (count($chips))
                        &middot; {{ implode(' · ', $chips) }}
                    @endif
                </div>
            </div>
            <div class="meta">
                <div class="count">{{ count($rows) }} {{ \Illuminate\Support\Str::plural('delivery', count($rows)) }}</div>
                <div>Generated {{ $generatedAt->format('M j, Y g:i A') }}</div>
            </div>
        </div>

        <table>
            <colgroup>
                <col style="width: 10%">  {{-- Out --}}
                <col style="width: 8%">   {{-- Plate --}}
                <col style="width: 9%">   {{-- Route --}}
                <col style="width: 12%">  {{-- Crew --}}
                <col style="width: 19%">  {{-- Load --}}
                <col style="width: 15%">  {{-- Missing --}}
                <col style="width: 7%">   {{-- Status --}}
                <col style="width: 10%">  {{-- Returned --}}
                <col style="width: 10%">  {{-- Remarks --}}
            </colgroup>
            <thead>
                <tr>
                    <th>Out</th>
                    <th>Plate</th>
                    <th>Route</th>
                    <th>Crew</th>
                    <th>Load</th>
                    <th>Missing</th>
                    <th>Status</th>
                    <th>Returned</th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($rows as $r)
                    <tr>
                        <td>{{ $r['out'] ?: '—' }}</td>
                        <td class="strong">{{ $r['plate'] ?: '—' }}</td>
                        <td>{{ $r['route'] ?: '—' }}</td>
                        <td>
                            {{ $r['driver'] ?: '—' }}
                            @if ($r['helper'])
                                <div class="muted">helper: {{ $r['helper'] }}</div>
                            @endif
                        </td>
                        <td>{{ $r['load'] }}</td>
                        <td class="{{ $r['missing'] ? 'miss' : '' }}">{{ $r['missing'] ?: '—' }}</td>
                        <td>{{ $r['status'] }}</td>
                        <td>{{ $r['returned'] ?: '—' }}</td>
                        <td>{{ $r['remarks'] ?: '—' }}</td>
                    </tr>
                @empty
                    <tr><td colspan="9" class="empty">No deliveries match these filters.</td></tr>
                @endforelse
            </tbody>
        </table>

        <div class="foot">
            <span>Secora — Delivery Log Report</span>
            <span>{{ count($rows) }} {{ \Illuminate\Support\Str::plural('record', count($rows)) }}</span>
        </div>
    </div>

    <script>
        // Auto-open the print dialog once the logo has loaded so it always
        // appears on the printout (falls back after a short timeout).
        window.addEventListener('load', function () {
            var img = document.querySelector('.brand-logo img');
            var printed = false;
            var go = function () {
                if (printed) return;
                printed = true;
                window.print();
            };
            if (img && !img.complete) {
                img.addEventListener('load', go);
                img.addEventListener('error', go);
                setTimeout(go, 1500);
            } else {
                setTimeout(go, 200);
            }
        });
    </script>
</body>
</html>
