# SMLV SDK

> Easy integration of SMLV payment system into any SaaS application

## Why SMLV SDK?

SMLV SDK allows you to integrate payment functionality into your SaaS with **minimal code changes**:

- ✅ Just 1 database field
- ✅ Just 1 middleware for balance check
- ✅ Ready-made UI widget from SMLV platform
- ✅ Automatic webhooks handling
- ✅ No need to build payment UI

## Installation

### Via Packagist (recommended)

```bash
composer require smlv/sdk
```

### Via GitHub

Add to your `composer.json`:

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/smlv/sdk.git"
        }
    ],
    "require": {
        "smlv/sdk": "^1.0"
    }
}
```

Then run:

```bash
composer install
```

## Quick Start

### 1. Add one field to your user/account table

```sql
ALTER TABLE `your_accounts_table`
    ADD COLUMN `smlv_account_reference` VARCHAR(32) NULL;
```

### 2. Configure SDK

```php
use Smlv\Sdk\SmlvClient;

$smlv = new SmlvClient([
    'api_url' => 'https://api.smlv.com',
    'api_key' => 'your_api_key',
    'api_secret' => 'your_api_secret',
    'webhook_secret' => 'your_webhook_secret',
]);
```

### 3. Create SMLV account for user

```php
// When user registers or subscribes
$result = $smlv->createAccount([
    'external_user_id' => $user->id,
    'email' => $user->email,
    'account_type' => 'natural', // or 'legal'
]);

if ($result['success']) {
    $user->smlv_account_reference = $result['data']['account_reference'];
    $user->save();
}
```

### 4. Embed SMLV widget

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widget = new SmlvWidgetGenerator($smlv);

// Generate widget HTML for deposit
echo $widget->generateDepositWidget(
    $user->smlv_account_reference,
    route('smlv.callback')
);
```

Widget will render as iframe from SMLV platform with:

- Balance display
- Deposit form
- Transaction history
- Settings

### 5. Add balance check middleware

```php
use Smlv\Sdk\SmlvBalanceChecker;

// In your middleware or filter
$checker = new SmlvBalanceChecker($smlv);

if (!$checker->hasBalance($user->smlv_account_reference)) {
    // Redirect to payment page or show paywall
    return redirect()->route('payment.required');
}

// Allow access to feature
```

### 6. Handle webhooks

```php
use Smlv\Sdk\SmlvWebhookHandler;

// In your webhook endpoint controller
$handler = new SmlvWebhookHandler($smlv);

try {
    $event = $handler->handle($_POST, $_SERVER['HTTP_X_SMLV_SIGNATURE']);

    switch ($event['type']) {
        case 'balance.updated':
            // Update cached balance if needed
            break;
        case 'transaction.completed':
            // Log transaction
            break;
    }

    return response()->json(['success' => true]);
} catch (\Exception $e) {
    return response()->json(['error' => $e->getMessage()], 400);
}
```

## Features

### Zero Balance Restrictions

Automatically restrict access to paid features:

```php
use Smlv\Sdk\Middleware\RequireBalance;

// Laravel example
Route::middleware(['auth', RequireBalance::class])->group(function () {
    Route::get('/premium-feature', [FeatureController::class, 'index']);
});

// Yii2 example
public function behaviors()
{
    return [
        'requireBalance' => [
            'class' => \Smlv\Sdk\Yii2\RequireBalanceFilter::class,
            'accountReferenceCallback' => function() {
                return Yii::$app->user->identity->smlv_account_reference;
            },
        ],
    ];
}
```

### Widget Customization

```php
$widget->generateDepositWidget(
    $accountReference,
    $returnUrl,
    [
        'theme' => 'dark', // or 'light'
        'language' => 'en', // en, ru, lv, etc
        'min_amount' => 10,
        'suggested_amounts' => [10, 25, 50, 100],
    ]
);
```

### Balance Caching

```php
$checker = new SmlvBalanceChecker($smlv, [
    'cache_ttl' => 300, // 5 minutes
    'cache_driver' => 'redis', // or 'file', 'memcached'
]);

// First call - API request
$balance = $checker->getBalance($accountReference);

// Second call within 5 min - from cache
$balance = $checker->getBalance($accountReference);
```

## Framework Integration

### Laravel

```php
// config/services.php
'smlv' => [
    'api_url' => env('SMLV_API_URL'),
    'api_key' => env('SMLV_API_KEY'),
    'api_secret' => env('SMLV_API_SECRET'),
    'webhook_secret' => env('SMLV_WEBHOOK_SECRET'),
],

// Service Provider
$this->app->singleton(SmlvClient::class, function ($app) {
    return new SmlvClient(config('services.smlv'));
});
```

### Yii2

```php
// config/web.php
'components' => [
    'smlv' => [
        'class' => 'Smlv\Sdk\Yii2\SmlvComponent',
        'apiUrl' => getenv('SMLV_API_URL'),
        'apiKey' => getenv('SMLV_API_KEY'),
        'apiSecret' => getenv('SMLV_API_SECRET'),
        'webhookSecret' => getenv('SMLV_WEBHOOK_SECRET'),
    ],
],

// Usage
Yii::$app->smlv->createAccount([...]);
```

### Symfony

```php
// config/packages/smlv.yaml
smlv:
    api_url: '%env(SMLV_API_URL)%'
    api_key: '%env(SMLV_API_KEY)%'
    api_secret: '%env(SMLV_API_SECRET)%'
    webhook_secret: '%env(SMLV_WEBHOOK_SECRET)%'
```

## API Reference

### SmlvClient

```php
$client->createAccount(array $data): array
$client->getAccount(string $accountReference): array
$client->updateAccount(string $accountReference, array $data): array
$client->closeAccount(string $accountReference): array
$client->getBalance(string $accountReference): array
$client->createTransaction(string $accountReference, array $data): array
$client->getTransactions(string $accountReference, array $filters): array
```

### SmlvBalanceChecker

```php
$checker->hasBalance(string $accountReference, float $minAmount = 0): bool
$checker->getBalance(string $accountReference): float
$checker->canAfford(string $accountReference, float $amount): bool
$checker->deductBalance(string $accountReference, float $amount, string $description): bool
```

### SmlvWidgetGenerator

```php
$widget->generateDepositWidget(string $accountReference, string $returnUrl, array $options): string
$widget->generateBalanceWidget(string $accountReference, array $options): string
$widget->generateTransactionsWidget(string $accountReference, array $options): string
$widget->generateManagementWidget(string $accountReference, array $options): string
```

### SmlvWebhookHandler

```php
$handler->handle(array $payload, string $signature): array
$handler->verify(array $payload, string $signature): bool
```

## Webhook Events

| Event Type              | Description           | Payload                                           |
| ----------------------- | --------------------- | ------------------------------------------------- |
| `account.created`       | New account created   | `account_reference`, `status`                     |
| `account.closed`        | Account closed        | `account_reference`                               |
| `balance.updated`       | Balance changed       | `account_reference`, `old_balance`, `new_balance` |
| `transaction.pending`   | Transaction initiated | `transaction_id`, `amount`, `type`                |
| `transaction.completed` | Transaction completed | `transaction_id`, `amount`, `type`, `balance`     |
| `transaction.failed`    | Transaction failed    | `transaction_id`, `error`                         |

## Security

- All API requests are signed with HMAC-SHA256
- Webhook signatures are verified automatically
- JWT tokens for widget authentication
- TLS 1.2+ required for all connections

## Testing

```bash
composer test
```

## Support

- Documentation: https://docs.smlv.com
- API Reference: https://api.smlv.com/docs
- Issues: https://github.com/smlv/sdk/issues
- Email: support@smlv.com

## License

MIT License. See LICENSE file for details.
