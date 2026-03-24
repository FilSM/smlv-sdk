<?php

namespace Smlv\Sdk\Yii2;

use Yii;
use yii\base\Widget;

/**
 * Yii2 widget — renders the SMLV balance mini-panel with a quick-deposit button.
 *
 * Drop it into any layout, navbar, or view — the widget is fully self-contained.
 *
 * ─── Quick start ─────────────────────────────────────────────────────────────
 *
 *   // Minimal — SaaS provides the subscriber ID and email, widget does the rest:
 *   echo \Smlv\Sdk\Yii2\SmlvBalanceWidget::widget([
 *       'subscriberId' => (string) $abonent->id,
 *       'email'        => $email,
 *   ]);
 *
 *   // Compact for navbar:
 *   echo \Smlv\Sdk\Yii2\SmlvBalanceWidget::widget([
 *       'subscriberId' => (string) $abonent->id,
 *       'email'        => $email,
 *       'compact'      => true,
 *       'theme'        => 'dark',
 *   ]);
 *
 * ─── Behaviour ───────────────────────────────────────────────────────────────
 *
 *   - No SMLV account yet → compact card with «Create SMLV Account» button
 *     (the widget shows the registration form automatically)
 *   - Account exists      → balance panel with quick-deposit button
 *
 * Nothing is rendered if:
 *   - the «smlv» Yii2 component is not configured
 *   - $subscriberId or $email is empty
 *   - an exception is thrown (errors go to Yii::warning)
 *
 * ─── Customisation ───────────────────────────────────────────────────────────
 *
 * Pass extra options via $widgetOptions (forwarded to SmlvWidgetGenerator):
 *   return_url, per_page, prefill, sync_data, allow_withdraw, xdebug, …
 * Use $prefill to pre-fill the create-account form (first_name, last_name,
 * account_type = 'natural'|'legal').
 */
class SmlvBalanceWidget extends Widget
{
    /**
     * Unique subscriber identifier in the SaaS system.
     * Passed to SMLV as external_subscriber_id.
     * Typically: (string) $abonent->id  or  'prefix_' . $abonent->id
     *
     * @var string
     */
    public $subscriberId = '';

    /**
     * Subscriber e-mail — used to look up / pre-fill the SMLV account.
     *
     * @var string
     */
    public $email = '';

    /**
     * Compact mode — adds «smlv-widget-compact» CSS class to the container div.
     * Recommended when embedding in a top navbar or sidebar.
     *
     * @var bool
     */
    public $compact = false;

    /**
     * Widget theme: 'light' (default) or 'dark'.
     *
     * @var string
     */
    public $theme = 'light';

    /**
     * BCP-47 language tag, e.g. 'en', 'ru', 'lv'.
     * Defaults to the first two characters of Yii::$app->language.
     *
     * @var string|null
     */
    public $language = null;

    /**
     * Pre-fill data for the create-account form shown when no SMLV account exists.
     * Recognised keys: first_name, last_name, account_type ('natural'|'legal').
     * Merged with ['email' => $this->email] automatically.
     *
     * @var array
     */
    public $prefill = [];

    /**
     * Widget type:
     *   'mini'    (default) — single-line inline bar: balance + Deposit button.
     *                         Best for top navbars.
     *   'balance'           — balance panel card with Deposit button.
     *   'account'           — full 4-tab management dashboard.
     *
     * @var string
     */
    public $widgetType = 'mini';

    /**
     * Extra options forwarded verbatim to the generator method.
     * Keys: return_url, per_page, sync_data, allow_withdraw, xdebug, container_id, …
     *
     * @var array
     */
    public $widgetOptions = [];

    // ─────────────────────────────────────────────────────────────────────────

    public function run(): string
    {
        if (!Yii::$app->has('smlv')) {
            return '';
        }

        if (empty($this->subscriberId) || empty($this->email)) {
            return '';
        }

        $lang = $this->language ?? substr((string) Yii::$app->language, 0, 2);

        $prefill = array_merge(
            ['email' => $this->email],
            $this->prefill
        );

        $options = array_merge(
            [
                'theme'           => $this->theme,
                'language'        => $lang,
                'container_class' => $this->compact ? 'smlv-widget-compact' : 'smlv-widget-block',
                'prefill'         => $prefill,
            ],
            $this->widgetOptions
        );

        try {
            $generator = Yii::$app->smlv->widgetGenerator;
            if ($this->widgetType === 'account') {
                return $generator->generateAccountWidget(
                    $this->subscriberId,
                    $this->email,
                    $options
                );
            }
            if ($this->widgetType === 'balance') {
                return $generator->generateBalanceWidget(
                    $this->subscriberId,
                    $this->email,
                    $options
                );
            }
            // Default: 'mini' — single-line inline bar for navbars
            return $generator->generateMiniWidget(
                $this->subscriberId,
                $this->email,
                $options
            );
        } catch (\Throwable $e) {
            Yii::warning(
                'SmlvBalanceWidget: render failed for subscriber=' . $this->subscriberId
                    . ': ' . $e->getMessage(),
                __CLASS__
            );
            return '';
        }
    }
}
