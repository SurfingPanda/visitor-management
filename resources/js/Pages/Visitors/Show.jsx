import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PhotoCapture from '@/Components/PhotoCapture';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
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

function formatDateTime(value) {
    if (!value) return null;
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function Field({ label, value }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900">{value || '—'}</dd>
        </div>
    );
}

function EditInput({ label, value, onChange, error, type = 'text', placeholder }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
            />
            <InputError message={error} className="mt-1" />
        </div>
    );
}

/* ---------- visit history ---------- */

function VisitHistory({ visits, registeredAt }) {
    return (
        <ol className="relative space-y-6 border-l border-gray-200 pl-6">
            {visits.map((v) => (
                <li key={v.id} className="relative">
                    <span className="absolute -left-[1.92rem] flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white" />
                    <p className="text-sm font-medium text-gray-900">
                        {v.purpose || 'Visit'}
                    </p>
                    <p className="text-xs text-gray-500">
                        In · {formatDateTime(v.checked_in_at)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {v.checked_out_at ? (
                            <>Out · {formatDateTime(v.checked_out_at)}</>
                        ) : (
                            <span className="font-medium text-green-600">
                                Currently on-site
                            </span>
                        )}
                    </p>
                </li>
            ))}

            <li className="relative">
                <span className="absolute -left-[1.92rem] flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 ring-4 ring-white" />
                <p className="text-sm font-medium text-gray-500">Registered</p>
                <p className="text-xs text-gray-400">
                    {formatDateTime(registeredAt)}
                </p>
            </li>

            {visits.length === 0 && (
                <li className="text-sm text-gray-400">No visits recorded yet.</li>
            )}
        </ol>
    );
}

/* ---------- page ---------- */

export default function Show({ visitor, visits }) {
    const flash = usePage().props.flash;
    const [editing, setEditing] = useState(false);
    const [toast, setToast] = useState(null);

    const form = useForm({
        name: visitor.name ?? '',
        company: visitor.company ?? '',
        host: visitor.host ?? '',
        email: visitor.email ?? '',
        phone: visitor.phone ?? '',
        purpose: visitor.purpose ?? '',
    });

    useEffect(() => {
        const msg = flash?.success || flash?.error;
        if (msg) {
            setToast({ type: flash.success ? 'success' : 'error', msg });
            const id = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(id);
        }
    }, [flash?.success, flash?.error]);

    const save = (e) => {
        e.preventDefault();
        form.patch(route('visitors.update', visitor.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const cancel = () => {
        form.clearErrors();
        form.setData({
            name: visitor.name ?? '',
            company: visitor.company ?? '',
            host: visitor.host ?? '',
            email: visitor.email ?? '',
            phone: visitor.phone ?? '',
            purpose: visitor.purpose ?? '',
        });
        setEditing(false);
    };

    const doAction = (url) => router.patch(url, {}, { preserveScroll: true });

    // Gate check-in captures a face/ID photo before posting.
    const [checkingIn, setCheckingIn] = useState(false);
    const checkInForm = useForm({ photo: null, id_photo: null });

    const openCheckIn = () => {
        checkInForm.clearErrors();
        checkInForm.setData({ photo: null, id_photo: null });
        setCheckingIn(true);
    };

    const closeCheckIn = () => {
        setCheckingIn(false);
        checkInForm.reset();
    };

    const submitCheckIn = (e) => {
        e.preventDefault();
        checkInForm.patch(route('visitors.check-in', visitor.id), {
            preserveScroll: true,
            onSuccess: () => closeCheckIn(),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link
                        href={route('visitors.index')}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Back to visitors"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold leading-tight text-gray-800">
                            {visitor.name}
                        </h2>
                        <p className="hidden text-sm text-gray-500 sm:block">
                            {visitor.badge_number}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={visitor.name} />

            {toast && (
                <div
                    className={
                        'fixed right-4 top-20 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ' +
                        (toast.type === 'success' ? 'bg-green-600' : 'bg-red-600')
                    }
                >
                    {toast.msg}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                {/* Details */}
                <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Visitor details
                                </h3>
                                <StatusBadge status={visitor.status} />
                            </div>
                            {!editing && (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                        </div>

                        {!editing ? (
                            <dl className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
                                <Field label="Full name" value={visitor.name} />
                                <Field label="Company" value={visitor.company} />
                                <Field label="Host" value={visitor.host} />
                                <Field label="Purpose" value={visitor.purpose} />
                                <Field label="Email" value={visitor.email} />
                                <Field label="Phone" value={visitor.phone} />
                            </dl>
                        ) : (
                            <form
                                onSubmit={save}
                                className="space-y-4 px-6 py-5"
                            >
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <EditInput
                                        label="Full name"
                                        value={form.data.name}
                                        onChange={(v) => form.setData('name', v)}
                                        error={form.errors.name}
                                    />
                                    <EditInput
                                        label="Company"
                                        value={form.data.company}
                                        onChange={(v) =>
                                            form.setData('company', v)
                                        }
                                        error={form.errors.company}
                                    />
                                    <EditInput
                                        label="Host"
                                        value={form.data.host}
                                        onChange={(v) => form.setData('host', v)}
                                        error={form.errors.host}
                                    />
                                    <EditInput
                                        label="Purpose"
                                        value={form.data.purpose}
                                        onChange={(v) =>
                                            form.setData('purpose', v)
                                        }
                                        error={form.errors.purpose}
                                    />
                                    <EditInput
                                        label="Email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(v) =>
                                            form.setData('email', v)
                                        }
                                        error={form.errors.email}
                                    />
                                    <EditInput
                                        label="Phone"
                                        value={form.data.phone}
                                        onChange={(v) =>
                                            form.setData('phone', v)
                                        }
                                        error={form.errors.phone}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={cancel}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {form.processing ? 'Saving…' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Side panel */}
                <div className="space-y-6">
                    {/* Photo + Actions + QR */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col items-center text-center">
                            {visitor.photo_url ? (
                                <img
                                    src={visitor.photo_url}
                                    alt={visitor.name}
                                    className="mb-4 h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
                                />
                            ) : (
                                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-2xl font-semibold text-indigo-600 ring-2 ring-gray-200">
                                    {visitor.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join('')}
                                </div>
                            )}
                            <div className="rounded-xl border border-gray-200 p-2">
                                <QRCodeSVG
                                    value={visitor.qr_token}
                                    size={120}
                                    level="M"
                                    marginSize={0}
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                                {visitor.badge_number}
                            </p>
                        </div>

                        <div className="mt-5 space-y-2">
                            {visitor.status !== 'checked_in' ? (
                                <button
                                    type="button"
                                    onClick={openCheckIn}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                >
                                    Check in
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        doAction(
                                            route('visitors.check-out', visitor.id),
                                        )
                                    }
                                    className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700"
                                >
                                    Check out
                                </button>
                            )}
                            <Link
                                href={route('visitors.badge', visitor.id)}
                                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                View / print badge
                            </Link>
                        </div>

                        {visitor.id_photo_url && (
                            <div className="mt-5 border-t border-gray-100 pt-5">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    ID on file
                                </p>
                                <img
                                    src={visitor.id_photo_url}
                                    alt="Visitor ID"
                                    className="w-full rounded-lg object-cover ring-1 ring-gray-200"
                                />
                                <p className="mt-2 text-xs text-gray-400">
                                    Deleted automatically on check-out.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Visit history */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">
                                Visit history
                            </h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                {visits.length}{' '}
                                {visits.length === 1 ? 'visit' : 'visits'}
                            </span>
                        </div>
                        <VisitHistory
                            visits={visits}
                            registeredAt={visitor.created_at}
                        />
                    </div>
                </div>
            </div>

            {/* Gate check-in modal — capture arrival photo(s) */}
            <Modal show={checkingIn} onClose={closeCheckIn} maxWidth="xl">
                <form onSubmit={submitCheckIn} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Check in {visitor.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Capture a face and/or ID photo. Both are optional and are
                        deleted automatically when the visitor checks out.
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
                            onChange={(v) => checkInForm.setData('id_photo', v)}
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
            </Modal>
        </AuthenticatedLayout>
    );
}
