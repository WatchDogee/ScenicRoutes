<?php

namespace App\Http\Controllers;

use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class LocationController extends Controller
{
public function getCountries(Request $request)
    {
        
        $publicOnly = $request->has('public_only') ? $request->boolean('public_only') : false;

        
        $cacheKey = $publicOnly ? 'public_road_countries' : 'road_countries';

        return Cache::remember($cacheKey, 60, function () use ($publicOnly) {
            $query = SavedRoad::whereNotNull('country');

            
            if ($publicOnly) {
                $query->where('is_public', true);
            }

            $countries = $query->select('country')
                ->distinct()
                ->orderBy('country')
                ->pluck('country')
                ->filter()
                ->values();

            
            if ($countries->isEmpty()) {
                $countries = collect(['Latvia', 'Estonia', 'Lithuania', 'Finland', 'Sweden', 'Norway']);
            }

            return response()->json($countries);
        });
    }
public function getRegions(Request $request)
    {
        $country = $request->input('country');

        if (!$country) {
            return response()->json(['error' => 'Country parameter is required'], 400);
        }

        
        $publicOnly = $request->has('public_only') ? $request->boolean('public_only') : false;

        
        $cacheKey = ($publicOnly ? 'public_' : '') . 'road_regions_' . str_replace(' ', '_', strtolower($country));

        return Cache::remember($cacheKey, 60, function () use ($country, $publicOnly) {
            $query = SavedRoad::where('country', $country)
                ->whereNotNull('region');

            
            if ($publicOnly) {
                $query->where('is_public', true);
            }

            $regions = $query->select('region')
                ->distinct()
                ->orderBy('region')
                ->pluck('region')
                ->filter()
                ->values();

            
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
public function getCountryStats()
    {
        
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
