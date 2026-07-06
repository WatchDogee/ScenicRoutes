<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds platform support for Google Play billing alongside Stripe
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Platform: 'stripe' or 'google_play'
            $table->string('platform')->default('stripe')->after('plan');
            
            // External subscription ID (Stripe subscription ID or Google Play purchase token)
            $table->string('external_subscription_id')->nullable()->after('stripe_subscription_id');
            
            // Google Play specific fields
            $table->string('purchase_token')->nullable()->after('external_subscription_id');
            $table->string('product_id')->nullable()->after('purchase_token');
            
            // Add indexes for fast lookups
            $table->index('platform');
            $table->index('purchase_token');
            $table->index('external_subscription_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['platform']);
            $table->dropIndex(['purchase_token']);
            $table->dropIndex(['external_subscription_id']);
            
            $table->dropColumn([
                'platform',
                'external_subscription_id',
                'purchase_token',
                'product_id',
            ]);
        });
    }
};
