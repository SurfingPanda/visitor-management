import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/* ---------- helpers ---------- */

const severityStyles = {
    low: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    medium: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    high: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    critical: 'bg-red-100 text-red-700 ring-red-600/20',
};

const statusStyles = {
    open: 'bg-red-100 text-red-700 ring-red-600/20',
    under_review: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    resolved: 'bg-green-100 text-green-700 ring-green-600/20',
};

const statusLabels = {
    open: 'Open',
    under_review: 'Under review',
    resolved: 'Resolved',
};

const typeStyles = {
    incident: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
    accident: 'bg-rose-100 text-rose-700 ring-rose-600/20',
};

function Badge({ className, children }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${className}`}
        >
            {children}
        </span>
    );
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Convert a server datetime into the value a datetime-local input expects.
function toLocalInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const tabs = [
    { key: '', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'under_review', label: 'Under review' },
    { key: 'resolved', label: 'Resolved' },
];

// Classification checkboxes for a report.
const categoryOptions = [
    { key: 'injury_first_aid', label: 'Injury – First Aid Treatment' },
    { key: 'injury_medical', label: 'Injury – Medical / Emergency Treatment' },
    { key: 'property_damage', label: 'Property Damage' },
    { key: 'equipment_failure', label: 'Equipment Failure / Breakdown' },
    {
        key: 'code_violation',
        label: 'Violation of Code of Conduct & Ethics / Company Rules & Regulation',
    },
];

const categoryLabels = Object.fromEntries(
    categoryOptions.map((c) => [c.key, c.label]),
);

// Exact wording used on the official printed form (BW-HRD-SF-11).
const formCategoryLabels = {
    injury_first_aid: 'Injury – First Aid Treatment',
    injury_medical: 'Injury - Medical / Emergency Treatment',
    property_damage: 'Property Damage',
    equipment_failure: 'Equipment Failure / Break Down',
    code_violation:
        'Violation of code of conduct and ethics with Company Rules and Regulation',
};

// Scoped, print-safe CSS (plain classes, not Tailwind) reused by the on-screen
// preview and the print window so both render identically.
const incidentFormCss = `
.ir-sheet{width:100%;max-width:760px;margin:0 auto;color:#000;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;}
.ir-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:6px;}
.ir-logo img{height:58px;width:auto;display:block;}
.ir-company{text-align:right;line-height:1.3;}
.ir-co-name{font-weight:bold;font-size:14px;letter-spacing:.4px;}
.ir-phone{font-weight:bold;margin-top:6px;}
.ir-title{text-align:center;font-weight:bold;font-size:20px;letter-spacing:1px;margin:8px 0 20px;}
.ir-checks{display:flex;gap:36px;margin:0 0 20px;padding-left:6px;}
.ir-check-col{display:flex;flex-direction:column;gap:14px;flex:1;}
.ir-check{display:flex;align-items:flex-start;gap:8px;}
.ir-box{display:inline-block;width:14px;height:14px;border:1.5px solid #000;flex:none;margin-top:1px;text-align:center;line-height:12px;font-size:12px;font-weight:bold;}
.ir-table{width:100%;border-collapse:collapse;table-layout:fixed;}
.ir-table td{border:1.5px solid #000;padding:5px 7px;vertical-align:top;}
.ir-lbl{font-weight:bold;}
.ir-v{font-weight:normal;}
.ir-name .ir-v{display:block;margin-top:16px;}
.ir-details{height:360px;}
.ir-details .ir-v{display:block;margin-top:8px;white-space:pre-wrap;font-weight:normal;}
.ir-details .ir-subject{font-weight:bold;margin-top:6px;}
.ir-two .ir-v{display:block;margin-top:14px;}
.ir-indent{padding-left:22px;}
.ir-control{text-align:right;font-style:italic;font-size:11px;margin-top:6px;}
`;

function IncidentPrintForm({ report }) {
    const leftChecks = ['injury_first_aid', 'injury_medical', 'property_damage'];
    const rightChecks = ['equipment_failure', 'code_violation'];
    const checked = (key) => (report.categories ?? []).includes(key);

    const Check = ({ k }) => (
        <label className="ir-check">
            <span className="ir-box">{checked(k) ? '✔' : ''}</span>
            <span>{formCategoryLabels[k]}</span>
        </label>
    );

    return (
        <div id="incident-print" className="ir-sheet">
            <div className="ir-top">
                <div className="ir-logo">
                    <img src="/logo_main.webp" alt="Eljin Corp" />
                </div>
                <div className="ir-company">
                    <div className="ir-co-name">ELJIN CORPORATION</div>
                    <div>Sta. Rosa Road Zone 2</div>
                    <div>Brgy Maliwalo, City of Tarlac 2300</div>
                    <div className="ir-phone">(+63) 045-982-3481</div>
                </div>
            </div>

            <div className="ir-title">
                {(report.type === 'accident' ? 'ACCIDENT' : 'INCIDENT')} REPORT
            </div>

            <div className="ir-checks">
                <div className="ir-check-col">
                    {leftChecks.map((k) => (
                        <Check key={k} k={k} />
                    ))}
                </div>
                <div className="ir-check-col">
                    {rightChecks.map((k) => (
                        <Check key={k} k={k} />
                    ))}
                </div>
            </div>

            <table className="ir-table">
                <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '22%' }} />
                </colgroup>
                <tbody>
                    <tr>
                        <td colSpan={2} rowSpan={2} className="ir-name">
                            <span className="ir-lbl">
                                Name of Employee Involved in the Incident:
                            </span>
                            <span className="ir-v">
                                {report.people_involved || ''}
                            </span>
                        </td>
                        <td className="ir-lbl">Date Filed:</td>
                        <td className="ir-v">{formatDate(report.created_at)}</td>
                    </tr>
                    <tr>
                        <td className="ir-lbl">Reported By:</td>
                        <td className="ir-v">{report.reporter_name || ''}</td>
                    </tr>
                    <tr>
                        <td className="ir-lbl">Date and time of Incident:</td>
                        <td className="ir-v">{formatDate(report.occurred_at)}</td>
                        <td className="ir-lbl">Site/Location of Incident:</td>
                        <td className="ir-v">{report.location || ''}</td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="ir-details">
                            <span className="ir-lbl">Details of the Incident</span>
                            {report.title && (
                                <div className="ir-subject">{report.title}</div>
                            )}
                            <span className="ir-v">{report.description}</span>
                        </td>
                    </tr>
                    <tr className="ir-two">
                        <td colSpan={2}>
                            <span className="ir-lbl">Other Persons Involved:</span>
                            <span className="ir-v"></span>
                        </td>
                        <td colSpan={2}>
                            <span className="ir-lbl">Witness to the Incident:</span>
                            <span className="ir-v">{report.witness || ''}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2}>
                            <div className="ir-lbl">Received By/Date:</div>
                            <div className="ir-lbl">HR Department:</div>
                        </td>
                        <td colSpan={2}>
                            <div className="ir-lbl">CC: Department Head</div>
                            <div className="ir-indent">201 File</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="ir-control">
                Report No. {report.reference} &nbsp;|&nbsp; Control No.
                BW-HRD-SF-11
            </div>
        </div>
    );
}

/* ---------- shared report form fields (create + edit) ---------- */

function ReportFields({ form, toggleCategory }) {
    return (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.type}
                    onChange={(e) => form.setData('type', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="incident">Incident</option>
                    <option value="accident">Accident</option>
                </select>
                <InputError message={form.errors.type} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Severity <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data.severity}
                    onChange={(e) => form.setData('severity', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
                <InputError message={form.errors.severity} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    placeholder="Short summary of what happened"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.title} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Date &amp; time occurred
                </label>
                <input
                    type="datetime-local"
                    value={form.data.occurred_at}
                    onChange={(e) => form.setData('occurred_at', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.occurred_at} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Location
                </label>
                <input
                    type="text"
                    value={form.data.location}
                    onChange={(e) => form.setData('location', e.target.value)}
                    placeholder="e.g. Lobby, Warehouse B"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.location} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    People involved
                </label>
                <input
                    type="text"
                    value={form.data.people_involved}
                    onChange={(e) =>
                        form.setData('people_involved', e.target.value)
                    }
                    placeholder="Name of employee(s) involved"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.people_involved} className="mt-1" />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Witness to the incident
                </label>
                <input
                    type="text"
                    value={form.data.witness}
                    onChange={(e) => form.setData('witness', e.target.value)}
                    placeholder="Name(s) of witness(es)"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.witness} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Reported by
                </label>
                <input
                    type="text"
                    value={form.data.reported_by}
                    onChange={(e) => form.setData('reported_by', e.target.value)}
                    placeholder="Leave blank to use your name"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.reported_by} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    rows={4}
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder="What happened, in detail"
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.description} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                    Categories
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryOptions.map((c) => {
                        const checked = form.data.categories.includes(c.key);
                        return (
                            <label
                                key={c.key}
                                className={
                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ' +
                                    (checked
                                        ? 'border-indigo-300 bg-indigo-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50')
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCategory(c.key)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="leading-snug text-gray-700">
                                    {c.label}
                                </span>
                            </label>
                        );
                    })}
                </div>
                <InputError message={form.errors.categories} className="mt-1" />
            </div>
        </div>
    );
}

/* ---------- page ---------- */

export default function IncidentReportsIndex({ reports, filters, counts }) {
    const page = usePage().props;
    const flash = page.flash;
    // View-only users (granted the module without the write sub-grant) can read
    // and print but not create, edit, or change status.
    const canWrite = (page.auth?.moduleWrite ?? []).includes('incidents');
    const [search, setSearch] = useState(filters.search ?? '');
    const [toast, setToast] = useState(null);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(null);

    const form = useForm({
        type: 'incident',
        title: '',
        severity: 'low',
        location: '',
        people_involved: '',
        witness: '',
        reported_by: '',
        description: '',
        occurred_at: '',
        categories: [],
    });

    const toggleCategory = (key) => {
        const current = form.data.categories;
        form.setData(
            'categories',
            current.includes(key)
                ? current.filter((c) => c !== key)
                : [...current, key],
        );
    };

    const submitReport = (e) => {
        e.preventDefault();
        form.post(route('incident-reports.store'), {
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

    // ---- Edit ----
    const editForm = useForm({
        type: 'incident',
        title: '',
        severity: 'low',
        location: '',
        people_involved: '',
        witness: '',
        reported_by: '',
        description: '',
        occurred_at: '',
        categories: [],
    });

    const editToggleCategory = (key) => {
        const current = editForm.data.categories;
        editForm.setData(
            'categories',
            current.includes(key)
                ? current.filter((c) => c !== key)
                : [...current, key],
        );
    };

    const openEdit = (report) => {
        if (report.status === 'resolved') return;
        editForm.clearErrors();
        editForm.setData({
            type: report.type ?? 'incident',
            title: report.title ?? '',
            severity: report.severity ?? 'low',
            location: report.location ?? '',
            people_involved: report.people_involved ?? '',
            witness: report.witness ?? '',
            reported_by: report.reporter_name ?? '',
            description: report.description ?? '',
            occurred_at: toLocalInput(report.occurred_at),
            categories: report.categories ?? [],
        });
        setEditing(report);
    };

    const closeEdit = () => {
        setEditing(null);
        editForm.clearErrors();
        editForm.reset();
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('incident-reports.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
        });
    };

    // Debounced search.
    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;

        const id = setTimeout(() => {
            router.get(
                route('incident-reports.index'),
                {
                    search,
                    type: filters.type || undefined,
                    status: filters.status || undefined,
                },
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
            route('incident-reports.index'),
            {
                search: search || undefined,
                type: filters.type || undefined,
                status: status || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const setType = (type) => {
        router.get(
            route('incident-reports.index'),
            {
                search: search || undefined,
                type: type || undefined,
                status: filters.status || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const changeStatus = (report, status) => {
        router.patch(
            route('incident-reports.update', report.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setSelected((prev) =>
                        prev && prev.id === report.id
                            ? { ...prev, status }
                            : prev,
                    ),
            },
        );
    };

    // Open a clean print window containing only the official form.
    const printReport = () => {
        const node = document.getElementById('incident-print');
        if (!node) return;
        const win = window.open('', '_blank', 'width=850,height=1100');
        if (!win) return;
        win.document.write(
            `<!DOCTYPE html><html><head><title>Incident Report</title>` +
                `<style>@page{size:A4;margin:14mm;}body{margin:0;padding:0;}` +
                `${incidentFormCss}</style></head><body>${node.outerHTML}</body></html>`,
        );
        win.document.close();
        win.focus();
        // Print once the logo image has loaded.
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
    };

    const countFor = (key) =>
        ({
            '': counts.all,
            open: counts.open,
            under_review: counts.under_review,
            resolved: counts.resolved,
        })[key];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Incident &amp; Accident Report
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Log and track workplace incidents and accidents
                    </p>
                </div>
            }
        >
            <Head title="Incident & Accident Report" />

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

                    {/* Search + type filter + New */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters.type ?? ''}
                            onChange={(e) => setType(e.target.value)}
                            className="rounded-lg border-gray-300 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">All types</option>
                            <option value="incident">Incident</option>
                            <option value="accident">Accident</option>
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
                                placeholder="Search ref, title, location, people…"
                                className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <a
                            href={route('incident-reports.template')}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <path d="M7 10l5 5 5-5" />
                                <path d="M12 15V3" />
                            </svg>
                            Template (.docx)
                        </a>
                        {canWrite && (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                New report
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">ID #</th>
                                    <th className="px-6 py-3">Report</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Severity</th>
                                    <th className="px-6 py-3">Occurred</th>
                                    <th className="px-6 py-3">Reported by</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {reports.data.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/70">
                                        <td className="whitespace-nowrap px-6 py-3">
                                            <span className="font-mono text-[11px] font-medium tracking-wide text-indigo-500">
                                                {r.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">
                                                {r.title}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {r.location || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge className={typeStyles[r.type]}>
                                                {r.type}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge
                                                className={
                                                    severityStyles[r.severity]
                                                }
                                            >
                                                {r.severity}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(r.occurred_at)}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {r.reporter_name || '—'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge
                                                className={statusStyles[r.status]}
                                            >
                                                {statusLabels[r.status] ??
                                                    r.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelected(r)}
                                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                                >
                                                    View
                                                </button>
                                                {canWrite && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(r)}
                                                        disabled={r.status === 'resolved'}
                                                        title={
                                                            r.status === 'resolved'
                                                                ? 'Resolved reports are locked. Reopen to edit.'
                                                                : undefined
                                                        }
                                                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reports.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-6 py-12 text-center text-gray-400"
                                        >
                                            No reports match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {reports.total > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row">
                            <p className="text-sm text-gray-500">
                                Showing{' '}
                                <span className="font-medium text-gray-700">
                                    {reports.from}–{reports.to}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-gray-700">
                                    {reports.total}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {reports.links.map((link, i) => (
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

            {/* New report modal */}
            <Modal show={creating} onClose={closeModal} maxWidth="4xl">
                <form
                    onSubmit={submitReport}
                    className="flex max-h-[90vh] flex-col"
                >
                    {/* Sticky header */}
                    <div className="border-b border-gray-100 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            File a report
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Record the details of an incident or accident.
                        </p>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <ReportFields form={form} toggleCategory={toggleCategory} />
                    </div>

                    {/* Sticky footer */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
                            {form.processing ? 'Saving…' : 'File report'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit report modal */}
            <Modal show={!!editing} onClose={closeEdit} maxWidth="4xl">
                <form onSubmit={submitEdit} className="flex max-h-[90vh] flex-col">
                    {/* Sticky header */}
                    <div className="border-b border-gray-100 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Edit report
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update the details of this incident or accident.
                        </p>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <ReportFields
                            form={editForm}
                            toggleCategory={editToggleCategory}
                        />
                    </div>

                    {/* Sticky footer */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={closeEdit}
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

            {/* View report modal — official printable form */}
            <Modal show={!!selected} onClose={() => setSelected(null)} maxWidth="3xl">
                {selected && (
                    <div className="flex max-h-[90vh] flex-col">
                        <style dangerouslySetInnerHTML={{ __html: incidentFormCss }} />

                        {/* Scrollable form preview */}
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6">
                            <div className="mx-auto max-w-[780px] bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
                                <IncidentPrintForm report={selected} />
                            </div>
                        </div>

                        {/* Sticky footer */}
                        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Status
                                </label>
                                <select
                                    value={selected.status}
                                    disabled={!canWrite}
                                    onChange={(e) =>
                                        changeStatus(selected, e.target.value)
                                    }
                                    title={
                                        canWrite
                                            ? undefined
                                            : 'You have view-only access to incident reports.'
                                    }
                                    className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    <option value="open">Open</option>
                                    <option value="under_review">
                                        Under review
                                    </option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={printReport}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9V2h12v7" />
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                        <path d="M6 14h12v8H6z" />
                                    </svg>
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
