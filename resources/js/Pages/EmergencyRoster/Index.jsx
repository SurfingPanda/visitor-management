import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

/* ---------- helpers ---------- */

function formatTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatStamp(value) {
    const d = value ? new Date(value) : new Date();
    return d.toLocaleString([], {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/* ---------- tick-off row ---------- */

function CheckBox({ done }) {
    return (
        <span
            className={
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ' +
                (done
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-400 bg-white')
            }
        >
            {done && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            )}
        </span>
    );
}

/* ---------- page ---------- */

export default function EmergencyRoster({ visitors, employees, counts, generatedAt }) {
    // Names ticked off at the muster point (on-screen aid).
    const [accounted, setAccounted] = useState(() => new Set());

    const toggle = (key) =>
        setAccounted((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    const refresh = () =>
        router.reload({ only: ['visitors', 'employees', 'counts', 'generatedAt'] });

    const remaining = counts.visitors + counts.employees - accounted.size;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Emergency Roster
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Everyone currently on-site — for evacuation headcounts
                    </p>
                </div>
            }
        >
            <Head title="Emergency Roster" />

            <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:py-0">
                {/* Screen toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <p className="text-sm text-gray-500">
                        Live headcount · people not yet accounted for:{' '}
                        <span className="font-semibold text-gray-900">
                            {remaining}
                        </span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9V2h12v7" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" rx="1" />
                            </svg>
                            Print roster
                        </button>
                    </div>
                </div>

                {/* Title block (screen + print) */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
                    <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 print:pb-2">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 print:text-2xl">
                                ELJIN CORP — Emergency On-site Roster
                            </h1>
                            <p className="mt-0.5 text-sm text-gray-500">
                                As of {formatStamp(generatedAt)}
                            </p>
                        </div>
                        <div className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-center text-white print:bg-white print:text-black print:ring-1 print:ring-black">
                            <p className="text-3xl font-extrabold leading-none">
                                {counts.total}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-widest">
                                On-site
                            </p>
                        </div>
                    </div>

                    {/* Headcount breakdown */}
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center print:mt-2">
                        <div className="rounded-lg bg-gray-50 py-2 print:bg-transparent">
                            <p className="text-xl font-bold text-gray-900">
                                {counts.visitors}
                            </p>
                            <p className="text-xs text-gray-500">Visitors</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 py-2 print:bg-transparent">
                            <p className="text-xl font-bold text-gray-900">
                                {counts.companions}
                            </p>
                            <p className="text-xs text-gray-500">With them</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 py-2 print:bg-transparent">
                            <p className="text-xl font-bold text-gray-900">
                                {counts.employees}
                            </p>
                            <p className="text-xs text-gray-500">Staff</p>
                        </div>
                    </div>
                </div>

                {/* Visitors */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border print:shadow-none">
                    <div className="flex items-center justify-between bg-gray-50 px-5 py-3 print:bg-transparent">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                            Visitors on-site
                        </h3>
                        <span className="text-sm font-semibold text-gray-500">
                            {counts.visitors}
                            {counts.companions > 0 && ` (+${counts.companions} with them)`}
                        </span>
                    </div>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <th className="w-10 px-5 py-2"></th>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Company</th>
                                <th className="px-3 py-2">Host</th>
                                <th className="px-3 py-2">With them</th>
                                <th className="px-3 py-2">In</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visitors.map((v) => {
                                const key = `v${v.id}`;
                                const done = accounted.has(key);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => toggle(key)}
                                        className={
                                            'cursor-pointer align-middle print:cursor-auto ' +
                                            (done ? 'bg-green-50 text-gray-400 line-through print:bg-transparent print:text-black print:no-underline' : 'hover:bg-gray-50')
                                        }
                                    >
                                        <td className="px-5 py-2.5">
                                            <CheckBox done={done} />
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-900 print:text-black">
                                            {v.name}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">
                                            {v.company ?? '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">
                                            {v.host}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {v.companions > 0 ? (
                                                <span className="font-semibold text-gray-900">
                                                    +{v.companions}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500">
                                            {formatTime(v.checked_in_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {visitors.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                                        No visitors on-site.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>

                {/* Employees */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border print:shadow-none">
                    <div className="flex items-center justify-between bg-gray-50 px-5 py-3 print:bg-transparent">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                            Staff on-site
                        </h3>
                        <span className="text-sm font-semibold text-gray-500">
                            {counts.employees}
                        </span>
                    </div>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <th className="w-10 px-5 py-2"></th>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">PIN</th>
                                <th className="px-3 py-2">In</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {employees.map((e) => {
                                const key = `e${e.id}`;
                                const done = accounted.has(key);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => toggle(key)}
                                        className={
                                            'cursor-pointer align-middle print:cursor-auto ' +
                                            (done ? 'bg-green-50 text-gray-400 line-through print:bg-transparent print:text-black print:no-underline' : 'hover:bg-gray-50')
                                        }
                                    >
                                        <td className="px-5 py-2.5">
                                            <CheckBox done={done} />
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-900 print:text-black">
                                            {e.name}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500">
                                            {e.device_pin ?? '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500">
                                            {formatTime(e.checked_in_at)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                                        No staff on-site.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>

                {/* Print footer / sign-off */}
                <div className="hidden items-end justify-between pt-6 text-sm text-gray-600 print:flex">
                    <div>
                        <p className="mb-6">Warden name: _______________________</p>
                        <p>Signature: _______________________</p>
                    </div>
                    <p className="text-xs text-gray-400">
                        All persons accounted for? ☐ Yes ☐ No
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
