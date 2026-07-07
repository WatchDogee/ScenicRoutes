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
                'profile_picture' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,gif', 'max:5120'],
            ]);

            // Handle profile picture upload
            if ($request->hasFile('profile_picture')) {
                $file = $request->file('profile_picture');
                \Log::info('Profile picture upload - File received', [
                    'size' => $file->getSize(),
                    'mime' => $file->getMimeType(),
                    'original_name' => $file->getClientOriginalName(),
                    'is_valid' => $file->isValid()
                ]);
                
                if ($file->isValid()) {
                    try {
                        // Delete old profile picture if exists
                        if ($user->profile_picture && $user->profile_picture !== '') {
                            \Log::info('Deleting old profile picture', ['path' => $user->profile_picture]);
                            Storage::disk('public')->delete($user->profile_picture);
                        }
                        
                        // Store new profile picture
                        $fileName = 'profile-' . $user->id . '-' . time() . '.' . $file->getClientOriginalExtension();
                        $path = $file->storeAs('profile-pictures', $fileName, 'public');
                        
                        \Log::info('Profile picture stored', [
                            'fileName' => $fileName,
                            'path' => $path,
                            'disk_exists' => Storage::disk('public')->exists($path)
                        ]);
                        
                        if ($path) {
                            $validated['profile_picture'] = $path;
                        } else {
                            \Log::error('Profile picture storeAs returned null/false');
                        }
                    } catch (\Exception $e) {
                        \Log::error('Profile picture upload error: ' . $e->getMessage());
                    }
                }
            }

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

            if ($validated['email'] !== $user->email) {
                $user->email_verified_at = null;
                $user->update($validated);
                $user->sendEmailVerificationNotification();
                
                return response()->json([
                    'message' => 'Profile updated successfully. Please check your email to verify your new email address.',
                    'user' => $user,
                    'verification_sent' => true
                ]);
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

        // Perform cascade deletion similar to API account deletion
        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // Cancel subscriptions immediately
            try {
                $paymentService = app(\App\Services\PaymentService::class);
                $paymentService->cancelSubscription($user, false);
            } catch (\Throwable $e) {
                \Log::warning('Web deletion: subscription cancel failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Delete profile picture
            if (!empty($user->profile_picture)) {
                try { Storage::disk('public')->delete($user->profile_picture); } catch (\Throwable $e) {}
            }

            // Relationships and content
            \Illuminate\Support\Facades\DB::table('follows')->where('follower_id', $user->id)->orWhere('followed_id', $user->id)->delete();
            \Illuminate\Support\Facades\DB::table('user_saved_collections')->where('user_id', $user->id)->delete();
            \App\Models\UserSetting::where('user_id', $user->id)->delete();
            \App\Models\RouteUsage::where('user_id', $user->id)->delete();
            \App\Models\Entitlement::where('user_id', $user->id)->delete();
            \App\Models\Ride::where('user_id', $user->id)->delete();
            \App\Models\RideRecording::where('user_id', $user->id)->delete();
            \App\Models\RouteShare::where('user_id', $user->id)->delete();

            $poiPhotos = \App\Models\PoiPhoto::where('user_id', $user->id)->get();
            foreach ($poiPhotos as $photo) {
                if (!empty($photo->photo_path)) { Storage::disk('public')->delete($photo->photo_path); }
                $photo->delete();
            }
            \App\Models\PointOfInterest::where('user_id', $user->id)->delete();

            $userReviews = \App\Models\Review::where('user_id', $user->id)->get();
            foreach ($userReviews as $review) {
                $photos = \App\Models\ReviewPhoto::where('review_id', $review->id)->get();
                foreach ($photos as $p) { if (!empty($p->photo_path)) { Storage::disk('public')->delete($p->photo_path); } $p->delete(); }
                $review->delete();
            }
            \App\Models\Comment::where('user_id', $user->id)->delete();
            \App\Models\RoadComment::where('user_id', $user->id)->delete();
            \App\Models\OfflineMapDownload::where('user_id', $user->id)->delete();

            $collections = \App\Models\Collection::where('user_id', $user->id)->get();
            foreach ($collections as $collection) {
                if (!empty($collection->cover_image)) { try { Storage::disk('public')->delete($collection->cover_image); } catch (\Throwable $e) {} }
                $collection->roads()->detach();
                \Illuminate\Support\Facades\DB::table('collection_tag')->where('collection_id', $collection->id)->delete();
                \App\Models\CollectionReview::where('collection_id', $collection->id)->delete();
                $collection->delete();
            }

            $roads = \App\Models\SavedRoad::where('user_id', $user->id)->get();
            foreach ($roads as $road) {
                $photos = \App\Models\RoadPhoto::where('saved_road_id', $road->id)->get();
                foreach ($photos as $photo) { if (!empty($photo->photo_path)) { Storage::disk('public')->delete($photo->photo_path); } $photo->delete(); }
                $reviews = \App\Models\Review::where('saved_road_id', $road->id)->get();
                foreach ($reviews as $review) {
                    $rphotos = \App\Models\ReviewPhoto::where('review_id', $review->id)->get();
                    foreach ($rphotos as $rp) { if (!empty($rp->photo_path)) { Storage::disk('public')->delete($rp->photo_path); } $rp->delete(); }
                    $review->delete();
                }
                \App\Models\Comment::where('saved_road_id', $road->id)->delete();
                \App\Models\RoadComment::where('road_id', $road->id)->delete();
                $road->tags()->detach();
                $road->collections()->detach();
                $road->delete();
            }

            \App\Models\Subscription::where('user_id', $user->id)->delete();

            // Logout and delete user
            Auth::logout();
            $user->delete();

            \Illuminate\Support\Facades\DB::commit();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return Redirect::to('/');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Log::error('Profile deletion failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return Redirect::back()->withErrors(['delete' => 'Failed to delete account. Please try again later.']);
        }
    }

    public function updateProfilePicture(Request $request): JsonResponse
    {
        try {
            \Log::info('Starting profile picture upload', [
                'user_id' => $request->user()->id,
                'disk_default' => config('filesystems.default'),
                'disk_public' => config('filesystems.disks.public'),
            ]);
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
            $errorMessages = $e->errors()['profile_picture'] ?? ['Unknown validation error'];
            $specificError = $errorMessages[0];

            \Log::error('Profile picture validation failed', [
                'error' => $specificError,
                'details' => $e->errors()
            ]);

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
            \Log::error('No file uploaded for profile picture');
            return response()->json([
                'error' => 'Validation failed',
                'message' => 'No file uploaded.'
            ], 422);
        }

        $file = $request->file('profile_picture');

        if (!$file->isValid()) {
            \Log::error('Invalid file upload for profile picture', [
                'error' => $file->getErrorMessage()
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'message' => 'Invalid file upload: ' . $file->getErrorMessage()
            ], 422);
        }

        $user = $request->user();

        if ($user->profile_picture) {
            \Log::info('Deleting old profile picture', [
                'old_path' => $user->profile_picture
            ]);
            Storage::disk('public')->delete($user->profile_picture);
        }

        $fileName = 'profile-' . $user->id . '-' . time() . '.' . $file->getClientOriginalExtension();
        $disk = 'public';
        \Log::info('Storing new profile picture', [
            'fileName' => $fileName,
            'disk' => $disk
        ]);
        $path = $file->storeAs('profile-pictures', $fileName, $disk);
        \Log::info('Profile picture stored', [
            'path' => $path,
            'exists' => Storage::disk($disk)->exists($path)
        ]);

        if (!$path) {
            \Log::error('Failed to store the profile picture.');
            throw new \Exception('Failed to store the profile picture.');
        }

        if (!Storage::disk($disk)->exists($path)) {
            \Log::error('File was not found after storage. Check storage configuration and permissions.', [
                'path' => $path
            ]);
            throw new \Exception('File was not found after storage. Check storage configuration and permissions.');
        }

        $user->update([
            'profile_picture' => $path
        ]);

        \Log::info('Profile picture updated successfully', [
            'user_id' => $user->id,
            'profile_picture_url' => $user->profile_picture_url
        ]);

        return response()->json([
            'message' => 'Profile picture updated successfully',
            'profile_picture_url' => $user->profile_picture_url,
            'user' => $user
        ]);
    }

    public function getUserStats($userId): JsonResponse
    {
        try {
            $user = \App\Models\User::findOrFail($userId);

            $totalRoads = \App\Models\SavedRoad::where('user_id', $userId)->count();
            $totalPublicRoads = \App\Models\SavedRoad::where('user_id', $userId)
                ->where('is_public', true)
                ->count();
            $totalReviews = \App\Models\Review::where('user_id', $userId)->count();
            $totalCollections = \App\Models\Collection::where('user_id', $userId)->count();
            $totalPublicCollections = \App\Models\Collection::where('user_id', $userId)
                ->where('is_public', true)
                ->count();
            $followersCount = $user->followers()->count();
            $followingCount = $user->following()->count();

            return response()->json([
                'total_roads' => $totalRoads,
                'total_public_roads' => $totalPublicRoads,
                'total_reviews' => $totalReviews,
                'total_collections' => $totalCollections,
                'total_public_collections' => $totalPublicCollections,
                'followers_count' => $followersCount,
                'following_count' => $followingCount,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'User not found'], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching user stats: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch user stats'], 500);
        }
    }
}
