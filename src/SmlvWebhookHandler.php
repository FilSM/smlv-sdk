<?php

namespace Smlv\Sdk;

use Smlv\Sdk\Exceptions\SmlvAuthException;
use Smlv\Sdk\Exceptions\SmlvValidationException;

/**
 * SMLV Webhook Handler
 * 
 * Handles incoming webhooks from SMLV platform
 */
class SmlvWebhookHandler
{
    /** @var SmlvClient */
    private $client;

    /**
     * @param SmlvClient $client
     */
    public function __construct(SmlvClient $client)
    {
        $this->client = $client;
    }

    /**
     * Handle webhook request
     * 
     * @param array $payload Webhook payload (typically $_POST)
     * @param string $signature Signature from header (X-SMLV-Signature)
     * @return array Parsed event data
     * @throws SmlvAuthException If signature is invalid
     * @throws SmlvValidationException If payload is invalid
     */
    public function handle(array $payload, string $signature): array
    {
        // Verify signature
        if (!$this->verify($payload, $signature)) {
            throw new SmlvAuthException('Invalid webhook signature');
        }

        // Validate payload structure
        $this->validatePayload($payload);

        // Return parsed event
        return [
            'id' => $payload['id'] ?? null,
            'type' => $payload['type'],
            'timestamp' => $payload['timestamp'],
            'data' => $payload['data'] ?? [],
        ];
    }

    /**
     * Verify webhook signature
     * 
     * @param array $payload Webhook payload
     * @param string $signature Signature from header
     * @return bool
     */
    public function verify(array $payload, string $signature): bool
    {
        return $this->client->verifyWebhookSignature($payload, $signature);
    }

    /**
     * Validate webhook payload structure
     * 
     * @param array $payload
     * @throws SmlvValidationException
     */
    private function validatePayload(array $payload): void
    {
        if (empty($payload['type'])) {
            throw new SmlvValidationException('Missing webhook event type');
        }

        if (empty($payload['timestamp'])) {
            throw new SmlvValidationException('Missing webhook timestamp');
        }

        // Check if timestamp is not too old (prevent replay attacks)
        $maxAge = 300; // 5 minutes
        if (abs(time() - $payload['timestamp']) > $maxAge) {
            throw new SmlvValidationException('Webhook timestamp is too old');
        }
    }

    /**
     * Get supported event types
     * 
     * @return array
     */
    public static function getSupportedEvents(): array
    {
        return [
            'account.created',
            'account.updated',
            'account.closed',
            'balance.updated',
            'transaction.pending',
            'transaction.completed',
            'transaction.failed',
            'transaction.reversed',
        ];
    }
}
