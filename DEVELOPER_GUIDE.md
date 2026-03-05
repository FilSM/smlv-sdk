# SMLV SDK Developer Guide

Complete guide for integrating SMLV billing into your SaaS application.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Framework Integration](#framework-integration)
5. [API Reference](#api-reference)
6. [Widget Embedding](#widget-embedding)
7. [Webhook Handling](#webhook-handling)
8. [Balance Checking](#balance-checking)
9. [Advanced Usage](#advanced-usage)
10. [Security](#security)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

## Introduction

The SMLV SDK provides a drop-in billing solution for SaaS applications with **minimal integration effort**:

- **No custom UI development** - All billing UI is provided via iframe widgets
- **Minimal code changes** - 1 database field, 1 middleware, 1 webhook endpoint
- **Framework agnostic** - Works with Laravel, Yii2, Symfony, or plain PHP
- **Secure** - HMAC-SHA256 signatures, JWT tokens, webhook verification

### What You Get

- 💳 Payment processing (cards, bank transfers, crypto)
- 💰 Balance management and tracking
- 📊 Transaction history
- 🔔 Real-time webhooks
- 🎨 Customizable UI widgets
- 🔐 Secure authentication
- 📈 Analytics dashboard (on SMLV platform)

## Installation

### Via Composer

```bash
composer require smlv/sdk
```

### Manual Installation

1. Download SDK from: https://github.com/smlv/sdk
2. Place in your project (e.g., `vendor/smlv/sdk`)
3. Include autoloader:

```php
require_once 'vendor/smlv/sdk/src/autoload.php';
```

## Quick Start

### 1. Get API Credentials

Sign up at https://dashboard.smlv.com and get your API key and secret.

### 2. Initialize Client

```php
use Smlv\Sdk\SmlvClient;

$client = new SmlvClient(
    'your-api-key',
    'your-api-secret',
    'https://api.smlv.com'
);
```

### 3. Create Account

```php
$account = $client->createAccount('user@example.com', [
    'first_name' => 'John',
    'last_name' => 'Doe',
    'external_id' => '12345', // Your user ID
]);

$accountReference = $account['reference'];
// Store this in your database: users.smlv_account_reference
```

### 4. Embed Widget

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widgetGenerator = new SmlvWidgetGenerator($client);

// Show deposit form
echo $widgetGenerator->generateDepositWidget(
    $accountReference,
    'https://your-app.com/billing/success'
);
```

### 5. Check Balance

```php
use Smlv\Sdk\SmlvBalanceChecker;

$balanceChecker = new SmlvBalanceChecker($client);

if ($balanceChecker->hasBalance($accountReference)) {
    // Allow user access
} else {
    // Redirect to billing
}
```

## Framework Integration

### Yii2

#### 1. Configure Component

`common/config/main.php`:

```php
return [
    'components' => [
        'smlv' => [
            'class' => 'Smlv\Sdk\Yii2\SmlvComponent',
            'apiKey' => getenv('SMLV_API_KEY'),
            'apiSecret' => getenv('SMLV_API_SECRET'),
        ],
    ],
];
```

#### 2. Add Balance Filter

```php
use Smlv\Sdk\Yii2\SmlvBalanceFilter;

public function behaviors()
{
    return [
        'smlvBalance' => [
            'class' => SmlvBalanceFilter::class,
            'balanceChecker' => fn() => Yii::$app->smlv->getBalanceChecker(),
            'accountReferenceCallback' => fn() => Yii::$app->user->identity->smlv_account_reference,
            'only' => ['create', 'update', 'delete'],
            'redirectUrl' => ['/billing/deposit'],
        ],
    ];
}
```

#### 3. Embed Widget in View

```php
$widgetGenerator = Yii::$app->smlv->getWidgetGenerator();
echo $widgetGenerator->generateBalanceWidget(
    Yii::$app->user->identity->smlv_account_reference
);
```

### Laravel

#### 1. Configure Service

`config/services.php`:

```php
return [
    'smlv' => [
        'api_key' => env('SMLV_API_KEY'),
        'api_secret' => env('SMLV_API_SECRET'),
        'api_url' => env('SMLV_API_URL', 'https://api.smlv.com'),
    ],
];
```

`app/Providers/AppServiceProvider.php`:

```php
use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvBalanceChecker;

public function register()
{
    $this->app->singleton(SmlvClient::class, function ($app) {
        return new SmlvClient(
            config('services.smlv.api_key'),
            config('services.smlv.api_secret'),
            config('services.smlv.api_url')
        );
    });

    $this->app->singleton(SmlvBalanceChecker::class, function ($app) {
        return new SmlvBalanceChecker($app->make(SmlvClient::class));
    });
}
```

#### 2. Apply Middleware

`app/Http/Kernel.php`:

```php
protected $routeMiddleware = [
    'smlv.balance' => \Smlv\Sdk\Laravel\SmlvBalanceMiddleware::class,
];
```

`routes/web.php`:

```php
Route::middleware(['auth', 'smlv.balance:0.0,smlv_account_reference'])->group(function () {
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{id}', [PostController::class, 'update']);
});
```

#### 3. Embed Widget in Blade

```blade
@inject('widgetGenerator', 'Smlv\Sdk\SmlvWidgetGenerator')

{!! $widgetGenerator->generateDepositWidget(
    auth()->user()->smlv_account_reference,
    route('billing.success')
) !!}
```

### Symfony

#### 1. Configure Service

`config/services.yaml`:

```yaml
parameters:
    smlv.api_key: '%env(SMLV_API_KEY)%'
    smlv.api_secret: '%env(SMLV_API_SECRET)%'

services:
    Smlv\Sdk\SmlvClient:
        arguments:
            $apiKey: '%smlv.api_key%'
            $apiSecret: '%smlv.api_secret%'
            $apiUrl: 'https://api.smlv.com'

    Smlv\Sdk\SmlvBalanceChecker:
        arguments:
            $client: '@Smlv\Sdk\SmlvClient'

    Smlv\Sdk\SmlvWidgetGenerator:
        arguments:
            $client: '@Smlv\Sdk\SmlvClient'
```

#### 2. Create Event Subscriber

```php
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class SmlvBalanceSubscriber implements EventSubscriberInterface
{
    private $balanceChecker;

    public static function getSubscribedEvents()
    {
        return [RequestEvent::class => 'onKernelRequest'];
    }

    public function onKernelRequest(RequestEvent $event)
    {
        // Check balance for specific routes
        if ($this->requiresBalance($event->getRequest())) {
            $user = $this->security->getUser();
            if (!$this->balanceChecker->hasBalance($user->getSmlvAccountReference())) {
                throw new AccessDeniedHttpException('Insufficient balance');
            }
        }
    }
}
```

## API Reference

### SmlvClient

Main API client for interacting with SMLV platform.

#### Account Management

```php
// Create account
$account = $client->createAccount(
    'user@example.com',
    [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+1234567890',
        'external_id' => '12345',
    ]
);

// Get account
$account = $client->getAccount($accountReference);

// Update account
$client->updateAccount($accountReference, [
    'first_name' => 'Jane',
]);

// Close account
$client->closeAccount($accountReference, 'User requested closure');

// Reactivate account
$client->reactivateAccount($accountReference);

// Find account by email
$account = $client->findAccountByEmail('user@example.com');
```

#### Balance Operations

```php
// Get balance
$balance = $client->getBalance($accountReference);

// Sync balance (force refresh from SMLV)
$balance = $client->syncBalance($accountReference);
```

#### Transaction Management

```php
// Create transaction (debit/credit)
$transaction = $client->createTransaction($accountReference, [
    'type' => 'debit', // or 'credit'
    'amount' => 10.00,
    'description' => 'Monthly subscription',
    'metadata' => ['subscription_id' => 123],
]);

// Get transactions
$transactions = $client->getTransactions($accountReference, [
    'limit' => 10,
    'offset' => 0,
    'from' => '2024-01-01',
    'to' => '2024-12-31',
]);
```

#### Widget Authentication

```php
// Generate JWT token for widget
$token = $client->generateWidgetToken(
    $accountReference,
    'deposit',
    'https://your-app.com/return',
    ['theme' => 'dark']
);
```

### SmlvBalanceChecker

Helper class for balance checking with caching.

```php
use Smlv\Sdk\SmlvBalanceChecker;

$checker = new SmlvBalanceChecker($client, [
    'cache_ttl' => 300, // Cache for 5 minutes
]);

// Check if has any balance
$hasBalance = $checker->hasBalance($accountReference);

// Get current balance (cached)
$balance = $checker->getBalance($accountReference);

// Check if can afford specific amount
$canAfford = $checker->canAfford($accountReference, 10.00);

// Deduct balance
$checker->deductBalance($accountReference, 9.99, [
    'description' => 'Subscription payment',
]);

// Add balance
$checker->addBalance($accountReference, 5.00, [
    'description' => 'Refund',
]);

// Sync balance (bypass cache)
$balance = $checker->syncBalance($accountReference);

// Clear cache
$checker->clearCache($accountReference);
```

### SmlvWidgetGenerator

Generate HTML for embedding SMLV widgets.

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$generator = new SmlvWidgetGenerator($client, 'https://widget.smlv.com');

// Deposit widget (payment form)
$html = $generator->generateDepositWidget(
    $accountReference,
    'https://your-app.com/return',
    [
        'width' => '600px',
        'height' => '500px',
        'theme' => 'light', // or 'dark'
        'language' => 'en',
        'responsive' => false,
    ]
);

// Balance widget (compact display)
$html = $generator->generateBalanceWidget($accountReference, [
    'width' => '400px',
    'height' => '200px',
]);

// Transactions widget (history)
$html = $generator->generateTransactionsWidget($accountReference, [
    'width' => '800px',
    'height' => '600px',
]);

// Management widget (account settings)
$html = $generator->generateManagementWidget($accountReference, [
    'width' => '700px',
    'height' => '400px',
]);

// Get widget URL (for direct link)
$url = $generator->generateWidgetUrl(
    $accountReference,
    'deposit',
    'https://your-app.com/return'
);
```

### SmlvWebhookHandler

Handle incoming webhooks from SMLV platform.

```php
use Smlv\Sdk\SmlvWebhookHandler;

$handler = new SmlvWebhookHandler($apiSecret);

// Get webhook data
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SMLV_SIGNATURE'];
$timestamp = $_SERVER['HTTP_X_SMLV_TIMESTAMP'];

// Verify and parse
$data = $handler->handle($payload, $signature, $timestamp);

// Process event
switch ($data['event']) {
    case 'account.created':
        // Handle account creation
        break;
    case 'balance.updated':
        // Handle balance update
        break;
    case 'transaction.completed':
        // Handle transaction completion
        break;
}
```

## Widget Embedding

### Widget Types

1. **Deposit Widget** - Payment form with multiple payment methods
2. **Balance Widget** - Compact balance display
3. **Transactions Widget** - Full transaction history
4. **Management Widget** - Account settings and management

### Widget Options

```php
$options = [
    'width' => '600px',        // Widget width
    'height' => '500px',       // Widget height
    'theme' => 'light',        // 'light' or 'dark'
    'language' => 'en',        // Widget language (en, es, fr, etc.)
    'responsive' => false,     // Wrap in responsive container
    'border_radius' => '8px',  // Custom border radius
];
```

### Responsive Widgets

```php
// Automatically adjust to container size
$html = $generator->generateDepositWidget($accountReference, $returnUrl, [
    'responsive' => true,
]);
```

### Custom Styling

```html
<style>
	.smlv-widget {
		border: 1px solid #ddd;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.smlv-widget-responsive {
		max-width: 800px;
		margin: 0 auto;
	}
</style>
```

## Webhook Handling

### Webhook Events

- `account.created` - New account created
- `account.updated` - Account information updated
- `account.closed` - Account closed
- `balance.updated` - Balance changed
- `transaction.pending` - Transaction initiated
- `transaction.completed` - Transaction successful
- `transaction.failed` - Transaction failed
- `transaction.reversed` - Transaction reversed/refunded

### Event Payload Structure

```json
{
	"event": "balance.updated",
	"timestamp": 1234567890,
	"data": {
		"reference": "acc_abc123",
		"balance": 50.0,
		"previous_balance": 40.0
	}
}
```

### Webhook Security

Webhooks are signed with HMAC-SHA256:

```
X-SMLV-Signature: sha256=abc123...
X-SMLV-Timestamp: 1234567890
```

The SDK automatically verifies signatures and rejects replayed requests (>5 min old).

### Example Webhook Handler

```php
use Smlv\Sdk\SmlvWebhookHandler;
use Smlv\Sdk\Exceptions\SmlvException;

try {
    $handler = new SmlvWebhookHandler($apiSecret);
    $data = $handler->handle(
        file_get_contents('php://input'),
        $_SERVER['HTTP_X_SMLV_SIGNATURE'],
        $_SERVER['HTTP_X_SMLV_TIMESTAMP']
    );

    // Process event
    processWebhookEvent($data);

    http_response_code(200);
    echo json_encode(['status' => 'success']);

} catch (SmlvException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

## Balance Checking

### Middleware Pattern

Protect routes/actions that require balance:

```php
// Before action
if (!$balanceChecker->hasBalance($accountReference)) {
    return redirect('/billing/deposit');
}

// Check minimum amount
if (!$balanceChecker->canAfford($accountReference, 10.00)) {
    return error('Insufficient balance. Minimum $10.00 required.');
}
```

### Caching

Balance is cached in-memory to reduce API calls:

```php
$checker = new SmlvBalanceChecker($client, [
    'cache_ttl' => 300, // Cache for 5 minutes
]);

// First call hits API
$balance1 = $checker->getBalance($accountReference);

// Second call uses cache (within 5 min)
$balance2 = $checker->getBalance($accountReference);

// Force refresh
$balance3 = $checker->syncBalance($accountReference);
```

Cache is automatically cleared after transactions:

```php
// This clears cache automatically
$checker->deductBalance($accountReference, 10.00);
```

## Advanced Usage

### Error Handling

```php
use Smlv\Sdk\Exceptions\SmlvException;
use Smlv\Sdk\Exceptions\SmlvApiException;
use Smlv\Sdk\Exceptions\SmlvAuthException;
use Smlv\Sdk\Exceptions\SmlvValidationException;

try {
    $account = $client->createAccount($email);
} catch (SmlvValidationException $e) {
    // Invalid input data
    echo "Validation error: " . $e->getMessage();
} catch (SmlvAuthException $e) {
    // Invalid API credentials
    echo "Auth error: " . $e->getMessage();
} catch (SmlvApiException $e) {
    // API returned error
    echo "API error: " . $e->getMessage();
} catch (SmlvException $e) {
    // General SDK error
    echo "Error: " . $e->getMessage();
}
```

### Custom HTTP Client

```php
// Override HTTP client for testing or custom behavior
class MyHttpClient extends \Smlv\Sdk\SmlvClient {
    protected function makeRequest($method, $endpoint, $data = []) {
        // Custom HTTP logic
    }
}
```

### Transaction Metadata

Store custom data with transactions:

```php
$checker->deductBalance($accountReference, 9.99, [
    'description' => 'Premium subscription',
    'metadata' => [
        'subscription_id' => 123,
        'plan' => 'premium',
        'billing_cycle' => 'monthly',
    ],
]);
```

## Security

### API Authentication

All API requests are signed with HMAC-SHA256:

```
X-API-Key: your-api-key
X-Signature: sha256=abc123...
X-Timestamp: 1234567890
```

### Widget Authentication

Widgets use JWT tokens with expiration:

```php
$token = $client->generateWidgetToken(
    $accountReference,
    'deposit',
    $returnUrl,
    ['exp' => time() + 3600] // 1 hour expiration
);
```

### Webhook Verification

Webhooks must be verified:

```php
$handler->verify($payload, $signature, $timestamp);
// Throws SmlvAuthException if invalid
```

### Best Practices

1. **Never expose API secret** - Keep it in environment variables
2. **Verify all webhooks** - Always use signature verification
3. **Use HTTPS** - All API calls must use HTTPS
4. **Validate input** - Sanitize user input before API calls
5. **Handle errors** - Always catch and handle exceptions
6. **Cache balances** - Use caching to reduce API calls
7. **Log webhooks** - Keep audit trail of webhook events

## Testing

### Test Mode

SMLV provides test API credentials:

```php
$client = new SmlvClient(
    'test_key_abc123',
    'test_secret_xyz789',
    'https://api-sandbox.smlv.com'
);
```

### Mock Webhooks

Test webhook handling locally:

```bash
curl -X POST http://localhost/webhook \
  -H "Content-Type: application/json" \
  -H "X-SMLV-Signature: sha256=..." \
  -H "X-SMLV-Timestamp: 1234567890" \
  -d '{"event":"balance.updated","data":{...}}'
```

### Unit Tests

```php
use PHPUnit\Framework\TestCase;
use Smlv\Sdk\SmlvClient;

class SmlvIntegrationTest extends TestCase
{
    public function testCreateAccount()
    {
        $client = new SmlvClient('test_key', 'test_secret', 'https://api-sandbox.smlv.com');
        $account = $client->createAccount('test@example.com');

        $this->assertNotEmpty($account['reference']);
        $this->assertEquals('test@example.com', $account['email']);
    }
}
```

## Troubleshooting

### Common Issues

**"Invalid signature" error**

- Check that API secret is correct
- Ensure timestamp is within 5 minutes
- Verify payload hasn't been modified

**"Account not found" error**

- Check that account reference is stored correctly
- Ensure account wasn't closed or deleted
- Try searching by email with `findAccountByEmail()`

**Widget not loading**

- Check JWT token is valid and not expired
- Ensure widget URL is accessible
- Check browser console for CORS errors

**Balance always zero**

- Check that webhooks are configured correctly
- Manually sync balance with `syncBalance()`
- Verify transactions completed successfully

### Debug Mode

Enable logging for debugging:

```php
$client = new SmlvClient($apiKey, $apiSecret);
$client->setDebug(true); // Logs all API requests

// Now all requests are logged
$account = $client->getAccount($reference);
```

### Support

- **Documentation**: https://docs.smlv.com
- **Email**: support@smlv.com
- **GitHub**: https://github.com/smlv/sdk
- **Status**: https://status.smlv.com

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions welcome! Please submit pull requests to https://github.com/smlv/sdk

---

**Happy coding! 🚀**
