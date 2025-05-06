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
        // If login field is provided but email is not, copy login to email
        if ($this->has('login') && !$this->has('email')) {
            $this->merge([
                'email' => $this->input('login'),
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

        // Get the login value (could be from 'email' or 'login' field)
        $loginValue = $this->input('email');

        // Determine if the login input is an email or username
        $loginField = filter_var($loginValue, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        // First attempt with the detected field type
        $credentials = [
            $loginField => $loginValue,
            'password' => $this->input('password')
        ];

        if (! Auth::attempt($credentials, $this->boolean('remember'))) {
            // If authentication fails with the first field, try the other field
            $alternativeField = $loginField === 'email' ? 'username' : 'email';
            $alternativeCredentials = [
                $alternativeField => $loginValue,
                'password' => $this->input('password')
            ];

            if (! Auth::attempt($alternativeCredentials, $this->boolean('remember'))) {
                RateLimiter::hit($this->throttleKey());

                // Determine which field to show the error on
                $field = $this->has('login') ? 'login' : 'email';

                throw ValidationException::withMessages([
                    $field => trans('auth.failed'),
                ]);
            }
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
