<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
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
        foreach ($tagCategories as $type => $tags) {
            foreach ($tags as $name => $description) {
                // Check if tag already exists
                $slug = Str::slug($name);
                $existingTag = DB::table('tags')->where('slug', $slug)->first();

                if (!$existingTag) {
                    DB::table('tags')->insert([
                        'name' => $name,
                        'slug' => $slug,
                        'description' => $description,
                        'type' => $type,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Update existing tag with proper type and description
                    DB::table('tags')
                        ->where('id', $existingTag->id)
                        ->update([
                            'description' => $description,
                            'type' => $type,
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        // No need to delete tags in down method
        // as they will be deleted when the tags table is dropped
    }
};
