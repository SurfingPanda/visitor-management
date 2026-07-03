import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

const statusStyles = {
    checked_in: 'bg-green-100 text-green-700 ring-green-600/20',
    checked_out: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    expected: 'bg-amber-100 text-amber-700 ring-amber-600/20',
};

const statusLabels = {
    checked_in: 'On-site',
    checked_out: 'Checked out',
    expected: 'Expected',
};

function initials(name) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('');
}

export default function Badges({ visitors, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const current = filters.search ?? '';
        if (search === current) return;

        const id = setTimeout(() => {
            router.get(
                route('badges.index'),
                { search: search || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(id);
    }, [search]);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Badges
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Look up a visitor and reprint their badge
                    </p>
                </div>
            }
        >
            <Head title="Badges" />

            <div className="space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                {/* Search */}
                <div className="relative max-w-md">
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
                        placeholder="Search name, company, badge…"
                        className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                {/* Grid */}
                {visitors.data.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center text-gray-400 shadow-sm">
                        No visitors match your search.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visitors.data.map((v) => (
                            <div
                                key={v.id}
                                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                            >
                                {/* Top strip */}
                                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-800 px-4 py-2 text-white">
                                    <span className="text-xs font-bold tracking-wide">
                                        ECSecora
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
                                        {v.badge_number}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="flex flex-1 flex-col items-center px-4 py-4 text-center">
                                    {v.photo_url ? (
                                        <img
                                            src={v.photo_url}
                                            alt={v.name}
                                            className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-100"
                                        />
                                    ) : (
                                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600 ring-2 ring-gray-100">
                                            {initials(v.name)}
                                        </span>
                                    )}
                                    <p className="mt-2 line-clamp-1 font-semibold text-gray-900">
                                        {v.name}
                                    </p>
                                    <p className="line-clamp-1 text-xs text-gray-400">
                                        {v.company ?? '—'}
                                    </p>

                                    <div className="my-3 rounded-lg border border-gray-200 p-1.5">
                                        <QRCodeSVG
                                            value={v.qr_token}
                                            size={84}
                                            level="M"
                                            marginSize={0}
                                        />
                                    </div>

                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[v.status] ?? statusStyles.expected}`}
                                    >
                                        {statusLabels[v.status] ?? v.status}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex border-t border-gray-100">
                                    <Link
                                        href={route('visitors.show', v.id)}
                                        className="flex-1 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                                    >
                                        View
                                    </Link>
                                    <Link
                                        href={route('visitors.badge', v.id)}
                                        className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 px-3 py-2.5 text-center text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                                    >
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9V2h12v7" />
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                            <rect x="6" y="14" width="12" height="8" rx="1" />
                                        </svg>
                                        Print
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {visitors.total > visitors.per_page && (
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p className="text-sm text-gray-500">
                            Showing{' '}
                            <span className="font-medium text-gray-700">
                                {visitors.from}–{visitors.to}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-gray-700">
                                {visitors.total}
                            </span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {visitors.links.map((link, i) => (
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
                                              ? 'bg-white text-gray-600 hover:bg-gray-100'
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
        </AuthenticatedLayout>
    );
}
