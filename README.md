# SMLV SDK

PHP SDK for integrating SMLV billing into your SaaS application.

> **v2.0.0** — The widget now renders directly into your page DOM (no iframe). Account creation and management are handled fully inside the widget — no extra server-side code required from SaaS developers.

## Features

- **Zero account management** — widget auto-resolves or creates the user account on first load
- **No iframe** — widget renders as native DOM elements, fully styleable
- **Secure JWT** — short-lived signed tokens (900 s), never exposed in URLs
- **Full CRUD widget** — Deposit / Balance / Transactions / Account management tabs
- **Headless API** — use `SmlvClient` directly for server-side automation
- **Framework agnostic** — plain PHP, Laravel, Yii2, Symfony

## Requirements

- PHP 7.4+
- `firebase/php-jwt` ^6.0

## Installation

```bash
composer require smlv/sdk
```

## Quick Start

### 1. Configure `.env`

```dotenv
SMLV_API_URL=https://api.smlv.com
SMLV_API_KEY=your-api-key
SMLV_API_SECRET=your-api-secret
SMLV_WIDGET_SECRET=your-widget-secret
```

### 2. Initialize the client

```php
use Smlv\Sdk\SmlvClient;

$smlv = new SmlvClient(
    apiKey:    getenv('SMLV_API_KEY'),
    apiSecret: getenv('SMLV_API_SECRET'),
    apiUrl:    getenv('SMLV_API_URL'),
    widgetSecret: getenv('SMLV_WIDGET_SECRET')
);
```

### 3. Embed a widget

That is literally all you need to show a full billing UI to your user:

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widget = new SmlvWidgetGenerator($smlv);

// $user->id  — your internal user ID (any string/int)
// $user->email — user's e-mail

echo $widget->generateDepositWidget(
    externalUserId: (string) $user->id,
    email:          $user->email,
    returnUrl:      'https://your-app.com/billing'
);
```

The widget will:

1. Load the SMLV JS bundle from CDN
2. Resolve the user's SMLV account (or show a creation form on first visit)
3. Render the deposit UI directly in your page

**No database column, no `createAccount()` call, no extra routes required.**

## Widget Types

```php
// Deposit funds
echo $widget->generateDepositWidget($userId, $email, $returnUrl, $options);

// Balance overview + sync
echo $widget->generateBalanceWidget($userId, $email, $options);

// Paginated transaction history
echo $widget->generateTransactionsWidget($userId, $email, $options);

// Full account management (overview / edit / danger zone)
echo $widget->generateManagementWidget($userId, $email, $options);
```

All methods return a self-contained HTML snippet:

```html
<div id="smlv-widget-xxxxxxxx" data-smlv></div>
<script src="https://cdn.smlv.com/v2/smlv-widget.js" async></script>
<script>
	window._smlvQueue = window._smlvQueue || [];
	window._smlvQueue.push({
		token: 'eyJ...',
		selector: '#smlv-widget-xxxxxxxx',
		type: 'deposit',
		options: {},
	});
</script>
```

## Options

### Common options

| Key        | Type     | Default   | Description           |
| ---------- | -------- | --------- | --------------------- |
| `theme`    | `string` | `'light'` | `'light'` or `'dark'` |
| `language` | `string` | `'en'`    | UI language code      |

### Deposit options

| Key                | Type       | Description                |
| ------------------ | ---------- | -------------------------- |
| `currencies`       | `string[]` | Allowed currencies to show |
| `default_currency` | `string`   | Pre-selected currency      |

### Balance options

| Key         | Type   | Description                       |
| ----------- | ------ | --------------------------------- |
| `show_sync` | `bool` | Show Sync button (default `true`) |

### JS callbacks (inline `<script>` pattern)

```js
window._smlvQueue = window._smlvQueue || [];
window._smlvQueue.push({
  token:    '<?= $widget->generateToken($userId, $email, 'deposit') ?>',
  selector: '#my-widget',
  type:     'deposit',
  options: {
    theme: 'dark',
    onReady:   function(instance) { console.log('ready'); },
    onSuccess: function(data)     { location.reload(); },
    onError:   function(err)      { console.error(err); },
    onClose:   function()         { console.log('closed'); },
  }
});
```

## Headless API (`SmlvClient`)

Use `SmlvClient` directly for server-side operations — background sync, webhooks, reporting, etc.

```php
// Account
$account = $smlv->createAccount($email, ['first_name' => 'John', 'external_id' => '42']);
$account = $smlv->getAccount($accountReference);
$smlv->updateAccount($accountReference, ['last_name' => 'Doe']);
$smlv->closeAccount($accountReference);
$smlv->reactivateAccount($accountReference);

// Balance
$balance = $smlv->getBalance($accountReference);
$smlv->syncBalance($accountReference);

// Transactions
$smlv->createTransaction($accountReference, ['amount' => 50, 'currency' => 'USD']);
$txns = $smlv->getTransactions($accountReference, ['page' => 1, 'per_page' => 20]);

// Lookup
$account = $smlv->findAccountByEmail($email);
```

## Webhook Handling

```php
use Smlv\Sdk\SmlvWebhookHandler;

$handler = new SmlvWebhookHandler($smlv);

try {
    $event = $handler->handle($_POST, $_SERVER['HTTP_X_SMLV_SIGNATURE'] ?? '');

    match ($event['type']) {
        'balance.updated'       => syncUserBalance($event),
        'transaction.completed' => logTransaction($event),
        default                 => null,
    };

    http_response_code(200);
} catch (\Exception $e) {
    http_response_code(400);
    echo $e->getMessage();
}
```

### Webhook events

| Event                   | Payload fields                                    |
| ----------------------- | ------------------------------------------------- |
| `account.created`       | `account_reference`, `status`                     |
| `account.closed`        | `account_reference`                               |
| `balance.updated`       | `account_reference`, `old_balance`, `new_balance` |
| `transaction.pending`   | `transaction_id`, `amount`, `type`                |
| `transaction.completed` | `transaction_id`, `amount`, `type`, `balance`     |
| `transaction.failed`    | `transaction_id`, `error`                         |

## Framework Integration

### Laravel

```php
// config/services.php
'smlv' => [
    'api_url'       => env('SMLV_API_URL'),
    'api_key'       => env('SMLV_API_KEY'),
    'api_secret'    => env('SMLV_API_SECRET'),
    'widget_secret' => env('SMLV_WIDGET_SECRET'),
],

// AppServiceProvider::register()
$this->app->singleton(SmlvClient::class, fn() => new SmlvClient(
    config('services.smlv.api_key'),
    config('services.smlv.api_secret'),
    config('services.smlv.api_url'),
    config('services.smlv.widget_secret'),
));
```

### Yii2

```php
// config/web.php
'components' => [
    'smlv' => [
        'class'         => \Smlv\Sdk\Yii2\SmlvComponent::class,
        'apiUrl'        => getenv('SMLV_API_URL'),
        'apiKey'        => getenv('SMLV_API_KEY'),
        'apiSecret'     => getenv('SMLV_API_SECRET'),
        'widgetSecret'  => getenv('SMLV_WIDGET_SECRET'),
    ],
],

// In a controller/view
echo Yii::$app->smlv->widget->generateDepositWidget(
    Yii::$app->user->id,
    Yii::$app->user->identity->email,
    Yii::$app->urlManager->createAbsoluteUrl(['/billing/success'])
);
```

## Generating Snippets Separately

```php
// CDN <script> tag only (place in <head> or before </body>)
echo $widget->buildScriptTag();          // async
echo $widget->buildScriptTag(defer: true); // defer

// Inline init only (place after the <div>)
echo $widget->generateInitSnippet(
    externalUserId: $userId,
    email:          $email,
    widgetType:     'balance',
    options:        ['theme' => 'dark'],
    selector:       '#my-balance-widget'
);

// Signed JWT token only (for manual JS queue push)
$token = $widget->generateToken($userId, $email, 'deposit');
```

## Security

- All API requests are signed with HMAC-SHA256 (`X-API-Key`, `X-Signature`, `X-Timestamp`)
- Widget JWTs: HS256, TTL 900 s, one-time `jti` claim enforced by the server
- Tokens are injected into an inline `<script>` block — never in a URL or query string
- Webhook signatures verified before payload processing
- TLS 1.2+ required

## Testing

```bash
cd packages/smlv-sdk
composer install
composer test
```

## Support

- Documentation: https://docs.smlv.com
- API Reference: https://api.smlv.com/docs
- Issues: https://github.com/smlv/sdk/issues
- Email: support@smlv.com

## License

MIT — see [LICENSE](LICENSE)
