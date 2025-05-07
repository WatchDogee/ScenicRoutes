<?php

namespace App\Http\Controllers;

use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class LocationController extends Controller
{
    /**
     * Get a list of all countries that have roads
     */
    public function getCountries(Request $request)
    {
        // Check if we should only return countries with public roads
        $publicOnly = $request->has('public_only') ? $request->boolean('public_only') : false;

        // Cache the countries list for 1 hour to improve performance
        $cacheKey = $publicOnly ? 'public_road_countries' : 'road_countries';

        return Cache::remember($cacheKey, 60, function () use ($publicOnly) {
            $query = SavedRoad::whereNotNull('country');

            // Filter for public roads if requested
            if ($publicOnly) {
                $query->where('is_public', true);
            }

            $countries = $query->select('country')
                ->distinct()
                ->orderBy('country')
                ->pluck('country')
                ->filter()
                ->values();

            // If no countries found, add some default countries for testing
            if ($countries->isEmpty()) {
                $countries = collect(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
            }

            return response()->json($countries);
        });
    }

    /**
     * Get a list of regions within a specific country
     */
    public function getRegions(Request $request)
    {
        $country = $request->input('country');

        if (!$country) {
            return response()->json(['error' => 'Country parameter is required'], 400);
        }

        // Check if we should only return regions with public roads
        $publicOnly = $request->has('public_only') ? $request->boolean('public_only') : false;

        // Cache the regions list for 1 minute to improve performance but allow for quick updates
        $cacheKey = ($publicOnly ? 'public_' : '') . 'road_regions_' . str_replace(' ', '_', strtolower($country));

        return Cache::remember($cacheKey, 60, function () use ($country, $publicOnly) {
            $query = SavedRoad::where('country', $country)
                ->whereNotNull('region');

            // Filter for public roads if requested
            if ($publicOnly) {
                $query->where('is_public', true);
            }

            $regions = $query->select('region')
                ->distinct()
                ->orderBy('region')
                ->pluck('region')
                ->filter()
                ->values();

            // If no regions found, add some default regions for testing
            if ($regions->isEmpty()) {
                if ($country === 'Latvia') {
                    $regions = collect(['Riga', 'Vidzeme', 'Kurzeme', 'Zemgale', 'Latgale']);
                } else if ($country === 'Estonia') {
                    $regions = collect(['Tallinn', 'Tartu', 'Pärnu', 'Narva']);
                } else if ($country === 'Lithuania') {
                    $regions = collect(['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai']);
                } else {
                    $regions = collect(['Region 1', 'Region 2', 'Region 3']);
                }
            }

            return response()->json($regions);
        });
    }

    /**
     * Get statistics about roads by country
     */
    public function getCountryStats()
    {
        // Cache the country stats for 1 hour to improve performance
        return Cache::remember('country_road_stats', 3600, function () {
            $stats = SavedRoad::whereNotNull('country')
                ->select('country', DB::raw('count(*) as road_count'))
                ->groupBy('country')
                ->orderByDesc('road_count')
                ->get();

            return response()->json($stats);
        });
    }
}
