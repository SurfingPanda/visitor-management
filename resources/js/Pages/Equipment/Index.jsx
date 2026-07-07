import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    in_stock: 'bg-green-100 text-green-700 ring-green-600/20',
    disposed: 'bg-gray-100 text-gray-500 ring-gray-500/20',
};

const statusLabels = {
    in_stock: 'In stock',
    disposed: 'Disposed',
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status] ?? statusStyles.disposed}`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

function formatPrice(value) {
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
    <svg className="h-7 w-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <path d="M10 12h4" />
    </svg>
);

const emptyForm = {
    name: '',
    quantity: 1,
    price: '',
    status: 'in_stock',
    disposed_by: '',
    approved_by: '',
    disposed_at: '',
    notes: '',
    image: null,
};

/* ---------- image input ---------- */

// Downscale + re-encode a picked image in the browser so large phone photos
// (which the server would reject) become small, fast uploads. Falls back to the
// original file if the browser can't decode it.
function resizeImage(file, maxDim = 1600, quality = 0.85) {
    return new Promise((resolve) => {
        if (!file || !file.type?.startsWith('image/')) return resolve(file);
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const { width, height } = img;
            // Already small enough — don't bother re-encoding.
            if (Math.max(width, height) <= maxDim && file.size <= 1.5 * 1024 * 1024) {
                return resolve(file);
            }
            const scale = Math.min(1, maxDim / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return resolve(file);
                    const name =
                        (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, { type: 'image/jpeg' }));
                },
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

function ImageInput({ file, existingUrl, onChange }) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (file instanceof File) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [file]);

    const shown = preview || existingUrl;

    return (
        <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {shown ? (
                    <img src={shown} alt="" className="h-full w-full object-cover" />
                ) : (
                    BoxIcon
                )}
            </div>
            <div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M17 8l-5-5-5 5" />
                        <path d="M12 3v12" />
                    </svg>
                    {shown ? 'Change image' : 'Upload image'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                            const picked = e.target.files[0] ?? null;
                            e.target.value = ''; // allow re-picking the same file
                            onChange(picked ? await resizeImage(picked) : null);
                        }}
                    />
                </label>
                <p className="mt-1 text-xs text-gray-400">PNG or JPG, up to 5 MB.</p>
            </div>
        </div>
    );
}

/* ---------- shared form fields ---------- */

function EquipmentFields({ form, statuses, existingImageUrl }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Equipment name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="e.g. Handheld Metal Detector"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.name} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Equipment image
                </label>
                <ImageInput
                    file={form.data.image}
                    existingUrl={existingImageUrl}
                    onChange={(f) => form.setData('image', f)}
                />
                <InputError message={form.errors.image} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.quantity} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Price
                </label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400">
                        &#8369;
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.data.price}
                        onChange={(e) => form.setData('price', e.target.value)}
                        placeholder="0.00"
                        className="block w-full rounded-lg border-gray-300 pl-7 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <InputError message={form.errors.price} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.status}
                    onChange={(e) => form.setData('status', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {statusLabels[s] ?? s}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.status} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Disposal date
                </label>
                <input
                    type="date"
                    value={form.data.disposed_at}
                    onChange={(e) => form.setData('disposed_at', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.disposed_at} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Disposed by
                </label>
                <input
                    type="text"
                    value={form.data.disposed_by}
                    onChange={(e) => form.setData('disposed_by', e.target.value)}
                    placeholder="Name of who disposed it"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.disposed_by} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Approved by
                </label>
                <input
                    type="text"
                    value={form.data.approved_by}
                    onChange={(e) => form.setData('approved_by', e.target.value)}
                    placeholder="Name of the approver"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.approved_by} className="mt-1" />
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

export default function EquipmentIndex({ equipment, filters, statuses, count }) {
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

    // Push the current filter set to the server (params can be overridden).
    const applyFilters = (overrides = {}) => {
        const params = {
            search,
            status: filters.status || '',
            from,
            to,
            ...overrides,
        };
        router.get(
            route('equipment.index'),
            {
                search: params.search || undefined,
                status: params.status || undefined,
                from: params.from || undefined,
                to: params.to || undefined,
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

    const setStatus = (status) => applyFilters({ status });

    const applyRange = (nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
        applyFilters({ from: nextFrom, to: nextTo });
    };

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('equipment.store'), {
            forceFormData: true,
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
            name: item.name ?? '',
            quantity: item.quantity ?? 0,
            price: item.price ?? '',
            status: item.status ?? 'in_stock',
            disposed_by: item.disposed_by ?? '',
            approved_by: item.approved_by ?? '',
            disposed_at: item.disposed_at
                ? String(item.disposed_at).slice(0, 10)
                : '',
            notes: item.notes ?? '',
            image: null,
        });
        setEditing(item);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        // NOTE: form.transform() returns undefined in @inertiajs/react 2.x, so it
        // must NOT be chained with .post() — call them as separate statements.
        // Files can't be sent over a real PATCH, so spoof it with POST + _method.
        editForm.transform((data) => ({ ...data, _method: 'patch' }));
        editForm.post(route('equipment.update', editing.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('equipment.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Equipment Inventory
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Track equipment, quantities, and disposals
                    </p>
                </div>
            }
        >
            <Head title="Equipment Inventory" />

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
                        {count === 1 ? 'item' : 'items'}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters.status ?? ''}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded-lg border-gray-300 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            {statuses.map((s) => (
                                <option key={s} value={s}>
                                    {statusLabels[s] ?? s}
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
                                placeholder="Search ID, name, disposed/approved by…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        {/* Registered date range */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(e) => applyRange(e.target.value, to)}
                                title="Registered from"
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
                                title="Registered to"
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
                            Add equipment
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
                                    <th className="px-6 py-3">Equipment</th>
                                    <th className="px-6 py-3">Quantity</th>
                                    <th className="px-6 py-3">Price</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Disposed by</th>
                                    <th className="px-6 py-3">Approved by</th>
                                    <th className="px-6 py-3">Registered</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {equipment.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className="font-mono text-[11px] font-medium tracking-wide text-indigo-500">
                                                {item.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        BoxIcon
                                                    )}
                                                </span>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {item.name}
                                                    </div>
                                                    {item.notes && (
                                                        <div className="text-xs text-gray-400">
                                                            {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-700">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {formatPrice(item.price)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.disposed_by || '—'}
                                            {item.disposed_at && (
                                                <div className="text-xs text-gray-400">
                                                    {formatDate(item.disposed_at)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.approved_by || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            <div>{formatDate(item.created_at)}</div>
                                            {item.registrant_name && (
                                                <div className="text-xs text-gray-400">
                                                    by {item.registrant_name}
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
                                {equipment.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No equipment yet. Add one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {equipment.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {equipment.from}–{equipment.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {equipment.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {equipment.links.map((link, i) => (
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
                    <div>
                        {/* Full image */}
                        <div className="flex items-center justify-center bg-gray-50 p-4">
                            {viewing.image_url ? (
                                <img
                                    src={viewing.image_url}
                                    alt={viewing.name}
                                    className="max-h-80 w-auto max-w-full rounded-lg object-contain"
                                />
                            ) : (
                                <div className="flex h-40 w-full items-center justify-center">
                                    {BoxIcon}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {viewing.name}
                                    </h2>
                                    {viewing.notes && (
                                        <p className="mt-0.5 text-sm text-gray-500">
                                            {viewing.notes}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge status={viewing.status} />
                            </div>

                            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                                <Detail label="Quantity" value={viewing.quantity} />
                                <Detail label="Price" value={formatPrice(viewing.price)} />
                                <Detail
                                    label="Status"
                                    value={statusLabels[viewing.status] ?? viewing.status}
                                />
                                <Detail label="Disposed by" value={viewing.disposed_by} />
                                <Detail
                                    label="Disposal date"
                                    value={
                                        viewing.disposed_at
                                            ? formatDate(viewing.disposed_at)
                                            : null
                                    }
                                />
                                <Detail label="Approved by" value={viewing.approved_by} />
                                <Detail
                                    label="Registered"
                                    value={formatDate(viewing.created_at)}
                                    sub={
                                        viewing.registrant_name
                                            ? `by ${viewing.registrant_name}`
                                            : null
                                    }
                                />
                            </dl>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Add equipment
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Record an item and its details.
                    </p>
                    <div className="mt-6">
                        <EquipmentFields form={createForm} statuses={statuses} />
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
                            {createForm.processing ? 'Saving…' : 'Add equipment'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Edit equipment
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Update this item's details.
                    </p>
                    <div className="mt-6">
                        <EquipmentFields
                            form={editForm}
                            statuses={statuses}
                            existingImageUrl={editing?.image_url}
                        />
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
                            Remove equipment
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.name}
                            </span>{' '}
                            from the inventory? This can't be undone.
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
