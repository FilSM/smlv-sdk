# Integration Example

A complete working example of SMLV SDK integration into a PHP SaaS application.

## Tech stack

- **Framework**: Yii2 (same pattern applies to Laravel / Symfony)
- **DB**: PostgreSQL / MySQL — standard `users` table, **no extra columns needed**

---

## Step 1 — Install

```bash
composer require smlv/sdk
```

## Step 2 — Register SMLV component (Yii2)

Добавьте компонент в `common/config/main-local.php` (этот файл уже есть в `.gitignore` шаблона — безопасное место для секретов):

```php
// common/config/main-local.php
return [
    'components' => [
        'smlv' => [
            'class'        => \Smlv\Sdk\Yii2\SmlvComponent::class,
            'apiUrl'       => 'https://api.smlvcoin.com',
            'apiKey'       => 'pk_live_xxxxxxxxxxxx',
            'apiSecret'    => 'sk_live_xxxxxxxxxxxx',
            'widgetSecret' => 'ws_live_xxxxxxxxxxxx',
        ],
    ],
];
```

> Замените значения на реальные ключи из вашего SMLV личного кабинета. Не коммитьте `main-local.php` в репозиторий.

## Step 3 — Billing page controller

```php
// frontend/controllers/BillingController.php
namespace frontend\controllers;

use Smlv\Sdk\SmlvWidgetGenerator;
use yii\web\Controller;
use Yii;

class BillingController extends Controller
{
    public function actionIndex(): string
    {
        /** @var \Smlv\Sdk\SmlvClient $smlv */
        $smlv   = Yii::$app->smlv->getClient();
        $widget = new SmlvWidgetGenerator($smlv);

        // Абонент не хранит email напрямую. Стратегия получения email:
        // 1) email главного контакта (контактное лицо абонента)
        // 2) email текущего пользователя eGram
        // 3) пустая строка — виджет сам попросит ввести
        $subscriber = $this->loadCurrentSubscriber();
        $email = $subscriber->mainClient->clientMainContact->email
            ?? Yii::$app->user->identity->email
            ?? '';

        return $this->render('index', [
            'depositWidget'      => $widget->generateDepositWidget(
                (string) $subscriber->id,
                $email,
                Yii::$app->urlManager->createAbsoluteUrl(['/billing/success'])
            ),
            'balanceWidget'      => $widget->generateBalanceWidget(
                (string) $subscriber->id,
                $email
            ),
            'transactionsWidget' => $widget->generateTransactionsWidget(
                (string) $subscriber->id,
                $email
            ),
        ]);
    }

    public function actionSuccess(): string
    {
        return $this->render('success');
    }
}
```

## Step 4 — Billing view

```php
<!-- frontend/views/billing/index.php -->
<?php
/** @var string $depositWidget */
/** @var string $balanceWidget */
/** @var string $transactionsWidget */
?>

<div class="billing-page container">

    <h1>Billing</h1>

    <div class="row">
        <div class="col-md-6">
            <h3>Balance</h3>
            <?= $balanceWidget ?>
        </div>
        <div class="col-md-6">
            <h3>Add Funds</h3>
            <?= $depositWidget ?>
        </div>
    </div>

    <hr>

    <h3>Transaction History</h3>
    <?= $transactionsWidget ?>

</div>
```

On first visit the widget will display a brief account-creation form inside the widget area — **no extra server-side code or database columns required**.

## Step 5 — Account management page

```php
// Controller action
public function actionManage(): string
{
    $smlv       = Yii::$app->smlv->getClient();
    $widget     = new SmlvWidgetGenerator($smlv);
    $subscriber = $this->loadCurrentSubscriber();

    return $this->render('manage', [
        'managementWidget' => $widget->generateManagementWidget(
            (string) $subscriber->id,
            $subscriber->email,
            ['theme' => 'light']
        ),
    ]);
}
```

The management widget provides:

- **Overview tab** — read-only account snapshot
- **Edit tab** — update profile fields via PATCH `/account`
- **Danger Zone tab** — deactivate or permanently delete account

## Step 6 — Webhook endpoint

Create a controller that receives SMLV event notifications:

```php
// backend/controllers/WebhookController.php
namespace backend\controllers;

use Smlv\Sdk\SmlvWebhookHandler;
use yii\web\Controller;
use yii\web\Response;
use Yii;

class WebhookController extends Controller
{
    public $enableCsrfValidation = false;

    public function actionSmlv(): Response
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $handler = new SmlvWebhookHandler(Yii::$app->smlv->getClient());

        try {
            $event = $handler->handle(
                Yii::$app->request->post(),
                Yii::$app->request->headers->get('X-Smlv-Signature', '')
            );

            match ($event['type']) {
                'balance.updated' => $this->handleBalanceUpdated($event),
                'transaction.completed' => $this->handleTxCompleted($event),
                default => null,
            };

            return $this->asJson(['ok' => true]);
        } catch (\Exception $e) {
            Yii::$app->response->statusCode = 400;
            return $this->asJson(['error' => $e->getMessage()]);
        }
    }

    private function handleBalanceUpdated(array $event): void
    {
        // e.g. clear cached balance for this account
        Yii::info('Balance updated: ' . $event['account_reference'], __METHOD__);
    }

    private function handleTxCompleted(array $event): void
    {
        // e.g. send in-app notification
        Yii::info('Transaction completed: ' . $event['transaction_id'], __METHOD__);
    }
}
```

Register the route in `backend/config/main.php`:

```php
'urlManager' => [
    'rules' => [
        'POST webhooks/smlv' => 'webhook/smlv',
    ],
],
```

Configure the webhook URL in your SMLV dashboard:

```
https://your-app.com/webhooks/smlv
```

## Step 7 — Auto-charge on model save (optional)

If your SaaS charges a deposit fee whenever a user creates a document (order, invoice, etc.), attach `SmlvChargeBehavior` directly to that model. No interface, no base class — just configure callables:

```php
// common/models/Order.php  (or any AR model)
namespace common\models;

use yii\db\ActiveRecord;
use yii\helpers\ArrayHelper;
use Smlv\Sdk\Yii2\SmlvChargeBehavior;

class Order extends ActiveRecord
{
    public function behaviors(): array
    {
        return ArrayHelper::merge(parent::behaviors(), [
            'smlvCharge' => [
                'class' => SmlvChargeBehavior::class,

                // Required: email of the account to charge
                'email' => fn() => $this->owner->email,
                //          ^^ can be any expression that resolves to a string

                // Required: amount to deduct (null or 0 = skip)
                'amount' => fn() => $this->plan->charge_amount,

                // Optional: shown in SMLV transaction history
                'description' => fn() => 'Order #' . $this->id,

                // Optional: arbitrary key-value stored with the transaction
                'metadata' => fn() => [
                    'order_id' => $this->id,
                    'model'    => static::class,
                    'source'   => 'my-saas',
                ],
            ],
        ]);
    }
}
```

**Behavior contract:**

| Condition | Result |
|---|---|
| `smlv` component absent from app config | Silently skipped — safe in CLI / test environments |
| `email` resolves to empty string / null | Silently skipped |
| `amount` resolves to null, 0 or negative | Silently skipped |
| API call throws | Logged to `smlv` channel, **save is NOT rolled back** |

> **Note:** The behavior fires on `EVENT_AFTER_INSERT` only — edits to existing records do not trigger a charge.

---

## What you did NOT need to do

| Old approach                            | New approach  |
| --------------------------------------- | ------------- |
| Add `smlv_account_reference` column     | ❌ Not needed |
| Call `createAccount()` on registration  | ❌ Not needed |
| Store and pass account reference around | ❌ Not needed |
| Set up iframe src URL                   | ❌ Not needed |

The widget handles account lifecycle entirely. Your only responsibility is passing `externalUserId` and `email`.

---

For full API reference see [README.md](README.md).  
For advanced scenarios see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
