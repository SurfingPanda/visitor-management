<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Modules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Users/Index', [
            'users' => User::orderBy('name')->get([
                'id', 'name', 'email', 'is_admin', 'module_access', 'module_write', 'created_at',
            ]),
            'modules' => Modules::options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'confirmed', Password::defaults()],
            'is_admin' => ['boolean'],
            'module_access' => ['array'],
            'module_access.*' => [Rule::in(Modules::keys())],
            'module_write' => ['array'],
            'module_write.*' => [Rule::in(Modules::writableKeys())],
        ]);

        $isAdmin = $request->boolean('is_admin');
        $access = $isAdmin ? [] : array_values($validated['module_access'] ?? []);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $isAdmin,
            // Admins get everything implicitly, so store no explicit grants.
            'module_access' => $access,
            'module_write' => $isAdmin ? [] : $this->writeGrants($validated['module_write'] ?? [], $access),
            'email_verified_at' => now(),
        ]);

        return back()->with('success', "{$validated['name']} added to the team.");
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'is_admin' => ['boolean'],
            'module_access' => ['array'],
            'module_access.*' => [Rule::in(Modules::keys())],
            'module_write' => ['array'],
            'module_write.*' => [Rule::in(Modules::writableKeys())],
        ]);

        // Guard against an admin locking themselves out of admin.
        $isAdmin = $user->id === $request->user()->id
            ? true
            : $request->boolean('is_admin');

        $access = $isAdmin ? [] : array_values($validated['module_access'] ?? []);

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'is_admin' => $isAdmin,
            'module_access' => $access,
            'module_write' => $isAdmin ? [] : $this->writeGrants($validated['module_write'] ?? [], $access),
        ]);

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return back()->with('success', "{$user->name}'s access updated.");
    }

    /**
     * Write grants only make sense for modules the user can also view, so
     * intersect the requested write keys with the granted access keys.
     *
     * @param  list<string>  $write
     * @param  list<string>  $access
     * @return list<string>
     */
    private function writeGrants(array $write, array $access): array
    {
        return array_values(array_intersect($write, $access));
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot remove your own account.');
        }

        $user->delete();

        return back()->with('success', "{$user->name} removed.");
    }
}
