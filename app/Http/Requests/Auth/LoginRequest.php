<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required_without:login', 'string'],
            'login' => ['required_without:email', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    public function attributes(): array
    {
        return [
            'email' => 'email or username',
            'login' => 'email or username',
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('login') && !$this->has('email')) {
            $this->merge([
                'email' => $this->input('login'),
            ]);
        }

        if ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL)) {
            $this->merge([
                'login' => $this->input('email'),
            ]);
        }
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $tryUsernameFirst = $this->has('login') ||
                           ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL));

        $loginValue = $this->input('login') ?? $this->input('email');

        $firstField = $tryUsernameFirst ? 'username' : 'email';
        $secondField = $tryUsernameFirst ? 'email' : 'username';

        $credentials = [
            $firstField => $loginValue,
            'password' => $this->input('password')
        ];

        if (! Auth::attempt($credentials, $this->boolean('remember'))) {
            $alternativeCredentials = [
                $secondField => $loginValue,
                'password' => $this->input('password')
            ];

            if (! Auth::attempt($alternativeCredentials, $this->boolean('remember'))) {
                RateLimiter::hit($this->throttleKey());

                $field = $this->has('login') ? 'login' : 'email';

                throw ValidationException::withMessages([
                    $field => trans('auth.failed'),
                ]);
            }
        }

        RateLimiter::clear($this->throttleKey());
    }


    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        $field = $this->has('login') ? 'login' : 'email';

        throw ValidationException::withMessages([
            $field => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }


    public function throttleKey(): string
    {
        $loginValue = $this->input('login') ?? $this->input('email');
        return Str::transliterate(Str::lower($loginValue).'|'.$this->ip());
    }
}
