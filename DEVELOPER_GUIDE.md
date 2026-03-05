# SMLV SDK Developer Guide

Complete reference for integrating SMLV billing into your SaaS application.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Architecture Overview](#architecture-overview)
4. [Quick Start](#quick-start)
5. [Widget Types & Options](#widget-types--options)
6. [Advanced Widget Usage](#advanced-widget-usage)
7. [Framework Integration](#framework-integration)
8. [Headless API (SmlvClient)](#headless-api-smlvclient)
9. [Webhook Handling](#webhook-handling)
10. [Security](#security)
11. [Testing](#testing)
12. [Migration from v1.x](#migration-from-v1x)
13. [Troubleshooting](#troubleshooting)

---

## Introduction

SMLV SDK allows any PHP SaaS to add crypto billing with **minimal integration effort**:

- Pass your user's `id` and `email` to a widget generator method — done.
- **No database changes** — no `smlv_account_reference` column.
- **No account management code** — the widget auto-creates the account on first visit.
- **No iframe** — widget renders as native DOM, fully styleable.
- Full account CRUD (overview, edit, deactivate, delete) lives inside the management widget.

---

## Installation

### Via Composer

```bash
composer require smlv/sdk
```

### Manual / local path

```json
// composer.json
{
	"repositories": [{ "type": "path", "url": "./packages/smlv-sdk" }],
	"require": {
		"smlv/sdk": "*"
	}
}
```

```bash
composer update smlv/sdk
```

### Requirements

| Dependency         | Minimum version |
| ------------------ | --------------- |
| PHP                | 7.4             |
| `firebase/php-jwt` | ^6.0            |
| OpenSSL extension  | any             |

---

## Architecture Overview

```
SaaS Server                    Browser                    SMLV Platform
──────────────                 ─────────────              ──────────────
SmlvClient           ────────→ API requests ────────────→ /v1/api/*
SmlvWidgetGenerator  ────────→ HTML snippet
                               ↓
                               <div data-smlv>  ←── smlv-widget.js (CDN)
                               ↓
                               POST /v1/widget/account/resolve  ──────→ SMLV
                               (or show create-account form)
                               ↓
                               Render deposit / balance / transactions / management
```

### JWT flow

1. Server generates a short-lived JWT (900 s, HS256) and injects it into an inline `<script>` block.
2. The CDN JS bundle reads the token from `window._smlvQueue`, never from the URL.
3. Every widget API call sends `Authorization: Bearer <jwt>`.
4. The server enforces one-time use via the `jti` claim.

---

## Quick Start

### 1. Set environment variables

```dotenv
SMLV_API_URL=https://api.smlvcoin.com
SMLV_API_KEY=pk_live_xxxxxxxxxxxx
SMLV_API_SECRET=sk_live_xxxxxxxxxxxx
SMLV_WIDGET_SECRET=ws_live_xxxxxxxxxxxx
```

### 2. Initialize client and generator

```php
use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvWidgetGenerator;

$smlv   = new SmlvClient(
    getenv('SMLV_API_KEY'),
    getenv('SMLV_API_SECRET'),
    getenv('SMLV_API_URL'),
    getenv('SMLV_WIDGET_SECRET')
);

$widget = new SmlvWidgetGenerator($smlv);
```

### 3. Render a widget

```php
// In your view / controller
echo $widget->generateDepositWidget(
    externalUserId: (string) $user->id,
    email:          $user->email,
    returnUrl:      'https://your-app.com/billing/success'
);
```

The output is a self-contained HTML block — no extra CSS or JS files needed in your layout.

---

## Widget Types & Options

### Methods

```php
// Deposit: currency selector → wallet address → copy
$html = $widget->generateDepositWidget(
    string $externalUserId,
    string $email,
    string $returnUrl = '',
    array  $options   = []
): string;

// Balance: grid display + optional Sync button
$html = $widget->generateBalanceWidget(
    string $externalUserId,
    string $email,
    array  $options = []
): string;

// Transactions: paginated table (prev / next)
$html = $widget->generateTransactionsWidget(
    string $externalUserId,
    string $email,
    array  $options = []
): string;

// Management: 3-tab CRUD (Overview | Edit | Danger Zone)
$html = $widget->generateManagementWidget(
    string $externalUserId,
    string $email,
    array  $options = []
): string;

// Generic embed (type = 'deposit' | 'balance' | 'transactions' | 'management')
$html = $widget->generateEmbed(
    string $externalUserId,
    string $email,
    string $type,
    array  $options = []
): string;
```

### Common options

| Key        | Type     | Default   | Description           |
| ---------- | -------- | --------- | --------------------- |
| `theme`    | `string` | `'light'` | `'light'` or `'dark'` |
| `language` | `string` | `'en'`    | UI language code      |

### Deposit-specific options

| Key                | Type       | Description                      |
| ------------------ | ---------- | -------------------------------- |
| `currencies`       | `string[]` | Allowed currencies (empty = all) |
| `default_currency` | `string`   | Pre-selected currency            |

### Balance-specific options

| Key         | Type   | Default | Description             |
| ----------- | ------ | ------- | ----------------------- |
| `show_sync` | `bool` | `true`  | Show / hide Sync button |

### Prefill data (passed to account creation form)

```php
$widget->generateDepositWidget($userId, $email, $returnUrl, [
    'theme'   => 'dark',
    'prefill' => [
        'first_name' => $user->firstName,
        'last_name'  => $user->lastName,
        'phone'      => $user->phone,
    ],
]);
```

---

## Advanced Widget Usage

### JS callbacks

Use `generateToken()` + manual queue push to attach JavaScript callbacks:

```php
$token = $widget->generateToken($userId, $email, 'deposit', ['theme' => 'dark']);
```

```html
<div id="my-deposit-widget" data-smlv></div>

<script src="https://cdn.smlvcoin.com/v2/smlv-widget.js" async></script>
<script>
	window._smlvQueue = window._smlvQueue || [];
	window._smlvQueue.push({
		token: '<?= htmlspecialchars($token) ?>',
		selector: '#my-deposit-widget',
		type: 'deposit',
		options: {
			theme: 'dark',
			onReady: function (instance) {
				console.log('Widget ready', instance);
			},
			onSuccess: function (data) {
				location.reload();
			},
			onError: function (err) {
				alert('Error: ' + err.message);
			},
			onClose: function () {
				console.log('Widget closed');
			},
		},
	});
</script>
```

### Separate script tag + init snippet

Place the CDN `<script>` in `<head>` and the init snippet at the widget location:

```php
// In <head>:
echo $widget->buildScriptTag();         // <script async src="...">
// or:
echo $widget->buildScriptTag(defer: true); // <script defer src="...">

// At widget location:
echo $widget->generateInitSnippet(
    externalUserId: $userId,
    email:          $email,
    widgetType:     'balance',
    options:        ['theme' => 'dark'],
    selector:       '#my-balance'
);
```

This is useful when loading multiple widgets on the same page — include the CDN script once and place multiple init snippets.

### Multiple widgets on one page

```php
// <head> — one CDN script
echo $widget->buildScriptTag();

// Widget 1
echo '<div id="widget-balance" data-smlv></div>';
echo $widget->generateInitSnippet($userId, $email, 'balance', [], '#widget-balance');

// Widget 2
echo '<div id="widget-txns" data-smlv></div>';
echo $widget->generateInitSnippet($userId, $email, 'transactions', [], '#widget-txns');
```

---

## Framework Integration

### Laravel

**Service binding:**

```php
// app/Providers/AppServiceProvider.php
use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvWidgetGenerator;

public function register(): void
{
    $this->app->singleton(SmlvClient::class, fn() => new SmlvClient(
        config('services.smlv.api_key'),
        config('services.smlv.api_secret'),
        config('services.smlv.api_url'),
        config('services.smlv.widget_secret'),
    ));

    $this->app->singleton(SmlvWidgetGenerator::class,
        fn($app) => new SmlvWidgetGenerator($app->make(SmlvClient::class))
    );
}
```

**Config:**

```php
// config/services.php
'smlv' => [
    'api_url'       => env('SMLV_API_URL'),
    'api_key'       => env('SMLV_API_KEY'),
    'api_secret'    => env('SMLV_API_SECRET'),
    'widget_secret' => env('SMLV_WIDGET_SECRET'),
],
```

**Controller:**

```php
use Smlv\Sdk\SmlvWidgetGenerator;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function index(Request $request, SmlvWidgetGenerator $widget)
    {
        $user = $request->user();

        return view('billing.index', [
            'deposit' => $widget->generateDepositWidget(
                (string) $user->id,
                $user->email,
                route('billing.success')
            ),
        ]);
    }
}
```

**Webhook route:**

```php
// routes/api.php
Route::post('/webhooks/smlv', [WebhookController::class, 'handle'])
    ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);
```

---

### Yii2

**Component:**

```php
// common/config/main.php
'components' => [
    'smlv' => [
        'class'        => \Smlv\Sdk\Yii2\SmlvComponent::class,
        'apiUrl'       => getenv('SMLV_API_URL'),
        'apiKey'       => getenv('SMLV_API_KEY'),
        'apiSecret'    => getenv('SMLV_API_SECRET'),
        'widgetSecret' => getenv('SMLV_WIDGET_SECRET'),
    ],
],
```

**Usage:**

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widget = new SmlvWidgetGenerator(Yii::$app->smlv->getClient());

echo $widget->generateManagementWidget(
    (string) Yii::$app->user->id,
    Yii::$app->user->identity->email
);
```

---

### Symfony

**Services config:**

```yaml
# config/services.yaml
parameters:
    smlv.api_url: '%env(SMLV_API_URL)%'
    smlv.api_key: '%env(SMLV_API_KEY)%'
    smlv.api_secret: '%env(SMLV_API_SECRET)%'
    smlv.widget_secret: '%env(SMLV_WIDGET_SECRET)%'

services:
    Smlv\Sdk\SmlvClient:
        arguments:
            $apiKey: '%smlv.api_key%'
            $apiSecret: '%smlv.api_secret%'
            $apiUrl: '%smlv.api_url%'
            $widgetSecret: '%smlv.widget_secret%'

    Smlv\Sdk\SmlvWidgetGenerator:
        arguments:
            $client: '@Smlv\Sdk\SmlvClient'
```

---

### Plain PHP

```php
require_once __DIR__ . '/vendor/autoload.php';

use Smlv\Sdk\SmlvClient;
use Smlv\Sdk\SmlvWidgetGenerator;

$smlv   = new SmlvClient($_ENV['SMLV_API_KEY'], $_ENV['SMLV_API_SECRET'], $_ENV['SMLV_API_URL'], $_ENV['SMLV_WIDGET_SECRET']);
$widget = new SmlvWidgetGenerator($smlv);

echo $widget->generateBalanceWidget($userId, $email);
```

---

## Headless API (SmlvClient)

For server-side operations: background jobs, admin panels, reporting.

### Account management

```php
// Create account
$account = $smlv->createAccount($email, [
    'first_name'  => 'John',
    'last_name'   => 'Doe',
    'external_id' => '42',   // your user ID
]);
$ref = $account['data']['account_reference'];

// Read
$account = $smlv->getAccount($ref);

// Update
$smlv->updateAccount($ref, ['last_name' => 'Smith']);

// Close (soft-delete)
$smlv->closeAccount($ref);

// Restore
$smlv->reactivateAccount($ref);

// Lookup by e-mail
$account = $smlv->findAccountByEmail('user@example.com');
```

### Balance

```php
$balance = $smlv->getBalance($ref);     // Returns balance data
$smlv->syncBalance($ref);               // Force sync from blockchain
```

### Transactions

```php
// Create outbound transaction
$smlv->createTransaction($ref, [
    'amount'      => 25.00,
    'currency'    => 'USDT',
    'description' => 'Subscription fee',
]);

// List with pagination
$result = $smlv->getTransactions($ref, [
    'page'     => 1,
    'per_page' => 20,
    'type'     => 'debit',
]);
```

### JWT token only (custom widget init)

```php
$token = $smlv->generateWidgetToken(
    externalUserId: $userId,
    email:          $email,
    widgetType:     'deposit',
    returnUrl:      'https://your-app.com/success',
    options:        ['theme' => 'dark'],
    prefill:        ['first_name' => 'John']
);
```

---

## Webhook Handling

### Setup

```php
use Smlv\Sdk\SmlvWebhookHandler;

$handler = new SmlvWebhookHandler($smlv);

try {
    $event = $handler->handle(
        payload:   json_decode(file_get_contents('php://input'), true),
        signature: $_SERVER['HTTP_X_SMLV_SIGNATURE'] ?? ''
    );

    // Process event
    match ($event['type']) {
        'balance.updated'       => handleBalanceUpdated($event),
        'transaction.completed' => handleTxCompleted($event),
        'account.closed'        => handleAccountClosed($event),
        default                 => null,
    };

    http_response_code(200);
    echo json_encode(['ok' => true]);
} catch (\Smlv\Sdk\Exceptions\SmlvAuthException $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
} catch (\Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

### Event reference

| Event type              | Key payload fields                                            |
| ----------------------- | ------------------------------------------------------------- |
| `account.created`       | `account_reference`, `status`                                 |
| `account.updated`       | `account_reference`, `changes`                                |
| `account.closed`        | `account_reference`                                           |
| `account.reactivated`   | `account_reference`                                           |
| `balance.updated`       | `account_reference`, `old_balance`, `new_balance`, `currency` |
| `transaction.pending`   | `transaction_id`, `amount`, `currency`, `type`                |
| `transaction.completed` | `transaction_id`, `amount`, `currency`, `type`, `balance`     |
| `transaction.failed`    | `transaction_id`, `error`, `error_code`                       |

### Retry policy

SMLV retries failed webhook deliveries with exponential back-off: 1 min → 5 min → 30 min → 2 h → 24 h.  
Always respond with HTTP 200 within 10 s; process asynchronously for long jobs.

---

## Security

### Request signing

Every `SmlvClient` API call is signed with HMAC-SHA256:

```
X-API-Key:   <api_key>
X-Timestamp: <unix_timestamp>
X-Signature: HMAC-SHA256(api_secret, "api_key\ntimestamp\nbody")
```

### Widget JWT

```json
{
	"external_user_id": "42",
	"email": "user@example.com",
	"widget_type": "deposit",
	"return_url": "https://your-app.com/success",
	"options": {},
	"prefill": {},
	"iat": 1717000000,
	"exp": 1717000900,
	"jti": "uuid-v4"
}
```

- TTL: **900 seconds** (15 minutes)
- `jti`: server enforces single-use — replay attack prevention
- Token injected into inline `<script>` — **never** in a URL parameter

### Webhook signatures

```
X-Smlv-Signature: HMAC-SHA256(webhook_secret, raw_body)
```

`SmlvWebhookHandler::handle()` verifies this automatically.

### Checklist

- [ ] Store secrets in environment variables, never in code
- [ ] Use HTTPS for all endpoints and webhook URLs
- [ ] Validate JWT TTL — generate it immediately before rendering the view
- [ ] Rotate API keys via the SMLV dashboard if compromised

---

## Testing

```bash
cd packages/smlv-sdk
composer install
composer test
```

For unit tests using a mock client:

```php
use Smlv\Sdk\SmlvClient;

$mockClient = $this->createMock(SmlvClient::class);
$mockClient->method('generateWidgetToken')->willReturn('eyJ...');

$widget = new SmlvWidgetGenerator($mockClient);
$html   = $widget->generateBalanceWidget('42', 'test@example.com');

$this->assertStringContainsString('data-smlv', $html);
$this->assertStringContainsString('smlv-widget.js', $html);
```

---

## Migration from v1.x

### What changed

| v1.x                                                   | v2.0                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `generateDepositWidget($accountReference, $returnUrl)` | `generateDepositWidget($externalUserId, $email, $returnUrl)` |
| Rendered `<iframe src="...?token=...">`                | Renders `<div>` + CDN `<script>` + inline init               |
| Token in URL query string                              | Token in inline `<script>` block                             |
| Required `smlv_account_reference` DB column            | No DB column needed                                          |
| SaaS called `createAccount()` on registration          | Widget auto-creates account on first visit                   |
| Management widget was read-only                        | Full CRUD (edit / deactivate / delete)                       |

### Migration steps

1. **Update composer**: change `"smlv/sdk": "^1.0"` → `"^2.0"`, run `composer update`.
2. **Update widget calls**: replace `$accountReference` with `$user->id, $user->email`.
3. **Remove `createAccount()` calls** from your registration flow — optional now (widget handles it).
4. **Remove `smlv_account_reference` column** from your DB migration once all accounts are resolved via the widget. (Existing data is not affected — the widget will resolve accounts by `external_id + email`.)
5. **Update your layout**: the widget no longer needs a sandboxed iframe context.

---

## Troubleshooting

### Widget doesn't load

- Check browser console for errors
- Verify CDN URL is reachable: `https://cdn.smlvcoin.com/v2/smlv-widget.js`
- Ensure the `<div data-smlv>` is in the DOM before the init script runs (or use `async` loading queue)

### "Invalid token" error in widget

- Check that `SMLV_WIDGET_SECRET` matches the secret configured in SMLV dashboard
- Check server clock — JWT `iat`/`exp` are time-sensitive; time skew > 5 min will fail
- Token TTL is 900 s — don't cache the HTML output; generate per-request

### Account creation form appears every time

- The widget resolves the account via `external_user_id + email`
- If `externalUserId` changes between requests (e.g. casted differently), a new account will be created
- Always pass the same stable string for the same user: `(string) $user->id` or `"user_{$user->id}"`

### Webhook signature mismatch

- Verify you're using the raw request body for HMAC computation (not parsed/re-encoded)
- Ensure `SMLV_WIDGET_SECRET` vs `SMLV_API_SECRET` are not swapped — webhooks use `webhook_secret`

### Proxy / CDN caching issues

- The generated HTML contains a unique `jti`-linked token — do not cache it at the HTTP layer
- Set `Cache-Control: no-store` or `private` on billing pages

---

For the complete API surface, see [README.md](README.md).  
For a full working example, see [INTEGRATION_EXAMPLE.md](INTEGRATION_EXAMPLE.md).
