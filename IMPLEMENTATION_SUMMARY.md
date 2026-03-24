# SMLV SDK — Implementation Summary

> Last updated: v2.2.x  
> This document reflects the **current** state of the SDK and its integration in eGram.

---

## Implemented Components

### 1. Core SDK (`src/`)

| File | Purpose |
| ---- | ------- |
| `SmlvClient.php` | Low-level HTTP client. Signs all requests with HMAC-SHA256. Account CRUD, balance, transactions, JWT token generation, webhook verification. |
| `SmlvBillingService.php` | High-level billing façade. `charge()`, `chargeByEmail()`, `resolveAccountByEmail()`, `hasBalance()`, `getBalance()`. In-memory email→accountRef cache per request. |
| `SmlvBalanceChecker.php` | Balance read/write with TTL caching (`Yii::$app->cache` in Yii2, static in plain PHP). `hasBalance()`, `canAfford()`, `deductBalance()`, `addBalance()`, `syncBalance()`. |
| `SmlvWidgetGenerator.php` | Generates self-contained HTML blocks (no iframe — DOM-rendered since v2.0). Widget types: `deposit`, `balance`, `mini`, `transactions`, `management`, `account`. |
| `SmlvWebhookHandler.php` | Verifies HMAC-SHA256 webhook signatures, validates timestamp (5-min anti-replay), parses payload. |

**Exception hierarchy** (`src/Exceptions/`):

- `SmlvException` — base
- `SmlvApiException` — 4xx / 5xx from API
- `SmlvAuthException` — authentication failures
- `SmlvValidationException` — invalid input

---

### 2. Yii2 Integration (`src/Yii2/`)

| File | Purpose |
| ---- | ------- |
| `SmlvComponent.php` | Yii2 Application Component. Lazy-initializes `client`, `billing`, `balanceChecker`, `widgetGenerator`, `webhookHandler`. |
| `SmlvChargeBehavior.php` | AR Behavior. Fires on `EVENT_BEFORE_INSERT` (balance pre-check) and `EVENT_AFTER_INSERT` (actual charge). Everything via callables — no interface required. |
| `SmlvBalanceWidget.php` | Yii2 Widget. Wraps `SmlvWidgetGenerator` with auto language detection and deposit-URL generation. Default type: `mini`. |
| `SmlvBalanceFilter.php` | Action filter for controllers. Redirects or throws 402 when subscriber balance is insufficient. |

**`SmlvComponent` configuration properties:**

| Property | Default | Description |
| -------- | ------- | ----------- |
| `apiKey` | — | Public API key (required) |
| `apiSecret` | — | Secret signing key (required) |
| `apiUrl` | `'https://api.smlvcoin.com'` | REST API base URL |
| `widgetUrl` | `'https://cdn.smlvcoin.com'` | CDN base URL for widget script |
| `appUrl` | `'https://smlvcoin.com'` | App base URL; used by `generateDepositUrl()` |
| `widgetSecret` | — | HMAC secret for widget JWT signing |
| `widgetScriptVersion` | `'v2.2'` | CDN subfolder version path |
| `balanceCacheTtl` | `300` | Balance cache TTL in seconds |
| `currency` | `'SMLV'` | Default transaction currency |

**Magic property shortcuts on the component:**

```php
Yii::$app->smlv->billing          // SmlvBillingService
Yii::$app->smlv->balanceChecker   // SmlvBalanceChecker
Yii::$app->smlv->widgetGenerator  // SmlvWidgetGenerator
Yii::$app->smlv->webhookHandler   // SmlvWebhookHandler
Yii::$app->smlv->client           // SmlvClient
```

---

### 3. Laravel Integration (`src/Laravel/`)

`SmlvBalanceMiddleware` — route middleware that checks minimum balance before allowing access. Returns JSON 402 or redirects.

---

## Widget System (v2.0+)

Widgets are **DOM-rendered** — the CDN script (`smlv-widget.js`) injects a UI block directly into the page. **No iframe.**

| Type | Description | Account required? |
| ---- | ----------- | ----------------- |
| `deposit` | Currency → address → copy flow | Auto-resolves |
| `balance` | Balance grid + optional Sync | Auto-resolves |
| `mini` | Single-line inline bar + `+` deposit button | No (direct `/balance` fetch) |
| `transactions` | Paginated transaction history | Auto-resolves |
| `management` | 3-tab CRUD: Overview / Edit / Danger Zone | Auto-resolves |
| `account` | Auto-detects: "Create account" OR 4-tab dashboard | No (handles both states) |

Widget flow: PHP generates a signed JWT token → injects `<div data-smlv>` + inline `<script>` → CDN JS picks it up from `window._smlvQueue` → renders into the div.

---

## Opt-in Architecture (no DB field required)

**SMLV account existence = billing opt-in.** The SaaS never stores `smlv_account_reference` in its own DB.

```
Subscriber creates SMLV account (via `account` widget)
  → their email is linked in SMLV

On next billable event
  → SaaS calls resolveAccountByEmail(email)
  → found?  charge SMLV
  : not found?  issue bank invoice
```

`resolveAccountByEmail()` returns `null` for unknown emails (404 = "not opted in"). This is the guard used in `SmlvChargeableTrait::getChargeAmount()` in eGram.

---

## Auto-charge Pattern (eGram)

eGram wraps `SmlvChargeBehavior` in a **shared trait** (`common\traits\smlv\SmlvChargeableTrait`) so individual models only implement one abstract method:

```php
// common/models/bill/Bill.php
class Bill extends BaseDoc
{
    use SmlvChargeableTrait;

    public function behaviors(): array
    {
        return ArrayHelper::merge(parent::behaviors(), [
            'smlvCharge' => $this->smlvBehaviorConfig(),  // ← from trait
        ]);
    }

    // Only method to implement — all other charge logic is in the trait
    protected function getSmlvActionType(): ?string
    {
        return $this->doc_type === 'job_request'
            ? SmlvPricelist::TYPE_ORDER
            : SmlvPricelist::TYPE_BILL;
    }
}
```

The trait handles: email resolution via `Abonent` model, opt-in guard, EUR price from `SmlvPricelist`, EUR→SMLV rate conversion (cached 1 h), description and metadata.

---

## Navbar Widget (eGram)

`SmlvBalanceWidget` (type `mini`) is embedded in `top-navbar.php`:

```php
echo \Smlv\Sdk\Yii2\SmlvBalanceWidget::widget([
    'subscriberId' => (string) $abonent->id,
    'email'        => $abonent->email,
    // widgetType = 'mini' by default
]);
```

Renders: `Balance: 1272.81 SMLV [+]` inline. The `+` button redirects to the SMLV deposit page via a signed JWT URL from `generateDepositUrl()`.

---

## Configuration (eGram `main-local.php`)

```php
'smlv' => [
    'class'        => \Smlv\Sdk\Yii2\SmlvComponent::class,
    'apiUrl'       => 'https://api.smlvcoin.com',
    'apiKey'       => 'pk_live_...',
    'apiSecret'    => 'sk_live_...',
    'widgetSecret' => 'ws_live_...',
    'widgetUrl'    => 'https://cdn.smlvcoin.com',
    'appUrl'       => 'https://smlvcoin.com',
],
```

---

## File Structure

```
packages/smlv-sdk/
├── composer.json
├── README.md
├── CHANGELOG.md
├── DEVELOPER_GUIDE.md
├── INTEGRATION_EXAMPLE.md
├── SECURITY.md
├── widget/
│   └── smlv-widget.js            # CDN widget script (DOM renderer)
└── src/
    ├── SmlvClient.php             # HTTP client + HMAC signing
    ├── SmlvBillingService.php     # Billing façade (charge, resolveAccountByEmail)
    ├── SmlvBalanceChecker.php     # Balance read/write + caching
    ├── SmlvWidgetGenerator.php    # HTML widget generation
    ├── SmlvWebhookHandler.php     # Webhook verification + parsing
    ├── Exceptions/
    │   ├── SmlvException.php
    │   ├── SmlvApiException.php
    │   ├── SmlvAuthException.php
    │   └── SmlvValidationException.php
    ├── Yii2/
    │   ├── SmlvComponent.php      # Yii2 app component
    │   ├── SmlvChargeBehavior.php # AR behavior (EVENT_AFTER_INSERT charge)
    │   ├── SmlvBalanceWidget.php  # Drop-in Yii2 widget (mini / balance / account)
    │   └── SmlvBalanceFilter.php  # Action filter for balance-gated controllers
    └── Laravel/
        └── SmlvBalanceMiddleware.php
```

---

## Features Delivered

✅ **Account Management** — CRUD, find by email / external ID, close, reactivate

✅ **Balance Operations** — real-time + cached; debit/credit; manual sync

✅ **Payment Processing** — deposit widget, transaction history, webhook notifications

✅ **DOM Widgets** (v2.0+) — `mini`, `balance`, `account`, `deposit`, `transactions`, `management`

✅ **Auto-charge Behavior** — `SmlvChargeBehavior` + wrapper-trait pattern, best-effort (never breaks AR save)

✅ **Opt-in without DB field** — account existence = opt-in; bank fallback when no account

✅ **Access Control** — `SmlvBalanceFilter` (Yii2), `SmlvBalanceMiddleware` (Laravel)

✅ **Security** — HMAC-SHA256 signing, JWT widgets, webhook verification, anti-replay

---

## Architecture Decisions

### DOM widgets (not iframe)
Since v2.0. The CDN script renders directly into the host page DOM. SaaS developers get native page integration and easier CSS customization. SMLV controls UI updates via CDN without requiring SDK updates.

### Opt-in via account existence (no DB field)
Eliminates the need for a migration in the SaaS DB. The email lookup to SMLV API acts as the gate. Result is cached in memory per request and in `Yii::$app->cache` (1 h) to minimize API calls.

### Wrapper trait pattern for auto-charge
`SmlvChargeableTrait` (in the SaaS, not in the SDK) centralizes email resolution, EUR→SMLV conversion, and the opt-in guard. Individual models only declare `getSmlvActionType()`. This keeps models thin while billing logic stays in one place.

### Silent fail for charges
`SmlvChargeBehavior` never breaks an AR save on API errors. Failures are logged to the `smlv` channel (`Yii::error(..., 'smlv')`). Billing is best-effort; reconciliation happens via webhooks and the SMLV dashboard.

---

## Testing Checklist

- [ ] `composer require smlv/sdk` — no extra migration needed
- [ ] Configure component in `main-local.php` (apiKey, apiSecret, widgetSecret, widgetUrl, appUrl)
- [ ] Embed `SmlvBalanceWidget` (mini) in navbar
- [ ] Embed `SmlvBalanceWidget` (account) on subscriber page — test "Create account" flow
- [ ] Add `SmlvChargeableTrait` to a billable model, implement `getSmlvActionType()`
- [ ] Verify charge fires on model save when subscriber has SMLV account
- [ ] Verify charge is skipped (bank invoice logic runs) when subscriber has no SMLV account
- [ ] Test `+` button → deposit redirect URL → return to app
- [ ] Verify balance updates in mini widget after deposit
- [ ] Check `Yii::error` log on API failure — confirm AR save still succeeds

## Next Steps

### For other SaaS platforms

1. `composer require smlv/sdk`
2. Config: `apiKey`, `apiSecret`, `widgetSecret`, `widgetUrl`, `appUrl`
3. No DB migration needed
4. Embed `account` widget on subscriber page (handles "Create account" + dashboard in one widget)
5. Add `SmlvChargeBehavior` to billable models (or create a wrapper trait)
6. Optional: add webhook endpoint for balance-change events
3. Add 1 database field for account reference
4. Configure SDK client with API credentials
5. Apply middleware to protected routes
6. Add webhook endpoint
7. Embed widgets in billing views
8. Test and deploy


---

## Security

- API credentials stored outside VCS (environment variables / `main-local.php`)
- All API requests signed HMAC-SHA256; timestamp validates anti-replay
- Widget JWTs: HS256, TTL 900 s, one-time `jti` enforced server-side
- Webhook signatures verified before payload processing; 5-min timestamp window
- TLS 1.2+ required
- Widget tokens injected into inline `<script>`  never in URL / query string

## Maintenance

### Updating SDK

```bash
composer update smlv/sdk
```

### Monitoring

- `Yii::error(..., 'smlv')` channel for charge failures
- Monitor `resolveAccountByEmail()` miss rate (indicates opt-out or email mismatch)
- Verify webhook signature failures in API logs
