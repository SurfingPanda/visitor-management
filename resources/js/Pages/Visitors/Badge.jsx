import VisitorPassCard from '@/Components/VisitorPassCard';
import { Head, Link } from '@inertiajs/react';

export default function Badge({ visitor }) {
    return (
        <>
            <Head title={`Badge — ${visitor.name}`} />

            {/* Print rules: only the badge prints */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; }
                    @page { margin: 12mm; }
                }
            `}</style>

            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10 print:bg-white">
                {/* Same pass card used throughout the appointment flow. Walk-in
                    badges carry a photo + purpose and no signatures. */}
                <VisitorPassCard
                    name={visitor.name}
                    company={visitor.company}
                    contactPerson={visitor.host}
                    purpose={visitor.purpose}
                    photoUrl={visitor.photo_url}
                    qrToken={visitor.qr_token}
                    badgeNumber={visitor.badge_number}
                    visitDate={visitor.visit_date}
                    status="approved"
                    showSignatures={false}
                />

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
