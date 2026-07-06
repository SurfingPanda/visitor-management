import Dropdown from '@/Components/Dropdown';
import Modal from '@/Components/Modal';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/* ---------- nav config ---------- */

const icons = {
    dashboard: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
    ),
    visitors: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
    ),
    checkin: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="m10 17 5-5-5-5" />
            <path d="M15 12H3" />
        </svg>
    ),
    badges: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <circle cx="12" cy="9" r="2.5" />
            <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
        </svg>
    ),
    reports: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m7 14 4-4 3 3 5-6" />
        </svg>
    ),
    settings: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
    ),
    team: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    incidents: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    ),
    roster: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    ),
    delivery: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="M3.3 7 12 12l8.7-5" />
            <path d="M12 22V12" />
        </svg>
    ),
    vehicles: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3v-5l2-5h11l3 5h1a1 1 0 0 1 1 1v4h-2" />
            <path d="M9 17h6" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    ),
    drivers: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 3v6.5M4.5 8.5l5 3M19.5 8.5l-5 3M7 19.5l2.5-4.5M17 19.5l-2.5-4.5" />
        </svg>
    ),
    helpers: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
            <path d="M16 3.5a3 3 0 0 1 0 5.8" />
            <path d="M18.5 14a5 5 0 0 1 3 4.6V20" />
        </svg>
    ),
    equipment: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
            <path d="M10 12h4" />
        </svg>
    ),
    supplierDelivery: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
    scrap: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    ),
};

// Nav is grouped into labeled sections for hierarchy. `route` is set for live
// pages; items without one render as "Soon" placeholders. `adminOnly` items
// only render for administrators (an empty group is hidden entirely).
// `module` ties a nav item to a grantable access module (see App\Support\Modules);
// items without one (Dashboard, Settings) are always visible. `adminOnly` items
// only render for administrators.
const navGroups = [
    {
        title: 'Overview',
        items: [
            { label: 'Dashboard', icon: icons.dashboard, route: 'dashboard' },
            { label: 'Reports', icon: icons.reports, route: 'reports.index', module: 'reports' },
        ],
    },
    {
        title: 'Front Desk',
        items: [
            { label: 'Visitors', icon: icons.visitors, route: 'visitors.index', module: 'front_desk' },
            { label: 'Scan / Check-out', icon: icons.checkin, route: 'visitors.scan', module: 'front_desk' },
            { label: 'Badges', icon: icons.badges, route: 'badges.index', module: 'front_desk' },
        ],
    },
    {
        title: 'Fleet & Delivery',
        items: [
            { label: 'Delivery Log', icon: icons.delivery, route: 'delivery-logs.index', module: 'delivery_logs' },
            { label: 'Supplier Delivery', icon: icons.supplierDelivery, route: 'supplier-deliveries.index', module: 'supplier_deliveries' },
            { label: 'Vehicles', icon: icons.vehicles, route: 'vehicles.index', module: 'vehicles' },
            { label: 'Drivers', icon: icons.drivers, route: 'drivers.index', module: 'drivers' },
            { label: 'Helpers', icon: icons.helpers, route: 'helpers.index', module: 'helpers' },
        ],
    },
    {
        title: 'Inventory',
        items: [
            { label: 'Equipment Inventory', icon: icons.equipment, route: 'equipment.index', module: 'equipment' },
            { label: 'Scrap Disposal', icon: icons.scrap, route: 'scrap-disposals.index', module: 'scrap_disposal' },
        ],
    },
    {
        title: 'Safety',
        items: [
            { label: 'Incident & Accident Report', icon: icons.incidents, route: 'incident-reports.index', module: 'incidents' },
        ],
    },
    {
        title: 'Administration',
        items: [
            { label: 'Team', icon: icons.team, route: 'users.index', adminOnly: true },
            { label: 'Settings', icon: icons.settings, route: 'settings.index' },
        ],
    },
];

/* ---------- sidebar ---------- */

function Sidebar({ onNavigate, isAdmin, modules = [], collapsed = false }) {
    const canSee = (item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.module && !isAdmin && !modules.includes(item.module)) return false;
        return true;
    };

    const renderItem = (item) => {
        const isActive = item.route && route().current(item.route);

        const base =
            'group flex items-center rounded-lg py-2 text-sm font-medium transition ' +
            (collapsed ? 'justify-center px-0' : 'gap-3 px-3');

        if (item.route) {
            return (
                <Link
                    key={item.label}
                    href={route(item.route)}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={
                        base +
                        ' ' +
                        (isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white')
                    }
                >
                    {item.icon}
                    {!collapsed && item.label}
                </Link>
            );
        }

        return (
            <button
                key={item.label}
                type="button"
                title={collapsed ? `${item.label} (soon)` : undefined}
                className={
                    base +
                    ' w-full text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }
            >
                {item.icon}
                {!collapsed && (
                    <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Soon
                        </span>
                    </>
                )}
            </button>
        );
    };

    return (
        <div className="flex h-full flex-col bg-slate-900">
            {/* Brand */}
            <div
                className={
                    'flex h-16 shrink-0 items-center justify-center gap-2 ' +
                    (collapsed ? 'px-2' : 'px-5')
                }
            >
                <img
                    src="/images/secora-logo.png"
                    alt="Secora"
                    className="h-9 w-auto shrink-0"
                />
                {!collapsed && (
                    <span className="text-lg font-bold tracking-tight text-white">
                        Secora
                    </span>
                )}
            </div>

            {/* Nav */}
            <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
                {navGroups.map((group, gi) => {
                    const items = group.items.filter(canSee);
                    if (items.length === 0) return null;

                    return (
                        <div
                            key={group.title}
                            className={
                                gi > 0
                                    ? 'mt-2 border-t border-slate-800/80 pt-2'
                                    : ''
                            }
                        >
                            <div className="space-y-1">
                                {items.map(renderItem)}
                            </div>
                        </div>
                    );
                })}
            </nav>
        </div>
    );
}

/* ---------- layout ---------- */

export default function AuthenticatedLayout({ header, children }) {
    const auth = usePage().props.auth;
    const user = auth.user;
    const modules = auth.modules ?? [];
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [collapsed, setCollapsed] = useState(
        () =>
            typeof window !== 'undefined' &&
            localStorage.getItem('sidebarCollapsed') === '1',
    );

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
            }
            return next;
        });
    };

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('');

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white">
            {/* Desktop sidebar */}
            <aside
                className={
                    'fixed inset-y-0 left-0 z-30 hidden transition-all duration-200 lg:block print:!hidden ' +
                    (collapsed ? 'w-20' : 'w-64')
                }
            >
                <Sidebar
                    isAdmin={user.is_admin}
                    modules={modules}
                    collapsed={collapsed}
                />
            </aside>

            {/* Mobile sidebar + overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 w-64">
                        <Sidebar
                            isAdmin={user.is_admin}
                            modules={modules}
                            onNavigate={() => setSidebarOpen(false)}
                        />
                    </aside>
                </div>
            )}

            {/* Main column */}
            <div
                className={
                    'transition-all duration-200 print:!pl-0 ' +
                    (collapsed ? 'lg:pl-20' : 'lg:pl-64')
                }
            >
                {/* Top bar */}
                <header className="sticky top-0 z-20 border-b border-gray-200 bg-white print:hidden">
                    <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="-ml-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
                                aria-label="Open sidebar"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={toggleCollapsed}
                                className="-ml-1 hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:inline-flex"
                                aria-label={
                                    collapsed
                                        ? 'Expand sidebar'
                                        : 'Collapse sidebar'
                                }
                                title={
                                    collapsed
                                        ? 'Expand sidebar'
                                        : 'Collapse sidebar'
                                }
                            >
                                <svg
                                    className={
                                        'h-6 w-6 transition-transform duration-200 ' +
                                        (collapsed ? 'rotate-180' : '')
                                    }
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="3" y="4" width="18" height="16" rx="2" />
                                    <path d="M9 4v16" />
                                    <path d="m15 9-2 3 2 3" />
                                </svg>
                            </button>
                            <div className="min-w-0">{header}</div>
                        </div>

                        {/* User menu */}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-full p-1 pr-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none"
                                >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                                        {initials}
                                    </span>
                                    <span className="hidden sm:block">
                                        {user.name}
                                    </span>
                                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('settings.index')}>
                                    Settings
                                </Dropdown.Link>
                                <button
                                    type="button"
                                    onClick={() => setLoggingOut(true)}
                                    className="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                    Log Out
                                </button>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <main className="overflow-x-hidden">{children}</main>
            </div>

            {/* Logout confirmation */}
            <Modal show={loggingOut} onClose={() => setLoggingOut(false)} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Log out
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Are you sure you want to log out of Secora?
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setLoggingOut(false)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(route('logout'), {}, {
                                    onFinish: () => setLoggingOut(false),
                                })
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
