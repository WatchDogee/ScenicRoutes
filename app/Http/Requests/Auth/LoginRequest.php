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
        
        \Log::info('LoginRequest prepareForValidation', [
            'has_login' => $this->has('login'),
            'has_email' => $this->has('email'),
            'login_value' => $this->input('login'),
            'email_value' => $this->input('email'),
        ]);

        
        if ($this->has('login') && !$this->has('email')) {
            $this->merge([
                'email' => $this->input('login'),
            ]);

            \Log::info('Copied login to email field', [
                'login' => $this->input('login'),
                'email' => $this->input('email'),
            ]);
        }

        
        
        if ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL)) {
            \Log::info('Email field contains a username, not an email', [
                'value' => $this->input('email')
            ]);

            
            $this->merge([
                'login' => $this->input('email'),
            ]);
        }
    }
public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        
        \Log::info('LoginRequest authenticate attempt', [
            'email' => $this->input('email'),
            'login' => $this->input('login'),
            'has_password' => $this->has('password'),
        ]);

        
        $tryUsernameFirst = $this->has('login') ||
                           ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL));

        
        $loginValue = $this->input('login') ?? $this->input('email');

        
        $firstField = $tryUsernameFirst ? 'username' : 'email';
        $secondField = $tryUsernameFirst ? 'email' : 'username';

        \Log::info('Authentication strategy', [
            'login_value' => $loginValue,
            'try_username_first' => $tryUsernameFirst,
            'first_field' => $firstField,
            'second_field' => $secondField
        ]);

        
        $credentials = [
            $firstField => $loginValue,
            'password' => $this->input('password')
        ];

        \Log::info('First authentication attempt', [
            'credentials' => array_keys($credentials),
            $firstField => $loginValue
        ]);

        if (! Auth::attempt($credentials, $this->boolean('remember'))) {
            \Log::info('First authentication attempt failed');

            
            $alternativeCredentials = [
                $secondField => $loginValue,
                'password' => $this->input('password')
            ];

            \Log::info('Second authentication attempt', [
                'credentials' => array_keys($alternativeCredentials),
                $secondField => $loginValue
            ]);

            if (! Auth::attempt($alternativeCredentials, $this->boolean('remember'))) {
                \Log::warning('Both authentication attempts failed');
                RateLimiter::hit($this->throttleKey());

                
                $field = $this->has('login') ? 'login' : 'email';

                throw ValidationException::withMessages([
                    $field => trans('auth.failed'),
                ]);
            } else {
                \Log::info('Second authentication attempt succeeded');
            }
        } else {
            \Log::info('First authentication attempt succeeded');
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
