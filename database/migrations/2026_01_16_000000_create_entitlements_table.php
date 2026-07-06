<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Core entitlement
            $table->string('entitlement_key')->default('premium'); // 'premium', 'pro', etc.
            $table->string('status')->default('inactive'); // 'active', 'inactive', 'cancelled', 'grace'
            
            // Billing source tracking
            $table->enum('source', ['play', 'stripe', 'manual'])->default('stripe');
            $table->string('product_id')->nullable(); // Play SKU or Stripe price_id
            
            // Timestamps for entitlement validity
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('next_billing_date')->nullable();
            
            // Purchase/subscription tracking
            $table->string('purchase_token')->nullable()->comment('Play purchase token');
            $table->string('stripe_subscription_id')->nullable();
            $table->string('stripe_price_id')->nullable();
            
            // Device binding (optional, for tighter control)
            $table->string('device_id')->nullable();
            
            // Validation tracking
            $table->dateTime('last_validated_at')->nullable();
            $table->string('last_validation_result')->nullable(); // 'success', 'expired', 'revoked', etc.
            
            // Metadata
            $table->json('metadata')->nullable();
            $table->text('notes')->nullable();
            
            // Audit
            $table->timestamps();
            
            // Indices for efficient queries
            $table->index('user_id');
            $table->index('status');
            $table->index('source');
            $table->index('entitlement_key');
            $table->index('expires_at');
            $table->index('purchase_token');
            $table->index('stripe_subscription_id');
            $table->unique(['user_id', 'source', 'product_id']); // Only one active per source+product
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entitlements');
    }
};
