import { QRCodeSVG } from 'qrcode.react';

const statusChip = {
    pending: {
        label: 'Awaiting approval',
        dot: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    },
    approved: {
        label: 'Approved',
        dot: 'bg-green-500',
        chip: 'bg-green-50 text-green-700 ring-green-600/20',
    },
    declined: {
        label: 'Declined',
        dot: 'bg-gray-400',
        chip: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    },
};

function formatCardDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// A dated pass is valid through the end of its appointment day; after that it's
// expired (mirrors the server-side scan check).
function isPastVisitDate(value) {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    return Date.now() > d.getTime();
}

function SignatureBox({ src, placeholder }) {
    return (
        <div className="flex h-16 items-end justify-center">
            {src ? (
                <img src={src} alt="Signature" className="max-h-16 object-contain" />
            ) : (
                <span className="pb-2 text-xs text-gray-300">{placeholder}</span>
            )}
        </div>
    );
}

/**
 * Landscape visitor pass. Renders live (pre-approval) with just the visitor's
 * details + signature, and fully once approved with the approver's sign-off and
 * a QR code.
 */
export default function VisitorPassCard({
    name,
    company,
    contactPerson,
    purpose,
    photoUrl,
    visitorSignature,
    approverName,
    approverSignature,
    qrToken,
    badgeNumber,
    visitDate,
    status = 'pending',
    showSignatures = true,
}) {
    const meta = statusChip[status] ?? statusChip.pending;
    const visitLabel = formatCardDate(visitDate);
    const expired = status === 'approved' && isPastVisitDate(visitDate);

    return (
        <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
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
                    <span className="text-sm font-bold tracking-wide">Secora</span>
                </div>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest">
                    Visitor
                </span>
            </div>

            {/* Body — details on the left, QR on the right */}
            <div className="flex gap-5 px-6 py-5">
                <div className="min-w-0 flex-1">
                    <span
                        className={
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                            meta.chip
                        }
                    >
                        <span className={'h-1.5 w-1.5 rounded-full ' + meta.dot} />
                        {meta.label}
                    </span>
                    <div className="mt-3 flex items-start gap-3">
                        {photoUrl && (
                            <img
                                src={photoUrl}
                                alt={name || 'Visitor'}
                                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-indigo-100"
                            />
                        )}
                        <div className="min-w-0">
                            <h1 className="break-words text-2xl font-bold leading-tight text-gray-900">
                                {name || 'Your name'}
                            </h1>
                            <p className="truncate text-sm text-gray-500">
                                {company || 'Company / organization'}
                            </p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-700">
                        <span className="text-gray-400">Visiting:</span>{' '}
                        <span className="font-medium">
                            {contactPerson || 'Contact person'}
                        </span>
                    </p>
                    {purpose && (
                        <p className="mt-1 text-sm text-gray-700">
                            <span className="text-gray-400">Purpose:</span>{' '}
                            <span className="font-medium">{purpose}</span>
                        </p>
                    )}
                    {visitLabel && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
                            <span className="text-gray-400">Valid on:</span>
                            <span
                                className={
                                    'font-medium ' +
                                    (expired ? 'text-red-600 line-through' : 'text-gray-800')
                                }
                            >
                                {visitLabel}
                            </span>
                            {expired && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                    Expired
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* QR */}
                <div className="flex w-[116px] shrink-0 flex-col items-center justify-center text-center">
                    {qrToken ? (
                        <>
                            <div className="rounded-xl border border-gray-200 bg-white p-2">
                                <QRCodeSVG
                                    value={qrToken}
                                    size={96}
                                    level="M"
                                    marginSize={0}
                                />
                            </div>
                            {badgeNumber && (
                                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    {badgeNumber}
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex h-[112px] w-[112px] items-center justify-center rounded-xl border border-dashed border-gray-200 px-2 text-center text-[10px] text-gray-300">
                            QR issued after approval
                        </div>
                    )}
                </div>
            </div>

            {/* Signatures (appointment flow only — hidden for walk-in badges) */}
            {showSignatures && (
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                    <div className="px-4 py-3 text-center">
                        <SignatureBox src={visitorSignature} placeholder="Signature" />
                        <p className="mt-1 border-t border-gray-200 pt-1 text-[11px] uppercase tracking-wide text-gray-400">
                            Visitor
                        </p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <SignatureBox
                            src={approverSignature}
                            placeholder="Pending"
                        />
                        <p className="mt-1 border-t border-gray-200 pt-1 text-[11px] uppercase tracking-wide text-gray-400">
                            {approverName ? `Approved by ${approverName}` : 'Approved by'}
                        </p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div
                className={
                    'border-t border-dashed px-6 py-3 text-center ' +
                    (expired
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50')
                }
            >
                <p
                    className={
                        'text-xs ' + (expired ? 'font-medium text-red-600' : 'text-gray-500')
                    }
                >
                    {expired
                        ? 'This pass has expired — please register again at the front desk'
                        : 'Present this at the front desk on arrival'}
                </p>
            </div>
        </div>
    );
}
