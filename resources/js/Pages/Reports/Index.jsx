import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    RankedBar,
    CategoryDoughnut,
    SeverityDoughnut,
    AreaTrend,
} from '@/Components/ReportCharts';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

/* ---------- helpers ---------- */

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDay(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatPeso(n) {
    const v = Number(n) || 0;
    return (
        '₱' +
        v.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })
    );
}

/* ---------- small inline icons ---------- */

const I = {
    users: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M23 21v-2a4 4 0 0 0-3-3.87" />,
    id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    peak: <path d="M3 3v18h18M7 14l3-4 3 3 5-7" />,
    truck: <><path d="M10 17h4V5H2v12h3" /><path d="M14 8h4l4 4v5h-3" /><circle cx="7.5" cy="17.5" r="2" /><circle cx="17.5" cy="17.5" r="2" /></>,
    box: <><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></>,
    peso: <><path d="M7 4h5a4 4 0 0 1 0 8H7V4ZM5 9h9M5 13h9M7 12v8" /></>,
    scale: <path d="M12 3v18M5 8h14M8 8l-3 6a3 3 0 0 0 6 0L8 8Zm8 0-3 6a3 3 0 0 0 6 0l-3-6Z" />,
};

function Icon({ path }) {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {path}
        </svg>
    );
}

const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    gray: 'bg-gray-100 text-gray-500',
};

function StatCard({ label, value, sub, icon, tone = 'indigo' }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {icon && (
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
                    >
                        <Icon path={icon} />
                    </span>
                )}
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                {value}
            </p>
            {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

function SectionTitle({ tone = 'bg-indigo-500', children }) {
    return (
        <h3 className="flex items-center gap-2 pt-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <span className={`h-4 w-1.5 rounded-full ${tone}`} />
            {children}
        </h3>
    );
}

function Panel({ title, subtitle, children }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            <div className="mt-4">{children}</div>
        </div>
    );
}

const presets = [
    { label: '7 days', days: 6 },
    { label: '30 days', days: 29 },
    { label: '90 days', days: 89 },
];

/* ---------- page ---------- */

export default function ReportsIndex({
    filters,
    stats,
    daily,
    byPurpose,
    topHosts,
    delivery,
    incidents,
    supplier,
    scrap,
}) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const apply = (nextFrom = from, nextTo = to) => {
        router.get(
            route('reports.index'),
            { from: nextFrom, to: nextTo },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applyPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        const f = start.toISOString().slice(0, 10);
        const t = end.toISOString().slice(0, 10);
        setFrom(f);
        setTo(t);
        apply(f, t);
    };

    const rangeLabel = `${formatDay(filters.from)} – ${formatDay(filters.to)}`;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Reports
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Visitors, deliveries, incidents &amp; disposal at a glance
                    </p>
                </div>
            }
        >
            <Head title="Reports" />

            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Controls */}
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                                From
                            </label>
                            <input
                                type="date"
                                value={from}
                                max={to}
                                onChange={(e) => setFrom(e.target.value)}
                                className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                                To
                            </label>
                            <input
                                type="date"
                                value={to}
                                min={from}
                                onChange={(e) => setTo(e.target.value)}
                                className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => apply()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            Apply
                        </button>
                        <div className="flex gap-1">
                            {presets.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => applyPreset(p.days)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <a
                        href={route('reports.export', { from, to })}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="M7 10l5 5 5-5" />
                            <path d="M12 15V3" />
                        </svg>
                        Export CSV
                    </a>
                </div>

                {/* ============ VISITORS ============ */}
                <SectionTitle>Visitors</SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total visits" value={stats.total} icon={I.users} tone="indigo" />
                    <StatCard label="Unique visitors" value={stats.unique} icon={I.id} tone="sky" />
                    <StatCard
                        label="Avg. visit duration"
                        value={formatDuration(stats.avg_minutes)}
                        icon={I.clock}
                        tone="green"
                    />
                    <StatCard
                        label="Busiest day"
                        value={stats.busiest ? stats.busiest.count : '—'}
                        sub={
                            stats.busiest
                                ? formatDay(stats.busiest.date)
                                : 'No visits in range'
                        }
                        icon={I.peak}
                        tone="amber"
                    />
                </div>

                <Panel title="Visits per day" subtitle={rangeLabel}>
                    <AreaTrend daily={daily} unit="visit" />
                </Panel>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Panel title="By purpose">
                        <RankedBar items={byPurpose} empty="No data for this range." />
                    </Panel>
                    <Panel title="Top hosts">
                        <RankedBar
                            items={topHosts.map((h) => ({
                                label: h.host,
                                count: h.count,
                            }))}
                            empty="No data for this range."
                        />
                    </Panel>
                </div>

                {/* ============ SUPPLIER DELIVERY ============ */}
                <SectionTitle tone="bg-green-500">Supplier Delivery</SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Deliveries" value={supplier.total} icon={I.box} tone="green" />
                    <StatCard label="On site" value={supplier.on_site} icon={I.truck} tone="amber" />
                    <StatCard label="Checked out" value={supplier.checked_out} icon={I.check} tone="gray" />
                    <StatCard label="Items received" value={supplier.items} icon={I.scale} tone="sky" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Panel title="Top suppliers">
                        <RankedBar
                            items={supplier.top_suppliers}
                            empty="No supplier deliveries in this range."
                        />
                    </Panel>
                    <Panel title="Supplier status">
                        <CategoryDoughnut
                            items={supplier.by_status}
                            empty="No supplier deliveries in this range."
                        />
                    </Panel>
                </div>

                {/* ============ DELIVERY LOG ============ */}
                <SectionTitle tone="bg-sky-500">Delivery Log</SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Dispatches" value={delivery.total} icon={I.truck} tone="sky" />
                    <StatCard label="On the road" value={delivery.out} icon={I.box} tone="amber" />
                    <StatCard label="Returned" value={delivery.returned} icon={I.check} tone="green" />
                    <StatCard
                        label="Missing items"
                        value={delivery.missing_items}
                        sub={
                            delivery.short_deliveries > 0
                                ? `${delivery.short_deliveries} deliver${delivery.short_deliveries === 1 ? 'y' : 'ies'} with shortages`
                                : 'No shortages'
                        }
                        icon={I.alert}
                        tone="rose"
                    />
                </div>

                <Panel title="Dispatches by route">
                    <RankedBar
                        items={delivery.by_route}
                        empty="No deliveries in this range."
                    />
                </Panel>

                {/* ============ SCRAP DISPOSAL ============ */}
                <SectionTitle tone="bg-amber-500">Scrap Disposal</SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Disposals" value={scrap.total} icon={I.trash} tone="gray" />
                    <StatCard label="Total quantity" value={scrap.qty} icon={I.scale} tone="amber" />
                    <StatCard
                        label="Amount recovered"
                        value={formatPeso(scrap.amount)}
                        icon={I.peso}
                        tone="green"
                    />
                    <StatCard
                        label="Methods used"
                        value={scrap.by_method.length}
                        sub="sold · recycled · hauled · discarded"
                        icon={I.box}
                        tone="indigo"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Panel title="By disposal method">
                        <CategoryDoughnut
                            items={scrap.by_method}
                            empty="No disposals in this range."
                        />
                    </Panel>
                    <Panel title="By category">
                        <RankedBar
                            items={scrap.by_category}
                            empty="No disposals in this range."
                        />
                    </Panel>
                </div>

                {/* ============ INCIDENT & ACCIDENT ============ */}
                <SectionTitle tone="bg-rose-500">
                    Incident &amp; Accident Reports
                </SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total reports" value={incidents.total} icon={I.alert} tone="rose" />
                    <StatCard
                        label="Incidents"
                        value={incidents.incident}
                        sub={`${incidents.accident} accident${incidents.accident === 1 ? '' : 's'}`}
                        icon={I.alert}
                        tone="amber"
                    />
                    <StatCard
                        label="Open"
                        value={incidents.open}
                        sub={`${incidents.under_review} under review`}
                        icon={I.clock}
                        tone="indigo"
                    />
                    <StatCard label="Resolved" value={incidents.resolved} icon={I.check} tone="green" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Panel title="By severity">
                        <SeverityDoughnut
                            items={incidents.by_severity}
                            empty="No reports in this range."
                        />
                    </Panel>
                    <Panel title="By category">
                        <CategoryDoughnut
                            items={incidents.by_category}
                            empty="No categories tagged in this range."
                        />
                    </Panel>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
