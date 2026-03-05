<?php

namespace Smlv\Sdk\Yii2;

use yii\base\Component;
use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvBalanceChecker;
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
 *         'widgetUrl' => 'https://widget.smlvcoin.com',
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
    public $widgetUrl = 'https://widget.smlvcoin.com';

    /**
     * @var int Balance cache TTL in seconds
     */
    public $balanceCacheTtl = 300;

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
            $this->_client = new SmlvClient($this->apiKey, $this->apiSecret, $this->apiUrl);
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
                ['cache_ttl' => $this->balanceCacheTtl]
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
                $this->widgetUrl
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
