<?php

namespace Database\Seeders;

use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PredefinedTagsSeeder extends Seeder
{
public function run(): void
    {
        
        $tagCategories = [
            
            'road_characteristic' => [
                'Twisty' => 'Roads with many curves and turns',
                'Straight' => 'Roads with long straight sections',
                'Hilly' => 'Roads with significant elevation changes',
                'Flat' => 'Roads with minimal elevation changes',
            ],
            
            
            'surface_type' => [
                'Paved' => 'Roads with asphalt or concrete surface',
                'Gravel' => 'Roads with gravel or crushed stone surface',
                'Dirt' => 'Unpaved dirt roads',
            ],
            
            
            'scenery' => [
                'Mountain' => 'Roads through mountainous terrain',
                'Coastal' => 'Roads along coastlines or with ocean views',
                'Forest' => 'Roads through forested areas',
                'Desert' => 'Roads through desert landscapes',
                'Urban' => 'Roads through cities or urban areas',
                'Scenic' => 'Roads with particularly beautiful views',
            ],
            
            
            'experience' => [
                'Technical' => 'Roads requiring technical driving skills',
                'Beginner-friendly' => 'Roads suitable for beginners',
                'Advanced' => 'Roads best suited for experienced drivers',
            ],
            
            
            'vehicle' => [
                'Motorcycle' => 'Roads particularly good for motorcycles',
                'Car' => 'Roads well-suited for cars',
                'Bicycle' => 'Roads suitable for cycling',
            ],
        ];

        
        foreach ($tagCategories as $type => $tags) {
            foreach ($tags as $name => $description) {
                
                $slug = Str::slug($name);
                $existingTag = Tag::where('slug', $slug)->first();
                
                if (!$existingTag) {
                    Tag::create([
                        'name' => $name,
                        'slug' => $slug,
                        'description' => $description,
                        'type' => $type,
                    ]);
                    $this->command->info("Created tag: $name ($type)");
                } else {
                    
                    $existingTag->update([
                        'description' => $description,
                        'type' => $type,
                    ]);
                    $this->command->info("Updated existing tag: $name ($type)");
                }
            }
        }
    }
}
