<?php

namespace App\Http\Controllers;

use App\Services\GPXService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\SavedRoad;
use App\Models\Collection;

class RouteExportController extends Controller
{
    protected $gpxService;

    public function __construct(GPXService $gpxService)
    {
        $this->gpxService = $gpxService;
    }

    /**
     * Export route to GPX format
     * 
     * POST /api/routes/export/gpx
     * Body: { route: {...}, name: "Route Name", description: "..." }
     */
    public function exportRoute(Request $request)
    {
        // GPX export is available for all users (no subscription gating)

        $validator = Validator::make($request->all(), [
            'route' => 'required|array',
            'route.coordinates' => 'required|array',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        try {
            $route = $request->input('route');
            $name = $request->input('name', 'Route');
            $description = $request->input('description', '');

            $gpxContent = $this->gpxService->generateGPX($route, $name, $description);

            return response($gpxContent, 200)
                ->header('Content-Type', 'application/gpx+xml')
                ->header('Content-Disposition', 'attachment; filename="' . $this->sanitizeFilename($name) . '.gpx"');
        } catch (\Exception $e) {
            Log::error('GPX export error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to generate GPX: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Export saved road to GPX format
     * 
     * GET /api/routes/export/saved-road/{id}
     */
    public function exportSavedRoad(Request $request, $id)
    {
        try {
            $savedRoad = SavedRoad::findOrFail($id);
            
            Log::info('Exporting saved road to GPX', [
                'road_id' => $id,
                'road_name' => $savedRoad->road_name,
                'has_road_coordinates' => !empty($savedRoad->road_coordinates),
                'coordinates_length' => is_string($savedRoad->road_coordinates) ? strlen($savedRoad->road_coordinates) : 0
            ]);
            
            // Check if user has access (must be owner or public)
            $user = $request->user();
            if (!$savedRoad->is_public && (!$user || $savedRoad->user_id !== $user->id)) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            // GPX export is available for all users (no subscription gating)

            $gpxContent = $this->gpxService->generateGPXFromSavedRoad($savedRoad);
            
            Log::info('GPX generated successfully', [
                'road_id' => $id,
                'gpx_length' => strlen($gpxContent),
                'gpx_preview' => substr($gpxContent, 0, 500)
            ]);

            return response($gpxContent, 200)
                ->header('Content-Type', 'application/gpx+xml')
                ->header('Content-Disposition', 'attachment; filename="' . $this->sanitizeFilename($savedRoad->road_name) . '.gpx"');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Saved road not found'], 404);
        } catch (\Exception $e) {
            Log::error('GPX export error for saved road', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json(['error' => 'Failed to generate GPX: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Export collection to GPX format
     * 
     * GET /api/routes/export/collection/{id}
     */
    public function exportCollection(Request $request, $id)
    {
        try {
            $collection = Collection::with('roads')->findOrFail($id);
            
            // Check if user has access (must be owner or public)
            $user = $request->user();
            if (!$collection->is_public && (!$user || $collection->user_id !== $user->id)) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            // GPX export is available for all users (no subscription gating)

            $gpxContent = $this->gpxService->generateGPXFromCollection($collection);

            return response($gpxContent, 200)
                ->header('Content-Type', 'application/gpx+xml')
                ->header('Content-Disposition', 'attachment; filename="' . $this->sanitizeFilename($collection->name) . '.gpx"');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Collection not found'], 404);
        } catch (\Exception $e) {
            Log::error('GPX export error for collection', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json(['error' => 'Failed to generate GPX: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Import GPX file and return route data
     * 
     * POST /api/routes/import/gpx
     * Body: FormData with 'file' field containing GPX file
     */
    public function importGPX(Request $request)
    {
        try {
            $gpxContent = null;

            if ($request->hasFile('file')) {
                // Accept any uploaded file up to 10MB (no MIME validation)
                $file = $request->file('file');
                if (!$file) {
                    return response()->json(['error' => 'No file uploaded'], 400);
                }
                if ($file->getSize() > 10 * 1024 * 1024) {
                    return response()->json(['error' => 'File exceeds 10MB limit'], 400);
                }
                $gpxContent = file_get_contents($file->getRealPath());
            } elseif ($request->filled('file')) {
                // Fallback: accept raw XML or base64-encoded GPX string in JSON
                $raw = $request->input('file');
                if (is_string($raw)) {
                    // If looks like XML, use directly; else try base64 decode
                    if (stripos($raw, '<gpx') !== false || strpos(trim($raw), '<') === 0) {
                        $gpxContent = $raw;
                    } else {
                        $decoded = base64_decode($raw, true);
                        if ($decoded !== false) {
                            $gpxContent = $decoded;
                        }
                    }
                }
            }

            if (empty($gpxContent)) {
                return response()->json(['error' => 'No GPX file provided or invalid content'], 400);
            }

            // Debug: log first 500 chars of GPX to see structure
            Log::info('GPX import attempt', [
                'length' => strlen($gpxContent),
                'preview' => substr($gpxContent, 0, 500)
            ]);

            $routeData = $this->gpxService->parseGPX($gpxContent);

            return response()->json([
                'success' => true,
                'route' => $routeData,
            ]);
        } catch (\Exception $e) {
            Log::error('GPX import error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to parse GPX: ' . $e->getMessage()], 400);
        }
    }

    /**
     * Import GPX from URL
     * 
     * POST /api/routes/import/gpx-url
     * Body: { url: "https://..." }
     */
    public function importGPXFromUrl(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'url' => 'required|url|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        try {
            $url = $request->input('url');
            
            // Fetch GPX content
            $gpxContent = @file_get_contents($url);
            
            if ($gpxContent === false) {
                return response()->json(['error' => 'Failed to fetch GPX file from URL'], 400);
            }

            if (empty($gpxContent)) {
                return response()->json(['error' => 'File from URL is empty'], 400);
            }

            $routeData = $this->gpxService->parseGPX($gpxContent);

            return response()->json([
                'success' => true,
                'route' => $routeData,
            ]);
        } catch (\Exception $e) {
            Log::error('GPX import from URL error', ['error' => $e->getMessage(), 'url' => $url ?? null]);
            return response()->json(['error' => 'Failed to parse GPX: ' . $e->getMessage()], 400);
        }
    }

    /**
     * Sanitize filename for download
     * 
     * @param string $filename
     * @return string
     */
    protected function sanitizeFilename($filename)
    {
        // Remove special characters and replace spaces with underscores
        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $filename);
        $filename = preg_replace('/_+/', '_', $filename);
        $filename = trim($filename, '_');
        
        // Limit length
        if (strlen($filename) > 100) {
            $filename = substr($filename, 0, 100);
        }
        
        return $filename ?: 'route';
    }
}

