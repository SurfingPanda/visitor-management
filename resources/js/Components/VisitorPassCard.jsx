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
    visitorSignature,
    approverName,
    approverSignature,
    qrToken,
    badgeNumber,
    status = 'pending',
}) {
    const meta = statusChip[status] ?? statusChip.pending;

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
                    <h1 className="mt-3 break-words text-2xl font-bold leading-tight text-gray-900">
                        {name || 'Your name'}
                    </h1>
                    <p className="truncate text-sm text-gray-500">
                        {company || 'Company / organization'}
                    </p>
                    <p className="mt-4 text-sm text-gray-700">
                        <span className="text-gray-400">Visiting:</span>{' '}
                        <span className="font-medium">
                            {contactPerson || 'Contact person'}
                        </span>
                    </p>
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

            {/* Signatures */}
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

            {/* Footer */}
            <div className="border-t border-dashed border-gray-200 bg-gray-50 px-6 py-3 text-center">
                <p className="text-xs text-gray-500">
                    Present this at the front desk on arrival
                </p>
            </div>
        </div>
    );
}
