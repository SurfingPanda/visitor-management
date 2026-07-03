<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Supplier Deliveries</title>
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

        /* Document sheet (screen preview) */
        .sheet {
            max-width: 1040px;
            margin: 24px auto;
            background: #fff;
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
        }

        /* Brand header */
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

        /* Table — proper bordered grid */
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
        th.num { text-align: right; }
        tbody td {
            padding: 8px 9px;
            border: 1px solid #cbd1d8;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        tbody tr:nth-child(even) { background: #f6f7f9; }
        .supplier { font-weight: 600; color: #111827; }
        .muted { color: #9ca3af; font-size: 10.5px; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .item-line { line-height: 1.5; }

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
                <h1>Supplier Deliveries</h1>
                <div class="sub">
                    {{ $rangeLabel ?? 'All deliveries' }}
                    @if ($filters['search'])
                        &middot; search &ldquo;{{ $filters['search'] }}&rdquo;
                    @endif
                </div>
            </div>
            <div class="meta">
                <div class="count">{{ $deliveries->count() }} {{ \Illuminate\Support\Str::plural('delivery', $deliveries->count()) }}</div>
                <div>Generated {{ $generatedAt->format('M j, Y g:i A') }}</div>
            </div>
        </div>

        <table>
            <colgroup>
                <col style="width: 10%">  {{-- Delivery date --}}
                <col style="width: 19%">  {{-- Supplier --}}
                <col style="width: 10%">  {{-- DR # --}}
                <col style="width: 21%">  {{-- Items --}}
                <col style="width: 6%">   {{-- Qty --}}
                <col style="width: 14%">  {{-- Received by --}}
                <col style="width: 10%">  {{-- Checked in --}}
                <col style="width: 10%">  {{-- Checked out --}}
            </colgroup>
            <thead>
                <tr>
                    <th>Delivery date</th>
                    <th>Supplier</th>
                    <th>DR #</th>
                    <th>Items</th>
                    <th class="num">Qty</th>
                    <th>Received by</th>
                    <th>Checked in</th>
                    <th>Checked out</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($deliveries as $d)
                    <tr>
                        <td>{{ $d->delivery_date?->format('M j, Y') ?? '—' }}</td>
                        <td>
                            <div class="supplier">{{ $d->supplier_name }}</div>
                            @if ($d->plate_number)
                                <div class="muted">Plate: {{ $d->plate_number }}</div>
                            @endif
                        </td>
                        <td>{{ $d->dr_number ?: '—' }}</td>
                        <td>
                            @foreach ($d->items as $it)
                                <div class="item-line">{{ $it->name }} <span class="muted">x{{ $it->quantity }}</span></div>
                            @endforeach
                        </td>
                        <td class="num">{{ $d->items->sum('quantity') }}</td>
                        <td>{{ $d->received_by ?: '—' }}</td>
                        <td>{{ $d->checked_in_at?->copy()->setTimezone($tz)->format('M j, g:i A') ?? '—' }}</td>
                        <td>{{ $d->checked_out_at?->copy()->setTimezone($tz)->format('M j, g:i A') ?? '—' }}</td>
                    </tr>
                @empty
                    <tr><td colspan="8" class="empty">No deliveries match this range.</td></tr>
                @endforelse
            </tbody>
        </table>

        <div class="foot">
            <span>ECSecora — Supplier Delivery Report</span>
            <span>{{ $deliveries->count() }} {{ \Illuminate\Support\Str::plural('record', $deliveries->count()) }}</span>
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
