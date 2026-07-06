<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SupabaseAuthController extends Controller
{
    /**
     * Bridge a Supabase (Google OAuth) session into a Laravel session.
     *
     * The browser completes the Google sign-in via the Supabase JS SDK and
     * posts the resulting Supabase access token here. We validate that token
     * against Supabase itself (source of truth, algorithm-agnostic), then
     * find-or-create the matching local user and log them in.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'access_token' => ['required', 'string'],
        ]);

        $base = rtrim((string) config('services.supabase.url'), '/');
        $anonKey = (string) config('services.supabase.anon_key');

        if ($base === '' || $anonKey === '') {
            return back()->withErrors([
                'email' => 'Google sign-in is not configured on the server.',
            ]);
        }

        // Ask Supabase to validate the token and return the authenticated user.
        $response = Http::withHeaders([
            'apikey' => $anonKey,
            'Authorization' => 'Bearer '.$validated['access_token'],
        ])->acceptJson()->get($base.'/auth/v1/user');

        if (! $response->successful()) {
            return back()->withErrors([
                'email' => 'Google sign-in could not be verified. Please try again.',
            ]);
        }

        $supabaseUser = $response->json();
        $email = $supabaseUser['email'] ?? null;

        if (! $email) {
            return back()->withErrors([
                'email' => 'Google did not return an email address for this account.',
            ]);
        }

        $meta = $supabaseUser['user_metadata'] ?? [];
        $name = $meta['full_name'] ?? $meta['name'] ?? Str::before($email, '@');

        // Auto-provision unknown emails with no module access. An admin grants
        // modules later on the Team page; existing users keep their access.
        $user = User::firstOrNew(['email' => $email]);

        if (! $user->exists) {
            $user->name = $name;
            $user->password = Str::random(40); // never used; login is via Google
            $user->is_admin = false;
            $user->module_access = [];
            $user->email_verified_at = now(); // Google verifies the address
            $user->save();
        }

        Auth::login($user, remember: true);

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
