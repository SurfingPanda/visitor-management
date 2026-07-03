import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    active: 'bg-green-100 text-green-700 ring-green-600/20',
    inactive: 'bg-gray-100 text-gray-500 ring-gray-500/20',
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusStyles[status] ?? statusStyles.inactive}`}
        >
            {status}
        </span>
    );
}

function initials(name = '') {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

const emptyForm = {
    name: '',
    license_number: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
    notes: '',
};

/* ---------- shared form fields ---------- */

function DriverFields({ form, statuses }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Full name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="e.g. Jimmy Bautista"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.name} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    License number
                </label>
                <input
                    type="text"
                    value={form.data.license_number}
                    onChange={(e) => form.setData('license_number', e.target.value)}
                    placeholder="e.g. N01-23-456789"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.license_number} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone
                </label>
                <input
                    type="text"
                    value={form.data.phone}
                    onChange={(e) => form.setData('phone', e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.phone} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    placeholder="e.g. driver@example.com"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.email} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.status}
                    onChange={(e) => form.setData('status', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm capitalize shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.status} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                </label>
                <input
                    type="text"
                    value={form.data.address}
                    onChange={(e) => form.setData('address', e.target.value)}
                    placeholder="Home address"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.address} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                </label>
                <input
                    type="text"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                    placeholder="Optional remarks"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.notes} className="mt-1" />
            </div>
        </div>
    );
}

/* ---------- page ---------- */

export default function DriversIndex({ drivers, filters, statuses, count }) {
    const flash = usePage().props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const createForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm });

    // Debounced search.
    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;
        const id = setTimeout(() => {
            router.get(
                route('drivers.index'),
                { search, status: filters.status || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);
        return () => clearTimeout(id);
    }, [search]);

    // Flash toast.
    useEffect(() => {
        const next = flash?.success
            ? { text: flash.success, tone: 'success' }
            : flash?.error
              ? { text: flash.error, tone: 'error' }
              : null;
        if (next) {
            setToast(next);
            const id = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(id);
        }
    }, [flash?.success, flash?.error]);

    const setStatus = (status) => {
        router.get(
            route('drivers.index'),
            { search: search || undefined, status: status || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('drivers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreating(false);
            },
        });
    };

    const openEdit = (driver) => {
        editForm.clearErrors();
        editForm.setData({
            name: driver.name ?? '',
            license_number: driver.license_number ?? '',
            phone: driver.phone ?? '',
            email: driver.email ?? '',
            address: driver.address ?? '',
            status: driver.status ?? 'active',
            notes: driver.notes ?? '',
        });
        setEditing(driver);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('drivers.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('drivers.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Drivers
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Register drivers and their license details
                    </p>
                </div>
            }
        >
            <Head title="Drivers" />

            {/* Toast */}
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
                {/* Toolbar */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600">
                            {count}
                        </span>
                        registered {count === 1 ? 'driver' : 'drivers'}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters.status ?? ''}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded-lg border-gray-300 py-2.5 text-sm capitalize shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            {statuses.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        <div className="relative w-full sm:flex-1 lg:w-72 lg:flex-none">
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
                                placeholder="Search name, license, phone…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                createForm.reset();
                                createForm.clearErrors();
                                setCreating(true);
                            }}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Register driver
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Driver</th>
                                    <th className="px-6 py-3">License no.</th>
                                    <th className="px-6 py-3">Phone</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Registered</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {drivers.data.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                                                    {initials(d.name)}
                                                </span>
                                                <div>
                                                    <Link
                                                        href={route('drivers.show', d.id)}
                                                        className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                                                    >
                                                        {d.name}
                                                    </Link>
                                                    {d.address && (
                                                        <div className="text-xs text-gray-400">
                                                            {d.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.license_number || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.phone || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.email || '—'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={d.status} />
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            <div>{formatDate(d.created_at)}</div>
                                            {d.registrant_name && (
                                                <div className="text-xs text-gray-400">
                                                    by {d.registrant_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route('drivers.show', d.id)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(d)}
                                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(d)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {drivers.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No drivers found. Register one to get
                                            started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {drivers.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {drivers.from}–{drivers.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {drivers.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {drivers.links.map((link, i) => (
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

            {/* Register modal */}
            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="2xl">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Register a driver
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Add a driver and their details.
                    </p>
                    <div className="mt-6">
                        <DriverFields form={createForm} statuses={statuses} />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {createForm.processing ? 'Saving…' : 'Register driver'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Edit driver
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Update this driver's details.
                    </p>
                    <div className="mt-6">
                        <DriverFields form={editForm} statuses={statuses} />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editForm.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {editForm.processing ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirm */}
            <Modal show={!!deleting} onClose={() => setDeleting(null)} maxWidth="md">
                {deleting && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Remove driver
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.name}
                            </span>{' '}
                            from the register? This can't be undone.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleting(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
