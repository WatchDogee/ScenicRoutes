<?php
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\SavedRoadController;

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoadController;
use Illuminate\Http\Request;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/saved-roads', [SavedRoadController::class, 'index']);
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::delete('/saved-roads/{road}', [SavedRoadController::class, 'destroy']);
    Route::post('/saved-roads/{road}/review', [SavedRoadController::class, 'addReview'])->middleware('auth:sanctum');
    Route::post('/saved-roads/{road}/comment', [SavedRoadController::class, 'addComment'])->middleware('auth:sanctum');
    Route::get('/saved-roads/{road}', [SavedRoadController::class, 'show']);
    Route::put('/saved-roads/{road}', [SavedRoadController::class, 'update']);
});

Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);