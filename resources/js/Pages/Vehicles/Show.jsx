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

const statusStyles = {
    scheduled: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    ongoing: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    completed: 'bg-green-100 text-green-700 ring-green-600/20',
    cancelled: 'bg-gray-100 text-gray-500 ring-gray-500/20',
};

const statTones = {
    all: 'bg-indigo-50 text-indigo-700',
    scheduled: 'bg-blue-50 text-blue-700',
    ongoing: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
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

// Human-readable gap between two datetimes, e.g. "6h 30m" or "2d 3h".
function formatDuration(from, to) {
    if (!from || !to) return null;
    const ms = new Date(to).getTime() - new Date(from).getTime();
    if (Number.isNaN(ms) || ms < 0) return null;
    const mins = Math.round(ms / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// Convert an ISO/DB datetime string into the value a <input type="datetime-local">
// expects (YYYY-MM-DDTHH:mm), using local clock parts.
function toDatetimeLocal(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
    destination: '',
    purpose: '',
    driver_name: '',
    departure_at: '',
    return_at: '',
    status: 'scheduled',
    notes: '',
};

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

/* ---------- shared form fields ---------- */

function TripFields({ form, statuses }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Destination <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.destination}
                    onChange={(e) => form.setData('destination', e.target.value)}
                    placeholder="e.g. Central Warehouse, Cebu"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.destination} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Purpose
                </label>
                <input
                    type="text"
                    value={form.data.purpose}
                    onChange={(e) => form.setData('purpose', e.target.value)}
                    placeholder="e.g. Delivery run"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.purpose} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Driver
                </label>
                <input
                    type="text"
                    value={form.data.driver_name}
                    onChange={(e) => form.setData('driver_name', e.target.value)}
                    placeholder="Name of the driver"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.driver_name} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Departure
                </label>
                <input
                    type="datetime-local"
                    value={form.data.departure_at}
                    onChange={(e) => form.setData('departure_at', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.departure_at} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Return
                </label>
                <input
                    type="datetime-local"
                    value={form.data.return_at}
                    onChange={(e) => form.setData('return_at', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.return_at} className="mt-1" />
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

export default function VehicleShow({ vehicle, trips, statuses, counts }) {
    const flash = usePage().props.flash;
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const createForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm });

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

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('trips.store', vehicle.id), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreating(false);
            },
        });
    };

    const openCreate = () => {
        createForm.reset();
        createForm.clearErrors();
        setCreating(true);
    };

    const openEdit = (trip) => {
        editForm.clearErrors();
        editForm.setData({
            destination: trip.destination ?? '',
            purpose: trip.purpose ?? '',
            driver_name: trip.driver_name ?? '',
            departure_at: toDatetimeLocal(trip.departure_at),
            return_at: toDatetimeLocal(trip.return_at),
            status: trip.status ?? 'scheduled',
            notes: trip.notes ?? '',
        });
        setEditing(trip);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('trips.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('trips.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    const CarIcon = (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3v-5l2-5h11l3 5h1a2 2 0 0 1 2 2v3h-3" />
            <path d="M5 17h11" />
            <circle cx="7.5" cy="17.5" r="2" />
            <circle cx="17.5" cy="17.5" r="2" />
        </svg>
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link
                        href={route('vehicles.index')}
                        className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-500 shadow-sm transition hover:bg-gray-50"
                        aria-label="Back to vehicles"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold leading-tight text-gray-800">
                            {vehicle.plate_number}
                        </h2>
                        <p className="hidden text-sm text-gray-500 sm:block">
                            Trips taken and scheduled for this vehicle
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`Trips · ${vehicle.plate_number}`} />

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

            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Vehicle summary */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                {CarIcon}
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h3 className="text-xl font-bold tracking-wide text-gray-900">
                                        {vehicle.plate_number}
                                    </h3>
                                    <Badge
                                        label={vehicle.type}
                                        styles={typeStyles[vehicle.type] ?? typeStyles.other}
                                    />
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">
                                    {vehicle.make_model || 'No make / model on file'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Schedule trip
                        </button>
                    </div>

                    {/* Full detail grid */}
                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-3 lg:grid-cols-5">
                        <Field label="Make / model" value={vehicle.make_model} />
                        <Field label="Color" value={vehicle.color} />
                        <Field
                            label="Registered"
                            value={formatDate(vehicle.created_at)}
                            sub={vehicle.registrant_name ? `by ${vehicle.registrant_name}` : null}
                        />
                        <Field label="Notes" value={vehicle.notes} />
                    </dl>
                </div>

                {/* Trip stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <StatTile label="Total" value={counts.all} tone={statTones.all} />
                    <StatTile label="Scheduled" value={counts.scheduled} tone={statTones.scheduled} />
                    <StatTile label="Ongoing" value={counts.ongoing} tone={statTones.ongoing} />
                    <StatTile label="Completed" value={counts.completed} tone={statTones.completed} />
                    <StatTile label="Cancelled" value={counts.cancelled} tone={statTones.cancelled} />
                </div>

                {/* Trips table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                        <h3 className="text-base font-semibold text-gray-900">
                            Trip history
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {counts.all} {counts.all === 1 ? 'trip' : 'trips'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Destination</th>
                                    <th className="px-6 py-3">Purpose</th>
                                    <th className="px-6 py-3">Driver</th>
                                    <th className="px-6 py-3">Departure</th>
                                    <th className="px-6 py-3">Return</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {trips.map((t) => {
                                    const duration = formatDuration(t.departure_at, t.return_at);
                                    const isDelivery = t.source === 'delivery';
                                    return (
                                        <tr key={`${t.source}-${t.id}`} className="hover:bg-gray-50/70">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900">
                                                        {t.destination}
                                                    </span>
                                                    {isDelivery && (
                                                        <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600 ring-1 ring-inset ring-sky-600/20">
                                                            Delivery
                                                        </span>
                                                    )}
                                                </div>
                                                {t.notes && (
                                                    <div className="text-xs text-gray-400">
                                                        {t.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">
                                                {t.purpose || '—'}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">
                                                {t.driver_name || '—'}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">
                                                {formatDateTime(t.departure_at)}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">
                                                <div>{formatDateTime(t.return_at)}</div>
                                                {duration && (
                                                    <div className="text-xs text-gray-400">
                                                        {duration}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <Badge
                                                    label={t.status}
                                                    styles={statusStyles[t.status] ?? statusStyles.cancelled}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isDelivery ? (
                                                        <Link
                                                            href={route('delivery-logs.index', { search: vehicle.plate_number })}
                                                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                        >
                                                            Delivery Log
                                                        </Link>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEdit(t)}
                                                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleting(t)}
                                                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {trips.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-14 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                    {CarIcon}
                                                </span>
                                                <p className="mt-3 text-sm font-medium text-gray-600">
                                                    No trips yet
                                                </p>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Schedule a trip to start tracking where this vehicle goes.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={openCreate}
                                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                >
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12h14" />
                                                    </svg>
                                                    Schedule trip
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Schedule modal */}
            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="2xl">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Schedule a trip
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Log a trip for {vehicle.plate_number}.
                    </p>
                    <div className="mt-6">
                        <TripFields form={createForm} statuses={statuses} />
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
                            {createForm.processing ? 'Saving…' : 'Add trip'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">Edit trip</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Update this trip's details.
                    </p>
                    <div className="mt-6">
                        <TripFields form={editForm} statuses={statuses} />
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
                            Remove trip
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove the trip to{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.destination}
                            </span>
                            ? This can't be undone.
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
