import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

const READER_ID = 'qr-reader';

export default function Scan() {
    const flash = usePage().props.flash;
    const scannerRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [camError, setCamError] = useState(null);
    const [manual, setManual] = useState('');

    const stopScanner = async () => {
        const s = scannerRef.current;
        if (s) {
            try {
                await s.stop();
                await s.clear();
            } catch {
                /* ignore */
            }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const submitCode = (code) => {
        if (!code) return;
        router.post(
            route('visitors.scan-checkout'),
            { code },
            { preserveScroll: true, preserveState: true },
        );
    };

    const startScanner = async () => {
        setCamError(null);
        try {
            const html5 = new Html5Qrcode(READER_ID);
            scannerRef.current = html5;
            setScanning(true);
            await html5.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                async (decodedText) => {
                    await stopScanner();
                    submitCode(decodedText);
                },
                () => {
                    /* per-frame decode errors: ignore */
                },
            );
        } catch {
            setCamError(
                'Could not access the camera. Grant permission or use manual entry.',
            );
            await stopScanner();
        }
    };

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitManual = (e) => {
        e.preventDefault();
        const code = manual.trim();
        setManual('');
        submitCode(code);
    };

    const result = flash?.success
        ? { type: 'success', message: flash.success }
        : flash?.error
          ? { type: 'error', message: flash.error }
          : null;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Scan to check out
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Scan the QR code on the visitor’s badge
                    </p>
                </div>
            }
        >
            <Head title="Scan badge" />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Result banner */}
                {result && (
                    <div
                        className={
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ' +
                            (result.type === 'success'
                                ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                                : 'bg-red-50 text-red-700 ring-1 ring-red-600/20')
                        }
                    >
                        <span
                            className={
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                                (result.type === 'success'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-red-600 text-white')
                            }
                        >
                            {result.type === 'success' ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            )}
                        </span>
                        {result.message}
                    </div>
                )}

                {/* Scanner */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mx-auto max-w-sm">
                        <div
                            id={READER_ID}
                            className="aspect-square w-full overflow-hidden rounded-xl bg-slate-900"
                        />

                        {!scanning && (
                            <button
                                type="button"
                                onClick={startScanner}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                                    <path d="M7 12h10" />
                                </svg>
                                {result ? 'Scan next badge' : 'Start camera'}
                            </button>
                        )}

                        {scanning && (
                            <button
                                type="button"
                                onClick={stopScanner}
                                className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Stop camera
                            </button>
                        )}

                        {camError && (
                            <p className="mt-3 text-center text-sm text-red-600">
                                {camError}
                            </p>
                        )}
                    </div>
                </div>

                {/* Manual fallback */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900">
                        Can’t scan?
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Enter the badge number (e.g. V-0001) or code printed on
                        the badge.
                    </p>
                    <form
                        onSubmit={submitManual}
                        className="mt-3 flex gap-3"
                    >
                        <input
                            type="text"
                            value={manual}
                            onChange={(e) => setManual(e.target.value)}
                            placeholder="V-0001"
                            className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            className="shrink-0 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                        >
                            Check out
                        </button>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
