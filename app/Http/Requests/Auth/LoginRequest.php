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
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required_without:login', 'string'],
            'login' => ['required_without:email', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'email' => 'email or username',
            'login' => 'email or username',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // Log the incoming request data
        \Log::info('LoginRequest prepareForValidation', [
            'has_login' => $this->has('login'),
            'has_email' => $this->has('email'),
            'login_value' => $this->input('login'),
            'email_value' => $this->input('email'),
        ]);

        // If login field is provided but email is not, copy login to email
        if ($this->has('login') && !$this->has('email')) {
            $this->merge([
                'email' => $this->input('login'),
            ]);

            \Log::info('Copied login to email field', [
                'login' => $this->input('login'),
                'email' => $this->input('email'),
            ]);
        }

        // If email field contains a username (not an email format),
        // treat it as a username for authentication
        if ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL)) {
            \Log::info('Email field contains a username, not an email', [
                'value' => $this->input('email')
            ]);

            // Add a login field with the same value for our authentication logic
            $this->merge([
                'login' => $this->input('email'),
            ]);
        }
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        // Log authentication attempt
        \Log::info('LoginRequest authenticate attempt', [
            'email' => $this->input('email'),
            'login' => $this->input('login'),
            'has_password' => $this->has('password'),
        ]);

        // Determine if we should try username login first
        $tryUsernameFirst = $this->has('login') ||
                           ($this->has('email') && !filter_var($this->input('email'), FILTER_VALIDATE_EMAIL));

        // Get the login value (could be from 'email' or 'login' field)
        $loginValue = $this->input('login') ?? $this->input('email');

        // Determine authentication order based on input type
        $firstField = $tryUsernameFirst ? 'username' : 'email';
        $secondField = $tryUsernameFirst ? 'email' : 'username';

        \Log::info('Authentication strategy', [
            'login_value' => $loginValue,
            'try_username_first' => $tryUsernameFirst,
            'first_field' => $firstField,
            'second_field' => $secondField
        ]);

        // First attempt with the primary field type
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

            // If authentication fails with the first field, try the other field
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

                // Determine which field to show the error on
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

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        // Determine which field to show the error on
        $field = $this->has('login') ? 'login' : 'email';

        throw ValidationException::withMessages([
            $field => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        // Use login field if provided, otherwise use email
        $loginValue = $this->input('login') ?? $this->input('email');
        return Str::transliterate(Str::lower($loginValue).'|'.$this->ip());
    }
}
