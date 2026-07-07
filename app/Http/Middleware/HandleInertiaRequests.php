<?php

namespace App\Http\Middleware;

use App\Support\Modules;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                // Effective module keys the current user can reach (all for admins).
                'modules' => $request->user()
                    ? ($request->user()->is_admin
                        ? Modules::keys()
                        : ($request->user()->module_access ?? []))
                    : [],
                // Modules the current user may write to (all writable ones for
                // admins). Read routes ignore this; write-gated pages use it to
                // hide create/edit controls.
                'moduleWrite' => $request->user()
                    ? ($request->user()->is_admin
                        ? Modules::writableKeys()
                        : ($request->user()->module_write ?? []))
                    : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
