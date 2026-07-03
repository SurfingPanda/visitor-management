<?php

namespace App\Http\Middleware;

use App\Support\Modules;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleAccess
{
    /**
     * Block a non-admin user from any route that belongs to a module they
     * haven't been granted. Routes not tied to a module (dashboard, settings,
     * profile) always pass.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->is_admin) {
            return $next($request);
        }

        $module = Modules::forRoute($request->route()?->getName());

        if ($module && ! $user->canAccessModule($module)) {
            abort(403, 'You do not have access to this module.');
        }

        return $next($request);
    }
}
