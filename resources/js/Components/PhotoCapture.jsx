import { useEffect, useRef, useState } from 'react';

/* Per-mode configuration. `face` uses the front camera and a square/round
 * preview; `id` uses the rear camera (when available) with a landscape,
 * higher-resolution capture so ID text stays legible. */
const MODES = {
    face: {
        facingMode: 'user',
        width: 320,
        height: 320,
        quality: 0.8,
        previewClass: 'h-28 w-28 rounded-full',
        label: 'Take photo',
        alt: 'Visitor',
        icon: (
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
            </svg>
        ),
    },
    id: {
        facingMode: 'environment',
        width: 640,
        height: 400,
        quality: 0.9,
        previewClass: 'h-40 w-64 rounded-lg',
        label: 'Capture ID',
        alt: 'Visitor ID',
        icon: (
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <circle cx="8" cy="11" r="2" />
                <path d="M13 9h5M13 13h5M6 15h6" />
            </svg>
        ),
    },
};

export default function PhotoCapture({ value, onChange, mode = 'face', label }) {
    const cfg = MODES[mode] ?? MODES.face;
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [active, setActive] = useState(false);
    const [err, setErr] = useState(null);

    const stop = () => {
        const s = streamRef.current;
        if (s) {
            s.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setActive(false);
    };

    const start = async () => {
        setErr(null);
        onChange(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cfg.facingMode },
            });
            streamRef.current = stream;
            setActive(true);
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            });
        } catch {
            setErr('Camera unavailable — you can continue without this photo.');
            setActive(false);
        }
    };

    const capture = () => {
        const video = videoRef.current;
        if (!video) return;

        const { width, height, quality } = cfg;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Center-crop the live frame to the target aspect ratio (object-cover).
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const targetAspect = width / height;
        const videoAspect = vw / vh;
        let sx, sy, sw, sh;
        if (videoAspect > targetAspect) {
            sh = vh;
            sw = vh * targetAspect;
            sx = (vw - sw) / 2;
            sy = 0;
        } else {
            sw = vw;
            sh = vw / targetAspect;
            sx = 0;
            sy = (vh - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

        onChange(canvas.toDataURL('image/jpeg', quality));
        stop();
    };

    useEffect(() => () => stop(), []);

    return (
        <div className="flex flex-col items-center">
            {label && (
                <span className="mb-2 text-xs font-medium text-gray-500">
                    {label}
                </span>
            )}
            <div
                className={`overflow-hidden bg-gray-100 ring-2 ring-gray-200 ${cfg.previewClass}`}
            >
                {value ? (
                    <img
                        src={value}
                        alt={cfg.alt}
                        className="h-full w-full object-cover"
                    />
                ) : active ? (
                    <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                        {cfg.icon}
                    </div>
                )}
            </div>

            <div className="mt-3 flex gap-2">
                {!active && !value && (
                    <button
                        type="button"
                        onClick={start}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        {cfg.label}
                    </button>
                )}
                {active && (
                    <>
                        <button
                            type="button"
                            onClick={capture}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            Capture
                        </button>
                        <button
                            type="button"
                            onClick={stop}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </>
                )}
                {value && (
                    <button
                        type="button"
                        onClick={start}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        Retake
                    </button>
                )}
            </div>
            {err && <p className="mt-2 text-xs text-amber-600">{err}</p>}
        </div>
    );
}
