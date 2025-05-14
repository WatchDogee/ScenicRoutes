<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }
public function update(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => [
                    'required',
                    'string',
                    'email',
                    'max:255',
                    Rule::unique('users')->ignore($user->id),
                ],
                'current_password' => ['nullable', 'required_with:new_password'],
                'new_password' => ['nullable', 'min:8', 'confirmed'],
                'new_password_confirmation' => ['nullable', 'required_with:new_password'],
            ]);

            
            if (isset($validated['new_password'])) {
                if (!Hash::check($validated['current_password'], $user->password)) {
                    return response()->json([
                        'message' => 'The provided password does not match your current password.',
                        'errors' => ['current_password' => ['The provided password is incorrect.']]
                    ], 422);
                }
                $validated['password'] = Hash::make($validated['new_password']);
                unset($validated['current_password'], $validated['new_password'], $validated['new_password_confirmation']);
            }

            if ($request->user()->isDirty('email')) {
                $request->user()->email_verified_at = null;
            }

            $user->update($validated);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user
            ]);
        } catch (\Exception $e) {
            \Log::error('Profile update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }
public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function updateProfilePicture(Request $request): JsonResponse
    {
        try {
            \Log::info('Profile picture update request received');

            try {
                $validated = $request->validate([
                    'profile_picture' => [
                        'required',
                        'file',
                        'image',
                        'mimes:jpeg,png,jpg,gif',
                        'max:5120'
                    ]
                ]);
            } catch (\Illuminate\Validation\ValidationException $e) {
                \Log::error('Validation error details: ' . json_encode($e->errors()));

                
                $errorMessages = $e->errors()['profile_picture'] ?? ['Unknown validation error'];
                $specificError = $errorMessages[0];

                return response()->json([
                    'error' => 'Validation failed',
                    'message' => $specificError,
                    'details' => [
                        'rules' => [
                            'allowed_types' => ['jpeg', 'png', 'jpg', 'gif'],
                            'max_size' => '5MB',
                        ],
                        'received' => [
                            'mime_type' => $request->file('profile_picture')?->getMimeType(),
                            'size' => $request->file('profile_picture')?->getSize(),
                            'original_name' => $request->file('profile_picture')?->getClientOriginalName(),
                        ]
                    ]
                ], 422);
            }

            if (!$request->hasFile('profile_picture')) {
                \Log::error('No file present in request');
                return response()->json([
                    'error' => 'Validation failed',
                    'message' => 'No file uploaded.'
                ], 422);
            }

            $file = $request->file('profile_picture');

            \Log::info('File details', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'error' => $file->getError()
            ]);

            if (!$file->isValid()) {
                \Log::error('Invalid file upload: ' . $file->getErrorMessage());
                return response()->json([
                    'error' => 'Validation failed',
                    'message' => 'Invalid file upload: ' . $file->getErrorMessage()
                ], 422);
            }

            $user = $request->user();

            
            if ($user->profile_picture) {
                \Log::info('Deleting old profile picture: ' . $user->profile_picture);
                
                Storage::disk('public')->delete($user->profile_picture);
            }

            
            $fileName = 'profile-' . $user->id . '-' . time() . '.' . $file->getClientOriginalExtension();

            
            $disk = config('filesystems.default');
            $storageDisk = ($disk === 's3' && config('filesystems.disks.s3.key')) ? 's3' : 'public';

            \Log::info('Using storage disk: ' . $storageDisk);

            
            if ($storageDisk === 'public' && !Storage::disk('public')->exists('profile-pictures')) {
                Storage::disk('public')->makeDirectory('profile-pictures');
            }

            
            $path = $file->storeAs('profile-pictures', $fileName, $storageDisk);

            if (!$path) {
                \Log::error('Failed to store the profile picture');
                throw new \Exception('Failed to store the profile picture.');
            }

            \Log::info('New profile picture stored at: ' . $path . ' on disk: ' . $storageDisk);

            
            if (!Storage::disk($storageDisk)->exists($path)) {
                \Log::error('File was not found after storage: ' . $path . ' on disk: ' . $storageDisk);
                throw new \Exception('File was not found after storage. Check storage configuration and permissions.');
            }

            $user->update([
                'profile_picture' => $path
            ]);

            return response()->json([
                'message' => 'Profile picture updated successfully',
                'profile_picture_url' => $user->profile_picture_url,
                'user' => $user
            ]);
        } catch (\Exception $e) {
            \Log::error('Profile picture update error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to update profile picture',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
