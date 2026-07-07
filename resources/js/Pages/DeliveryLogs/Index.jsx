import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const statusStyles = {
    out: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    returned: 'bg-green-100 text-green-700 ring-green-600/20',
};

const statusLabels = {
    out: 'On the road',
    returned: 'Returned',
};

function Badge({ status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status] ?? statusStyles.out}`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Format an ISO/date value for a <input type="datetime-local"> (local time).
function toDateTimeLocal(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The item-count fields, in display order.
const loadItems = [
    { key: 'crates_big', label: 'Crates (big)' },
    { key: 'crates_small', label: 'Crates (small)' },
    { key: 'box', label: 'Box' },
    { key: 'bin', label: 'Bin' },
    { key: 'empanada_box', label: 'Empanada box' },
    { key: 'trolley', label: 'Trolley' },
];

// The same six item counts, but for the load that comes back to the plant.
const returnItems = loadItems.map((i) => ({
    key: `ret_${i.key}`,
    label: i.label,
}));

// Compact "3 crates (big) · 2 box" summary of the non-zero load counts.
function loadSummary(d) {
    const parts = loadItems
        .filter((i) => Number(d[i.key]) > 0)
        .map((i) => `${d[i.key]} ${i.label.toLowerCase()}`);
    return parts.length ? parts.join(' · ') : '—';
}

// Per-item shortage (out − returned) for a returned delivery.
// Returns { total, text } where total is the count of unreturned items.
function missingSummary(d) {
    let total = 0;
    const parts = [];
    for (const i of loadItems) {
        const short = Number(d[i.key] ?? 0) - Number(d[`ret_${i.key}`] ?? 0);
        if (short > 0) {
            total += short;
            parts.push(`${short} ${i.label.toLowerCase()}`);
        }
    }
    return { total, text: parts.join(' · ') };
}

const tabs = [
    { key: '', label: 'All' },
    { key: 'out', label: 'On the road' },
    { key: 'returned', label: 'Returned' },
];

/* ---------- plate autocomplete ---------- */

// Text input that suggests registered vehicles and previously-used plates as
// you type. `suggestions` is [{ plate, detail, source }].
function PlateAutocomplete({ value, onChange, suggestions = [], autoFocus }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);

    const q = (value ?? '').trim().toLowerCase();
    const matches = (
        q
            ? suggestions.filter(
                  (s) =>
                      s.plate.toLowerCase().includes(q) ||
                      (s.detail ?? '').toLowerCase().includes(q),
              )
            : suggestions
    ).slice(0, 8);

    // Hide when the current value already exactly equals the only match.
    const showList =
        open &&
        matches.length > 0 &&
        !(matches.length === 1 && matches[0].plate.toLowerCase() === q);

    const choose = (plate) => {
        onChange(plate);
        setOpen(false);
        setActive(-1);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter' && showList && active >= 0 && matches[active]) {
            e.preventDefault();
            choose(matches[active].plate);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                autoComplete="off"
                placeholder="e.g. ABC 1234"
                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
            />
            {showList && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {matches.map((s, i) => (
                        <li key={s.source + s.plate}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(s.plate)}
                                className={
                                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left ' +
                                    (i === active ? 'bg-indigo-50' : 'hover:bg-gray-50')
                                }
                            >
                                <span className="min-w-0">
                                    <span className="block font-semibold tracking-wide text-gray-900">
                                        {s.plate}
                                    </span>
                                    {s.detail && (
                                        <span className="block truncate text-xs text-gray-400">
                                            {s.detail}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={
                                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                                        (s.source === 'vehicle'
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'bg-gray-100 text-gray-500')
                                    }
                                >
                                    {s.source === 'vehicle' ? 'Registered' : 'Previous'}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ---------- crew autocomplete ---------- */

// Type-ahead over a crew registry. `suggestions` is [{ id, name, detail }].
// `onInput(name)` fires on free typing (caller should clear the linked id);
// `onChoose(person)` fires when a registry row is picked (caller stores id + name).
function PersonAutocomplete({ value, onInput, onChoose, suggestions = [], placeholder }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);

    const q = (value ?? '').trim().toLowerCase();
    const matches = (
        q
            ? suggestions.filter(
                  (s) =>
                      s.name.toLowerCase().includes(q) ||
                      (s.detail ?? '').toLowerCase().includes(q),
              )
            : suggestions
    ).slice(0, 8);

    // Hide when the current value already exactly equals the only match.
    const showList =
        open &&
        matches.length > 0 &&
        !(matches.length === 1 && matches[0].name.toLowerCase() === q);

    const choose = (person) => {
        onChoose(person);
        setOpen(false);
        setActive(-1);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter' && showList && active >= 0 && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onInput(e.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                placeholder={placeholder}
                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
            />
            {showList && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {matches.map((s, i) => (
                        <li key={s.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(s)}
                                className={
                                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left ' +
                                    (i === active ? 'bg-indigo-50' : 'hover:bg-gray-50')
                                }
                            >
                                <span className="min-w-0">
                                    <span className="block font-medium text-gray-900">
                                        {s.name}
                                    </span>
                                    {s.detail && (
                                        <span className="block truncate text-xs text-gray-400">
                                            {s.detail}
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                    Registered
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ---------- page ---------- */

export default function DeliveryLogsIndex({ deliveries, filters, plates = [], plateSuggestions = [], driverSuggestions = [], helperSuggestions = [], routes = [], counts }) {
    const flash = usePage().props.flash;
    const [search, setSearch] = useState(filters.search ?? '');
    const [plateFilter, setPlateFilter] = useState(filters.plate ?? '');
    const [routeFilter, setRouteFilter] = useState(filters.route ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [returning, setReturning] = useState(null); // delivery being marked returned
    const [viewing, setViewing] = useState(null); // delivery being viewed
    const [editing, setEditing] = useState(null); // delivery being edited

    const form = useForm({
        plate_number: '',
        route: '',
        driver: '',
        helper: '',
        driver_id: null,
        helper_id: null,
        crates_big: '',
        crates_small: '',
        box: '',
        bin: '',
        empanada_box: '',
        trolley: '',
        delivery_out: '',
    });

    const returnForm = useForm({
        arrival_plant: '',
        ret_crates_big: '',
        ret_crates_small: '',
        ret_box: '',
        ret_bin: '',
        ret_empanada_box: '',
        ret_trolley: '',
        returned_remarks: '',
    });

    const editForm = useForm({
        plate_number: '',
        route: '',
        driver: '',
        helper: '',
        driver_id: null,
        helper_id: null,
        crates_big: '',
        crates_small: '',
        box: '',
        bin: '',
        empanada_box: '',
        trolley: '',
        delivery_out: '',
        status: 'out',
        arrival_plant: '',
        ret_crates_big: '',
        ret_crates_small: '',
        ret_box: '',
        ret_bin: '',
        ret_empanada_box: '',
        ret_trolley: '',
        returned_remarks: '',
    });

    const openEdit = (d) => {
        editForm.clearErrors();
        editForm.setData({
            plate_number: d.plate_number ?? '',
            route: d.route ?? '',
            driver: d.driver ?? '',
            helper: d.helper ?? '',
            driver_id: d.driver_id ?? null,
            helper_id: d.helper_id ?? null,
            crates_big: d.crates_big ?? 0,
            crates_small: d.crates_small ?? 0,
            box: d.box ?? 0,
            bin: d.bin ?? 0,
            empanada_box: d.empanada_box ?? 0,
            trolley: d.trolley ?? 0,
            delivery_out: toDateTimeLocal(d.delivery_out),
            status: d.status ?? 'out',
            arrival_plant: toDateTimeLocal(d.arrival_plant),
            ret_crates_big: d.ret_crates_big ?? 0,
            ret_crates_small: d.ret_crates_small ?? 0,
            ret_box: d.ret_box ?? 0,
            ret_bin: d.ret_bin ?? 0,
            ret_empanada_box: d.ret_empanada_box ?? 0,
            ret_trolley: d.ret_trolley ?? 0,
            returned_remarks: d.returned_remarks ?? '',
        });
        setEditing(d);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('delivery-logs.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const submitDelivery = (e) => {
        e.preventDefault();
        form.post(route('delivery-logs.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setCreating(false);
            },
        });
    };

    const submitReturn = (e) => {
        e.preventDefault();
        returnForm.patch(route('delivery-logs.return', returning.id), {
            preserveScroll: true,
            onSuccess: () => {
                returnForm.reset();
                setReturning(null);
            },
        });
    };

    const closeModal = () => {
        setCreating(false);
        form.clearErrors();
        form.reset();
    };

    // Push the current filter set to the server (params can be overridden).
    const applyFilters = (overrides = {}) => {
        const params = {
            search,
            status: filters.status || '',
            plate: plateFilter,
            route: routeFilter,
            from,
            to,
            ...overrides,
        };
        router.get(
            route('delivery-logs.index'),
            {
                search: params.search || undefined,
                status: params.status || undefined,
                plate: params.plate || undefined,
                route: params.route || undefined,
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
        if (flash?.success) {
            setToast(flash.success);
            const id = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(id);
        }
    }, [flash?.success]);

    const setStatus = (status) => applyFilters({ status });

    const setPlate = (value) => {
        setPlateFilter(value);
        applyFilters({ plate: value });
    };

    const setRoute = (value) => {
        setRouteFilter(value);
        applyFilters({ route: value });
    };

    const applyRange = (nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
        applyFilters({ from: nextFrom, to: nextTo });
    };

    const clearFilters = () => {
        setSearch('');
        setPlateFilter('');
        setRouteFilter('');
        setFrom('');
        setTo('');
        router.get(
            route('delivery-logs.index'),
            { status: filters.status || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const hasFilters = search || plateFilter || routeFilter || from || to;

    const countFor = (key) =>
        ({
            '': counts.all,
            out: counts.out,
            returned: counts.returned,
        })[key];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Delivery Log
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Track vehicles dispatched and the load they carry
                    </p>
                </div>
            }
        >
            <Head title="Delivery Log" />

            {/* Route suggestions (previously-used routes) shared by both forms. */}
            <datalist id="route-options">
                {routes.map((r) => (
                    <option key={r} value={r} />
                ))}
            </datalist>

            {/* Toast */}
            {toast && (
                <div className="fixed right-4 top-20 z-50 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
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

                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Log delivery
                    </button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm lg:flex-row lg:flex-wrap lg:items-center">
                    <div className="relative flex-1 lg:min-w-[16rem]">
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
                            placeholder="Search ref, plate, route, driver…"
                            className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Plate filter */}
                    <select
                        value={plateFilter}
                        onChange={(e) => setPlate(e.target.value)}
                        title="Filter by plate #"
                        className={
                            'rounded-lg border-gray-300 py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                            (plateFilter ? 'text-gray-900' : 'text-gray-500')
                        }
                    >
                        <option value="">All plates</option>
                        {plates.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>

                    {/* Route filter */}
                    <select
                        value={routeFilter}
                        onChange={(e) => setRoute(e.target.value)}
                        title="Filter by route"
                        className={
                            'rounded-lg border-gray-300 py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                            (routeFilter ? 'text-gray-900' : 'text-gray-500')
                        }
                    >
                        <option value="">All routes</option>
                        {routes.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    {/* Date range (on the OUT date) */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={(e) => applyRange(e.target.value, to)}
                            title="From date (out)"
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
                            title="To date (out)"
                            className={
                                'rounded-lg border-gray-300 py-2.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                                (to ? 'text-gray-900' : 'text-gray-500')
                            }
                        />
                    </div>

                    {/* Export / print — available once a date range is set */}
                    {(from || to) && (
                        <>
                            <a
                                href={route('delivery-logs.export', {
                                    search: search || undefined,
                                    status: filters.status || undefined,
                                    plate: plateFilter || undefined,
                                    route: routeFilter || undefined,
                                    from: from || undefined,
                                    to: to || undefined,
                                })}
                                title="Export the selected range to Excel (CSV)"
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <path d="M7 10l5 5 5-5" />
                                    <path d="M12 15V3" />
                                </svg>
                                Excel
                            </a>
                            <a
                                href={route('delivery-logs.print', {
                                    search: search || undefined,
                                    status: filters.status || undefined,
                                    plate: plateFilter || undefined,
                                    route: routeFilter || undefined,
                                    from: from || undefined,
                                    to: to || undefined,
                                })}
                                target="_blank"
                                rel="noopener"
                                title="Print the selected range (Save as PDF)"
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
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

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                            Clear
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">ID #</th>
                                    <th className="px-6 py-3">Out</th>
                                    <th className="px-6 py-3">Plate</th>
                                    <th className="px-6 py-3">Route</th>
                                    <th className="px-6 py-3">Crew</th>
                                    <th className="px-6 py-3">Load</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {deliveries.data.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50/70">
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className="font-mono text-[11px] font-medium tracking-wide text-indigo-500">
                                                {d.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDateTime(d.delivery_out)}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {d.plate_number}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.route ?? '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {d.driver ?? '—'}
                                            {d.helper && (
                                                <div className="text-xs font-normal text-gray-400">
                                                    helper: {d.helper}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {loadSummary(d)}
                                            {d.status === 'returned' &&
                                                (() => {
                                                    const m = missingSummary(d);
                                                    return m.total > 0 ? (
                                                        <div className="mt-0.5 text-xs font-medium text-red-600">
                                                            Missing: {m.text}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 text-xs font-medium text-green-600">
                                                            All returned
                                                        </div>
                                                    );
                                                })()}
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge status={d.status} />
                                            {d.status === 'returned' && (
                                                <div className="mt-0.5 text-xs text-gray-400">
                                                    {formatDateTime(d.returned_at)}
                                                    {d.returned_remarks
                                                        ? ` · ${d.returned_remarks}`
                                                        : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {d.status === 'out' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturning(d)}
                                                        className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                                    >
                                                        Mark returned
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setViewing(d)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(d)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    Edit
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
                                            No deliveries logged.
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

            {/* Log delivery modal */}
            <Modal show={creating} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={submitDelivery} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Log a delivery
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Record a vehicle going out and the load it carries.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Plate number <span className="text-red-500">*</span>
                            </label>
                            <PlateAutocomplete
                                value={form.data.plate_number}
                                onChange={(v) => form.setData('plate_number', v)}
                                suggestions={plateSuggestions}
                                autoFocus
                            />
                            <InputError message={form.errors.plate_number} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Delivery out
                            </label>
                            <input
                                type="datetime-local"
                                value={form.data.delivery_out}
                                onChange={(e) =>
                                    form.setData('delivery_out', e.target.value)
                                }
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Leave blank to use the current time.
                            </p>
                            <InputError message={form.errors.delivery_out} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Driver
                            </label>
                            <PersonAutocomplete
                                value={form.data.driver}
                                onInput={(v) =>
                                    form.setData((d) => ({ ...d, driver: v, driver_id: null }))
                                }
                                onChoose={(p) =>
                                    form.setData((d) => ({ ...d, driver: p.name, driver_id: p.id }))
                                }
                                suggestions={driverSuggestions}
                                placeholder="Search or type a name"
                            />
                            <InputError message={form.errors.driver} className="mt-1" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Helper
                            </label>
                            <PersonAutocomplete
                                value={form.data.helper}
                                onInput={(v) =>
                                    form.setData((d) => ({ ...d, helper: v, helper_id: null }))
                                }
                                onChoose={(p) =>
                                    form.setData((d) => ({ ...d, helper: p.name, helper_id: p.id }))
                                }
                                suggestions={helperSuggestions}
                                placeholder="Search or type a name"
                            />
                            <InputError message={form.errors.helper} className="mt-1" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Route
                            </label>
                            <input
                                type="text"
                                list="route-options"
                                value={form.data.route}
                                onChange={(e) =>
                                    form.setData('route', e.target.value)
                                }
                                placeholder="Destination / area"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={form.errors.route} className="mt-1" />
                        </div>
                    </div>

                    {/* Load counts */}
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700">Load out</h3>
                        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {loadItems.map((item) => (
                                <div key={item.key}>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        {item.label}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.data[item.key]}
                                        onChange={(e) =>
                                            form.setData(item.key, e.target.value)
                                        }
                                        placeholder="0"
                                        className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <InputError message={form.errors[item.key]} className="mt-1" />
                                </div>
                            ))}
                        </div>
                    </div>

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
                            {form.processing ? 'Saving…' : 'Log delivery'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Mark returned modal */}
            <Modal show={!!returning} onClose={() => setReturning(null)} maxWidth="xl">
                {returning && (
                    <form onSubmit={submitReturn} className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Mark as returned
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Vehicle{' '}
                            <span className="font-medium text-gray-700">
                                {returning.plate_number}
                            </span>
                            {returning.route ? ` (${returning.route})` : ''}.
                        </p>

                        <div className="mt-5">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Arrival plant
                            </label>
                            <input
                                type="datetime-local"
                                value={returnForm.data.arrival_plant}
                                onChange={(e) =>
                                    returnForm.setData(
                                        'arrival_plant',
                                        e.target.value,
                                    )
                                }
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Leave blank to use the current time.
                            </p>
                            <InputError message={returnForm.errors.arrival_plant} className="mt-1" />
                        </div>

                        {/* Load returned */}
                        <div className="mt-5">
                            <h3 className="text-sm font-semibold text-gray-700">
                                Load returned
                            </h3>
                            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {returnItems.map((item) => (
                                    <div key={item.key}>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            {item.label}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={returnForm.data[item.key]}
                                            onChange={(e) =>
                                                returnForm.setData(
                                                    item.key,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0"
                                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <InputError message={returnForm.errors[item.key]} className="mt-1" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Remarks
                            </label>
                            <input
                                type="text"
                                value={returnForm.data.returned_remarks}
                                onChange={(e) =>
                                    returnForm.setData(
                                        'returned_remarks',
                                        e.target.value,
                                    )
                                }
                                placeholder="Returns, shortages, notes (optional)"
                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <InputError message={returnForm.errors.returned_remarks} className="mt-1" />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setReturning(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={returnForm.processing}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {returnForm.processing ? 'Saving…' : 'Confirm return'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* View delivery modal */}
            <Modal show={!!viewing} onClose={() => setViewing(null)} maxWidth="2xl">
                {viewing &&
                    (() => {
                        const isReturned = viewing.status === 'returned';
                        const totals = loadItems.reduce(
                            (acc, item) => {
                                const out = Number(viewing[item.key] ?? 0);
                                const ret = Number(viewing[`ret_${item.key}`] ?? 0);
                                acc.out += out;
                                acc.ret += ret;
                                acc.missing += Math.max(0, out - ret);
                                return acc;
                            },
                            { out: 0, ret: 0, missing: 0 },
                        );

                        return (
                            <div>
                                {/* Header band */}
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10 17h4V5H2v12h3" />
                                                    <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                                                    <circle cx="7.5" cy="17.5" r="2.5" />
                                                    <circle cx="17.5" cy="17.5" r="2.5" />
                                                </svg>
                                            </span>
                                            <div>
                                                <h2 className="text-xl font-bold leading-tight text-white">
                                                    {viewing.plate_number}
                                                </h2>
                                                <p className="mt-0.5 text-sm text-indigo-100">
                                                    {viewing.route || 'No route'} · out{' '}
                                                    {formatDateTime(viewing.delivery_out)}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ' +
                                                (isReturned
                                                    ? 'bg-white text-green-700'
                                                    : 'bg-amber-400/20 text-white ring-1 ring-inset ring-white/30')
                                            }
                                        >
                                            <span
                                                className={
                                                    'h-1.5 w-1.5 rounded-full ' +
                                                    (isReturned ? 'bg-green-500' : 'bg-amber-300')
                                                }
                                            />
                                            {statusLabels[viewing.status]}
                                        </span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="space-y-5 px-6 py-5">
                                    {/* KPI tiles */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Load out
                                            </p>
                                            <p className="mt-1 text-2xl font-bold text-gray-900">
                                                {totals.out}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-green-100 bg-green-50/70 p-3">
                                            <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                                                Returned
                                            </p>
                                            <p className="mt-1 text-2xl font-bold text-green-700">
                                                {isReturned ? totals.ret : '—'}
                                            </p>
                                        </div>
                                        <div
                                            className={
                                                'rounded-xl border p-3 ' +
                                                (isReturned && totals.missing > 0
                                                    ? 'border-red-100 bg-red-50/70'
                                                    : 'border-gray-100 bg-gray-50/70')
                                            }
                                        >
                                            <p
                                                className={
                                                    'text-xs font-medium uppercase tracking-wide ' +
                                                    (isReturned && totals.missing > 0
                                                        ? 'text-red-600'
                                                        : 'text-gray-400')
                                                }
                                            >
                                                Missing
                                            </p>
                                            <p
                                                className={
                                                    'mt-1 text-2xl font-bold ' +
                                                    (isReturned && totals.missing > 0
                                                        ? 'text-red-600'
                                                        : 'text-gray-900')
                                                }
                                            >
                                                {isReturned ? totals.missing : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-gray-50 px-4 py-4 text-sm sm:grid-cols-4">
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Driver
                                            </dt>
                                            <dd className="mt-0.5 font-medium text-gray-800">
                                                {viewing.driver || '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Helper
                                            </dt>
                                            <dd className="mt-0.5 font-medium text-gray-800">
                                                {viewing.helper || '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Logged by
                                            </dt>
                                            <dd className="mt-0.5 font-medium text-gray-800">
                                                {viewing.logger_name || '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Arrival plant
                                            </dt>
                                            <dd className="mt-0.5 font-medium text-gray-800">
                                                {isReturned
                                                    ? formatDateTime(viewing.arrival_plant)
                                                    : '—'}
                                            </dd>
                                        </div>
                                    </dl>

                                    {/* Load out vs returned, with missing (unreturned) count */}
                                    <div className="overflow-hidden rounded-xl border border-gray-100">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left">Item</th>
                                                    <th className="px-4 py-2.5 text-right">Out</th>
                                                    <th className="px-4 py-2.5 text-right">Returned</th>
                                                    <th className="px-4 py-2.5 text-right">Missing</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {loadItems.map((item) => {
                                                    const out = Number(viewing[item.key] ?? 0);
                                                    const ret = Number(viewing[`ret_${item.key}`] ?? 0);
                                                    const missing = out - ret;
                                                    const short = isReturned && missing > 0;
                                                    return (
                                                        <tr
                                                            key={item.key}
                                                            className={short ? 'bg-red-50/40' : ''}
                                                        >
                                                            <td className="px-4 py-2.5 text-gray-700">
                                                                {item.label}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                                {out}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                                {isReturned ? ret : '—'}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                {!isReturned ? (
                                                                    <span className="text-gray-400">—</span>
                                                                ) : missing > 0 ? (
                                                                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-red-700">
                                                                        {missing}
                                                                    </span>
                                                                ) : missing < 0 ? (
                                                                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
                                                                        +{-missing}
                                                                    </span>
                                                                ) : (
                                                                    <span className="tabular-nums text-gray-400">0</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {isReturned && (
                                                <tfoot className="border-t border-gray-100 bg-gray-50 text-sm font-semibold text-gray-700">
                                                    <tr>
                                                        <td className="px-4 py-2.5">Total</td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums">
                                                            {totals.out}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums">
                                                            {totals.ret}
                                                        </td>
                                                        <td
                                                            className={
                                                                'px-4 py-2.5 text-right tabular-nums ' +
                                                                (totals.missing > 0
                                                                    ? 'text-red-600'
                                                                    : 'text-gray-500')
                                                            }
                                                        >
                                                            {totals.missing}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                        {isReturned && totals.missing > 0 && (
                                            <div className="flex items-center gap-1.5 border-t border-gray-100 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
                                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                    <path d="M12 9v4M12 17h.01" />
                                                </svg>
                                                {totals.missing} item
                                                {totals.missing === 1 ? '' : 's'} unreturned (missing
                                                from what went out).
                                            </div>
                                        )}
                                        {isReturned && totals.missing === 0 && (
                                            <div className="flex items-center gap-1.5 border-t border-gray-100 bg-green-50 px-4 py-2.5 text-xs font-medium text-green-700">
                                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6 9 17l-5-5" />
                                                </svg>
                                                All items returned.
                                            </div>
                                        )}
                                    </div>

                                    {/* Remarks */}
                                    {isReturned && viewing.returned_remarks && (
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                Remarks
                                            </p>
                                            <p className="mt-1 text-gray-700">
                                                {viewing.returned_remarks}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = viewing;
                                            setViewing(null);
                                            openEdit(d);
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
                        );
                    })()}
            </Modal>

            {/* Edit delivery modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="2xl">
                {editing && (
                    <form onSubmit={submitEdit} className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Edit delivery
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update the dispatch and return details.
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Plate number <span className="text-red-500">*</span>
                                </label>
                                <PlateAutocomplete
                                    value={editForm.data.plate_number}
                                    onChange={(v) => editForm.setData('plate_number', v)}
                                    suggestions={plateSuggestions}
                                />
                                <InputError message={editForm.errors.plate_number} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Delivery out
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editForm.data.delivery_out}
                                    onChange={(e) =>
                                        editForm.setData('delivery_out', e.target.value)
                                    }
                                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <InputError message={editForm.errors.delivery_out} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Route
                                </label>
                                <input
                                    type="text"
                                    list="route-options"
                                    value={editForm.data.route}
                                    onChange={(e) =>
                                        editForm.setData('route', e.target.value)
                                    }
                                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <InputError message={editForm.errors.route} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Driver
                                </label>
                                <PersonAutocomplete
                                    value={editForm.data.driver}
                                    onInput={(v) =>
                                        editForm.setData((d) => ({ ...d, driver: v, driver_id: null }))
                                    }
                                    onChoose={(p) =>
                                        editForm.setData((d) => ({ ...d, driver: p.name, driver_id: p.id }))
                                    }
                                    suggestions={driverSuggestions}
                                    placeholder="Search or type a name"
                                />
                                <InputError message={editForm.errors.driver} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Helper
                                </label>
                                <PersonAutocomplete
                                    value={editForm.data.helper}
                                    onInput={(v) =>
                                        editForm.setData((d) => ({ ...d, helper: v, helper_id: null }))
                                    }
                                    onChoose={(p) =>
                                        editForm.setData((d) => ({ ...d, helper: p.name, helper_id: p.id }))
                                    }
                                    suggestions={helperSuggestions}
                                    placeholder="Search or type a name"
                                />
                                <InputError message={editForm.errors.helper} className="mt-1" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Status
                                </label>
                                <select
                                    value={editForm.data.status}
                                    onChange={(e) =>
                                        editForm.setData('status', e.target.value)
                                    }
                                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="out">On the road</option>
                                    <option value="returned">Returned</option>
                                </select>
                                <InputError message={editForm.errors.status} className="mt-1" />
                            </div>
                        </div>

                        {/* Load out */}
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-700">Load out</h3>
                            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {loadItems.map((item) => (
                                    <div key={item.key}>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            {item.label}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editForm.data[item.key]}
                                            onChange={(e) =>
                                                editForm.setData(item.key, e.target.value)
                                            }
                                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <InputError message={editForm.errors[item.key]} className="mt-1" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Return section — only when returned */}
                        {editForm.data.status === 'returned' && (
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Arrival plant
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={editForm.data.arrival_plant}
                                            onChange={(e) =>
                                                editForm.setData('arrival_plant', e.target.value)
                                            }
                                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <InputError message={editForm.errors.arrival_plant} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Remarks
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.data.returned_remarks}
                                            onChange={(e) =>
                                                editForm.setData('returned_remarks', e.target.value)
                                            }
                                            placeholder="Returns, shortages, notes"
                                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                        <InputError message={editForm.errors.returned_remarks} className="mt-1" />
                                    </div>
                                </div>

                                <h3 className="mt-5 text-sm font-semibold text-gray-700">
                                    Load returned
                                </h3>
                                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {returnItems.map((item) => (
                                        <div key={item.key}>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                {item.label}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editForm.data[item.key]}
                                                onChange={(e) =>
                                                    editForm.setData(item.key, e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                            <InputError message={editForm.errors[item.key]} className="mt-1" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
