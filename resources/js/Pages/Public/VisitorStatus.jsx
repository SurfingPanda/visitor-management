import VisitorPassCard from '@/Components/VisitorPassCard';
import { downloadPdf, downloadPng } from '@/lib/exportCard';
import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

const statusMeta = {
    pending: {
        label: 'Awaiting approval',
        note: 'Your request has been received and is waiting for front-desk review. Please proceed to the front desk on arrival.',
        dot: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        icon: (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </svg>
        ),
        ring: 'bg-amber-100 text-amber-600',
    },
    approved: {
        label: 'Approved',
        note: 'You are cleared to visit. Please proceed to the front desk to collect your visitor badge.',
        dot: 'bg-green-500',
        chip: 'bg-green-50 text-green-700 ring-green-600/20',
        icon: (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
            </svg>
        ),
        ring: 'bg-green-100 text-green-600',
    },
    declined: {
        label: 'Declined',
        note: 'This request was not approved. Please contact the front desk if you believe this is a mistake.',
        dot: 'bg-gray-400',
        chip: 'bg-gray-100 text-gray-600 ring-gray-500/20',
        icon: (
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="m15 9-6 6M9 9l6 6" />
            </svg>
        ),
        ring: 'bg-gray-100 text-gray-500',
    },
};

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function VisitorStatusPage({ query, result }) {
    const [ref, setRef] = useState(query ?? '');
    const passRef = useRef(null);
    const [saving, setSaving] = useState(null); // 'png' | 'pdf' | null

    const savePass = async (kind) => {
        setSaving(kind);
        try {
            const filename = `visitor-pass-${result?.reference ?? 'card'}`;
            if (kind === 'png') await downloadPng(passRef.current, filename);
            else await downloadPdf(passRef.current, filename);
        } finally {
            setSaving(null);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        router.get(
            route('visit.status'),
            { ref },
            { preserveScroll: true, preserveState: true },
        );
    };

    const meta = result?.found ? statusMeta[result.status] : null;

    return (
        <>
            <Head title="Check request status" />

            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
                {/* Brand header */}
                <div className="mx-auto mb-8 flex max-w-xl items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 p-1.5 shadow-sm">
                        <img
                            src="/images/secora-logo.png"
                            alt="Secora"
                            className="h-full w-full object-contain"
                        />
                    </span>
                    <div>
                        <p className="text-lg font-bold leading-tight text-gray-900">
                            Eljin Corporation
                        </p>
                        <p className="text-sm text-gray-500">
                            Check request status
                        </p>
                    </div>
                </div>

                <div className="mx-auto max-w-xl space-y-5">
                    {/* Search */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                        <h2 className="text-xl font-bold text-gray-900">
                            Track your visit request
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Enter the reference code from your confirmation (e.g.
                            REQ-7QK4M2XP).
                        </p>

                        <form onSubmit={submit} className="mt-5 flex gap-3">
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={ref}
                                    onChange={(e) => setRef(e.target.value)}
                                    placeholder="REQ-7QK4M2XP"
                                    autoFocus
                                    className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                Check
                            </button>
                        </form>
                    </div>

                    {/* Result */}
                    {result && !result.found && (
                        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                            </span>
                            <h3 className="mt-4 text-base font-semibold text-gray-900">
                                No request found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                We couldn&apos;t find a request for
                                {query ? ` “${query}”` : ' that reference'}.
                                Double-check the reference number and try again.
                            </p>
                        </div>
                    )}

                    {/* Approved: show the full pass with QR the visitor presents */}
                    {result?.found && result.status === 'approved' && (
                        <div className="flex flex-col items-center gap-4">
                            <div ref={passRef}>
                                <VisitorPassCard
                                    name={result.name}
                                    company={result.company}
                                    contactPerson={result.contact_person}
                                    visitorSignature={result.signature_url}
                                    approverName={result.approver_name}
                                    approverSignature={
                                        result.approver_signature_url
                                    }
                                    qrToken={result.qr_token}
                                    badgeNumber={result.badge_number}
                                    visitDate={result.visit_date}
                                    status="approved"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => savePass('png')}
                                    disabled={saving !== null}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <path d="M7 10l5 5 5-5" />
                                        <path d="M12 15V3" />
                                    </svg>
                                    {saving === 'png' ? 'Saving…' : 'Download PNG'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => savePass('pdf')}
                                    disabled={saving !== null}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <path d="M7 10l5 5 5-5" />
                                        <path d="M12 15V3" />
                                    </svg>
                                    {saving === 'pdf' ? 'Saving…' : 'Download PDF'}
                                </button>
                            </div>

                            <p className="text-center text-sm text-gray-600">
                                You&apos;re approved — show this QR code at the
                                front desk to collect your badge.
                            </p>
                        </div>
                    )}

                    {result?.found && meta && result.status !== 'approved' && (
                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                                <span
                                    className={
                                        'flex h-14 w-14 items-center justify-center rounded-full ' +
                                        meta.ring
                                    }
                                >
                                    {meta.icon}
                                </span>
                                <span
                                    className={
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-sm font-medium ring-1 ring-inset ' +
                                        meta.chip
                                    }
                                >
                                    <span
                                        className={
                                            'h-1.5 w-1.5 rounded-full ' + meta.dot
                                        }
                                    />
                                    {meta.label}
                                </span>
                                <p className="max-w-sm text-sm text-gray-600">
                                    {meta.note}
                                </p>
                                {result.status === 'declined' &&
                                    result.decline_reason && (
                                        <p className="max-w-sm rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 ring-1 ring-inset ring-gray-200">
                                            <span className="font-medium text-gray-700">
                                                Reason:
                                            </span>{' '}
                                            {result.decline_reason}
                                        </p>
                                    )}
                            </div>

                            <dl className="divide-y divide-gray-100 border-t border-gray-100 px-6 py-2 text-sm">
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-gray-400">Reference</dt>
                                    <dd className="font-mono font-medium text-indigo-600">
                                        {result.reference}
                                    </dd>
                                </div>
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-gray-400">Name</dt>
                                    <dd className="font-medium text-gray-900">
                                        {result.name}
                                    </dd>
                                </div>
                                {result.company && (
                                    <div className="flex justify-between py-2.5">
                                        <dt className="text-gray-400">Company</dt>
                                        <dd className="text-gray-700">
                                            {result.company}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-gray-400">Visiting</dt>
                                    <dd className="text-gray-700">
                                        {result.contact_person}
                                    </dd>
                                </div>
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-gray-400">Submitted</dt>
                                    <dd className="text-gray-700">
                                        {formatDate(result.created_at)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}

                    {/* Footer link */}
                    <p className="text-center text-sm text-gray-500">
                        Need to register?{' '}
                        <a
                            href={route('visit.create')}
                            className="font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                            Request a visit
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}
