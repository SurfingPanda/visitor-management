export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-6 sm:py-12">
            {/* Corporate reception photo background */}
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/reception-bg.jpg')" }}
            />
            {/* Readability overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/85 via-indigo-950/75 to-slate-900/85" />
            <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/40 sm:p-10">
                    {children}
                </div>
                <p className="mt-6 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} Secora
                </p>
            </div>
        </div>
    );
}
