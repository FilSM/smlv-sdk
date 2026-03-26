# SMLV SDK

PHP SDK for integrating SMLV billing into your SaaS application.

> **v2.2** — The widget now renders directly into your page DOM (no iframe). Account creation and management are handled fully inside the widget — no extra server-side code required from SaaS developers.

## Features

- **Zero account management** — widget auto-resolves or creates the user account on first load
- **No iframe** — widget renders as native DOM elements, fully styleable
- **Secure JWT** — short-lived signed tokens (900 s), never exposed in URLs
- **Full CRUD widget** — Deposit / Balance / Transactions / Account management tabs
- **Headless API** — use `SmlvClient` directly for server-side automation
- **Framework agnostic** — plain PHP, Laravel, Yii2, Symfony

## Requirements

- PHP 7.4+
- `firebase/php-jwt` ^6.0 || ^7.0

## Installation

```bash
composer require smlv/sdk
```

## Quick Start

### 1. Initialize the client

```php
use Smlv\Sdk\SmlvClient;

$smlv = new SmlvClient([
    'api_url'       => 'https://api.smlvcoin.com',
    'api_key'       => 'your-api-key',
    'api_secret'    => 'your-api-secret',
    'widget_secret' => 'your-widget-secret',
]);
```

> Keep credentials in a config file that is excluded from version control (e.g. `main-local.php` in Yii2, `services.php` in Laravel). **Never commit real keys to git.**

### 3. Embed a widget

That is literally all you need to show a full billing UI to your user:

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widget = new SmlvWidgetGenerator($smlv);

// $subscriber->id — the subscriber ID in your system.
// One user may have multiple subscribers — pass the subscriber ID, not the user ID!
//
// email — optional, used only to pre-fill the account creation form on first visit.
// Recommended order: 1) main contact email of the subscriber, 2) current user's email.
// If email is unknown — pass an empty string.

echo $widget->generateDepositWidget(
    externalSubscriberId: (string) $subscriber->id,
    email:                $subscriber->contactEmail ?? $currentUser->email ?? '',
    returnUrl:            'https://your-app.com/billing'
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
echo $widget->generateDepositWidget($subscriber->id, $email, $returnUrl, $options);

// Balance overview + sync
echo $widget->generateBalanceWidget($subscriber->id, $email, $options);

// Mini inline bar — balance + ⊕ deposit button (ideal for navbars)
echo $widget->generateMiniWidget($subscriber->id, $email, $options);

// Paginated transaction history
echo $widget->generateTransactionsWidget($subscriber->id, $email, $options);

// Full account management (overview / edit / danger zone)
echo $widget->generateManagementWidget($subscriber->id, $email, $options);

// Unified widget: "Create account" OR 4-tab dashboard (Balance | Transactions | Overview | Danger Zone)
echo $widget->generateAccountWidget($subscriber->id, $email, $options);
```

| Type           | Best for                 | Account required? |
| -------------- | ------------------------ | ----------------- |
| `deposit`      | Standalone deposit page  | Auto-resolves     |
| `balance`      | Balance panel / sidebar  | Auto-resolves     |
| `mini`         | Top navbar inline bar    | No (direct fetch) |
| `transactions` | Transaction history page | Auto-resolves     |
| `management`   | Account settings page    | Auto-resolves     |
| `account`      | Subscriber detail page   | No (handles both) |

All methods return a self-contained HTML snippet:

```html
<div id="smlv-widget-xxxxxxxx" data-smlv></div>
<script src="https://cdn.smlvcoin.com/v2.2/smlv-widget.js" async></script>
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
  token:    '<?= $widget->generateToken($subscriber->id, $email, 'deposit') ?>',
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
    'api_url'       => env('SMLV_API_URL', 'https://api.smlvcoin.com'),
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
// common/config/main-local.php  ← already in .gitignore
'components' => [
    'smlv' => [
        'class'        => \Smlv\Sdk\Yii2\SmlvComponent::class,
        'apiUrl'       => 'https://api.smlvcoin.com',
        'apiKey'       => 'pk_live_xxxxxxxxxxxx',
        'apiSecret'    => 'sk_live_xxxxxxxxxxxx',
        'widgetSecret' => 'ws_live_xxxxxxxxxxxx',
        'widgetUrl'    => 'https://cdn.smlvcoin.com',   // CDN base URL
        'appUrl'       => 'https://smlvcoin.com',       // used by generateDepositUrl()
        // 'widgetScriptVersion' => 'v2.2',             // override CDN version (optional)
    ],
],
```

> `main-local.php` is generated from `environments/` and is listed in `.gitignore` by default in the Yii2 advanced template — safe for secrets.

**Embed a widget in a view:**

```php
// Full account management widget (subscriber detail page)
echo Yii::$app->smlv->widgetGenerator->generateAccountWidget(
    (string) $subscriber->id,
    $subscriber->email,
    ['prefill' => ['account_type' => 'legal']]
);
```

**Drop-in Yii2 widget class (`SmlvBalanceWidget`):**

For even simpler embedding use the bundled Yii2 Widget class — no generator calls needed:

```php
// Minimal navbar widget (default widgetType = 'mini')
echo \Smlv\Sdk\Yii2\SmlvBalanceWidget::widget([
    'subscriberId' => (string) $abonent->id,
    'email'        => $abonent->email,
]);

// Full account widget for subscriber page
echo \Smlv\Sdk\Yii2\SmlvBalanceWidget::widget([
    'subscriberId' => (string) $abonent->id,
    'email'        => $abonent->email,
    'widgetType'   => 'account',
    'prefill'      => ['account_type' => 'legal'],
]);
```

| Property        | Type     | Default   | Description                                   |
| --------------- | -------- | --------- | --------------------------------------------- |
| `subscriberId`  | `string` | `''`      | Subscriber ID in your system                  |
| `email`         | `string` | `''`      | Subscriber e-mail                             |
| `widgetType`    | `string` | `'mini'`  | `'mini'` \| `'balance'` \| `'account'`        |
| `compact`       | `bool`   | `false`   | Adds `smlv-widget-compact` CSS class          |
| `theme`         | `string` | `'light'` | `'light'` or `'dark'`                         |
| `language`      | `string` | auto      | BCP-47 tag; defaults to `Yii::$app->language` |
| `prefill`       | `array`  | `[]`      | `first_name`, `last_name`, `account_type`     |
| `widgetOptions` | `array`  | `[]`      | Extra options forwarded to the generator      |

The `mini` type automatically generates a deposit redirect URL via `generateDepositUrl()` — no extra config needed.

**Generate a deposit redirect URL (server-side):**

```php
$depositUrl = Yii::$app->smlv->generateDepositUrl(
    (string) $subscriber->id,      // account reference
    Yii::$app->request->absoluteUrl // return URL after deposit
);
```

## Generating Snippets Separately

```php
// CDN <script> tag only (place in <head> or before </body>)
echo $widget->buildScriptTag();          // async
echo $widget->buildScriptTag(defer: true); // defer

// Inline init only (place after the <div>)
echo $widget->generateInitSnippet(
    externalSubscriberId: $subscriber->id,
    email:                $email,  // optional — see email sourcing note above
    type:                 'balance',
    options:              ['theme' => 'dark'],
    selector:             '#my-balance-widget'
);

// Signed JWT token only (for manual JS queue push)
$token = $widget->generateToken($subscriber->id, $email, 'deposit');
```

## Auto-charge Behavior (Yii2)

`SmlvChargeBehavior` deducts a deposit automatically every time a model is saved (`EVENT_AFTER_INSERT`). All data is provided via callables — **no interface implementation required** in your model.

### Option A — Raw behavior (simple cases)

```php
use Smlv\Sdk\Yii2\SmlvChargeBehavior;

class Order extends ActiveRecord
{
    public function behaviors(): array
    {
        return [
            'smlvCharge' => [
                'class'       => SmlvChargeBehavior::class,
                'email'       => fn() => $this->user->email,
                'amount'      => fn() => $this->subtotal * 0.02,   // e.g. 2% fee
                'description' => fn() => 'Order #' . $this->id,
                'metadata'    => fn() => [
                    'order_id' => $this->id,
                    'plan'     => $this->plan_name,
                ],
            ],
        ];
    }
}
```

### Option B — Wrapper trait (recommended for SaaS, eGram pattern)

For production SaaS apps, the recommended approach is to put all charge logic into a reusable **wrapper trait** in your own codebase.
This is exactly the pattern used in **eGram** via `common\traits\smlv\SmlvChargeableTrait`.

**The trait provides:**

- `smlvBehaviorConfig()` — returns ready `SmlvChargeBehavior` config to register in `behaviors()`
- `getChargeEmail()` — resolves subscriber email (main client contact → abonent admin user fallback)
- `getChargeAmount()` — converts EUR price from pricelist to SMLV; **returns `null` if the subscriber has no SMLV account** (opt-in guard: no account = fall back to bank billing)
- `getChargeDescription()` / `getChargeMetadata()` — human label + EUR/rate/SMLV metadata for reporting
- **abstract** `getSmlvActionType()` — the only method your model must implement

**In your trait:**

```php
// common/traits/smlv/SmlvChargeableTrait.php  (your SaaS code)
namespace common\traits\smlv;

use Smlv\Sdk\Yii2\SmlvChargeBehavior;

trait SmlvChargeableTrait
{
    protected function smlvBehaviorConfig(): array
    {
        return [
            'class'       => SmlvChargeBehavior::class,
            'email'       => fn() => $this->getChargeEmail(),
            'amount'      => fn() => $this->getChargeAmount(),
            'description' => fn() => $this->getChargeDescription(),
            'metadata'    => fn() => $this->getChargeMetadata(),
        ];
    }

    abstract protected function getSmlvActionType(): ?string;

    public function getChargeAmount(): ?float
    {
        // Opt-in guard: skip SMLV charge when the subscriber has no SMLV account
        // (returns null) — traditional bank billing will apply instead.
        $accountRef = Yii::$app->smlv->billing->resolveAccountByEmail($this->getChargeEmail());
        if ($accountRef === null) {
            return null;
        }

        $eurPrice = SmlvPricelist::getPriceFor($this->getSmlvActionType());
        $rate     = $this->fetchSmlvRate();

        return ($eurPrice && $rate > 0) ? round($eurPrice / $rate, 8) : null;
    }

    // ... getChargeEmail(), getChargeDescription(), getChargeMetadata(), fetchSmlvRate()
}
```

**In each model:**

```php
// common/models/bill/Bill.php
use common\traits\smlv\SmlvChargeableTrait;

class Bill extends BaseDoc
{
    use SmlvChargeableTrait;

    public function behaviors(): array
    {
        return ArrayHelper::merge(parent::behaviors(), [
            'smlvCharge' => $this->smlvBehaviorConfig(),
        ]);
    }

    // The only method you must implement — everything else is handled by the trait
    protected function getSmlvActionType(): ?string
    {
        return $this->doc_type === 'job_request'
            ? SmlvPricelist::TYPE_ORDER
            : SmlvPricelist::TYPE_BILL;
    }
}
```

**How the opt-in guard works:**

| Subscriber state        | `resolveAccountByEmail()` | Result                        |
| ----------------------- | ------------------------- | ----------------------------- |
| Has SMLV account        | returns account ref       | Charged in SMLV tokens        |
| No SMLV account         | returns `null`            | Skipped → bank invoice issued |
| `smlv` component absent | —                         | Skipped (CLI, test, dev)      |
| API error               | throws (caught)           | Skipped, warning logged       |

Errors are logged to `Yii::error(..., 'smlv')` and **never break the original AR save** — the charge is best-effort.

> **Tip:** All four `SmlvChargeBehavior` properties (`email`, `amount`, `description`, `metadata`) accept either a `callable` or a scalar value. Use callables when you need `$this` context.

---

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

- Documentation: https://docs.smlvcoin.com
- API Reference: https://api.smlvcoin.com/docs
- Issues: https://github.com/smlv/sdk/issues
- Email: support@smlvcoin.com

## License

MIT — see [LICENSE](LICENSE)
