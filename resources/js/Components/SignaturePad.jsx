import { useEffect, useRef, useState } from 'react';

/**
 * A canvas signature pad. Calls `onChange(dataUrl)` with a PNG data URL after
 * each stroke, and `onChange('')` when cleared. Remount (via a changing `key`)
 * to reset it externally.
 */
export default function SignaturePad({ onChange, heightClass = 'h-40' }) {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const last = useRef({ x: 0, y: 0 });
    const [empty, setEmpty] = useState(true);

    // Size the canvas to its displayed box (crisp on high-DPI screens).
    useEffect(() => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1f2937';
    }, []);

    const posOf = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e) => {
        e.preventDefault();
        drawing.current = true;
        last.current = posOf(e);
        canvasRef.current.setPointerCapture?.(e.pointerId);
    };

    const move = (e) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current.getContext('2d');
        const p = posOf(e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
    };

    const end = () => {
        if (!drawing.current) return;
        drawing.current = false;
        setEmpty(false);
        onChange(canvasRef.current.toDataURL('image/png'));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setEmpty(true);
        onChange('');
    };

    return (
        <div>
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-white">
                {empty && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300">
                        Sign here
                    </span>
                )}
                <canvas
                    ref={canvasRef}
                    onPointerDown={start}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerLeave={end}
                    className={'block w-full touch-none ' + heightClass}
                />
            </div>
            <div className="mt-1.5 flex justify-end">
                <button
                    type="button"
                    onClick={clear}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                    Clear signature
                </button>
            </div>
        </div>
    );
}
