import Modal from '@/Components/Modal';
import SignaturePad from '@/Components/SignaturePad';
import VisitorPassCard from '@/Components/VisitorPassCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { downloadPdf, downloadPng } from '@/lib/exportCard';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusStyles = {
    pending: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    approved: 'bg-green-100 text-green-700 ring-green-600/20',
    declined: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const statusLabels = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
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

const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
];

export default function VisitorRequestsIndex({ requests, filters, counts }) {
    const flash = usePage().props.flash;
    const authUser = usePage().props.auth.user;
    const [toast, setToast] = useState(null);
    const [preview, setPreview] = useState(null); // signature preview modal
    const [approving, setApproving] = useState(null); // request being approved
    const [declining, setDeclining] = useState(null); // request being declined
    const [viewingPass, setViewingPass] = useState(null); // approved pass viewer
    const [padKey, setPadKey] = useState(0);

    const approveForm = useForm({
        approver_name: '',
        approver_signature: '',
    });

    const declineForm = useForm({
        reason: '',
    });

    const passRef = useRef(null);
    const [saving, setSaving] = useState(null); // 'png' | 'pdf' | null

    const savePass = async (kind) => {
        setSaving(kind);
        try {
            const filename = `visitor-pass-${viewingPass?.reference ?? 'card'}`;
            if (kind === 'png') await downloadPng(passRef.current, filename);
            else await downloadPdf(passRef.current, filename);
        } finally {
            setSaving(null);
        }
    };

    useEffect(() => {
        const next = flash?.success
            ? { text: flash.success, tone: 'success' }
            : flash?.error
              ? { text: flash.error, tone: 'error' }
              : null;
        if (next) {
            setToast(next);
            const id = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(id);
        }
    }, [flash?.success, flash?.error]);

    const setStatus = (status) =>
        router.get(
            route('visitor-requests.index'),
            { status },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const openApprove = (r) => {
        approveForm.clearErrors();
        // Prefill with the logged-in user's name; editable, and the audit link
        // (approved_by) is set server-side to the authenticated user regardless.
        approveForm.setData({
            approver_name: authUser?.name ?? '',
            approver_signature: '',
        });
        setPadKey((k) => k + 1);
        setApproving(r);
    };

    const submitApprove = (e) => {
        e.preventDefault();
        approveForm.post(route('visitor-requests.approve', approving.id), {
            preserveScroll: true,
            onSuccess: () => setApproving(null),
        });
    };

    const openDecline = (r) => {
        declineForm.clearErrors();
        declineForm.setData({ reason: '' });
        setDeclining(r);
    };

    const submitDecline = (e) => {
        e.preventDefault();
        declineForm.patch(route('visitor-requests.decline', declining.id), {
            preserveScroll: true,
            onSuccess: () => setDeclining(null),
        });
    };

    const remove = (r) => {
        if (confirm(`Remove ${r.name}'s request? This cannot be undone.`)) {
            router.delete(route('visitor-requests.destroy', r.id), { preserveScroll: true });
        }
    };

    const cleanUp = () => {
        if (
            confirm(
                'Clean up requests?\n\nThis will decline pending requests older than 7 days and permanently remove records (with their signatures) older than 30 days.',
            )
        ) {
            router.post(
                route('visitor-requests.prune'),
                {},
                { preserveScroll: true },
            );
        }
    };

    const countFor = (key) => counts[key];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Visitor Requests
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Self-service submissions from the public registration page
                    </p>
                </div>
            }
        >
            <Head title="Visitor Requests" />

            {toast && (
                <div
                    className={
                        'fixed right-4 top-20 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ' +
                        (toast.tone === 'error' ? 'bg-red-600' : 'bg-green-600')
                    }
                >
                    {toast.text}
                </div>
            )}

            <div className="space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                {/* Tabs + public link */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
                        {tabs.map((t) => {
                            const active = (filters.status ?? 'pending') === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setStatus(t.key)}
                                    className={
                                        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                                        (active
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800')
                                    }
                                >
                                    {t.label}
                                    <span
                                        className={
                                            'rounded-full px-1.5 text-xs ' +
                                            (active
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'bg-gray-200 text-gray-500')
                                        }
                                    >
                                        {countFor(t.key)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {authUser?.is_admin && (
                            <button
                                type="button"
                                onClick={cleanUp}
                                title="Decline stale pending requests and purge old records"
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <path d="M10 11v6M14 11v6" />
                                </svg>
                                Clean up
                            </button>
                        )}
                        <a
                            href={route('visit.create')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <path d="M15 3h6v6" />
                                <path d="M10 14 21 3" />
                            </svg>
                            Open public form
                        </a>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">ID #</th>
                                    <th className="px-6 py-3">Visitor</th>
                                    <th className="px-6 py-3">Contact person</th>
                                    <th className="px-6 py-3">Signature</th>
                                    <th className="px-6 py-3">Submitted</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {requests.data.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/70">
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className="font-mono text-[11px] font-medium tracking-wide text-indigo-500">
                                                {r.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">
                                                {r.name}
                                            </div>
                                            {r.email && (
                                                <a
                                                    href={`mailto:${r.email}`}
                                                    className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline"
                                                    title="Notifications are sent here"
                                                >
                                                    {r.email}
                                                </a>
                                            )}
                                            <div className="text-xs text-gray-400">
                                                {r.company || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {r.contact_person}
                                        </td>
                                        <td className="px-6 py-3">
                                            {r.signature_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreview(r)}
                                                    className="rounded-md border border-gray-200 bg-white p-1 transition hover:border-indigo-300"
                                                    title="View signature"
                                                >
                                                    <img
                                                        src={r.signature_url}
                                                        alt="Signature"
                                                        className="h-8 w-20 object-contain"
                                                    />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-300">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(r.created_at)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={
                                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                                    statusStyles[r.status]
                                                }
                                            >
                                                {statusLabels[r.status] ?? r.status}
                                            </span>
                                            {r.status === 'approved' &&
                                                r.approver_name && (
                                                    <div className="mt-1 text-xs text-gray-400">
                                                        by {r.approver_name}
                                                    </div>
                                                )}
                                            {r.status === 'declined' && (
                                                <div className="mt-1 max-w-[16rem] text-xs text-gray-400">
                                                    {r.decline_reason && (
                                                        <span className="text-gray-500">
                                                            “{r.decline_reason}”
                                                        </span>
                                                    )}
                                                    {r.decliner?.name && (
                                                        <span>
                                                            {r.decline_reason
                                                                ? ' · '
                                                                : ''}
                                                            by {r.decliner.name}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {r.status === 'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => openApprove(r)}
                                                            className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openDecline(r)}
                                                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                        >
                                                            Decline
                                                        </button>
                                                    </>
                                                )}
                                                {r.status === 'approved' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingPass(r)}
                                                        className="whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                    >
                                                        View pass
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => remove(r)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {requests.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No {filters.status ?? 'pending'}{' '}
                                            requests.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {requests.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {requests.from}–{requests.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {requests.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {requests.links.map((link, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url &&
                                            router.get(
                                                link.url,
                                                {},
                                                {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                },
                                            )
                                        }
                                        className={
                                            'min-w-[2rem] rounded-md px-2.5 py-1.5 text-sm transition ' +
                                            (link.active
                                                ? 'bg-indigo-600 text-white'
                                                : link.url
                                                  ? 'text-gray-600 hover:bg-gray-100'
                                                  : 'cursor-not-allowed text-gray-300')
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Approve modal — approver signs off */}
            <Modal
                show={!!approving}
                onClose={() => setApproving(null)}
                maxWidth="md"
            >
                {approving && (
                    <form onSubmit={submitApprove} className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Approve {approving.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {approving.reference} · Visiting{' '}
                            {approving.contact_person}. Sign off to issue the pass.
                        </p>
                        {approving.email && (
                            <p className="mt-1 text-xs text-gray-400">
                                An approval email with their pass link will be sent
                                to{' '}
                                <span className="font-medium text-gray-600">
                                    {approving.email}
                                </span>
                                .
                            </p>
                        )}

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Approver name
                                </label>
                                <input
                                    type="text"
                                    value={approveForm.data.approver_name}
                                    onChange={(e) =>
                                        approveForm.setData(
                                            'approver_name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Approver name"
                                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Shown on the pass. This approval is recorded
                                    against your account
                                    {authUser?.name ? ` (${authUser.name})` : ''}.
                                </p>
                                {approveForm.errors.approver_name && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {approveForm.errors.approver_name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Your signature{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <SignaturePad
                                    key={padKey}
                                    heightClass="h-36"
                                    onChange={(url) =>
                                        approveForm.setData(
                                            'approver_signature',
                                            url,
                                        )
                                    }
                                />
                                {approveForm.errors.approver_signature && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {approveForm.errors.approver_signature}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setApproving(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={approveForm.processing}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {approveForm.processing
                                    ? 'Approving…'
                                    : 'Approve & issue pass'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Decline modal — captures an optional reason */}
            <Modal
                show={!!declining}
                onClose={() => setDeclining(null)}
                maxWidth="md"
            >
                {declining && (
                    <form onSubmit={submitDecline} className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Decline {declining.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {declining.reference}. The visitor can see the status,
                            so a brief reason is helpful.
                        </p>
                        {declining.email && (
                            <p className="mt-1 text-xs text-gray-400">
                                They'll be emailed at{' '}
                                <span className="font-medium text-gray-600">
                                    {declining.email}
                                </span>
                                {' '}with the reason below.
                            </p>
                        )}

                        <div className="mt-5">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Reason{' '}
                                <span className="font-normal text-gray-400">
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                rows={3}
                                value={declineForm.data.reason}
                                onChange={(e) =>
                                    declineForm.setData('reason', e.target.value)
                                }
                                placeholder="e.g. No appointment on file; please contact your host."
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {declineForm.errors.reason && (
                                <p className="mt-1 text-xs text-red-600">
                                    {declineForm.errors.reason}
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeclining(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={declineForm.processing}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                            >
                                {declineForm.processing
                                    ? 'Declining…'
                                    : 'Decline request'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Approved pass viewer */}
            <Modal
                show={!!viewingPass}
                onClose={() => setViewingPass(null)}
                maxWidth="lg"
            >
                {viewingPass && (
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Visitor pass
                            </h3>
                            <button
                                type="button"
                                onClick={() => setViewingPass(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-4 flex justify-center">
                            <div ref={passRef}>
                                <VisitorPassCard
                                    name={viewingPass.name}
                                    company={viewingPass.company}
                                    contactPerson={viewingPass.contact_person}
                                    visitorSignature={viewingPass.signature_url}
                                    approverName={viewingPass.approver_name}
                                    approverSignature={
                                        viewingPass.approver_signature_url
                                    }
                                    qrToken={viewingPass.visitor?.qr_token}
                                    badgeNumber={viewingPass.visitor?.badge_number}
                                    status="approved"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex justify-center gap-3">
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
                    </div>
                )}
            </Modal>

            {/* Signature preview */}
            <Modal show={!!preview} onClose={() => setPreview(null)} maxWidth="lg">
                {preview && (
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {preview.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {preview.reference} · Visiting{' '}
                                    {preview.contact_person}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreview(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-4 flex justify-center rounded-xl border border-gray-200 bg-gray-50 p-6">
                            <img
                                src={preview.signature_url}
                                alt="Signature"
                                className="max-h-48 object-contain"
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
