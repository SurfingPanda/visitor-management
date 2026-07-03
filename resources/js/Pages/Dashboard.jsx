import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

/* ---------- helpers ---------- */

const statusStyles = {
    checked_in: 'bg-green-100 text-green-700',
    checked_out: 'bg-gray-100 text-gray-600',
    expected: 'bg-amber-100 text-amber-700',
};
const statusLabels = {
    checked_in: 'On-site',
    checked_out: 'Checked out',
    expected: 'Expected',
};

function initials(name = '') {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('');
}

function formatTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const donutColors = ['#6366f1', '#38bdf8', '#22c55e', '#f59e0b', '#cbd5e1'];

/* ---------- mini charts ---------- */

function Sparkline({ data, color }) {
    const max = Math.max(1, ...data);
    const w = 80;
    const h = 32;
    const pts = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - (v / max) * (h - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-20" preserveAspectRatio="none">
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

function TrendChart({ data }) {
    const W = 720;
    const H = 260;
    const padL = 34;
    const padR = 14;
    const padT = 16;
    const padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const niceMax = Math.max(10, Math.ceil(maxCount / 10) * 10);
    const n = data.length;

    const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v) => padT + innerH - (v / niceMax) * innerH;

    const linePath = data
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`)
        .join(' ');
    const areaPath =
        `M ${x(0)} ${y(0)} ` +
        data.map((d, i) => `L ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ') +
        ` L ${x(n - 1)} ${y(0)} Z`;

    const yTicks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full">
            <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
            </defs>

            {yTicks.map((t, i) => (
                <g key={i}>
                    <line
                        x1={padL}
                        x2={W - padR}
                        y1={y(t)}
                        y2={y(t)}
                        stroke="#eef2f7"
                        strokeWidth="1"
                    />
                    <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-400 text-[11px]">
                        {Math.round(t)}
                    </text>
                </g>
            ))}

            <path d={areaPath} fill="url(#trendFill)" />
            <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />

            {data.map((d, i) => (
                <g key={i}>
                    <circle cx={x(i)} cy={y(d.count)} r="3.5" fill="#fff" stroke="#6366f1" strokeWidth="2">
                        <title>{`${d.date}: ${d.count}`}</title>
                    </circle>
                    <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-gray-400 text-[11px]">
                        {d.label}
                    </text>
                </g>
            ))}
        </svg>
    );
}

function Donut({ segments }) {
    const r = 60;
    const c = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.count, 0);
    let acc = 0;
    return (
        <div className="relative h-44 w-44 shrink-0">
            <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
                <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
                {segments.map((s, i) => {
                    const len = (s.pct / 100) * c;
                    const off = acc;
                    acc += len;
                    return (
                        <circle
                            key={i}
                            cx="80"
                            cy="80"
                            r={r}
                            fill="none"
                            stroke={donutColors[i % donutColors.length]}
                            strokeWidth="20"
                            strokeDasharray={`${len} ${c - len}`}
                            strokeDashoffset={-off}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{total}</span>
                <span className="text-xs text-gray-400">visits</span>
            </div>
        </div>
    );
}

/* ---------- cards ---------- */

function StatCard({ label, value, accent, spark, icon, footer }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${accent.bg}`}>
                            {icon}
                        </span>
                        <span className="text-sm font-medium text-gray-500">{label}</span>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
                    <div className="mt-1 text-xs">{footer}</div>
                </div>
                {spark && spark.length > 1 && (
                    <Sparkline data={spark} color={accent.line} />
                )}
            </div>
        </div>
    );
}

function QuickAction({ href, title, subtitle, tone, icon }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-xl p-4 transition hover:brightness-95 ${tone.bg}`}
        >
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone.icon}`}>
                {icon}
            </span>
            <div>
                <p className={`text-sm font-semibold ${tone.title}`}>{title}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </Link>
    );
}

/* ---------- page ---------- */

const deliveryStatusStyles = {
    out: 'bg-amber-100 text-amber-700',
    returned: 'bg-green-100 text-green-700',
};
const deliveryStatusLabels = {
    out: 'On the road',
    returned: 'Returned',
};

export default function Dashboard({
    stats,
    trend,
    sparks,
    recentVisitors,
    activity,
    byPurpose,
    onsiteSummary,
    delivery,
}) {
    const user = usePage().props.auth.user;
    const modules = usePage().props.auth.modules ?? [];
    const can = (m) => user.is_admin || modules.includes(m);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-gray-900">
                        {greeting}, {user.name}! 👋
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Here’s what’s happening at the front desk.
                    </p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* Top actions */}
                <div className="animate-dash-reveal flex items-center justify-between gap-3" style={{ animationDelay: '0ms' }}>
                    <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600">
                        {new Date().toLocaleDateString([], {
                            weekday: 'short',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </span>
                    <Link
                        href={route('visitors.index')}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Register Visitor
                    </Link>
                </div>

                {/* Stat cards */}
                <div className="animate-dash-reveal grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '80ms' }}>
                    <StatCard
                        label="Currently On-site"
                        value={stats.on_site}
                        accent={{ bg: 'bg-indigo-500', line: '#6366f1' }}
                        spark={sparks.on_site}
                        icon={
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            </svg>
                        }
                        footer={
                            stats.change_pct === null ? (
                                <span className="text-gray-400">No data yesterday</span>
                            ) : (
                                <span className={stats.change_pct >= 0 ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                                    {stats.change_pct >= 0 ? '↑' : '↓'} {Math.abs(stats.change_pct)}% from yesterday
                                </span>
                            )
                        }
                    />
                    <StatCard
                        label="Expected Today"
                        value={stats.expected}
                        accent={{ bg: 'bg-orange-500', line: '#f97316' }}
                        icon={
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                        }
                        footer={
                            <Link href={route('visitors.index', { status: 'expected' })} className="font-medium text-indigo-600 hover:text-indigo-700">
                                View schedule →
                            </Link>
                        }
                    />
                    <StatCard
                        label="Checked In Today"
                        value={stats.checked_in_today}
                        accent={{ bg: 'bg-green-500', line: '#22c55e' }}
                        spark={sparks.checked_in}
                        icon={
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <path d="m10 17 5-5-5-5M15 12H3" />
                            </svg>
                        }
                        footer={
                            <Link href={route('visitors.index', { status: 'checked_in' })} className="font-medium text-indigo-600 hover:text-indigo-700">
                                View all →
                            </Link>
                        }
                    />
                    <StatCard
                        label="Checked Out Today"
                        value={stats.checked_out_today}
                        accent={{ bg: 'bg-blue-500', line: '#3b82f6' }}
                        spark={sparks.checked_out}
                        icon={
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <path d="m16 17 5-5-5-5M21 12H9" />
                            </svg>
                        }
                        footer={
                            <Link href={route('visitors.index', { status: 'checked_out' })} className="font-medium text-indigo-600 hover:text-indigo-700">
                                View history →
                            </Link>
                        }
                    />
                </div>

                {/* Quick actions / recent / activity */}
                <div className="animate-dash-reveal grid grid-cols-1 gap-6 xl:grid-cols-12" style={{ animationDelay: '160ms' }}>
                    {/* Quick actions */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-3">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Quick Actions</h3>
                        <div className="space-y-3">
                            {can('front_desk') && (
                                <QuickAction
                                    href={route('visitors.index')}
                                    title="Register Walk-in"
                                    subtitle="Add new visitor"
                                    tone={{ bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-600', title: 'text-sky-700' }}
                                    icon={
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
                                        </svg>
                                    }
                                />
                            )}
                            {can('delivery_logs') && (
                                <QuickAction
                                    href={route('delivery-logs.index')}
                                    title="Add Delivery Log"
                                    subtitle="Record an outgoing delivery"
                                    tone={{ bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', title: 'text-indigo-700' }}
                                    icon={
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" />
                                        </svg>
                                    }
                                />
                            )}
                            {can('supplier_deliveries') && (
                                <QuickAction
                                    href={route('supplier-deliveries.index')}
                                    title="Add Supplier Delivery"
                                    subtitle="Log an incoming delivery"
                                    tone={{ bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', title: 'text-green-700' }}
                                    icon={
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                                        </svg>
                                    }
                                />
                            )}
                            {can('incidents') && (
                                <QuickAction
                                    href={route('incident-reports.index')}
                                    title="Log Incident Report"
                                    subtitle="Report an incident or accident"
                                    tone={{ bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', title: 'text-amber-700' }}
                                    icon={
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                                        </svg>
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {/* Recent visitors */}
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm xl:col-span-6">
                        <div className="flex items-center justify-between px-6 py-4">
                            <h3 className="text-base font-semibold text-gray-900">Recent Visitors</h3>
                            <Link href={route('visitors.index')} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                                View all
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        <th className="px-6 py-2">Visitor</th>
                                        <th className="px-6 py-2">Host</th>
                                        <th className="px-6 py-2">Purpose</th>
                                        <th className="px-6 py-2">In / Out</th>
                                        <th className="px-6 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recentVisitors.map((v) => (
                                        <tr key={v.id} className="hover:bg-gray-50/70">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                                                        {initials(v.name)}
                                                    </span>
                                                    <div>
                                                        <Link href={route('visitors.show', v.id)} className="font-medium text-gray-900 hover:text-indigo-600">
                                                            {v.name}
                                                        </Link>
                                                        <div className="text-xs text-gray-400">{v.company ?? '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{v.host}</td>
                                            <td className="px-6 py-3 text-gray-600">{v.purpose ?? '—'}</td>
                                            <td className="px-6 py-3 text-gray-500">{formatTime(v.checked_in_at)}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[v.status] ?? statusStyles.expected}`}>
                                                    {statusLabels[v.status] ?? v.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentVisitors.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No visitors yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-gray-50 py-3 text-center">
                            <Link href={route('visitors.index')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                View all visitors →
                            </Link>
                        </div>
                    </div>

                    {/* Today's activity */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-3">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Today’s Activity</h3>
                        <ul className="space-y-4">
                            {activity.map((a, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {a.type === 'in' ? (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10 17 5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m16 17 5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></svg>
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-semibold">{a.name}</span>{' '}
                                            {a.type === 'in' ? 'checked in' : 'checked out'}
                                        </p>
                                        <p className="truncate text-xs text-gray-400">{a.detail}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-gray-400">{a.time}</span>
                                </li>
                            ))}
                            {activity.length === 0 && (
                                <li className="text-sm text-gray-400">No activity yet today.</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Trend / purpose / summary */}
                <div className="animate-dash-reveal grid grid-cols-1 gap-6 xl:grid-cols-12" style={{ animationDelay: '240ms' }}>
                    {/* Visitor trend */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-6">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">Visitor Trend</h3>
                            <span className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">This Week</span>
                        </div>
                        <TrendChart data={trend} />
                    </div>

                    {/* By purpose */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-3">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Visitors by Purpose</h3>
                        <div className="flex items-center gap-4">
                            <Donut segments={byPurpose} />
                            <ul className="flex-1 space-y-2 text-sm">
                                {byPurpose.map((p, i) => (
                                    <li key={p.label} className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: donutColors[i % donutColors.length] }} />
                                        <span className="flex-1 text-gray-600">{p.label}</span>
                                        <span className="font-medium text-gray-900">{p.pct}%</span>
                                        <span className="text-xs text-gray-400">({p.count})</span>
                                    </li>
                                ))}
                                {byPurpose.length === 0 && <li className="text-gray-400">No data.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* On-site summary */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-3">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">On-site Summary</h3>
                        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                </svg>
                            </span>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{onsiteSummary.on_site}</p>
                                <p className="text-xs text-gray-500">Visitors currently on-site</p>
                            </div>
                        </div>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-gray-500">Longest on-site</dt>
                                <dd className="font-semibold text-gray-900">{formatDuration(onsiteSummary.longest_minutes)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-gray-500">Average duration</dt>
                                <dd className="font-semibold text-gray-900">{formatDuration(onsiteSummary.avg_minutes)}</dd>
                            </div>
                        </dl>

                    </div>
                </div>

                {/* Delivery Log */}
                <div className="animate-dash-reveal rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={{ animationDelay: '320ms' }}>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900">Delivery Log</h3>
                        <Link
                            href={route('delivery-logs.index')}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            View all
                        </Link>
                    </div>

                    {/* Delivery stat tiles */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <div className="rounded-xl bg-amber-50 p-4">
                            <p className="text-xs font-medium text-amber-700">On the road</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{delivery.on_the_road}</p>
                        </div>
                        <div className="rounded-xl bg-indigo-50 p-4">
                            <p className="text-xs font-medium text-indigo-700">Dispatched today</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{delivery.dispatched_today}</p>
                        </div>
                        <div className="rounded-xl bg-green-50 p-4">
                            <p className="text-xs font-medium text-green-700">Returned today</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{delivery.returned_today}</p>
                        </div>
                        <div className="rounded-xl bg-red-50 p-4">
                            <p className="text-xs font-medium text-red-700">Missing items</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{delivery.missing_items}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                                {delivery.short_deliveries > 0
                                    ? `${delivery.short_deliveries} deliver${delivery.short_deliveries === 1 ? 'y' : 'ies'} with shortages`
                                    : 'No shortages'}
                            </p>
                        </div>
                    </div>

                    {/* Recent dispatches */}
                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-3 py-2">Plate</th>
                                    <th className="px-3 py-2">Route</th>
                                    <th className="px-3 py-2">Driver</th>
                                    <th className="px-3 py-2">Dispatched</th>
                                    <th className="px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {delivery.recent.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50/70">
                                        <td className="px-3 py-3 font-medium text-gray-900">{d.plate_number}</td>
                                        <td className="px-3 py-3 text-gray-600">{d.route || '—'}</td>
                                        <td className="px-3 py-3 text-gray-600">{d.driver || '—'}</td>
                                        <td className="px-3 py-3 text-gray-500">{formatDateTime(d.delivery_out)}</td>
                                        <td className="px-3 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${deliveryStatusStyles[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {deliveryStatusLabels[d.status] ?? d.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {delivery.recent.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-10 text-center text-gray-400">
                                            No deliveries logged yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
