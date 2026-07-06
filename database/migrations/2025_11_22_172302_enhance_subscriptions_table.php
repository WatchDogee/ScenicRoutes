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
        Schema::table('subscriptions', function (Blueprint $table) {
            // Payment provider fields
            $table->string('stripe_subscription_id')->nullable()->unique()->after('user_id');
            $table->string('stripe_customer_id')->nullable()->after('stripe_subscription_id');
            $table->string('stripe_price_id')->nullable()->after('stripe_customer_id');
            
            // Payment details
            $table->string('payment_method')->default('stripe')->after('plan'); // 'founder' plan supported
            $table->string('billing_cycle')->nullable()->after('payment_method'); // monthly, yearly, null for founder
            $table->decimal('amount', 10, 2)->nullable()->after('billing_cycle'); // founder: one-time
            $table->string('currency', 3)->default('USD')->after('amount');
            
            // Subscription lifecycle
            $table->timestamp('trial_ends_at')->nullable()->after('ends_at'); // ends_at null for founder
            $table->timestamp('cancelled_at')->nullable()->after('trial_ends_at');
            $table->string('cancellation_reason')->nullable()->after('cancelled_at');
            $table->boolean('cancel_at_period_end')->default(false)->after('cancellation_reason');
            
            // Metadata
            $table->json('metadata')->nullable()->after('cancel_at_period_end');
            
            // Indexes
            $table->index('stripe_subscription_id');
            $table->index('stripe_customer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['stripe_subscription_id']);
            $table->dropIndex(['stripe_customer_id']);
            
            $table->dropColumn([
                'stripe_subscription_id',
                'stripe_customer_id',
                'stripe_price_id',
                'payment_method',
                'billing_cycle',
                'amount',
                'currency',
                'trial_ends_at',
                'cancelled_at',
                'cancellation_reason',
                'cancel_at_period_end',
                'metadata',
            ]);
        });
    }
};
