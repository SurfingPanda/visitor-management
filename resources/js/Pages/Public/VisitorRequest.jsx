import SignaturePad from '@/Components/SignaturePad';
import VisitorPassCard from '@/Components/VisitorPassCard';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function VisitorRequestPage() {
    const flash = usePage().props.flash;
    const [submitted, setSubmitted] = useState(false);

    const form = useForm({
        name: '',
        email: '',
        contact_person: '',
        visit_date: '',
        company: '',
        signature: '',
    });

    // Local "today" (YYYY-MM-DD) so the date picker can't select the past.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Bump to remount the signature pad (clears the canvas) after a reset.
    const [padKey, setPadKey] = useState(0);

    const submit = (e) => {
        e.preventDefault();
        form.post(route('visit.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setSubmitted(true);
                form.reset();
                setPadKey((k) => k + 1);
            },
        });
    };

    const another = () => {
        setSubmitted(false);
        form.clearErrors();
        form.reset();
        setPadKey((k) => k + 1);
    };

    const field =
        'block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500';

    return (
        <>
            <Head title="Visitor Registration" />

            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
                {/* Brand header */}
                <div className="mx-auto mb-8 flex max-w-5xl items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 p-1.5 shadow-sm">
                        <img
                            src="/images/secora-logo.png"
                            alt="Secora"
                            className="h-full w-full object-contain"
                        />
                    </span>
                    <div>
                        <p className="text-lg font-bold leading-tight text-gray-900">
                            Eljin Corporation
                        </p>
                        <p className="text-sm text-gray-500">
                            Visitor registration
                        </p>
                    </div>
                </div>

                <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Left: form / thank-you */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                        {submitted ? (
                            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                </span>
                                <h2 className="mt-4 text-xl font-bold text-gray-900">
                                    Request submitted
                                </h2>
                                <p className="mt-2 max-w-sm text-sm text-gray-600">
                                    {flash?.success ||
                                        'Thanks! Please proceed to the front desk — your request is now awaiting approval.'}
                                </p>
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                    <a
                                        href={route('visit.status')}
                                        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                                    >
                                        Check request status
                                    </a>
                                    <button
                                        type="button"
                                        onClick={another}
                                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                    >
                                        Submit another request
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Request a visit
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Fill in your details below. The card on the
                                        right updates as you type.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Full name{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Juan Dela Cruz"
                                        className={field}
                                    />
                                    {form.errors.name && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Email address{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData('email', e.target.value)
                                        }
                                        placeholder="you@example.com"
                                        className={field}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                        We'll email you when your request is approved or declined.
                                    </p>
                                    {form.errors.email && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Contact person{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.contact_person}
                                        onChange={(e) =>
                                            form.setData(
                                                'contact_person',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Who are you here to see?"
                                        className={field}
                                    />
                                    {form.errors.contact_person && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.contact_person}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Date of visit{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        min={todayStr}
                                        value={form.data.visit_date}
                                        onChange={(e) =>
                                            form.setData('visit_date', e.target.value)
                                        }
                                        className={field}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                        Your badge is valid for this day only.
                                    </p>
                                    {form.errors.visit_date && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.visit_date}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Company
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.company}
                                        onChange={(e) =>
                                            form.setData('company', e.target.value)
                                        }
                                        placeholder="Your company / organization"
                                        className={field}
                                    />
                                    {form.errors.company && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.company}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Signature{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <SignaturePad
                                        key={padKey}
                                        onChange={(url) =>
                                            form.setData('signature', url)
                                        }
                                    />
                                    {form.errors.signature && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.signature}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {form.processing
                                        ? 'Submitting…'
                                        : 'Submit request'}
                                </button>

                                <p className="text-center text-sm text-gray-500">
                                    Already submitted?{' '}
                                    <a
                                        href={route('visit.status')}
                                        className="font-semibold text-indigo-600 hover:text-indigo-500"
                                    >
                                        Check your request status
                                    </a>
                                </p>
                            </form>
                        )}
                    </div>

                    {/* Right: live preview */}
                    <div className="flex flex-col items-center">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Live preview
                        </p>
                        <div className="lg:sticky lg:top-8">
                            <VisitorPassCard
                                name={form.data.name}
                                contactPerson={form.data.contact_person}
                                company={form.data.company}
                                visitorSignature={form.data.signature}
                                visitDate={form.data.visit_date}
                                status="pending"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
