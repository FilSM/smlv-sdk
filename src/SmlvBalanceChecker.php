<?php

namespace Smlv\Sdk;

use Smlv\Sdk\Exceptions\SmlvApiException;

/**
 * SMLV Balance Checker
 * 
 * Check and manage account balances with caching support
 */
class SmlvBalanceChecker
{
    /** @var SmlvClient */
    private $client;

    /** @var int Cache TTL in seconds */
    private $cacheTtl;

    /** @var array In-memory cache */
    private $cache = [];

    /**
     * @param SmlvClient $client
     * @param array $options Configuration options
     */
    public function __construct(SmlvClient $client, array $options = [])
    {
        $this->client = $client;
        $this->cacheTtl = $options['cache_ttl'] ?? 300; // 5 minutes default
    }

    /**
     * Check if account has sufficient balance
     * 
     * @param string $accountReference Account reference ID
     * @param float $minAmount Minimum required amount (default 0 = any positive balance)
     * @return bool
     */
    public function hasBalance(string $accountReference, float $minAmount = 0): bool
    {
        try {
            $balance = $this->getBalance($accountReference);
            return $balance >= $minAmount;
        } catch (SmlvApiException $e) {
            // If account not found or API error, assume no balance
            return false;
        }
    }

    /**
     * Get account balance
     * 
     * @param string $accountReference Account reference ID
     * @param bool $forceRefresh Force API call, bypass cache
     * @return float Current balance
     * @throws SmlvApiException
     */
    public function getBalance(string $accountReference, bool $forceRefresh = false): float
    {
        // Check cache first
        if (!$forceRefresh && $this->isCached($accountReference)) {
            return $this->cache[$accountReference]['balance'];
        }

        // Fetch from API
        $response = $this->client->getBalance($accountReference);

        // Extract available balance from first currency entry.
        // API response: data.balances[].available_balance
        $balance = 0;
        if (isset($response['data']['balances'][0]['available_balance'])) {
            $balance = (float) $response['data']['balances'][0]['available_balance'];
        }

        // Cache the result
        $this->cacheBalance($accountReference, $balance);

        return $balance;
    }

    /**
     * Check if account can afford specific amount
     * 
     * @param string $accountReference Account reference ID
     * @param float $amount Amount to check
     * @return bool
     */
    public function canAfford(string $accountReference, float $amount): bool
    {
        return $this->hasBalance($accountReference, $amount);
    }

    /**
     * Deduct balance from account (create debit transaction)
     * 
     * @param string $accountReference Account reference ID
     * @param float $amount Amount to deduct
     * @param string $description Transaction description
     * @param array $metadata Additional metadata
     * @return bool Success status
     * @throws SmlvApiException
     */
    public function deductBalance(
        string $accountReference,
        float $amount,
        string $description,
        array $metadata = []
    ): bool {
        // Check if can afford
        if (!$this->canAfford($accountReference, $amount)) {
            return false;
        }

        // Create debit transaction
        $result = $this->client->createTransaction($accountReference, [
            'type' => 'debit',
            'amount' => $amount,
            'currency' => 'EUR', // Default currency for SaaS
            'description' => $description,
            'metadata' => $metadata,
        ]);

        // Clear cache after transaction
        $this->clearCache($accountReference);

        return $result['success'] ?? false;
    }

    /**
     * Add balance to account (create credit transaction)
     * 
     * @param string $accountReference Account reference ID
     * @param float $amount Amount to add
     * @param string $description Transaction description
     * @param array $metadata Additional metadata
     * @return bool Success status
     * @throws SmlvApiException
     */
    public function addBalance(
        string $accountReference,
        float $amount,
        string $description,
        array $metadata = []
    ): bool {
        $result = $this->client->createTransaction($accountReference, [
            'type' => 'credit',
            'amount' => $amount,
            'currency' => 'EUR',
            'description' => $description,
            'metadata' => $metadata,
        ]);

        // Clear cache after transaction
        $this->clearCache($accountReference);

        return $result['success'] ?? false;
    }

    /**
     * Sync balance from SMLV (force refresh and update cache)
     * 
     * @param string $accountReference Account reference ID
     * @return float Current balance
     * @throws SmlvApiException
     */
    public function syncBalance(string $accountReference): float
    {
        $this->clearCache($accountReference);
        return $this->getBalance($accountReference, true);
    }

    /**
     * Clear cached balance for account
     * 
     * @param string $accountReference Account reference ID
     * @return void
     */
    public function clearCache(string $accountReference): void
    {
        unset($this->cache[$accountReference]);
    }

    /**
     * Clear all cached balances
     * 
     * @return void
     */
    public function clearAllCache(): void
    {
        $this->cache = [];
    }

    /**
     * Check if balance is cached and not expired
     * 
     * @param string $accountReference Account reference ID
     * @return bool
     */
    private function isCached(string $accountReference): bool
    {
        if (!isset($this->cache[$accountReference])) {
            return false;
        }

        $cached = $this->cache[$accountReference];
        $age = time() - $cached['timestamp'];

        return $age < $this->cacheTtl;
    }

    /**
     * Cache balance with timestamp
     * 
     * @param string $accountReference Account reference ID
     * @param float $balance Balance value
     * @return void
     */
    private function cacheBalance(string $accountReference, float $balance): void
    {
        $this->cache[$accountReference] = [
            'balance' => $balance,
            'timestamp' => time(),
        ];
    }
}
