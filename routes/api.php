<?php
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\SavedRoadController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Saved roads management
    Route::get('/saved-roads', [SavedRoadController::class, 'index'])->name('saved-roads.index');
    Route::post('/saved-roads', [SavedRoadController::class, 'store'])->name('saved-roads.store');
    Route::get('/saved-roads/{id}', [SavedRoadController::class, 'show'])->name('saved-roads.show');
    Route::put('/saved-roads/{id}', [SavedRoadController::class, 'update'])->name('saved-roads.update');
    Route::delete('/saved-roads/{id}', [SavedRoadController::class, 'destroy'])->name('saved-roads.destroy');
    
    // Community interaction routes
    Route::post('/saved-roads/{id}/review', [SavedRoadController::class, 'addReview'])->name('saved-roads.review');
    Route::post('/saved-roads/{id}/comment', [SavedRoadController::class, 'addComment'])->name('saved-roads.comment');
    Route::post('/saved-roads/{id}/toggle-public', [SavedRoadController::class, 'togglePublic'])->name('saved-roads.toggle-public');
});

// Public routes
Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);