import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/* ---------- module access picker ---------- */

function ModuleAccess({ form, modules }) {
    const selected = form.data.module_access ?? [];
    const isAdmin = form.data.is_admin;

    const toggle = (key) => {
        const set = new Set(selected);
        set.has(key) ? set.delete(key) : set.add(key);
        form.setData('module_access', [...set]);
    };

    const setAll = (all) =>
        form.setData('module_access', all ? modules.map((m) => m.key) : []);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Module access
                </label>
                {!isAdmin && (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setAll(true)}
                            className="font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            Select all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            type="button"
                            onClick={() => setAll(false)}
                            className="font-semibold text-gray-500 hover:text-gray-700"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {isAdmin ? (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-700">
                    Administrators have full access to every module.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
                    {modules.map((m) => (
                        <label
                            key={m.key}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(m.key)}
                                onChange={() => toggle(m.key)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-gray-700">{m.label}</span>
                        </label>
                    ))}
                </div>
            )}
            <InputError message={form.errors.module_access} className="mt-1" />
        </div>
    );
}

/* ---------- shared form fields ---------- */

function MemberFields({ form, modules, isSelf }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                </label>
                <input
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.name} className="mt-1" />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <InputError message={form.errors.email} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        placeholder={form.isEdit ? 'Leave blank to keep' : ''}
                        className="block w-full rounded-lg border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <InputError message={form.errors.password} className="mt-1" />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Confirm
                    </label>
                    <input
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData('password_confirmation', e.target.value)
                        }
                        className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <label
                className={
                    'flex items-center ' +
                    (isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')
                }
            >
                <input
                    type="checkbox"
                    checked={form.data.is_admin}
                    disabled={isSelf}
                    onChange={(e) => form.setData('is_admin', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ms-2 text-sm text-gray-600">
                    Administrator (full access &amp; can manage the team)
                </span>
            </label>

            <ModuleAccess form={form} modules={modules} />
        </div>
    );
}

/* ---------- page ---------- */

export default function UsersIndex({ users, modules }) {
    const flash = usePage().props.flash;
    const authUser = usePage().props.auth.user;
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [toast, setToast] = useState(null);

    const moduleLabel = (key) =>
        modules.find((m) => m.key === key)?.label ?? key;

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_admin: false,
        module_access: [],
    });
    createForm.isEdit = false;

    const editForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_admin: false,
        module_access: [],
    });
    editForm.isEdit = true;

    useEffect(() => {
        const msg = flash?.success || flash?.error;
        if (msg) {
            setToast({ type: flash.success ? 'success' : 'error', msg });
            const id = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(id);
        }
    }, [flash?.success, flash?.error]);

    const submitCreate = (e) => {
        e.preventDefault();
        createForm.post(route('users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreating(false);
            },
        });
    };

    const openEdit = (user) => {
        editForm.clearErrors();
        editForm.setData({
            name: user.name ?? '',
            email: user.email ?? '',
            password: '',
            password_confirmation: '',
            is_admin: !!user.is_admin,
            module_access: user.module_access ?? [],
        });
        setEditing(user);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.patch(route('users.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const remove = (user) => {
        if (confirm(`Remove ${user.name}? This cannot be undone.`)) {
            router.delete(route('users.destroy', user.id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Team
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Manage who can sign in and what they can access
                    </p>
                </div>
            }
        >
            <Head title="Team" />

            {toast && (
                <div
                    className={
                        'fixed right-4 top-20 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ' +
                        (toast.type === 'success' ? 'bg-green-600' : 'bg-red-600')
                    }
                >
                    {toast.msg}
                </div>
            )}

            <div className="space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            createForm.reset();
                            createForm.clearErrors();
                            setCreating(true);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add member
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Access</th>
                                    <th className="px-6 py-3">Added</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                                                    {u.name
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .slice(0, 2)
                                                        .join('')}
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {u.name}
                                                    {u.id === authUser.id && (
                                                        <span className="ml-2 text-xs font-normal text-gray-400">
                                                            (you)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-3">
                                            {u.is_admin ? (
                                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                                                    Administrator
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                                                    Member
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {u.is_admin ? (
                                                <span className="text-xs font-medium text-indigo-600">
                                                    Full access
                                                </span>
                                            ) : (u.module_access ?? []).length === 0 ? (
                                                <span className="text-xs text-gray-400">
                                                    Dashboard only
                                                </span>
                                            ) : (
                                                <div className="flex max-w-xs flex-wrap gap-1">
                                                    {(u.module_access ?? [])
                                                        .slice(0, 3)
                                                        .map((k) => (
                                                            <span
                                                                key={k}
                                                                className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600"
                                                            >
                                                                {moduleLabel(k)}
                                                            </span>
                                                        ))}
                                                    {(u.module_access ?? []).length > 3 && (
                                                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                                                            +
                                                            {(u.module_access ?? [])
                                                                .length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {formatDate(u.created_at)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(u)}
                                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                                >
                                                    Edit access
                                                </button>
                                                {u.id !== authUser.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(u)}
                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add member modal */}
            <Modal show={creating} onClose={() => setCreating(false)} maxWidth="lg">
                <form
                    onSubmit={submitCreate}
                    className="flex max-h-[calc(100vh-3rem)] flex-col"
                >
                    <div className="shrink-0 px-6 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Add team member
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            They’ll sign in with this email and password. Choose the
                            modules they can access.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <MemberFields form={createForm} modules={modules} />
                    </div>
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => setCreating(false)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {createForm.processing ? 'Adding…' : 'Add member'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit access modal */}
            <Modal show={!!editing} onClose={() => setEditing(null)} maxWidth="lg">
                <form
                    onSubmit={submitEdit}
                    className="flex max-h-[calc(100vh-3rem)] flex-col"
                >
                    <div className="shrink-0 px-6 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Edit {editing?.name}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update their details and module access.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <MemberFields
                            form={editForm}
                            modules={modules}
                            isSelf={editing?.id === authUser.id}
                        />
                    </div>
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editForm.processing}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {editForm.processing ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
