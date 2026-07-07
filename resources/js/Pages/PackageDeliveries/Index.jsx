import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SignaturePad from '@/Components/SignaturePad';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    pending: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    received: 'bg-green-100 text-green-700 ring-green-600/20',
};

const statusLabels = {
    pending: 'Awaiting pickup',
    received: 'Received',
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status] ?? statusStyles.pending}`}
        >
            {statusLabels[status] ?? status}
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

function formatDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function Detail({ label, value, sub }) {
    const empty = value === null || value === undefined || value === '';
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-800">
                {empty ? '—' : value}
            </dd>
            {sub && <dd className="text-xs text-gray-400">{sub}</dd>}
        </div>
    );
}

const BoxIcon = (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.5 4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.29 7 8.71 5 8.71-5" />
        <path d="M12 22V12" />
    </svg>
);

const tabs = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Awaiting pickup' },
    { key: 'received', label: 'Received' },
];

const COURIERS = [
    'J&T Express', 'LBC', 'Grab', 'Lalamove', 'Flash Express',
    'Ninja Van', 'JRS', '2GO', 'Shopee Express', 'Lazada',
];

const emptyItem = { tracking_number: '', courier: '', sender: '' };

const emptyForm = {
    recipient_name: '',
    recipient_department: '',
    rider_name: '',
    notes: '',
    items: [{ ...emptyItem }],
};

// Short one-line summary of a drop-off's parcels for tables/subtitles.
function itemsSummary(items) {
    const list = items ?? [];
    if (list.length === 0) return 'No parcels';
    const first = list[0];
    const label = first.courier || first.tracking_number || 'Parcel';
    if (list.length === 1) return label;
    return `${label} +${list.length - 1} more`;
}

/* ---------- parcels editor ---------- */

function ParcelsEditor({ form }) {
    const items = form.data.items ?? [];
    const setItems = (next) => form.setData('items', next);
    const addItem = () => setItems([...items, { ...emptyItem }]);
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i, key, value) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));

    const fieldClass =
        'block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500';
    const subLabel = 'mb-1 block text-xs font-medium text-gray-500';

    return (
        <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Parcels <span className="text-red-500">*</span>
                </label>
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add parcel
                </button>
            </div>

            <div className="space-y-3">
                {items.map((it, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-gray-200 bg-gray-50/60 p-3"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                                <label className={subLabel}>
                                    Package / tracking no.
                                </label>
                                <input
                                    type="text"
                                    value={it.tracking_number}
                                    onChange={(e) =>
                                        updateItem(i, 'tracking_number', e.target.value)
                                    }
                                    placeholder="Tracking or waybill no."
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.tracking_number`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className={subLabel}>Courier</label>
                                <input
                                    type="text"
                                    list="courier-options"
                                    value={it.courier}
                                    onChange={(e) =>
                                        updateItem(i, 'courier', e.target.value)
                                    }
                                    placeholder="e.g. J&T"
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.courier`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className={subLabel}>Sender</label>
                                <input
                                    type="text"
                                    value={it.sender}
                                    onChange={(e) =>
                                        updateItem(i, 'sender', e.target.value)
                                    }
                                    placeholder="Optional"
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.sender`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-start sm:col-span-1 sm:pt-6">
                                <button
                                    type="button"
                                    onClick={() => removeItem(i)}
                                    disabled={items.length === 1}
                                    title="Remove parcel"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                        <path d="M10 11v6M14 11v6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <datalist id="courier-options">
                {COURIERS.map((c) => (
                    <option key={c} value={c} />
                ))}
            </datalist>

            {typeof form.errors.items === 'string' && (
                <InputError message={form.errors.items} className="mt-1" />
            )}
        </div>
    );
}

/* ---------- shared form fields ---------- */

function PackageFields({ form }) {
    const field =
        'block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500';
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Recipient (employee) <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.recipient_name}
                    onChange={(e) => form.setData('recipient_name', e.target.value)}
                    placeholder="Who the package is for"
                    className={field}
                />
                <InputError message={form.errors.recipient_name} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Department
                </label>
                <input
                    type="text"
                    value={form.data.recipient_department}
                    onChange={(e) =>
                        form.setData('recipient_department', e.target.value)
                    }
                    placeholder="e.g. HR, Accounting"
                    className={field}
                />
                <InputError message={form.errors.recipient_department} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Rider name
                </label>
                <input
                    type="text"
                    value={form.data.rider_name}
                    onChange={(e) => form.setData('rider_name', e.target.value)}
                    placeholder="Delivery rider who dropped it off"
                    className={field}
                />
                <InputError message={form.errors.rider_name} className="mt-1" />
            </div>

            <ParcelsEditor form={form} />

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                </label>
                <input
                    type="text"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                    placeholder="Optional remarks"
                    className={field}
                />
                <InputError message={form.errors.notes} className="mt-1" />
            </div>
        </div>
    );
}

/* ---------- page ---------- */

export default function PackageDeliveriesIndex({ deliveries, filters, counts }) {
    const flash = usePage().props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [receiving, setReceiving] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    // Bumped to remount (reset) the signature pad between receipts.
    const [sigKey, setSigKey] = useState(0);

    const createForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm });
    const receiveForm = useForm({ received_by_name: '', signature: '' });

    const applyFilters = (overrides = {}) => {
        const params = { search, status: filters.status || '', ...overrides };
        router.get(
            route('package-deliveries.index'),
            {
                search: params.search || undefined,
                status: params.status || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Debounced search.
    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;
        const id = setTimeout(() => applyFilters({ search }), 350);
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

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('package-deliveries.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreating(false);
            },
        });
    };

    const openEdit = (item) => {
        editForm.clearErrors();
        editForm.setData({
            recipient_name: item.recipient_name ?? '',
            recipient_department: item.recipient_department ?? '',
            rider_name: item.rider_name ?? '',
            notes: item.notes ?? '',
            items:
                item.items && item.items.length
                    ? item.items.map((it) => ({
                          tracking_number: it.tracking_number ?? '',
                          courier: it.courier ?? '',
                          sender: it.sender ?? '',
                      }))
                    : [{ ...emptyItem }],
        });
        setEditing(item);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('package-deliveries.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const openReceive = (item) => {
        receiveForm.clearErrors();
        receiveForm.setData({
            received_by_name: item.recipient_name ?? '',
            signature: '',
        });
        setSigKey((k) => k + 1);
        setReceiving(item);
    };

    const submitReceive = (e) => {
        e.preventDefault();
        receiveForm.patch(route('package-deliveries.receive', receiving.id), {
            preserveScroll: true,
            onSuccess: () => {
                receiveForm.reset();
                setReceiving(null);
            },
        });
    };

    const confirmDelete = () => {
        router.delete(route('package-deliveries.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    const setStatus = (status) => applyFilters({ status });

    const countFor = (key) =>
        ({ '': counts.all, pending: counts.pending, received: counts.received })[key];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Packages
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Log courier deliveries for employees and confirm receipt
                    </p>
                </div>
            }
        >
            <Head title="Packages" />

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

                    <div className="flex flex-wrap items-center gap-3">
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
                                placeholder="Search recipient, courier, tracking…"
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
                            Log package
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">ID #</th>
                                    <th className="px-6 py-3">Package</th>
                                    <th className="px-6 py-3">Recipient</th>
                                    <th className="px-6 py-3">Rider</th>
                                    <th className="px-6 py-3">Logged</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {deliveries.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className="font-mono text-[11px] font-medium tracking-wide text-indigo-500">
                                                {item.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {itemsSummary(item.items)}
                                                </span>
                                                {(item.items?.length ?? 0) > 1 && (
                                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                                                        {item.items.length} parcels
                                                    </span>
                                                )}
                                            </div>
                                            {item.items?.length === 1 &&
                                                item.items[0].tracking_number && (
                                                    <div className="text-xs text-gray-400">
                                                        {item.items[0].tracking_number}
                                                    </div>
                                                )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-gray-700">
                                                {item.recipient_name}
                                            </div>
                                            {item.recipient_department && (
                                                <div className="text-xs text-gray-400">
                                                    {item.recipient_department}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.rider_name || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            <div>{formatDate(item.created_at)}</div>
                                            {item.logger_name && (
                                                <div className="text-xs text-gray-400">
                                                    by {item.logger_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={item.status} />
                                            {item.received_at && (
                                                <div className="mt-0.5 text-xs text-gray-400">
                                                    {formatDateTime(item.received_at)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewing(item)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    View
                                                </button>
                                                {item.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openReceive(item)}
                                                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
                                                    >
                                                        Receive
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(item)}
                                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(item)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {deliveries.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No packages logged yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {deliveries.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {deliveries.from}–{deliveries.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {deliveries.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {deliveries.links.map((link, i) => (
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

            {/* View modal */}
            <Modal show={!!viewing} onClose={() => setViewing(null)} maxWidth="2xl">
                {viewing && (
                    <div className="flex max-h-[calc(100vh-3rem)] flex-col">
                        <div className="shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
                                        {BoxIcon}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-xl font-bold text-white">
                                            {viewing.recipient_name}
                                        </h2>
                                        <p className="mt-0.5 truncate text-sm text-indigo-100">
                                            {(viewing.items?.length ?? 0)}{' '}
                                            {(viewing.items?.length ?? 0) === 1
                                                ? 'parcel'
                                                : 'parcels'}
                                            {' · '}
                                            {itemsSummary(viewing.items)}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={viewing.status} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                                <Detail label="Recipient" value={viewing.recipient_name} />
                                <Detail label="Department" value={viewing.recipient_department} />
                                <Detail label="Rider" value={viewing.rider_name} />
                                <Detail
                                    label="Logged"
                                    value={formatDate(viewing.created_at)}
                                    sub={viewing.logger_name ? `by ${viewing.logger_name}` : null}
                                />
                                <Detail label="Notes" value={viewing.notes} />
                            </dl>

                            {viewing.items?.length > 0 && (
                                <div className="mt-6">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Parcels
                                        </h3>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                            {viewing.items.length}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-gray-100">
                                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                <tr>
                                                    <th className="px-4 py-2.5">Tracking no.</th>
                                                    <th className="px-4 py-2.5">Courier</th>
                                                    <th className="px-4 py-2.5">Sender</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {viewing.items.map((it) => (
                                                    <tr key={it.id}>
                                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                                            {it.tracking_number || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600">
                                                            {it.courier || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-500">
                                                            {it.sender || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {viewing.status === 'received' && (
                                <div className="mt-6 rounded-xl border border-green-100 bg-green-50/60 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-green-700/70">
                                                Received by
                                            </p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {viewing.received_by_name || viewing.recipient_name}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {formatDateTime(viewing.received_at)}
                                        </p>
                                    </div>
                                    {viewing.received_signature_url && (
                                        <img
                                            src={viewing.received_signature_url}
                                            alt="Recipient signature"
                                            className="mt-3 max-h-40 rounded-lg border border-gray-200 bg-white"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            {viewing.status === 'pending' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const item = viewing;
                                        setViewing(null);
                                        openReceive(item);
                                    }}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                                >
                                    Receive
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setViewing(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Log modal */}
            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="2xl">
                <form
                    onSubmit={submitCreate}
                    className="flex max-h-[calc(100vh-3rem)] flex-col"
                >
                    <div className="shrink-0 px-6 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Log a package
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Record a courier drop-off for an employee to pick up later.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <PackageFields form={createForm} />
                    </div>
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
                            {createForm.processing ? 'Saving…' : 'Log package'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                <form
                    onSubmit={submitEdit}
                    className="flex max-h-[calc(100vh-3rem)] flex-col"
                >
                    <div className="shrink-0 px-6 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Edit package
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update this package's details.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <PackageFields form={editForm} />
                    </div>
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
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

            {/* Receive modal — capture recipient signature */}
            <Modal show={!!receiving} onClose={() => setReceiving(null)} maxWidth="lg">
                {receiving && (
                    <form onSubmit={submitReceive} className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Confirm receipt
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            {receiving.items?.length ?? 0}{' '}
                            {(receiving.items?.length ?? 0) === 1
                                ? 'parcel'
                                : 'parcels'}{' '}
                            for{' '}
                            <span className="font-medium text-gray-700">
                                {receiving.recipient_name}
                            </span>
                            {' — one signature confirms receipt of all.'}
                        </p>

                        <div className="mt-5">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Received by
                            </label>
                            <input
                                type="text"
                                value={receiveForm.data.received_by_name}
                                onChange={(e) =>
                                    receiveForm.setData('received_by_name', e.target.value)
                                }
                                placeholder="Name of the person collecting it"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={receiveForm.errors.received_by_name} className="mt-1" />
                        </div>

                        <div className="mt-4">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Signature <span className="text-red-500">*</span>
                            </label>
                            <SignaturePad
                                key={sigKey}
                                onChange={(dataUrl) =>
                                    receiveForm.setData('signature', dataUrl)
                                }
                            />
                            <InputError message={receiveForm.errors.signature} className="mt-1" />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setReceiving(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={receiveForm.processing || !receiveForm.data.signature}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                            >
                                {receiveForm.processing ? 'Saving…' : 'Confirm receipt'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delete confirm */}
            <Modal show={!!deleting} onClose={() => setDeleting(null)} maxWidth="md">
                {deleting && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Remove package
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove the package for{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.recipient_name}
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
