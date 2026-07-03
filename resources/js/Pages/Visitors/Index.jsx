import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PhotoCapture from '@/Components/PhotoCapture';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    checked_in: 'bg-green-100 text-green-700 ring-green-600/20',
    checked_out: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    expected: 'bg-amber-100 text-amber-700 ring-amber-600/20',
};

const statusLabels = {
    checked_in: 'On-site',
    checked_out: 'Checked out',
    expected: 'Expected',
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status] ?? statusStyles.expected}`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

function formatTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
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

const tabs = [
    { key: '', label: 'All' },
    { key: 'expected', label: 'Expected' },
    { key: 'checked_in', label: 'On-site' },
    { key: 'checked_out', label: 'Checked out' },
];

/* ---------- page ---------- */

export default function VisitorsIndex({ visitors, filters, counts }) {
    const flash = usePage().props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);

    const form = useForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        host: '',
        purpose: '',
        companions: 0,
        photo: null,
        id_photo: null,
        check_in_now: true,
    });

    const submitVisitor = (e) => {
        e.preventDefault();
        form.post(route('visitors.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    };

    const closeModal = () => {
        setCreating(false);
        form.clearErrors();
        form.reset();
    };

    // Debounced search.
    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;

        const id = setTimeout(() => {
            router.get(
                route('visitors.index'),
                {
                    search,
                    status: filters.status || undefined,
                    from: from || undefined,
                    to: to || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(id);
    }, [search]);

    // Flash toast.
    useEffect(() => {
        if (flash?.success) {
            setToast(flash.success);
            const id = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(id);
        }
    }, [flash?.success]);

    const setStatus = (status) => {
        router.get(
            route('visitors.index'),
            {
                search: search || undefined,
                status: status || undefined,
                from: from || undefined,
                to: to || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applyRange = (nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
        router.get(
            route('visitors.index'),
            {
                search: search || undefined,
                status: filters.status || undefined,
                from: nextFrom || undefined,
                to: nextTo || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const countFor = (key) =>
        ({
            '': counts.all,
            expected: counts.expected,
            checked_in: counts.checked_in,
            checked_out: counts.checked_out,
        })[key];

    const action = (url) =>
        router.patch(url, {}, { preserveScroll: true });

    // Gate check-in captures a face/ID photo before posting.
    const [checkingIn, setCheckingIn] = useState(null);
    const checkInForm = useForm({ photo: null, id_photo: null });

    const openCheckIn = (visitor) => {
        checkInForm.clearErrors();
        checkInForm.setData({ photo: null, id_photo: null });
        setCheckingIn(visitor);
    };

    const closeCheckIn = () => {
        setCheckingIn(null);
        checkInForm.reset();
    };

    const submitCheckIn = (e) => {
        e.preventDefault();
        checkInForm.patch(route('visitors.check-in', checkingIn.id), {
            preserveScroll: true,
            onSuccess: () => closeCheckIn(),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Visitors
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Manage check-ins and visitor records
                    </p>
                </div>
            }
        >
            <Head title="Visitors" />

            {/* Toast */}
            {toast && (
                <div className="fixed right-4 top-20 z-50 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                {/* Toolbar */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Status tabs */}
                    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
                        {tabs.map((t) => {
                            const active = (filters.status ?? '') === t.key;
                            return (
                                <button
                                    key={t.key || 'all'}
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

                    {/* Search + New */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:flex-1 lg:w-80 lg:flex-none">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, company, host, badge…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(e) => applyRange(e.target.value, to)}
                                title="From date"
                                className={
                                    'rounded-lg border-gray-300 py-2.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                                    (from ? 'text-gray-900' : 'text-gray-500')
                                }
                            />
                            <span className="text-sm text-gray-400">–</span>
                            <input
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(e) => applyRange(from, e.target.value)}
                                title="To date"
                                className={
                                    'rounded-lg border-gray-300 py-2.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                                    (to ? 'text-gray-900' : 'text-gray-500')
                                }
                            />
                            {(from || to) && (
                                <button
                                    type="button"
                                    onClick={() => applyRange('', '')}
                                    title="Clear date range"
                                    className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6 6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <a
                            href={route('visitors.export', {
                                search: search || undefined,
                                status: filters.status || undefined,
                                from: from || undefined,
                                to: to || undefined,
                            })}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            title="Export the filtered list to Excel (CSV)"
                        >
                            <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <path d="M7 10l5 5 5-5" />
                                <path d="M12 15V3" />
                            </svg>
                            Export
                        </a>
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            New visitor
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Visitor</th>
                                    <th className="px-6 py-3">Host</th>
                                    <th className="px-6 py-3">Purpose</th>
                                    <th className="px-6 py-3">Badge</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">In / Out</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {visitors.data.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                {v.photo_url ? (
                                                    <img
                                                        src={v.photo_url}
                                                        alt={v.name}
                                                        className="h-9 w-9 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                                                        {v.name
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .slice(0, 2)
                                                            .join('')}
                                                    </span>
                                                )}
                                                <div>
                                                    <Link
                                                        href={route(
                                                            'visitors.show',
                                                            v.id,
                                                        )}
                                                        className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                                                    >
                                                        {v.name}
                                                    </Link>
                                                    <div className="text-xs text-gray-400">
                                                        {v.company ?? '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {v.host}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {v.purpose ?? '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {v.badge_number ?? '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(v.checked_in_at ?? v.created_at)}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatTime(v.checked_in_at)}
                                            {' – '}
                                            {formatTime(v.checked_out_at)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={v.status} />
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route(
                                                        'visitors.badge',
                                                        v.id,
                                                    )}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                    title="View / print badge"
                                                >
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="4" y="3" width="16" height="18" rx="2" />
                                                        <circle cx="12" cy="9" r="2.5" />
                                                        <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                                                    </svg>
                                                    Badge
                                                </Link>
                                                {v.status !== 'checked_in' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openCheckIn(v)
                                                        }
                                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                    >
                                                        Check in
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            action(
                                                                route(
                                                                    'visitors.check-out',
                                                                    v.id,
                                                                ),
                                                            )
                                                        }
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                    >
                                                        Check out
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {visitors.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No visitors match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {visitors.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {visitors.from}–{visitors.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {visitors.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {visitors.links.map((link, i) => (
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

            {/* New visitor modal */}
            <Modal show={creating} onClose={closeModal} maxWidth="xl">
                <form onSubmit={submitVisitor} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Register a visitor
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Add a walk-in or pre-register an expected guest.
                    </p>

                    {form.data.check_in_now && (
                        <div className="mt-6 flex flex-col items-center gap-6 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-center">
                            <PhotoCapture
                                mode="face"
                                label="Face photo"
                                value={form.data.photo}
                                onChange={(v) => form.setData('photo', v)}
                            />
                            <PhotoCapture
                                mode="id"
                                label="ID photo"
                                value={form.data.id_photo}
                                onChange={(v) => form.setData('id_photo', v)}
                            />
                        </div>
                    )}
                    {form.data.check_in_now && (
                        <p className="mt-2 text-center text-xs text-gray-400">
                            Face and ID are optional — capture the ID, the face, or
                            neither if the visitor prefers.
                        </p>
                    )}

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Full name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                autoFocus
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.name} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Company
                            </label>
                            <input
                                type="text"
                                value={form.data.company}
                                onChange={(e) =>
                                    form.setData('company', e.target.value)
                                }
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.company} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Host <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.data.host}
                                onChange={(e) =>
                                    form.setData('host', e.target.value)
                                }
                                placeholder="Employee being visited"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.host} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.email} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Phone
                            </label>
                            <input
                                type="text"
                                value={form.data.phone}
                                onChange={(e) =>
                                    form.setData('phone', e.target.value)
                                }
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.phone} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Purpose
                            </label>
                            <input
                                type="text"
                                value={form.data.purpose}
                                onChange={(e) =>
                                    form.setData('purpose', e.target.value)
                                }
                                placeholder="Meeting, Interview, Delivery…"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.purpose} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                People with them
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.data.companions}
                                onChange={(e) =>
                                    form.setData(
                                        'companions',
                                        e.target.value === ''
                                            ? 0
                                            : Math.max(0, parseInt(e.target.value, 10) || 0),
                                    )
                                }
                                placeholder="0"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Number of extra people accompanying this visitor
                            </p>
                            <InputError message={form.errors.companions} className="mt-1" />
                        </div>

                    </div>

                    <label className="mt-4 flex cursor-pointer items-center">
                        <input
                            type="checkbox"
                            checked={form.data.check_in_now}
                            onChange={(e) =>
                                form.setData('check_in_now', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ms-2 text-sm text-gray-600">
                            Check in immediately
                        </span>
                    </label>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {form.processing ? 'Saving…' : 'Register visitor'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Gate check-in modal — capture arrival photo(s) */}
            <Modal show={!!checkingIn} onClose={closeCheckIn} maxWidth="xl">
                {checkingIn && (
                    <form onSubmit={submitCheckIn} className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Check in {checkingIn.name}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Capture a face and/or ID photo. Both are optional and
                            are deleted automatically when the visitor checks out.
                        </p>

                        <div className="mt-6 flex flex-col items-center gap-6 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-center">
                            <PhotoCapture
                                mode="face"
                                label="Face photo"
                                value={checkInForm.data.photo}
                                onChange={(v) => checkInForm.setData('photo', v)}
                            />
                            <PhotoCapture
                                mode="id"
                                label="ID photo"
                                value={checkInForm.data.id_photo}
                                onChange={(v) =>
                                    checkInForm.setData('id_photo', v)
                                }
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeCheckIn}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={checkInForm.processing}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {checkInForm.processing ? 'Checking in…' : 'Check in'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
