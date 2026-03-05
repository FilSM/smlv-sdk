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

        $user = Yii::$app->user->identity;

        return $this->render('index', [
            'depositWidget'      => $widget->generateDepositWidget(
                (string) $user->id,
                $user->email,
                Yii::$app->urlManager->createAbsoluteUrl(['/billing/success'])
            ),
            'balanceWidget'      => $widget->generateBalanceWidget(
                (string) $user->id,
                $user->email
            ),
            'transactionsWidget' => $widget->generateTransactionsWidget(
                (string) $user->id,
                $user->email
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
    $smlv   = Yii::$app->smlv->getClient();
    $widget = new SmlvWidgetGenerator($smlv);
    $user   = Yii::$app->user->identity;

    return $this->render('manage', [
        'managementWidget' => $widget->generateManagementWidget(
            (string) $user->id,
            $user->email,
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
