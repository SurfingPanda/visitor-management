import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

/* ---------- helpers ---------- */

const statusStyles = {
    active: 'bg-green-100 text-green-700 ring-green-600/20',
    inactive: 'bg-gray-100 text-gray-500 ring-gray-500/20',
    out: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    returned: 'bg-green-100 text-green-700 ring-green-600/20',
};

const deliveryStatusLabels = {
    out: 'On the road',
    returned: 'Returned',
};

const statTones = {
    all: 'bg-indigo-50 text-indigo-700',
    out: 'bg-amber-50 text-amber-700',
    returned: 'bg-green-50 text-green-700',
    dispatched: 'bg-sky-50 text-sky-700',
    missing: 'bg-red-50 text-red-700',
};

function Badge({ label, styles }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles}`}
        >
            {label}
        </span>
    );
}

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function initials(name = '') {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/* ---------- small presentational pieces ---------- */

function Field({ label, value, sub }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
            </dt>
            <dd className="mt-1 truncate text-sm font-medium text-gray-800">
                {value || '—'}
            </dd>
            {sub && <dd className="truncate text-xs text-gray-400">{sub}</dd>}
        </div>
    );
}

function StatTile({ label, value, tone }) {
    return (
        <div className={`rounded-xl p-4 ${tone}`}>
            <p className="text-xs font-medium">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

const PersonIcon = (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
);

/* ---------- page ---------- */

export default function HelperShow({ helper, deliveries, stats }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link
                        href={route('helpers.index')}
                        className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-500 shadow-sm transition hover:bg-gray-50"
                        aria-label="Back to helpers"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold leading-tight text-gray-800">
                            {helper.name}
                        </h2>
                        <p className="hidden text-sm text-gray-500 sm:block">
                            Delivery history and totals for this helper
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`Helper · ${helper.name}`} />

            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Helper summary */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">
                                {helper.name ? initials(helper.name) : PersonIcon}
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {helper.name}
                                    </h3>
                                    <Badge
                                        label={helper.status}
                                        styles={statusStyles[helper.status] ?? statusStyles.inactive}
                                    />
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                    {helper.license_number
                                        ? `ID ${helper.license_number}`
                                        : 'No ID on file'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Full detail grid */}
                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-3 lg:grid-cols-5">
                        <Field label="Phone" value={helper.phone} />
                        <Field label="Email" value={helper.email} />
                        <Field label="Address" value={helper.address} />
                        <Field
                            label="Registered"
                            value={formatDate(helper.created_at)}
                            sub={helper.registrant_name ? `by ${helper.registrant_name}` : null}
                        />
                        <Field label="Notes" value={helper.notes} />
                    </dl>
                </div>

                {/* Delivery stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <StatTile label="Deliveries" value={stats.total} tone={statTones.all} />
                    <StatTile label="On the road" value={stats.out} tone={statTones.out} />
                    <StatTile label="Returned" value={stats.returned} tone={statTones.returned} />
                    <StatTile label="Items dispatched" value={stats.dispatched} tone={statTones.dispatched} />
                    <StatTile label="Items missing" value={stats.missing} tone={statTones.missing} />
                </div>

                {/* Delivery history */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                        <h3 className="text-base font-semibold text-gray-900">
                            Delivery history
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {stats.total} {stats.total === 1 ? 'delivery' : 'deliveries'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Out</th>
                                    <th className="px-6 py-3">Plate</th>
                                    <th className="px-6 py-3">Route</th>
                                    <th className="px-6 py-3">Driver</th>
                                    <th className="px-6 py-3 text-right">Load</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Missing</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {deliveries.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDateTime(d.delivery_out)}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {d.plate_number}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.route || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.driver || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums text-gray-800">
                                            {d.load}
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge
                                                label={deliveryStatusLabels[d.status] ?? d.status}
                                                styles={statusStyles[d.status] ?? statusStyles.out}
                                            />
                                            {d.status === 'returned' && d.returned_at && (
                                                <div className="mt-0.5 text-xs text-gray-400">
                                                    {formatDateTime(d.returned_at)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {d.missing === null ? (
                                                <span className="text-gray-300">—</span>
                                            ) : d.missing > 0 ? (
                                                <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-red-700">
                                                    {d.missing}
                                                </span>
                                            ) : (
                                                <span className="tabular-nums text-gray-400">0</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {deliveries.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-14 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                    {PersonIcon}
                                                </span>
                                                <p className="mt-3 text-sm font-medium text-gray-600">
                                                    No deliveries yet
                                                </p>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Deliveries logged with this helper will appear here.
                                                </p>
                                                <Link
                                                    href={route('delivery-logs.index')}
                                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                >
                                                    Go to Delivery Log
                                                </Link>
                                            </div>
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
