import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import { Head, usePage } from '@inertiajs/react';

function Section({ title, description, children }) {
    return (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <header className="mb-6">
                <h3 className="text-base font-semibold text-gray-900">
                    {title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            </header>
            {children}
        </section>
    );
}

export default function SettingsIndex({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-semibold leading-tight text-gray-800">
                        Settings
                    </h2>
                    <p className="hidden text-sm text-gray-500 sm:block">
                        Manage your account
                    </p>
                </div>
            }
        >
            <Head title="Settings" />

            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Account summary */}
                <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-600">
                        {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-gray-900">
                            {user.name}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                            {user.email}
                        </p>
                    </div>
                    <span
                        className={
                            'ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                            (user.is_admin
                                ? 'bg-indigo-100 text-indigo-700 ring-indigo-600/20'
                                : 'bg-gray-100 text-gray-600 ring-gray-500/20')
                        }
                    >
                        {user.is_admin ? 'Administrator' : 'Guard'}
                    </span>
                </div>

                <Section
                    title="Profile information"
                    description="Update your name and email address."
                >
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-3xl"
                    />
                </Section>

                <Section
                    title="Password"
                    description="Use a long, random password to stay secure."
                >
                    <UpdatePasswordForm className="max-w-3xl" />
                </Section>

                <Section
                    title="Delete account"
                    description="Permanently delete your account and all of its data."
                >
                    <DeleteUserForm className="max-w-3xl" />
                </Section>
            </div>
        </AuthenticatedLayout>
    );
}
