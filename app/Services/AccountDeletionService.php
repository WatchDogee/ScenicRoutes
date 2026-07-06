<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AccountDeletionService
{
    public function deleteUserPermanently(User $user): void
    {
        DB::beginTransaction();
        try {
            // Remove follow relationships
            DB::table('follows')->where('follower_id', $user->id)->orWhere('followed_id', $user->id)->delete();
            // Remove saved collections pivot
            DB::table('user_saved_collections')->where('user_id', $user->id)->delete();

            // Delete user settings and usages
            \App\Models\UserSetting::where('user_id', $user->id)->delete();
            \App\Models\RouteUsage::where('user_id', $user->id)->delete();
            \App\Models\Entitlement::where('user_id', $user->id)->delete();

            // Delete rides
            \App\Models\Ride::where('user_id', $user->id)->delete();
            \App\Models\RideRecording::where('user_id', $user->id)->delete();

            // Delete route shares
            \App\Models\RouteShare::where('user_id', $user->id)->delete();

            // Delete POIs and photos created by user
            $poiPhotos = \App\Models\PoiPhoto::where('user_id', $user->id)->get();
            foreach ($poiPhotos as $photo) {
                if (!empty($photo->photo_path)) {
                    Storage::disk('public')->delete($photo->photo_path);
                }
                $photo->delete();
            }
            \App\Models\PointOfInterest::where('user_id', $user->id)->delete();

            // Delete reviews authored by user and their photos
            $userReviews = \App\Models\Review::where('user_id', $user->id)->get();
            foreach ($userReviews as $review) {
                $photos = \App\Models\ReviewPhoto::where('review_id', $review->id)->get();
                foreach ($photos as $p) {
                    if (!empty($p->photo_path)) {
                        Storage::disk('public')->delete($p->photo_path);
                    }
                    $p->delete();
                }
                $review->delete();
            }

            // Delete comments authored by user
            \App\Models\Comment::where('user_id', $user->id)->delete();
            \App\Models\RoadComment::where('user_id', $user->id)->delete();

            // Offline maps: downloads and saved regions entries
            \App\Models\OfflineMapDownload::where('user_id', $user->id)->delete();

            // Delete collections owned by user (remove cover images, detach roads/tags, delete associated reviews)
            $collections = \App\Models\Collection::where('user_id', $user->id)->get();
            foreach ($collections as $collection) {
                if (!empty($collection->cover_image)) {
                    try { Storage::disk('public')->delete($collection->cover_image); } catch (\Throwable $e) {}
                }
                $collection->roads()->detach();
                DB::table('collection_tag')->where('collection_id', $collection->id)->delete();
                \App\Models\CollectionReview::where('collection_id', $collection->id)->delete();
                $collection->delete();
            }

            // Delete saved roads owned by user (remove photos, reviews, comments, tags, detach from collections)
            $roads = \App\Models\SavedRoad::where('user_id', $user->id)->get();
            foreach ($roads as $road) {
                $photos = \App\Models\RoadPhoto::where('saved_road_id', $road->id)->get();
                foreach ($photos as $photo) {
                    if (!empty($photo->photo_path)) {
                        Storage::disk('public')->delete($photo->photo_path);
                    }
                    $photo->delete();
                }
                $reviews = \App\Models\Review::where('saved_road_id', $road->id)->get();
                foreach ($reviews as $review) {
                    $rphotos = \App\Models\ReviewPhoto::where('review_id', $review->id)->get();
                    foreach ($rphotos as $rp) {
                        if (!empty($rp->photo_path)) {
                            Storage::disk('public')->delete($rp->photo_path);
                        }
                        $rp->delete();
                    }
                    $review->delete();
                }
                \App\Models\Comment::where('saved_road_id', $road->id)->delete();
                \App\Models\RoadComment::where('road_id', $road->id)->delete();
                $road->tags()->detach();
                $road->collections()->detach();
                $road->delete();
            }

            // Delete subscriptions (historical) and user record
            \App\Models\Subscription::where('user_id', $user->id)->delete();

            if (!empty($user->profile_picture)) {
                try {
                    Storage::disk('public')->delete($user->profile_picture);
                } catch (\Throwable $e) {
                    Log::warning('Account deletion: failed to delete profile picture', [
                        'user_id' => $user->id,
                        'path' => $user->profile_picture,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $user->delete();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Account deletion failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
