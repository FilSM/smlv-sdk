# Quick Start — SMLV SDK

Get billing running in your PHP SaaS in under 5 minutes.

## 1. Install

**From Packagist:**

```bash
composer require smlv/sdk
```

**From GitHub (dev / private fork):**

```json
// composer.json
{
	"repositories": [
		{
			"type": "vcs",
			"url": "https://github.com/smlv/sdk.git"
		}
	],
	"require": {
		"smlv/sdk": "^2.0"
	}
}
```

```bash
composer install
```

## 2. Add credentials to `.env`

```dotenv
SMLV_API_URL=https://api.smlvcoin.com
SMLV_API_KEY=pk_live_xxxxxxxxxxxxx
SMLV_API_SECRET=sk_live_xxxxxxxxxxxxx
SMLV_WIDGET_SECRET=ws_live_xxxxxxxxxxxxx
```

## 3. Initialize the client

```php
use Smlv\Sdk\SmlvClient;

$smlv = new SmlvClient(
    getenv('SMLV_API_KEY'),
    getenv('SMLV_API_SECRET'),
    getenv('SMLV_API_URL'),
    getenv('SMLV_WIDGET_SECRET')
);
```

## 4. Embed a widget in your view

```php
use Smlv\Sdk\SmlvWidgetGenerator;

$widget = new SmlvWidgetGenerator($smlv);

// Pass your user's ID and e-mail — the widget does the rest
echo $widget->generateDepositWidget(
    externalUserId: (string) $currentUser->id,
    email:          $currentUser->email,
    returnUrl:      'https://your-app.com/billing'
);
```

**That's it.** The widget:

- Resolves the SMLV account by `externalUserId + email`
- Creates the account automatically on first visit
- Renders a deposit / balance / transaction UI directly in your page

## 5. (Optional) Handle webhooks

```php
use Smlv\Sdk\SmlvWebhookHandler;

$handler = new SmlvWebhookHandler($smlv);
$event   = $handler->handle($_POST, $_SERVER['HTTP_X_SMLV_SIGNATURE'] ?? '');

match ($event['type']) {
    'balance.updated'       => updateCachedBalance($event),
    'transaction.completed' => notifyUser($event),
    default                 => null,
};
```

## Framework notes

| Framework   | Quick config                                                            |
| ----------- | ----------------------------------------------------------------------- |
| **Laravel** | Add to `config/services.php`, bind `SmlvClient` in `AppServiceProvider` |
| **Yii2**    | Register `\Smlv\Sdk\Yii2\SmlvComponent` in `components` array           |
| **Symfony** | Use env vars in `services.yaml`, inject via DI                          |

Full details: [README.md](README.md) · [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
