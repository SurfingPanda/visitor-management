<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\QueuedResetPassword;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    /**
     * Mass-assignable attributes. Privilege fields (is_admin, module_access,
     * module_write) are deliberately NOT here — they are set explicitly in
     * UserController behind admin middleware, so a stray create($request->all())
     * can never let a user grant themselves admin or extra module access.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'module_access' => 'array',
            'module_write' => 'array',
        ];
    }

    /**
     * Send the password reset notification via the queued variant so a mail
     * hiccup retries in the background instead of failing the web request.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPassword($token));
    }

    /**
     * Whether this user may access (view) the given module key. Admins get
     * everything.
     */
    public function canAccessModule(string $module): bool
    {
        return $this->is_admin || in_array($module, $this->module_access ?? [], true);
    }

    /**
     * Whether this user may write (create/edit) within the given module. Only
     * relevant for modules that split view vs write; admins get everything.
     */
    public function canWriteModule(string $module): bool
    {
        return $this->is_admin || in_array($module, $this->module_write ?? [], true);
    }
}
