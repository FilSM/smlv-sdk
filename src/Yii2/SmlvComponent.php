<?php

namespace Smlv\Sdk\Yii2;

use yii\base\Component;

use Firebase\JWT\JWT;

use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvBalanceChecker;
use Smlv\Sdk\SmlvBillingService;
use Smlv\Sdk\SmlvWebhookHandler;
use Smlv\Sdk\SmlvWidgetGenerator;

/**
 * SMLV Application Component for Yii2
 * 
 * Configuration in common/config/main.php:
 * 
 * 'components' => [
 *     'smlv' => [
 *         'class' => 'Smlv\Sdk\Yii2\SmlvComponent',
 *         'apiKey' => 'your-api-key',
 *         'apiSecret' => 'your-api-secret',
 *         'apiUrl' => 'https://api.smlvcoin.com',
 *         'widgetUrl' => 'https://cdn.smlvcoin.com',
 *     ],
 * ],
 */
class SmlvComponent extends Component
{
    /**
     * @var string SMLV API Key
     */
    public $apiKey;

    /**
     * @var string SMLV API Secret
     */
    public $apiSecret;

    /**
     * @var string SMLV API Base URL
     */
    public $apiUrl = 'https://api.smlvcoin.com';

    /**
     * @var string SMLV Widget Base URL
     */
    public $widgetUrl = 'https://cdn.smlvcoin.com';

    /**
     * @var string SMLV App (frontend) Base URL — used to build deposit page links
     */
    public $appUrl = 'https://smlvcoin.com';

    /**
     * @var string JWT secret for widget token signing (falls back to apiSecret if not set)
     */
    public $widgetSecret;

    /**
     * @var int Balance cache TTL in seconds
     */
    public $balanceCacheTtl = 300;

    /**
     * @var string Default currency code for debit/credit transactions.
     * Must match the SaaS account's operating currency in SMLV.
     */
    public $currency = 'SMLV';

    /**
     * @var SmlvClient
     */
    private $_client;

    /**
     * @var SmlvBalanceChecker
     */
    private $_balanceChecker;

    /**
     * @var SmlvWidgetGenerator
     */
    private $_widgetGenerator;

    /**
     * @var SmlvWebhookHandler
     */
    private $_webhookHandler;

    /**
     * @var SmlvBillingService
     */
    private $_billingService;

    /**
     * {@inheritdoc}
     */
    public function init()
    {
        parent::init();

        if (empty($this->apiKey)) {
            throw new \yii\base\InvalidConfigException('The "apiKey" property must be set.');
        }

        if (empty($this->apiSecret)) {
            throw new \yii\base\InvalidConfigException('The "apiSecret" property must be set.');
        }
    }

    /**
     * Get SMLV API client
     * 
     * @return SmlvClient
     */
    public function getClient(): SmlvClient
    {
        if ($this->_client === null) {
            $this->_client = new SmlvClient([
                'api_url'       => $this->apiUrl,
                'api_key'       => $this->apiKey,
                'api_secret'    => $this->apiSecret,
                'widget_secret' => $this->widgetSecret,
            ]);
        }

        return $this->_client;
    }

    /**
     * Get balance checker
     * 
     * @return SmlvBalanceChecker
     */
    public function getBalanceChecker(): SmlvBalanceChecker
    {
        if ($this->_balanceChecker === null) {
            $this->_balanceChecker = new SmlvBalanceChecker(
                $this->getClient(),
                ['cache_ttl' => $this->balanceCacheTtl, 'currency' => $this->currency]
            );
        }

        return $this->_balanceChecker;
    }

    /**
     * Get widget generator
     * 
     * @return SmlvWidgetGenerator
     */
    public function getWidgetGenerator(): SmlvWidgetGenerator
    {
        if ($this->_widgetGenerator === null) {
            $this->_widgetGenerator = new SmlvWidgetGenerator(
                $this->getClient(),
                $this->widgetUrl,
                'v2',
                $this->apiUrl
            );
        }

        return $this->_widgetGenerator;
    }

    /**
     * Get webhook handler
     * 
     * @return SmlvWebhookHandler
     */
    public function getWebhookHandler(): SmlvWebhookHandler
    {
        if ($this->_webhookHandler === null) {
            $this->_webhookHandler = new SmlvWebhookHandler($this->apiSecret);
        }

        return $this->_webhookHandler;
    }

    /**
     * Get billing service — отвечает за списание депозита.
     *
     * Пример использования:
     *   Yii::$app->smlv->billing->charge($accountRef, 1.50, 'Bill #42');
     *   Yii::$app->smlv->billing->chargeByEmail('user@example.com', 1.50, 'Bill #42');
     *
     * @return SmlvBillingService
     */
    public function getBillingService(): SmlvBillingService
    {
        if ($this->_billingService === null) {
            $this->_billingService = new SmlvBillingService(
                $this->getClient(),
                $this->getBalanceChecker()
            );
        }

        return $this->_billingService;
    }

    /**
     * Alias for getBillingService() — позволяет использовать ->billing вместо ->billingService.
     *
     * @return SmlvBillingService
     */
    public function getBilling(): SmlvBillingService
    {
        return $this->getBillingService();
    }

    /**
     * Generate deposit URL for PartnerWidgetController::actionDeposit on SMLV platform.
     * Returns null if partner credentials are not configured.
     *
     * @param string $accountRef External account reference (abonent ID used with SMLV)
     * @param string $returnUrl  URL to return to after deposit is completed
     * @param int    $ttl        Token TTL in seconds (default 3600 = 1 hour)
     * @return string|null
     */
    public function generateDepositUrl(string $accountRef, string $returnUrl, int $ttl = 3600, array $options = []): ?string
    {
        if (empty($this->appUrl) || empty($this->apiKey) || empty($this->widgetSecret)) {
            return null;
        }

        $now     = time();
        $payload = array_merge([
            'iat'         => $now,
            'exp'         => $now + $ttl,
            'partner_id'  => $this->apiKey,
            'account_ref' => $accountRef,
            'return_url'  => $returnUrl,
        ], $options);

        $token = JWT::encode($payload, $this->widgetSecret, 'HS256');

        $route = !empty($options['is_merchant_owner']) ? 'partner-widget/owner-deposit' : 'partner-widget/deposit';
        return rtrim($this->appUrl, '/') . '/' . $route . '?token=' . $token;
    }

    /**
     * Create SMLV account for user
     * 
     * @param \yii\web\IdentityInterface $user User model with email property
     * @return string Account reference ID
     */
    public function createAccountForUser($user): string
    {
        $response = $this->getClient()->createAccount(
            $user->email,
            [
                'first_name' => $user->first_name ?? '',
                'last_name' => $user->last_name ?? '',
                'external_id' => (string) $user->id,
            ]
        );

        return $response['reference'];
    }

    /**
     * Get or create SMLV account for user
     * 
     * @param \yii\web\IdentityInterface $user User model with email and smlv_account_reference properties
     * @return string Account reference ID
     */
    public function getOrCreateAccountForUser($user): string
    {
        if (!empty($user->smlv_account_reference)) {
            return $user->smlv_account_reference;
        }

        // Try to find existing account by email
        try {
            $account = $this->getClient()->findAccountByEmail($user->email);
            if ($account) {
                $user->smlv_account_reference = $account['reference'];
                $user->save(false);
                return $account['reference'];
            }
        } catch (\Exception $e) {
            // Account not found, create new
        }

        // Create new account
        $reference = $this->createAccountForUser($user);
        $user->smlv_account_reference = $reference;
        $user->save(false);

        return $reference;
    }
}
