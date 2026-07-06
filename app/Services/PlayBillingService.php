<?php

namespace App\Services;

use App\Models\Entitlement;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Service for handling Google Play Billing verification and entitlement management
 */
class PlayBillingService
{
    private string $packageName;
    private string $serviceAccountJson;

    public function __construct()
    {
        $this->packageName = config('billing.play.package_name');
        $this->serviceAccountJson = config('billing.play.service_account_json_path');
    }

    /**
     * Verify Play purchase token and grant entitlement
     *
     * @param User $user
     * @param string $productId SKU (e.g., 'premium_monthly')
     * @param string $purchaseToken Token from Play
     * @return array Result with status and entitlement
     */
    public function verifyAndGrant(User $user, string $productId, string $purchaseToken): array
    {
        try {
            // Step 1: Validate token with Play Developer API
            $validationResult = $this->validateWithPlay($productId, $purchaseToken);
            
            if (!$validationResult['valid']) {
                return [
                    'success' => false,
                    'message' => $validationResult['reason'] ?? 'Token validation failed',
                ];
            }

            // Step 2: Create or update entitlement
            $entitlement = Entitlement::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'source' => 'play',
                    'product_id' => $productId,
                ],
                [
                    'purchase_token' => $purchaseToken,
                    'entitlement_key' => $this->mapProductToEntitlementKey($productId),
                    'status' => 'active',
                    'starts_at' => now(),
                    'expires_at' => $validationResult['expires_at'],
                    'next_billing_date' => $validationResult['next_billing_date'] ?? null,
                    'last_validated_at' => now(),
                    'last_validation_result' => 'success',
                    'metadata' => [
                        'purchase_time' => $validationResult['purchase_time'] ?? null,
                        'order_id' => $validationResult['order_id'] ?? null,
                    ],
                ]
            );

            Log::info('Play purchase verified', [
                'user_id' => $user->id,
                'product_id' => $productId,
                'entitlement_id' => $entitlement->id,
            ]);

            return [
                'success' => true,
                'message' => 'Entitlement granted',
                'entitlement' => $entitlement,
            ];
        } catch (Exception $e) {
            Log::error('Play billing verification failed', [
                'user_id' => $user->id,
                'product_id' => $productId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Verification failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Validate purchase token with Google Play Developer API
     * 
     * For products (one-time purchases):
     * GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}
     * 
     * For subscriptions:
     * GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptionsv2/tokens/{token}
     */
    private function validateWithPlay(string $productId, string $purchaseToken): array
    {
        try {
            $accessToken = $this->getPlayServiceAccountToken();
            
            // Determine if product or subscription (could be configurable)
            $isSubscription = $this->isSubscriptionProduct($productId);
            
            if ($isSubscription) {
                $url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{$this->packageName}/purchases/subscriptionsv2/tokens/{$purchaseToken}";
            } else {
                $url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{$this->packageName}/purchases/products/{$productId}/tokens/{$purchaseToken}";
            }

            $response = Http::withToken($accessToken)
                ->get($url)
                ->throw();

            $data = $response->json();

            // Parse response based on type
            if ($isSubscription) {
                return $this->parseSubscriptionResponse($data);
            } else {
                return $this->parseProductResponse($data);
            }
        } catch (Exception $e) {
            Log::error('Play API validation failed', [
                'product_id' => $productId,
                'error' => $e->getMessage(),
            ]);

            return [
                'valid' => false,
                'reason' => 'API validation failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get OAuth2 access token for Play Developer API using service account
     */
    private function getPlayServiceAccountToken(): string
    {
        // Cache in memory/Redis to avoid repeated token generation (valid for 1 hour)
        $cached = cache()->get('play_service_account_token');
        if ($cached) {
            return $cached;
        }

        try {
            $serviceAccountConfig = json_decode(
                file_get_contents($this->serviceAccountJson),
                true
            );

            $privateKey = $serviceAccountConfig['private_key'];
            $clientEmail = $serviceAccountConfig['client_email'];

            // Create JWT
            $now = time();
            $payload = [
                'iss' => $clientEmail,
                'scope' => 'https://www.googleapis.com/auth/androidpublisher',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $now + 3600,
                'iat' => $now,
            ];

            $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
            $claims = json_encode($payload);
            
            $header64 = $this->base64UrlEncode($header);
            $claims64 = $this->base64UrlEncode($claims);
            
            $signature = '';
            openssl_sign(
                "$header64.$claims64",
                $signature,
                $privateKey,
                'sha256'
            );
            $signature64 = $this->base64UrlEncode($signature);

            $jwt = "$header64.$claims64.$signature64";

            // Exchange JWT for access token
            $response = Http::asForm()
                ->post('https://oauth2.googleapis.com/token', [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ])
                ->throw();

            $token = $response->json()['access_token'];
            
            // Cache for 50 minutes (safe margin from 1 hour expiry)
            cache()->put('play_service_account_token', $token, 3000);

            return $token;
        } catch (Exception $e) {
            Log::error('Failed to obtain Play service account token', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Parse subscription purchase response
     */
    private function parseSubscriptionResponse(array $data): array
    {
        // Reference: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
        $latestOrderId = $data['latestOrderId'] ?? null;
        $subscriptionState = $data['subscriptionState'] ?? 'STATE_UNSPECIFIED';
        
        // Parse lineItem (subscription details)
        $lineItem = $data['lineItem'] ?? [];
        $expiryTimeMillis = $lineItem['expiryTime'] ?? null;
        $autoRenewingPlan = $lineItem['autoRenewingPlan'] ?? [];
        
        // Only valid if actively subscribed
        $isValid = $subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' && $expiryTimeMillis;

        return [
            'valid' => $isValid,
            'expires_at' => $expiryTimeMillis ? now()->timestamp($expiryTimeMillis / 1000) : null,
            'purchase_time' => $lineItem['expiryTime'] ?? null,
            'order_id' => $latestOrderId,
        ];
    }

    /**
     * Parse product (one-time purchase) response
     */
    private function parseProductResponse(array $data): array
    {
        // Reference: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
        $purchaseState = $data['purchaseState'] ?? 'PURCHASE_STATE_UNSPECIFIED';
        $consumptionState = $data['consumptionState'] ?? 'CONSUMPTION_STATE_UNCONSUMED';
        $purchaseTimeMillis = $data['purchaseTimeMillis'] ?? null;
        
        // Valid if purchased and not consumed
        $isValid = $purchaseState === 'PURCHASED' && $consumptionState === 'UNCONSUMED';

        return [
            'valid' => $isValid,
            'expires_at' => null, // One-time purchases don't expire
            'purchase_time' => $purchaseTimeMillis ? now()->timestamp($purchaseTimeMillis / 1000) : null,
            'order_id' => $data['orderId'] ?? null,
        ];
    }

    /**
     * Revalidate all Play entitlements for a user
     */
    public function revalidateUserEntitlements(User $user): void
    {
        $entitlements = Entitlement::where('user_id', $user->id)
            ->where('source', 'play')
            ->get();

        foreach ($entitlements as $entitlement) {
            try {
                $validationResult = $this->validateWithPlay(
                    $entitlement->product_id,
                    $entitlement->purchase_token
                );

                if (!$validationResult['valid']) {
                    $entitlement->expire();
                } else {
                    $entitlement->update([
                        'status' => 'active',
                        'expires_at' => $validationResult['expires_at'],
                        'last_validated_at' => now(),
                        'last_validation_result' => 'success',
                    ]);
                }
            } catch (Exception $e) {
                $entitlement->recordValidation('failed', 'Revalidation error: ' . $e->getMessage());
            }
        }
    }

    /**
     * Map Play product ID to entitlement key
     */
    private function mapProductToEntitlementKey(string $productId): string
    {
        $mapping = config('billing.play.product_to_entitlement_mapping', []);
        return $mapping[$productId] ?? 'premium';
    }

    /**
     * Check if product is a subscription (vs one-time purchase)
     */
    private function isSubscriptionProduct(string $productId): bool
    {
        $subscriptions = config('billing.play.subscription_skus', []);
        return in_array($productId, $subscriptions);
    }

    /**
     * Base64 URL encode (for JWT)
     */
    private function base64UrlEncode(string $data): string
    {
        return str_replace(
            ['+', '/', '='],
            ['-', '_', ''],
            base64_encode($data)
        );
    }
}
