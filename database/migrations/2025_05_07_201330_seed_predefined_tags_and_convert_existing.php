<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Tag;
use App\Models\SavedRoad;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Define predefined tags
        $tagCategories = [
            // Road characteristics
            'road_characteristic' => [
                'Twisty' => 'Roads with many curves and turns',
                'Straight' => 'Roads with long straight sections',
                'Hilly' => 'Roads with significant elevation changes',
                'Flat' => 'Roads with minimal elevation changes',
            ],

            // Surface types
            'surface_type' => [
                'Paved' => 'Roads with asphalt or concrete surface',
                'Gravel' => 'Roads with gravel or crushed stone surface',
                'Dirt' => 'Unpaved dirt roads',
            ],

            // Scenery types
            'scenery' => [
                'Mountain' => 'Roads through mountainous terrain',
                'Coastal' => 'Roads along coastlines or with ocean views',
                'Forest' => 'Roads through forested areas',
                'Desert' => 'Roads through desert landscapes',
                'Urban' => 'Roads through cities or urban areas',
                'Scenic' => 'Roads with particularly beautiful views',
            ],

            // Experience types
            'experience' => [
                'Technical' => 'Roads requiring technical driving skills',
                'Beginner-friendly' => 'Roads suitable for beginners',
                'Advanced' => 'Roads best suited for experienced drivers',
            ],

            // Vehicle suitability
            'vehicle' => [
                'Motorcycle' => 'Roads particularly good for motorcycles',
                'Car' => 'Roads well-suited for cars',
                'Bicycle' => 'Roads suitable for cycling',
            ],
        ];

        // Create tags
        $tagMap = [];
        foreach ($tagCategories as $type => $tags) {
            foreach ($tags as $name => $description) {
                // Check if tag already exists
                $slug = Str::slug($name);
                $existingTag = DB::table('tags')->where('slug', $slug)->first();

                if (!$existingTag) {
                    $tagId = DB::table('tags')->insertGetId([
                        'name' => $name,
                        'slug' => $slug,
                        'description' => $description,
                        'type' => $type,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $tagMap[$slug] = $tagId;
                } else {
                    // Update existing tag with proper type and description
                    DB::table('tags')
                        ->where('id', $existingTag->id)
                        ->update([
                            'description' => $description,
                            'type' => $type,
                            'updated_at' => now(),
                        ]);
                    $tagMap[$slug] = $existingTag->id;
                }
            }
        }

        // Find roads with "Scenic" tag (if it exists)
        $scenicTag = DB::table('tags')->where('name', 'Scenic')->first();

        if ($scenicTag) {
            // Get all roads with the Scenic tag
            $roadsWithScenicTag = DB::table('road_tag')
                ->where('tag_id', $scenicTag->id)
                ->get();

            // Log the number of roads found
            DB::table('migration_log')->insert([
                'message' => 'Found ' . $roadsWithScenicTag->count() . ' roads with Scenic tag',
                'migration' => '2025_05_07_201330_seed_predefined_tags_and_convert_existing',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cannot be reversed as it would be destructive
        // We don't want to delete predefined tags or lose tag associations
    }
};
