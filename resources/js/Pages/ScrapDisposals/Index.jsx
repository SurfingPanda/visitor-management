import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const methodStyles = {
    sold: 'bg-green-100 text-green-700 ring-green-600/20',
    recycled: 'bg-sky-100 text-sky-700 ring-sky-600/20',
    hauled: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    discarded: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const methodLabels = {
    sold: 'Sold',
    recycled: 'Recycled',
    hauled: 'Hauled',
    discarded: 'Discarded',
};

// Selectable units for a scrap disposal. Unit is optional; legacy/custom
// values not in this list are preserved as an extra option when editing.
const UNITS = [
    'kg',
    'g',
    'ton',
    'lbs',
    'pcs',
    'sacks',
    'boxes',
    'drums',
    'rolls',
    'bundles',
    'pallets',
    'liters',
    'gallons',
    'meters',
    'sets',
    'units',
];

function MethodBadge({ method }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${methodStyles[method] ?? methodStyles.discarded}`}
        >
            {methodLabels[method] ?? method}
        </span>
    );
}

function formatAmount(value) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return (
        '₱' +
        n.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
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

function Detail({ label, value }) {
    const empty = value === null || value === undefined || value === '';
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-800">
                {empty ? '—' : value}
            </dd>
        </div>
    );
}

const emptyForm = {
    reference_no: '',
    item: '',
    category: '',
    quantity: 1,
    unit: '',
    disposal_date: '',
    method: 'discarded',
    recipient: '',
    amount: '',
    notes: '',
};

/* ---------- form fields ---------- */

function DisposalFields({ form, methods }) {
    const field =
        'block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500';
    const label = 'mb-1 block text-sm font-medium text-gray-700';

    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
                <label className={label}>
                    Item / description <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.item}
                    onChange={(e) => form.setData('item', e.target.value)}
                    placeholder="e.g. Scrap metal sheets"
                    className={field}
                />
                <InputError message={form.errors.item} className="mt-1" />
            </div>

            <div>
                <label className={label}>Reference no.</label>
                <input
                    type="text"
                    value={form.data.reference_no}
                    onChange={(e) => form.setData('reference_no', e.target.value)}
                    placeholder="Disposal / gate pass no."
                    className={field}
                />
                <InputError message={form.errors.reference_no} className="mt-1" />
            </div>

            <div>
                <label className={label}>Category</label>
                <input
                    type="text"
                    value={form.data.category}
                    onChange={(e) => form.setData('category', e.target.value)}
                    placeholder="e.g. Metal, Plastic, E-waste"
                    className={field}
                />
                <InputError message={form.errors.category} className="mt-1" />
            </div>

            <div>
                <label className={label}>
                    Quantity <span className="text-red-500">*</span>
                </label>
                <input
                    type="number"
                    min="0"
                    value={form.data.quantity}
                    onChange={(e) =>
                        form.setData(
                            'quantity',
                            e.target.value === ''
                                ? ''
                                : Math.max(0, parseInt(e.target.value, 10) || 0),
                        )
                    }
                    className={field}
                />
                <InputError message={form.errors.quantity} className="mt-1" />
            </div>

            <div>
                <label className={label}>Unit</label>
                <select
                    value={form.data.unit}
                    onChange={(e) => form.setData('unit', e.target.value)}
                    className={field}
                >
                    <option value="">Select unit</option>
                    {form.data.unit && !UNITS.includes(form.data.unit) && (
                        <option value={form.data.unit}>{form.data.unit}</option>
                    )}
                    {UNITS.map((u) => (
                        <option key={u} value={u}>
                            {u}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.unit} className="mt-1" />
            </div>

            <div>
                <label className={label}>
                    Method <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.method}
                    onChange={(e) => form.setData('method', e.target.value)}
                    className={field}
                >
                    {methods.map((m) => (
                        <option key={m} value={m}>
                            {methodLabels[m] ?? m}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.method} className="mt-1" />
            </div>

            <div>
                <label className={label}>Disposal date</label>
                <input
                    type="date"
                    value={form.data.disposal_date}
                    onChange={(e) => form.setData('disposal_date', e.target.value)}
                    className={field}
                />
                <InputError message={form.errors.disposal_date} className="mt-1" />
            </div>

            <div>
                <label className={label}>Buyer / hauler</label>
                <input
                    type="text"
                    value={form.data.recipient}
                    onChange={(e) => form.setData('recipient', e.target.value)}
                    placeholder="Who received the scrap"
                    className={field}
                />
                <InputError message={form.errors.recipient} className="mt-1" />
            </div>

            <div>
                <label className={label}>Amount recovered</label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400">
                        &#8369;
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.data.amount}
                        onChange={(e) => form.setData('amount', e.target.value)}
                        placeholder="0.00"
                        className={field + ' pl-7'}
                    />
                </div>
                <InputError message={form.errors.amount} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className={label}>Notes</label>
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

export default function ScrapDisposalsIndex({
    disposals,
    filters,
    methods,
    count,
}) {
    const flash = usePage().props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [viewing, setViewing] = useState(null);

    const createForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm });

    const applyFilters = (overrides = {}) => {
        const params = {
            search,
            method: filters.method || '',
            from,
            to,
            ...overrides,
        };
        router.get(
            route('scrap-disposals.index'),
            {
                search: params.search || undefined,
                method: params.method || undefined,
                from: params.from || undefined,
                to: params.to || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;
        const id = setTimeout(() => applyFilters({ search }), 350);
        return () => clearTimeout(id);
    }, [search]);

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

    const setMethod = (method) => applyFilters({ method });

    const applyRange = (nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
        applyFilters({ from: nextFrom, to: nextTo });
    };

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('scrap-disposals.store'), {
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
            reference_no: item.reference_no ?? '',
            item: item.item ?? '',
            category: item.category ?? '',
            quantity: item.quantity ?? 0,
            unit: item.unit ?? '',
            disposal_date: item.disposal_date
                ? String(item.disposal_date).slice(0, 10)
                : '',
            method: item.method ?? 'discarded',
            recipient: item.recipient ?? '',
            amount: item.amount ?? '',
            notes: item.notes ?? '',
        });
        setEditing(item);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('scrap-disposals.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('scrap-disposals.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Scrap Disposal
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Log scrap and waste taken out for disposal
                    </p>
                </div>
            }
        >
            <Head title="Scrap Disposal" />

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
                        {count === 1 ? 'record' : 'records'}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters.method ?? ''}
                            onChange={(e) => setMethod(e.target.value)}
                            className="rounded-lg border-gray-300 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">All methods</option>
                            {methods.map((m) => (
                                <option key={m} value={m}>
                                    {methodLabels[m] ?? m}
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
                                placeholder="Search item, ref#, category, buyer…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(e) => applyRange(e.target.value, to)}
                                title="Disposed from"
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
                                title="Disposed to"
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
                            Record disposal
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Qty</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3">Buyer / hauler</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {disposals.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">
                                                {item.item}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {[item.reference_no, item.category]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-700">
                                            {item.quantity}
                                            {item.unit ? ` ${item.unit}` : ''}
                                        </td>
                                        <td className="px-6 py-3">
                                            <MethodBadge method={item.method} />
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.recipient || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {formatAmount(item.amount)}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(item.disposal_date)}
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
                                {disposals.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No scrap disposals yet. Record one to get
                                            started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {disposals.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {disposals.from}–{disposals.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {disposals.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {disposals.links.map((link, i) => (
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
                    <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {viewing.item}
                                </h2>
                                {(viewing.reference_no || viewing.category) && (
                                    <p className="mt-0.5 text-sm text-gray-500">
                                        {[viewing.reference_no, viewing.category]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>
                            <MethodBadge method={viewing.method} />
                        </div>

                        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                            <Detail
                                label="Quantity"
                                value={`${viewing.quantity}${viewing.unit ? ' ' + viewing.unit : ''}`}
                            />
                            <Detail
                                label="Method"
                                value={methodLabels[viewing.method] ?? viewing.method}
                            />
                            <Detail
                                label="Disposal date"
                                value={
                                    viewing.disposal_date
                                        ? formatDate(viewing.disposal_date)
                                        : null
                                }
                            />
                            <Detail label="Buyer / hauler" value={viewing.recipient} />
                            <Detail
                                label="Amount recovered"
                                value={formatAmount(viewing.amount)}
                            />
                            <Detail label="Reference no." value={viewing.reference_no} />
                            <Detail label="Notes" value={viewing.notes} />
                            <Detail
                                label="Logged"
                                value={formatDate(viewing.created_at)}
                            />
                        </dl>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const item = viewing;
                                    setViewing(null);
                                    openEdit(item);
                                }}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewing(null)}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add modal */}
            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="2xl">
                <form
                    onSubmit={submitCreate}
                    className="flex max-h-[calc(100vh-3rem)] flex-col"
                >
                    <div className="shrink-0 px-6 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Record a scrap disposal
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Log scrap or waste taken out for disposal.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <DisposalFields form={createForm} methods={methods} />
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
                            {createForm.processing ? 'Saving…' : 'Record disposal'}
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
                            Edit scrap disposal
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update this disposal record.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <DisposalFields form={editForm} methods={methods} />
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

            {/* Delete confirm */}
            <Modal show={!!deleting} onClose={() => setDeleting(null)} maxWidth="md">
                {deleting && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Remove disposal
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove the disposal record for{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.item}
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
