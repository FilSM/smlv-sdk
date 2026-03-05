# SMLV Integration Example for eGram

This guide demonstrates the minimal integration required to add SMLV billing to your eGram application.

## Overview

The SMLV SDK provides a drop-in solution for billing management with **minimal code changes**:

- **1 database field**: `smlv_account_reference`
- **1 middleware**: `SmlvBalanceFilter` for access control
- **1 webhook endpoint**: `/smlv/webhook`
- **1 widget embed**: Iframe widgets for UI

## Step 1: Install SDK

Add the SDK to your project:

```bash
cd e:\!WWW\eGram
composer require smlv/sdk
```

Or add to `composer.json`:

```json
{
	"repositories": [
		{
			"type": "path",
			"url": "./packages/smlv-sdk"
		}
	],
	"require": {
		"smlv/sdk": "*"
	}
}
```

Then run:

```bash
composer update smlv/sdk
```

## Step 2: Run Migration

Add the `smlv_account_reference` field to your users table:

```bash
php yii migrate/up --migrationPath=@console/migrations
```

This will run the migration: `m260305_120000_add_smlv_account_reference_to_abonent`

## Step 3: Configure SMLV Component

Add the SMLV component to your `common/config/main.php`:

```php
return [
    'components' => [
        'smlv' => [
            'class' => 'Smlv\Sdk\Yii2\SmlvComponent',
            'apiKey' => 'your-api-key-here',
            'apiSecret' => 'your-api-secret-here',
            'apiUrl' => 'https://api.smlv.com',
            'widgetUrl' => 'https://widget.smlv.com',
            'balanceCacheTtl' => 300, // Cache balance for 5 minutes
        ],
    ],
];
```

**Get your API credentials from SMLV platform**: https://dashboard.smlv.com/settings/api

## Step 4: Add Webhook Endpoint

The webhook controller is already created at `backend/controllers/SmlvController.php`.

Add the route to your `backend/config/main.php`:

```php
return [
    'components' => [
        'urlManager' => [
            'rules' => [
                'smlv/webhook' => 'smlv/webhook',
            ],
        ],
    ],
];
```

**Configure webhook URL in SMLV dashboard**: `https://your-domain.com/backend/web/smlv/webhook`

## Step 5: Add Balance Filter to Controllers

Apply the balance filter to controllers that require payment:

```php
<?php

namespace backend\controllers;

use Yii;
use yii\web\Controller;
use Smlv\Sdk\Yii2\SmlvBalanceFilter;

class PostController extends Controller
{
    public function behaviors()
    {
        return [
            'smlvBalance' => [
                'class' => SmlvBalanceFilter::class,
                'balanceChecker' => function() {
                    return Yii::$app->smlv->getBalanceChecker();
                },
                'accountReferenceCallback' => function() {
                    return Yii::$app->user->identity->smlv_account_reference;
                },
                'only' => ['create', 'update', 'delete'], // Actions requiring balance
                'minBalance' => 0.0, // Require any balance > 0
                'errorMessage' => 'Insufficient balance. Please deposit funds to continue.',
                'redirectUrl' => ['/billing/smlv-example'], // Redirect to billing page
            ],
        ];
    }

    // Your action methods...
}
```

## Step 6: Embed Widgets in Views

Use the widget generator to embed SMLV UI in your views:

```php
<?php

$user = Yii::$app->user->identity;

// Get or create SMLV account
if (empty($user->smlv_account_reference)) {
    $user->smlv_account_reference = Yii::$app->smlv->getOrCreateAccountForUser($user);
}

$widgetGenerator = Yii::$app->smlv->getWidgetGenerator();

// Balance widget (compact)
echo $widgetGenerator->generateBalanceWidget($user->smlv_account_reference, [
    'width' => '400px',
    'height' => '200px',
]);

// Deposit widget (payment methods)
echo $widgetGenerator->generateDepositWidget(
    $user->smlv_account_reference,
    Yii::$app->urlManager->createAbsoluteUrl(['/billing/success']), // Return URL
    [
        'width' => '600px',
        'height' => '500px',
    ]
);

// Transactions history widget
echo $widgetGenerator->generateTransactionsWidget($user->smlv_account_reference, [
    'width' => '800px',
    'height' => '600px',
]);

// Account management widget
echo $widgetGenerator->generateManagementWidget($user->smlv_account_reference, [
    'width' => '700px',
    'height' => '400px',
]);
```

See full example in: `backend/views/billing/smlv-example.php`

## Step 7: Test Integration

1. **Create test account**: Login to your application
2. **View billing page**: Navigate to `/billing/smlv-example`
3. **Deposit funds**: Use the deposit widget to add balance
4. **Test access control**: Try to access protected actions with zero balance

## Manual Balance Operations

You can manually check and modify balances in your code:

```php
$balanceChecker = Yii::$app->smlv->getBalanceChecker();

// Check if user has any balance
if ($balanceChecker->hasBalance($accountReference)) {
    // Allow access
}

// Check if user can afford specific amount
if ($balanceChecker->canAfford($accountReference, 10.00)) {
    // User has at least $10
}

// Get current balance
$balance = $balanceChecker->getBalance($accountReference);

// Deduct balance (e.g., after subscription renewal)
$balanceChecker->deductBalance($accountReference, 9.99, [
    'description' => 'Monthly subscription',
    'metadata' => ['subscription_id' => 123],
]);

// Add balance (e.g., promotional credit)
$balanceChecker->addBalance($accountReference, 5.00, [
    'description' => 'Promotional credit',
]);
```

## Complete Integration Checklist

- [ ] Install SDK package
- [ ] Run migration to add `smlv_account_reference` field
- [ ] Configure SMLV component with API credentials
- [ ] Add webhook endpoint and configure URL in SMLV dashboard
- [ ] Add balance filter to controllers requiring payment
- [ ] Embed widgets in views for deposit/balance/history
- [ ] Test account creation and balance operations
- [ ] Configure webhook event handlers as needed
- [ ] Set up low-balance notifications (optional)

## That's It!

You've successfully integrated SMLV billing with **minimal changes**:

- ✅ 1 field added to database
- ✅ 1 middleware applied to controllers
- ✅ 1 webhook endpoint configured
- ✅ Widgets embedded in views

**No custom UI development required!** All billing functionality is provided by SMLV widgets.

## Support

- SDK Documentation: `packages/smlv-sdk/README.md`
- SMLV API Docs: https://docs.smlv.com
- Support: support@smlv.com
