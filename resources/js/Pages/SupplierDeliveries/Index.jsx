import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    checked_in: 'bg-green-100 text-green-700 ring-green-600/20',
    checked_out: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const statusLabels = {
    checked_in: 'On site',
    checked_out: 'Checked out',
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status] ?? statusStyles.checked_in}`}
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

// Check-in/out are stored as real timestamps (server now()); render in the
// viewer's local time.
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

// Human "on site" duration between check-in and check-out.
function formatDuration(inAt, outAt) {
    if (!inAt || !outAt) return null;
    const mins = Math.round((new Date(outAt) - new Date(inAt)) / 60000);
    if (Number.isNaN(mins) || mins < 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
}

const TruckGlyph = (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17h4V5H2v12h3" />
        <path d="M14 8h4l4 4v5h-3" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const LoginGlyph = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
    </svg>
);

const LogoutGlyph = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
    </svg>
);

/* ---------- single-delivery print sheet ---------- */

// Scoped, print-safe CSS (plain classes, not Tailwind) so the print window
// renders identically to the hidden preview node.
const deliveryPrintCss = `
.dl-sheet{width:100%;max-width:760px;margin:0 auto;color:#000;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;}
.dl-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:6px;}
.dl-logo img{height:58px;width:auto;display:block;}
.dl-company{text-align:right;line-height:1.3;}
.dl-co-name{font-weight:bold;font-size:14px;letter-spacing:.4px;}
.dl-phone{font-weight:bold;margin-top:6px;}
.dl-title{text-align:center;font-weight:bold;font-size:18px;letter-spacing:1px;margin:12px 0 2px;}
.dl-sub{text-align:center;color:#444;margin-bottom:16px;font-size:11px;}
.dl-grid{width:100%;border-collapse:collapse;margin-bottom:16px;table-layout:fixed;}
.dl-grid td{border:1px solid #000;padding:6px 8px;vertical-align:top;}
.dl-lbl{font-weight:bold;background:#f2f2f2;text-transform:uppercase;font-size:9.5px;letter-spacing:.03em;width:110px;}
.dl-items{width:100%;border-collapse:collapse;margin-bottom:18px;}
.dl-items th,.dl-items td{border:1px solid #000;padding:5px 8px;}
.dl-items th{background:#f2f2f2;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;}
.dl-items .num{text-align:right;}
.dl-items tfoot td{font-weight:bold;background:#fafafa;}
.dl-sign{display:flex;justify-content:space-between;gap:40px;margin-top:46px;}
.dl-sign .line{border-top:1px solid #000;flex:1;padding-top:4px;text-align:center;font-size:11px;}
.dl-meta{margin-top:18px;font-size:10px;color:#555;text-align:right;}
`;

function DeliveryPrintSheet({ delivery }) {
    const totalQty = (delivery.items ?? []).reduce(
        (sum, it) => sum + (Number(it.quantity) || 0),
        0,
    );

    return (
        <div id="delivery-print" className="dl-sheet">
            <div className="dl-top">
                <div className="dl-logo">
                    <img src="/logo_main.webp" alt="Eljin Corp" />
                </div>
                <div className="dl-company">
                    <div className="dl-co-name">ELJIN CORPORATION</div>
                    <div>Sta. Rosa Road Zone 2</div>
                    <div>Brgy Maliwalo, City of Tarlac 2300</div>
                    <div className="dl-phone">(+63) 045-982-3481</div>
                </div>
            </div>

            <div className="dl-title">SUPPLIER DELIVERY RECEIPT</div>
            <div className="dl-sub">
                {statusLabels[delivery.status] ?? delivery.status}
            </div>

            <table className="dl-grid">
                <tbody>
                    <tr>
                        <td className="dl-lbl">Supplier</td>
                        <td>{delivery.supplier_name || '—'}</td>
                        <td className="dl-lbl">DR Number</td>
                        <td>{delivery.dr_number || '—'}</td>
                    </tr>
                    <tr>
                        <td className="dl-lbl">Plate No.</td>
                        <td>{delivery.plate_number || '—'}</td>
                        <td className="dl-lbl">Delivery Date</td>
                        <td>
                            {delivery.delivery_date
                                ? formatDate(delivery.delivery_date)
                                : '—'}
                        </td>
                    </tr>
                    <tr>
                        <td className="dl-lbl">Checked In</td>
                        <td>{formatDateTime(delivery.checked_in_at) ?? '—'}</td>
                        <td className="dl-lbl">Checked Out</td>
                        <td>{formatDateTime(delivery.checked_out_at) ?? '—'}</td>
                    </tr>
                    <tr>
                        <td className="dl-lbl">Received By</td>
                        <td>{delivery.received_by || '—'}</td>
                        <td className="dl-lbl">Status</td>
                        <td>{statusLabels[delivery.status] ?? delivery.status}</td>
                    </tr>
                    <tr>
                        <td className="dl-lbl">Notes</td>
                        <td colSpan={3}>{delivery.notes || '—'}</td>
                    </tr>
                </tbody>
            </table>

            <table className="dl-items">
                <thead>
                    <tr>
                        <th>Item / Description</th>
                        <th className="num" style={{ width: '80px' }}>
                            Qty
                        </th>
                        <th style={{ width: '90px' }}>UOM</th>
                    </tr>
                </thead>
                <tbody>
                    {(delivery.items ?? []).map((it) => (
                        <tr key={it.id}>
                            <td>{it.name}</td>
                            <td className="num">{it.quantity}</td>
                            <td>{it.uom || '—'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td>Total</td>
                        <td className="num">{totalQty}</td>
                        <td />
                    </tr>
                </tfoot>
            </table>

            <div className="dl-sign">
                <div className="line">Delivered by</div>
                <div className="line">Received by</div>
            </div>

            <div className="dl-meta">
                Logged {formatDate(delivery.created_at)}
                {delivery.recorder_name ? ` by ${delivery.recorder_name}` : ''}
            </div>
        </div>
    );
}

// Open a clean print window containing only the delivery sheet, mirroring the
// incident-report print so the Eljin logo prints reliably.
function printDeliverySheet() {
    const node = document.getElementById('delivery-print');
    if (!node) return;
    const win = window.open('', '_blank', 'width=850,height=1100');
    if (!win) return;
    win.document.write(
        `<!DOCTYPE html><html><head><title>Supplier Delivery Receipt</title>` +
            `<style>@page{size:A4;margin:14mm;}body{margin:0;padding:0;}` +
            `${deliveryPrintCss}</style></head><body>${node.outerHTML}</body></html>`,
    );
    win.document.close();
    win.focus();
    // Print once the logo image has loaded (or fails / times out).
    const done = () => {
        win.print();
        win.close();
    };
    const img = win.document.querySelector('img');
    if (img && !img.complete) {
        img.onload = done;
        img.onerror = done;
        setTimeout(done, 1500);
    } else {
        setTimeout(done, 300);
    }
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

const emptyItem = {
    name: '',
    quantity: 1,
    uom: 'pcs',
};

// Common units of measure offered as autocomplete suggestions.
const uomOptions = [
    'pcs', 'box', 'pack', 'set', 'pair', 'dozen', 'roll',
    'kg', 'g', 'L', 'mL', 'sack', 'bundle', 'ream', 'unit',
];

const emptyForm = {
    supplier_name: '',
    plate_number: '',
    dr_number: '',
    delivery_date: '',
    received_by: '',
    notes: '',
    dr_image: null,
    items: [{ ...emptyItem }],
};

/* ---------- DR image upload ---------- */

// Downscale a chosen photo to a modest JPEG File before upload so phone
// snapshots don't balloon the request (the server also caps at 10 MB). Returns
// the original file untouched if it's already small or not a raster image.
async function downscaleImage(file, maxDim = 1600, quality = 0.82) {
    if (!file || !file.type?.startsWith('image/')) return file;

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = dataUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 1_500_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    const base = (file.name || 'dr-image').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

// Upload widget for the delivery-receipt photo. Shows the newly picked image,
// or the existing one on edit; picking a new file replaces it on save.
function DrImageField({ form, existingImageUrl }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const file = form.data.dr_image;

    // Object URL for the freshly chosen file; revoke it when it changes.
    useEffect(() => {
        if (file instanceof File) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [file]);

    const onPick = async (e) => {
        const picked = e.target.files?.[0];
        if (!picked) return;
        form.setData('dr_image', await downscaleImage(picked));
    };

    const clear = () => {
        form.setData('dr_image', null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const shownUrl = preview ?? existingImageUrl ?? null;

    return (
        <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
                DR image
            </label>
            <div className="flex items-start gap-4">
                <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    {shownUrl ? (
                        <img
                            src={shownUrl}
                            alt="Delivery receipt"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                        </svg>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={onPick}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="M17 8l-5-5-5 5" />
                            <path d="M12 3v12" />
                        </svg>
                        {shownUrl ? 'Change image' : 'Upload image'}
                    </button>
                    {preview && (
                        <button
                            type="button"
                            onClick={clear}
                            className="text-left text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                            Remove selection
                        </button>
                    )}
                    <p className="text-xs text-gray-400">
                        Photo of the delivery receipt. JPG or PNG, auto-resized.
                    </p>
                </div>
            </div>
            <InputError message={form.errors.dr_image} className="mt-1" />
        </div>
    );
}

/* ---------- items editor ---------- */

function ItemsEditor({ form }) {
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
                    Items <span className="text-red-500">*</span>
                </label>
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add item
                </button>
            </div>

            <div className="space-y-3">
                {items.map((it, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-gray-200 bg-gray-50/60 p-3"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-6">
                                <label className={subLabel}>
                                    Item / description
                                </label>
                                <input
                                    type="text"
                                    value={it.name}
                                    onChange={(e) =>
                                        updateItem(i, 'name', e.target.value)
                                    }
                                    placeholder="What was delivered"
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.name`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className={subLabel}>Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={it.quantity}
                                    onChange={(e) =>
                                        updateItem(
                                            i,
                                            'quantity',
                                            e.target.value === ''
                                                ? ''
                                                : Math.max(
                                                      0,
                                                      parseInt(e.target.value, 10) || 0,
                                                  ),
                                        )
                                    }
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.quantity`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className={subLabel}>UOM</label>
                                <input
                                    type="text"
                                    list="uom-options"
                                    value={it.uom ?? ''}
                                    onChange={(e) =>
                                        updateItem(i, 'uom', e.target.value)
                                    }
                                    placeholder="pcs"
                                    className={fieldClass}
                                />
                                <InputError
                                    message={form.errors[`items.${i}.uom`]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-start sm:col-span-1 sm:pt-6">
                                <button
                                    type="button"
                                    onClick={() => removeItem(i)}
                                    disabled={items.length === 1}
                                    title="Remove item"
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

            <datalist id="uom-options">
                {uomOptions.map((u) => (
                    <option key={u} value={u} />
                ))}
            </datalist>

            {typeof form.errors.items === 'string' && (
                <InputError message={form.errors.items} className="mt-1" />
            )}
        </div>
    );
}

/* ---------- shared form fields ---------- */

function DeliveryFields({ form, existingImageUrl }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Supplier name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.supplier_name}
                    onChange={(e) => form.setData('supplier_name', e.target.value)}
                    placeholder="e.g. Metro Trading Corp."
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.supplier_name} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    DR number
                </label>
                <input
                    type="text"
                    value={form.data.dr_number}
                    onChange={(e) => form.setData('dr_number', e.target.value)}
                    placeholder="Delivery receipt no."
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.dr_number} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Plate No.
                </label>
                <input
                    type="text"
                    value={form.data.plate_number}
                    onChange={(e) => form.setData('plate_number', e.target.value)}
                    placeholder="e.g. ABC 1234"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.plate_number} className="mt-1" />
            </div>

            <ItemsEditor form={form} />

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Delivery date
                </label>
                <input
                    type="date"
                    value={form.data.delivery_date}
                    onChange={(e) => form.setData('delivery_date', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.delivery_date} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Received by
                </label>
                <input
                    type="text"
                    value={form.data.received_by}
                    onChange={(e) => form.setData('received_by', e.target.value)}
                    placeholder="Who received it"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.received_by} className="mt-1" />
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

            <DrImageField form={form} existingImageUrl={existingImageUrl} />
        </div>
    );
}

/* ---------- page ---------- */

export default function SupplierDeliveriesIndex({
    deliveries,
    filters,
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
            from,
            to,
            ...overrides,
        };
        router.get(
            route('supplier-deliveries.index'),
            {
                search: params.search || undefined,
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

    const applyRange = (nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
        applyFilters({ from: nextFrom, to: nextTo });
    };

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('supplier-deliveries.store'), {
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
            supplier_name: item.supplier_name ?? '',
            plate_number: item.plate_number ?? '',
            dr_number: item.dr_number ?? '',
            delivery_date: item.delivery_date
                ? String(item.delivery_date).slice(0, 10)
                : '',
            received_by: item.received_by ?? '',
            notes: item.notes ?? '',
            dr_image: null,
            items:
                item.items && item.items.length
                    ? item.items.map((it) => ({
                          name: it.name ?? '',
                          quantity: it.quantity ?? 0,
                          uom: it.uom ?? '',
                      }))
                    : [{ ...emptyItem }],
        });
        setEditing(item);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        // transform() returns undefined in @inertiajs/react 2.x — don't chain it.
        editForm.transform((data) => ({ ...data, _method: 'patch' }));
        editForm.post(route('supplier-deliveries.update', editing.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const confirmDelete = () => {
        router.delete(route('supplier-deliveries.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    };

    const checkOut = (item) => {
        router.patch(
            route('supplier-deliveries.check-out', item.id),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Supplier Delivery
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Log incoming deliveries and their receipts
                    </p>
                </div>
            }
        >
            <Head title="Supplier Delivery" />

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
                        {count === 1 ? 'delivery' : 'deliveries'}
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
                                placeholder="Search ref, supplier, DR#, item, receiver…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        {/* Delivery date range */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(e) => applyRange(e.target.value, to)}
                                title="Delivered from"
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
                                title="Delivered to"
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

                        {/* Export / print — available once a date range is set */}
                        {(from || to) && (
                            <>
                                <a
                                    href={route('supplier-deliveries.export', {
                                        search: search || undefined,
                                        from: from || undefined,
                                        to: to || undefined,
                                    })}
                                    title="Export the selected range to Excel (CSV)"
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                >
                                    <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <path d="M7 10l5 5 5-5" />
                                        <path d="M12 15V3" />
                                    </svg>
                                    Excel
                                </a>
                                <a
                                    href={route('supplier-deliveries.print', {
                                        search: search || undefined,
                                        from: from || undefined,
                                        to: to || undefined,
                                    })}
                                    target="_blank"
                                    rel="noopener"
                                    title="Print the selected range (Save as PDF)"
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                >
                                    <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9V2h12v7" />
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                        <rect x="6" y="14" width="12" height="8" rx="1" />
                                    </svg>
                                    PDF
                                </a>
                            </>
                        )}

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
                            Log delivery
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
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">DR #</th>
                                    <th className="px-6 py-3">Delivery date</th>
                                    <th className="px-6 py-3">Qty</th>
                                    <th className="px-6 py-3">Received by</th>
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
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {item.supplier_name}
                                                </div>
                                                {item.items?.length > 0 && (
                                                    <div className="text-xs text-gray-400">
                                                        {item.items
                                                            .map((it) => it.name)
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                    </div>
                                                )}
                                                {item.plate_number && (
                                                    <div className="text-xs text-gray-400">
                                                        Plate: {item.plate_number}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.dr_number || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(item.delivery_date)}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-700">
                                            {(item.items ?? []).reduce(
                                                (sum, it) => sum + (Number(it.quantity) || 0),
                                                0,
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {item.received_by || '—'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={item.status} />
                                            {item.checked_in_at && (
                                                <div className="mt-0.5 text-xs text-gray-400">
                                                    In: {formatDateTime(item.checked_in_at)}
                                                </div>
                                            )}
                                            {item.checked_out_at && (
                                                <div className="text-xs text-gray-400">
                                                    Out: {formatDateTime(item.checked_out_at)}
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
                                                {item.status === 'checked_in' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => checkOut(item)}
                                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                    >
                                                        Check out
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
                                            colSpan={8}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No supplier deliveries yet. Log one to get
                                            started.
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
                        {/* Hero header */}
                        <div className="shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
                                        {TruckGlyph}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-xl font-bold text-white">
                                            {viewing.supplier_name}
                                        </h2>
                                        <p className="mt-0.5 truncate text-sm text-indigo-100">
                                            {viewing.plate_number
                                                ? `Plate No. ${viewing.plate_number}`
                                                : 'No plate recorded'}
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            viewing.status === 'checked_in'
                                                ? 'bg-green-300'
                                                : 'bg-white/70'
                                        }`}
                                    />
                                    {statusLabels[viewing.status] ?? viewing.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Check-in / out */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                                        <span className="text-green-500">{LoginGlyph}</span>
                                        Checked in
                                    </div>
                                    <div className="mt-1.5 text-sm font-semibold text-gray-800">
                                        {formatDateTime(viewing.checked_in_at) ?? '—'}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                                        <span className="text-gray-400">{LogoutGlyph}</span>
                                        Checked out
                                    </div>
                                    <div className="mt-1.5 text-sm font-semibold text-gray-800">
                                        {formatDateTime(viewing.checked_out_at) ?? (
                                            <span className="inline-flex items-center gap-1.5 text-green-600">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                Still on site
                                            </span>
                                        )}
                                    </div>
                                    {formatDuration(
                                        viewing.checked_in_at,
                                        viewing.checked_out_at,
                                    ) && (
                                        <div className="mt-1 text-xs text-gray-400">
                                            On site for{' '}
                                            {formatDuration(
                                                viewing.checked_in_at,
                                                viewing.checked_out_at,
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                                <Detail label="DR number" value={viewing.dr_number} />
                                <Detail
                                    label="Delivery date"
                                    value={
                                        viewing.delivery_date
                                            ? formatDate(viewing.delivery_date)
                                            : null
                                    }
                                />
                                <Detail label="Received by" value={viewing.received_by} />
                                <Detail label="Notes" value={viewing.notes} />
                                <Detail
                                    label="Logged"
                                    value={formatDate(viewing.created_at)}
                                    sub={
                                        viewing.recorder_name
                                            ? `by ${viewing.recorder_name}`
                                            : null
                                    }
                                />
                            </dl>

                            {viewing.dr_image_url && (
                                <div className="mt-6">
                                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                        Delivery receipt
                                    </h3>
                                    <a
                                        href={viewing.dr_image_url}
                                        target="_blank"
                                        rel="noopener"
                                        title="Open full size"
                                        className="block overflow-hidden rounded-xl border border-gray-100"
                                    >
                                        <img
                                            src={viewing.dr_image_url}
                                            alt="Delivery receipt"
                                            className="max-h-96 w-full bg-gray-50 object-contain"
                                        />
                                    </a>
                                </div>
                            )}

                            {viewing.items?.length > 0 && (
                                <div className="mt-6">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                            Items
                                        </h3>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                            {viewing.items.length}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-gray-100">
                                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                <tr>
                                                    <th className="px-4 py-2.5">Item</th>
                                                    <th className="px-4 py-2.5 text-right">
                                                        Qty
                                                    </th>
                                                    <th className="px-4 py-2.5">UOM</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {viewing.items.map((it) => (
                                                    <tr key={it.id}>
                                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                                            {it.name}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                                                            {it.quantity}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-500">
                                                            {it.uom || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="border-t border-gray-100 bg-gray-50/60">
                                                <tr>
                                                    <td className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                        Total
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-800">
                                                        {viewing.items.reduce(
                                                            (sum, it) =>
                                                                sum +
                                                                (Number(it.quantity) || 0),
                                                            0,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5" />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
                                onClick={printDeliverySheet}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9V2h12v7" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" rx="1" />
                                </svg>
                                Print
                            </button>
                            {viewing.status === 'checked_in' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        checkOut(viewing);
                                        setViewing(null);
                                    }}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                >
                                    Check out
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

                        {/* Hidden sheet used only as the print source. */}
                        <div style={{ display: 'none' }} aria-hidden="true">
                            <DeliveryPrintSheet delivery={viewing} />
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
                            Log a supplier delivery
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Record an incoming delivery and its receipt.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <DeliveryFields form={createForm} />
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
                            {createForm.processing ? 'Saving…' : 'Log delivery'}
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
                            Edit supplier delivery
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update this delivery's details.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <DeliveryFields
                            form={editForm}
                            existingImageUrl={editing?.dr_image_url}
                        />
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
                            Remove delivery
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Remove the delivery from{' '}
                            <span className="font-semibold text-gray-700">
                                {deleting.supplier_name}
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
