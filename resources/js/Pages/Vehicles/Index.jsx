import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const typeStyles = {
    car: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
    motorcycle: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    suv: 'bg-sky-100 text-sky-700 ring-sky-600/20',
    van: 'bg-teal-100 text-teal-700 ring-teal-600/20',
    truck: 'bg-rose-100 text-rose-700 ring-rose-600/20',
    other: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function TypeBadge({ type }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${typeStyles[type] ?? typeStyles.other}`}
        >
            {type}
        </span>
    );
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
    plate_number: '',
    type: 'car',
    make_model: '',
    color: '',
    notes: '',
};

/* ---------- shared form fields ---------- */

function VehicleFields({ form, types }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Plate number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.plate_number}
                    onChange={(e) => form.setData('plate_number', e.target.value)}
                    placeholder="e.g. ABC 1234"
                    className="block w-full rounded-lg border-gray-300 text-sm uppercase shadow-sm placeholder:normal-case placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.plate_number} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.type}
                    onChange={(e) => form.setData('type', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm capitalize shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {types.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.type} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Make / model
                </label>
                <input
                    type="text"
                    value={form.data.make_model}
                    onChange={(e) => form.setData('make_model', e.target.value)}
                    placeholder="e.g. Toyota Vios"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.make_model} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Color
                </label>
                <input
                    type="text"
                    value={form.data.color}
                    onChange={(e) => form.setData('color', e.target.value)}
                    placeholder="e.g. Silver"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.color} className="mt-1" />
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

export default function VehiclesIndex({ vehicles, filters, types, count }) {
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
                route('vehicles.index'),
                { search, type: filters.type || undefined },
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

    const setType = (type) => {
        router.get(
            route('vehicles.index'),
            { search: search || undefined, type: type || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('vehicles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreating(false);
            },
        });
    };

    const openEdit = (vehicle) => {
        editForm.clearErrors();
        editForm.setData({
            plate_number: vehicle.plate_number ?? '',
            type: vehicle.type ?? 'car',
            make_model: vehicle.make_model ?? '',
            color: vehicle.color ?? '',
            notes: vehicle.notes ?? '',
        });
        setEditing(vehicle);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('vehicles.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('vehicles.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Vehicles
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Register vehicles and their plate numbers
                    </p>
                </div>
            }
        >
            <Head title="Vehicles" />

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
                        registered {count === 1 ? 'vehicle' : 'vehicles'}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters.type ?? ''}
                            onChange={(e) => setType(e.target.value)}
                            className="rounded-lg border-gray-300 py-2.5 text-sm capitalize shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">All types</option>
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {t}
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
                                placeholder="Search plate, model, color…"
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
                            Register vehicle
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Plate</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Make / model</th>
                                    <th className="px-6 py-3">Color</th>
                                    <th className="px-6 py-3">Registered</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vehicles.data.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3">
                                            <span className="font-semibold tracking-wide text-gray-900">
                                                {v.plate_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <TypeBadge type={v.type} />
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {v.make_model || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {v.color || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            <div>{formatDate(v.created_at)}</div>
                                            {v.registrant_name && (
                                                <div className="text-xs text-gray-400">
                                                    by {v.registrant_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={route('vehicles.show', v.id)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(v)}
                                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(v)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {vehicles.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No vehicles found. Register one to get
                                            started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {vehicles.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {vehicles.from}–{vehicles.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {vehicles.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {vehicles.links.map((link, i) => (
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
                        Register a vehicle
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Add a vehicle and its plate number.
                    </p>
                    <div className="mt-6">
                        <VehicleFields form={createForm} types={types} />
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
                            {createForm.processing ? 'Saving…' : 'Register vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Edit vehicle
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Update this vehicle's details.
                    </p>
                    <div className="mt-6">
                        <VehicleFields form={editForm} types={types} />
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
                            Remove vehicle
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.plate_number}
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
