<?php

namespace Smlv\Sdk;

use Smlv\Sdk\Exceptions\SmlvApiException;
use Smlv\Sdk\Exceptions\SmlvAuthException;
use Smlv\Sdk\Exceptions\SmlvValidationException;

/**
 * SMLV Platform API Client
 * 
 * Main class for interacting with SMLV API
 */
class SmlvClient
{
    /** @var string */
    private $apiUrl;

    /** @var string */
    private $apiKey;

    /** @var string */
    private $apiSecret;

    /** @var string */
    private $widgetSecret;

    /** @var string */
    private $webhookSecret;

    /** @var int */
    private $timeout = 30;

    /** @var string */
    private $version = '1.0';

    /**
     * @param array $config Configuration array
     * @throws SmlvValidationException
     */
    public function __construct(array $config)
    {
        $this->validateConfig($config);

        $this->apiUrl = rtrim($config['api_url'], '/');
        $this->apiKey = $config['api_key'];
        $this->apiSecret = $config['api_secret'];
        $this->widgetSecret = $config['widget_secret'] ?? null;
        $this->webhookSecret = $config['webhook_secret'] ?? null;
        $this->timeout = $config['timeout'] ?? 30;
    }

    /**
     * Create new SMLV account
     * 
     * @param array $data Account data
     * @return array API response
     * @throws SmlvApiException
     */
    public function createAccount(array $data): array
    {
        $this->validateAccountData($data);

        return $this->request('POST', '/v1/accounts', $data);
    }

    /**
     * Get account information
     * 
     * @param string $accountReference Account reference ID (e.g., ACC_A1B2C3D4)
     * @return array Account data
     * @throws SmlvApiException
     */
    public function getAccount(string $accountReference): array
    {
        return $this->request('GET', "/v1/accounts/{$accountReference}");
    }

    /**
     * Update account information
     * 
     * @param string $accountReference Account reference ID
     * @param array $data Data to update
     * @return array Updated account data
     * @throws SmlvApiException
     */
    public function updateAccount(string $accountReference, array $data): array
    {
        return $this->request('PATCH', "/v1/accounts/{$accountReference}", $data);
    }

    /**
     * Close (deactivate) account
     * 
     * @param string $accountReference Account reference ID
     * @return array Response
     * @throws SmlvApiException
     */
    public function closeAccount(string $accountReference): array
    {
        return $this->request('POST', "/v1/accounts/{$accountReference}/close");
    }

    /**
     * Reactivate closed account
     * 
     * @param string $accountReference Account reference ID
     * @param array $data Optional update data
     * @return array Response
     * @throws SmlvApiException
     */
    public function reactivateAccount(string $accountReference, array $data = []): array
    {
        return $this->request('POST', "/v1/accounts/{$accountReference}/reactivate", $data);
    }

    /**
     * Get account balance
     * 
     * @param string $accountReference Account reference ID
     * @return array Balance data with currencies
     * @throws SmlvApiException
     */
    public function getBalance(string $accountReference): array
    {
        return $this->request('GET', "/v1/accounts/{$accountReference}/balance");
    }

    /**
     * Sync balance from SMLV (force refresh)
     * 
     * @param string $accountReference Account reference ID
     * @return array Current balance data
     * @throws SmlvApiException
     */
    public function syncBalance(string $accountReference): array
    {
        return $this->request('POST', "/v1/accounts/{$accountReference}/balance/sync");
    }

    /**
     * Create transaction (deduct or add balance)
     * 
     * @param string $accountReference Account reference ID
     * @param array $data Transaction data
     * @return array Transaction result
     * @throws SmlvApiException
     */
    public function createTransaction(string $accountReference, array $data): array
    {
        return $this->request('POST', "/v1/accounts/{$accountReference}/transactions", $data);
    }

    /**
     * Get transactions history
     * 
     * @param string $accountReference Account reference ID
     * @param array $filters Optional filters (date_from, date_to, type, limit, offset)
     * @return array List of transactions
     * @throws SmlvApiException
     */
    public function getTransactions(string $accountReference, array $filters = []): array
    {
        $query = http_build_query($filters);
        $endpoint = "/v1/accounts/{$accountReference}/transactions" . ($query ? "?{$query}" : '');

        return $this->request('GET', $endpoint);
    }

    /**
     * Find account by email
     * 
     * @param string $email User email
     * @return array|null Account data or null if not found
     * @throws SmlvApiException
     */
    public function findAccountByEmail(string $email): ?array
    {
        try {
            $response = $this->request('GET', '/v1/accounts/search', ['email' => $email]);
            return $response['data'] ?? null;
        } catch (SmlvApiException $e) {
            if ($e->getCode() === 404) {
                return null;
            }
            throw $e;
        }
    }

    /**
     * Generate short-lived JWT token for widget authentication.
     *
     * The widget uses this token to call POST /v1/widget/account/resolve,
     * which finds the SMLV account by external_subscriber_id or, if none exists,
     * signals the widget to show the create-account form automatically.
     *
     * @param string $externalSubscriberId  Unique subscriber ID in the SaaS system.
     *                                      One SaaS user may have several subscribers —
     *                                      pass the subscriber entity ID, not the user ID.
     * @param string $email           Subscriber e-mail (pre-fills create-account form)
     * @param string $widgetType      deposit|balance|transactions|management
     * @param string $returnUrl       Redirect after success (deposit)
     * @param array  $options         Additional options passed through to the widget
     * @param array  $prefill         Extra fields pre-filled in create-account form
     *                                (first_name, last_name, account_type)
     * @return string JWT token (TTL: 15 min, includes jti for one-time enforcement)
     */
    public function generateWidgetToken(
        string $externalSubscriberId,
        string $email = '',
        string $widgetType = 'deposit',
        string $returnUrl = '',
        array $options = [],
        array $prefill = []
    ): string {
        $payload = [
            'iss'                    => $this->apiKey,
            'external_subscriber_id' => $externalSubscriberId,
            'email'            => $email,
            'widget_type'      => $widgetType,
            'return_url'       => $returnUrl,
            'options'          => $options,
            'prefill'          => $prefill,
            'iat'              => time(),
            'exp'              => time() + 900,
            'jti'              => bin2hex(random_bytes(8)),
        ];

        $secret = $this->widgetSecret ?: $this->apiSecret;
        return \Firebase\JWT\JWT::encode($payload, $secret, 'HS256');
    }

    /**
     * Verify webhook signature
     * 
     * @param array $payload Webhook payload
     * @param string $signature Signature from header
     * @return bool
     */
    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        if (!$this->webhookSecret) {
            throw new SmlvAuthException('Webhook secret is not configured');
        }

        $expectedSignature = hash_hmac('sha256', json_encode($payload), $this->webhookSecret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Get webhook secret
     * 
     * @return string|null
     */
    public function getWebhookSecret(): ?string
    {
        return $this->webhookSecret;
    }

    /**
     * Make HTTP request to SMLV API
     * 
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array $data Request data
     * @return array API response
     * @throws SmlvApiException
     */
    private function request(string $method, string $endpoint, array $data = []): array
    {
        $url = $this->apiUrl . $endpoint;

        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-API-Key: ' . $this->apiKey,
            'X-SDK-Version: ' . $this->version,
        ];

        // Generate signature
        $timestamp = time();
        $signature = $this->generateSignature($method, $endpoint, $data, $timestamp);
        $headers[] = 'X-Signature: ' . $signature;
        $headers[] = 'X-Timestamp: ' . $timestamp;

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method,
        ]);

        if (!empty($data) && in_array($method, ['POST', 'PATCH', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($error) {
            throw new SmlvApiException("CURL error: {$error}");
        }

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            $message = $decoded['message'] ?? $decoded['error'] ?? 'API request failed';
            throw new SmlvApiException($message, $httpCode);
        }

        if (!$decoded || !isset($decoded['success'])) {
            throw new SmlvApiException('Invalid API response format');
        }

        return $decoded;
    }

    /**
     * Generate request signature
     * 
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array $data Request data
     * @param int $timestamp Request timestamp
     * @return string HMAC signature
     */
    private function generateSignature(string $method, string $endpoint, array $data, int $timestamp): string
    {
        $payload = $method . '|' . $endpoint . '|' . json_encode($data) . '|' . $timestamp;
        return hash_hmac('sha256', $payload, $this->apiSecret);
    }

    /**
     * Validate configuration
     * 
     * @param array $config
     * @throws SmlvValidationException
     */
    private function validateConfig(array $config): void
    {
        $required = ['api_url', 'api_key', 'api_secret'];

        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new SmlvValidationException("Missing required config field: {$field}");
            }
        }
    }

    /**
     * Validate account creation data
     * 
     * @param array $data
     * @throws SmlvValidationException
     */
    private function validateAccountData(array $data): void
    {
        $required = ['external_subscriber_id', 'email', 'account_type'];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new SmlvValidationException("Missing required field: {$field}");
            }
        }

        if (!in_array($data['account_type'], ['natural', 'legal'])) {
            throw new SmlvValidationException("Invalid account_type. Must be 'natural' or 'legal'");
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new SmlvValidationException("Invalid email format");
        }
    }
}
