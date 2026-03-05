<?php

namespace Smlv\Sdk\Yii2;

use Yii;
use yii\base\ActionFilter;
use yii\web\ForbiddenHttpException;
use Smlv\Sdk\SmlvBalanceChecker;
use Smlv\Sdk\Exceptions\SmlvException;

/**
 * SMLV Balance Filter for Yii2
 * 
 * Usage in controller:
 * 
 * public function behaviors()
 * {
 *     return [
 *         'smlvBalance' => [
 *             'class' => SmlvBalanceFilter::class,
 *             'balanceChecker' => function() {
 *                 return Yii::$app->smlv->getBalanceChecker();
 *             },
 *             'accountReferenceCallback' => function() {
 *                 return Yii::$app->user->identity->smlv_account_reference;
 *             },
 *             'only' => ['create', 'update', 'delete'],
 *             'minBalance' => 0.0, // Require any balance > 0
 *             'errorMessage' => 'Insufficient balance to perform this action.',
 *             'redirectUrl' => ['/billing/deposit'],
 *         ],
 *     ];
 * }
 */
class SmlvBalanceFilter extends ActionFilter
{
    /**
     * @var callable|SmlvBalanceChecker Balance checker instance or callable that returns it
     */
    public $balanceChecker;

    /**
     * @var callable Callback that returns account reference for current user
     * Example: function() { return Yii::$app->user->identity->smlv_account_reference; }
     */
    public $accountReferenceCallback;

    /**
     * @var float Minimum required balance (default: 0.0, meaning any balance > 0)
     */
    public $minBalance = 0.0;

    /**
     * @var string Error message to show when balance is insufficient
     */
    public $errorMessage = 'Insufficient balance to perform this action.';

    /**
     * @var string|array|null URL to redirect user when balance is insufficient (instead of throwing exception)
     */
    public $redirectUrl = null;

    /**
     * @var bool Whether to allow access for guest users (default: false)
     */
    public $allowGuests = false;

    /**
     * {@inheritdoc}
     */
    public function init()
    {
        parent::init();

        if ($this->balanceChecker === null) {
            throw new \yii\base\InvalidConfigException('The "balanceChecker" property must be set.');
        }

        if ($this->accountReferenceCallback === null) {
            throw new \yii\base\InvalidConfigException('The "accountReferenceCallback" property must be set.');
        }
    }

    /**
     * {@inheritdoc}
     */
    public function beforeAction($action)
    {
        // Check if user is guest
        if (Yii::$app->user->isGuest) {
            if ($this->allowGuests) {
                return true;
            }
            throw new ForbiddenHttpException('You must be logged in to access this page.');
        }

        // Get account reference
        $accountReference = call_user_func($this->accountReferenceCallback);

        if (empty($accountReference)) {
            if ($this->redirectUrl) {
                Yii::$app->session->setFlash('error', 'SMLV account not found.');
                Yii::$app->response->redirect($this->redirectUrl);
                return false;
            }
            throw new ForbiddenHttpException('SMLV account not found.');
        }

        // Get balance checker
        $checker = $this->getBalanceChecker();

        try {
            // Check if user can afford the action
            $canAfford = $checker->canAfford($accountReference, $this->minBalance);

            if (!$canAfford) {
                return $this->handleInsufficientBalance($checker->getBalance($accountReference));
            }
        } catch (SmlvException $e) {
            Yii::error("SMLV balance check failed: " . $e->getMessage(), __METHOD__);

            if ($this->redirectUrl) {
                Yii::$app->session->setFlash('error', 'Unable to verify balance. Please try again later.');
                Yii::$app->response->redirect($this->redirectUrl);
                return false;
            }

            throw new ForbiddenHttpException('Unable to verify balance. Please try again later.');
        }

        return true;
    }

    /**
     * Handle insufficient balance scenario
     * 
     * @param float $currentBalance Current balance
     * @return bool Whether to continue action
     * @throws ForbiddenHttpException
     */
    protected function handleInsufficientBalance(float $currentBalance): bool
    {
        if ($this->redirectUrl) {
            Yii::$app->session->setFlash('error', $this->errorMessage);
            Yii::$app->session->setFlash('smlv_current_balance', $currentBalance);
            Yii::$app->session->setFlash('smlv_required_balance', $this->minBalance);
            Yii::$app->response->redirect($this->redirectUrl);
            return false;
        }

        throw new ForbiddenHttpException($this->errorMessage);
    }

    /**
     * Get balance checker instance
     * 
     * @return SmlvBalanceChecker
     */
    protected function getBalanceChecker(): SmlvBalanceChecker
    {
        if (is_callable($this->balanceChecker)) {
            return call_user_func($this->balanceChecker);
        }

        return $this->balanceChecker;
    }
}
