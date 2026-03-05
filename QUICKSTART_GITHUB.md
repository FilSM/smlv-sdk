# Quick Start Guide - Installing from GitHub

This is a quick reference for installing SMLV SDK from GitHub.

## Prerequisites

- PHP >= 7.4
- Composer
- Git

## Installation Options

### Option 1: Via Composer (from GitHub)

Add to your `composer.json`:

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/YOUR_USERNAME/smlv-sdk.git"
        }
    ],
    "require": {
        "smlv/sdk": "^1.0"
    }
}
```

Run:

```bash
composer install
```

### Option 2: Via Packagist (when published)

Simply run:

```bash
composer require smlv/sdk
```

## Configuration Example (Yii2)

```php
// common/config/main.php
return [
    'components' => [
        'smlv' => [
            'class' => 'Smlv\Sdk\Yii2\SmlvComponent',
            'apiKey' => getenv('SMLV_API_KEY'),
            'apiSecret' => getenv('SMLV_API_SECRET'),
            'apiUrl' => 'https://api.smlv.com',
        ],
    ],
];
```

## Basic Usage

```php
// Create account
$account = Yii::$app->smlv->getClient()->createAccount('user@example.com');

// Check balance
$hasBalance = Yii::$app->smlv->getBalanceChecker()->hasBalance($accountRef);

// Embed widget
echo Yii::$app->smlv->getWidgetGenerator()->generateDepositWidget($accountRef, $returnUrl);
```

## Full Documentation

- [README.md](README.md) - Quick start and API reference
- [INTEGRATION_EXAMPLE.md](INTEGRATION_EXAMPLE.md) - Step-by-step integration guide
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Complete documentation

## Need Help?

- **Issues**: https://github.com/YOUR_USERNAME/smlv-sdk/issues
- **Support**: support@smlv.com
- **Docs**: https://docs.smlv.com
