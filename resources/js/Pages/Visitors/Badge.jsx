import { Head, Link } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';

function formatDate(value) {
    const d = value ? new Date(value) : new Date();
    return d.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function Badge({ visitor }) {
    return (
        <>
            <Head title={`Badge — ${visitor.name}`} />

            {/* Print rules: only the badge prints */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; }
                    .badge-sheet { box-shadow: none !important; }
                    @page { margin: 12mm; }
                }
            `}</style>

            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10">
                {/* Badge */}
                <div className="badge-sheet w-[340px] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                    {/* Header */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-800 px-5 py-3 text-white">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1">
                                <img
                                    src="/images/secora-logo.png"
                                    alt="Secora"
                                    className="h-full w-full object-contain"
                                />
                            </span>
                            <span className="text-sm font-bold tracking-wide">
                                Secora
                            </span>
                        </div>
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest">
                            Visitor
                        </span>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 text-center">
                        {visitor.photo_url && (
                            <img
                                src={visitor.photo_url}
                                alt={visitor.name}
                                className="mx-auto mb-3 h-24 w-24 rounded-full object-cover ring-2 ring-indigo-100"
                            />
                        )}
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            {visitor.badge_number}
                        </p>
                        <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                            {visitor.name}
                        </h1>
                        {visitor.company && (
                            <p className="text-sm text-gray-500">
                                {visitor.company}
                            </p>
                        )}

                        <div className="mt-4 flex justify-center">
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                                <QRCodeSVG
                                    value={visitor.qr_token}
                                    size={168}
                                    level="M"
                                    marginSize={0}
                                />
                            </div>
                        </div>

                        <div className="mt-4 space-y-1 text-sm">
                            <p className="text-gray-700">
                                <span className="text-gray-400">Visiting:</span>{' '}
                                <span className="font-medium">
                                    {visitor.host}
                                </span>
                            </p>
                            {visitor.purpose && (
                                <p className="text-gray-700">
                                    <span className="text-gray-400">
                                        Purpose:
                                    </span>{' '}
                                    {visitor.purpose}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-dashed border-gray-200 bg-gray-50 px-6 py-3 text-center">
                        <p className="text-xs text-gray-500">
                            Issued {formatDate(visitor.checked_in_at)} · Please
                            wear visibly at all times
                        </p>
                    </div>
                </div>

                {/* Actions (not printed) */}
                <div className="no-print mt-6 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9V2h12v7" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" rx="1" />
                        </svg>
                        Print badge
                    </button>
                    <Link
                        href={route('visitors.index')}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        Back to visitors
                    </Link>
                    <Link
                        href={route('visitors.scan')}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        Scan to check out
                    </Link>
                </div>
            </div>
        </>
    );
}
