<?php

namespace Smlv\Sdk;

/**
 * SMLV Widget Generator
 *
 * Generates embed snippets for the SMLV JavaScript widget (v2).
 *
 * No iframes — the widget renders directly into the host page DOM via a
 * lightweight vanilla-JS bundle loaded from the SMLV CDN.
 *
 * ─── Quick start ────────────────────────────────────────────────────────────
 *
 *   $generator = new SmlvWidgetGenerator($client);
 *
 *   // One line — widget auto-creates account if it doesn't exist yet:
 *   echo $generator->generateDepositWidget($subscriber->id, $email, '/thanks');
 *
 *   // Or: CDN script tag once in <head>, inline init wherever needed:
 *   echo $generator->buildScriptTag(defer: true); // in layout
 *   echo $generator->generateInitSnippet($subscriber->id, $email, 'deposit', [], '#my-div');
 *
 * ─── Flow ────────────────────────────────────────────────────────────────────
 *
 *   1. Server generates JWT with external_subscriber_id + email → injects into page
 *   2. Widget calls POST /v1/widget/account/resolve
 *      a. Account found → renders requested widget type
 *      b. Not found    → shows create-account form → on submit renders widget
 *
 * ─── Callbacks ───────────────────────────────────────────────────────────────
 *
 *     onReady()        — widget rendered
 *     onSuccess(data)  — action completed; data.event: account_created |
 *                        account_updated | account_closed | account_reactivated |
 *                        account_deleted | (deposit confirmation)
 *     onError(error)   — API / network error
 *     onClose()        — widget dismissed
 *
 * ─── JWT security ────────────────────────────────────────────────────────────
 *
 *   Token is embedded in inline <script> (never in URL), 15-min TTL + jti.
 */
class SmlvWidgetGenerator
{
    /** @var SmlvClient */
    private $client;

    /** @var string CDN base URL for the widget script */
    private $cdnUrl;

    /** @var string Widget script version path segment */
    private $scriptVersion;

    /** @var string|null Override API base URL passed into every JS config */
    private $apiUrl;

    /**
     * @param SmlvClient  $client
     * @param string|null $cdnUrl        Override CDN base URL (useful for staging)
     * @param string      $scriptVersion Script version segment ('v2' by default)
     * @param string|null $apiUrl        API base URL injected into every JS widget config
     */
    public function __construct(
        SmlvClient $client,
        ?string $cdnUrl = null,
        string $scriptVersion = 'v2',
        ?string $apiUrl = null
    ) {
        $this->client        = $client;
        $this->cdnUrl        = rtrim($cdnUrl ?? 'https://cdn.smlvcoin.com', '/');
        $this->scriptVersion = $scriptVersion;
        $this->apiUrl        = $apiUrl;
    }

    // ─── Embed methods ───────────────────────────────────────────────────────

    /**
     * Deposit widget embed.
     *
     * @param string $externalSubscriberId Unique subscriber ID in the SaaS system.
     *                                     One SaaS user may have several subscribers —
     *                                     pass the subscriber entity ID, not the user ID.
     * @param string $email                Subscriber e-mail
     * @param string $returnUrl            Redirect after the user confirms the deposit
     * @param array  $options              See generateEmbed() for available keys
     * @return string HTML snippet (safe to echo directly)
     */
    public function generateDepositWidget(
        string $externalSubscriberId,
        string $email = '',
        string $returnUrl = '',
        array $options = []
    ): string {
        return $this->generateEmbed($externalSubscriberId, $email, 'deposit', array_merge(
            ['return_url' => $returnUrl],
            $options
        ));
    }

    /** Balance widget embed. */
    public function generateBalanceWidget(
        string $externalSubscriberId,
        string $email = '',
        array $options = []
    ): string {
        return $this->generateEmbed($externalSubscriberId, $email, 'balance', $options);
    }

    /** Transactions history widget embed. */
    public function generateTransactionsWidget(
        string $externalSubscriberId,
        string $email = '',
        array $options = []
    ): string {
        return $this->generateEmbed($externalSubscriberId, $email, 'transactions', $options);
    }

    /** Account management widget embed (full CRUD + Danger Zone). */
    public function generateManagementWidget(
        string $externalSubscriberId,
        string $email,
        array $options = []
    ): string {
        return $this->generateEmbed($externalSubscriberId, $email, 'management', $options);
    }

    /**
     * Unified account widget embed.
     *
     * Single widget for all subscriber interactions:
     * - No SMLV account yet  → compact card with "Create SMLV Account" button.
     *   If $options['prefill'] contains email + first_name, account is created
     *   automatically on button click (no form required).
     * - Account exists → 4-tab dashboard:
     *     Tab 1 (default): SMLV Balance
     *     Tab 2:          Transactions
     *     Tab 3:          Overview + "Update from SaaS" button (pushes prefill/syncData)
     *     Tab 4:          Danger Zone (deactivate, delete)
     *
     * Pass subscriber data via $options['prefill'] or $options['sync_data']:
     *   'email', 'first_name', 'last_name', 'account_type'  ('natural'|'legal')
     *
     * @param string $externalSubscriberId  Unique subscriber entity ID in the SaaS system
     * @param string $email                 Subscriber e-mail (also used as prefill.email)
     * @param array  $options               Same keys as generateEmbed(); add sync_data for
     *                                      the "Update" button payload
     */
    public function generateAccountWidget(
        string $externalSubscriberId,
        string $email = '',
        array $options = []
    ): string {
        // Merge email into prefill so the widget can auto-create the account
        if ($email && empty($options['prefill']['email'])) {
            $options['prefill']['email'] = $email;
        }
        // sync_data → passed as cfg.syncData to JS (used by the "Update" button)
        if (!empty($options['sync_data']) && is_array($options['sync_data'])) {
            // Will appear as cfg.syncData in the JS config
            $options['syncData'] = $options['sync_data'];
            unset($options['sync_data']);
        }
        return $this->generateEmbed($externalSubscriberId, $email, 'account', $options);
    }

    /**
     * Core embed builder — generates container div + CDN script tag + inline init.
     *
     * @param string $externalSubscriberId  Unique subscriber entity ID in the SaaS system.
     *                                       One SaaS user may have several subscribers —
     *                                       pass the subscriber entity ID, not the user ID.
     * @param string $email
     * @param string $type   deposit|balance|transactions|management|account
     * @param array  $options {
     *     @type string $theme           'light'|'dark' (default: 'light')
     *     @type string $language        BCP-47 tag, e.g. 'en', 'ru' (default: 'en')
     *     @type string $return_url      Redirect after success (deposit only)
     *     @type int    $per_page        Rows per page for transactions (default: 10)
     *     @type string $container_id    Override generated container ID
     *     @type string $container_class CSS class(es) added to the container div
     *     @type string $api_url         Override API base URL (staging / dev)
     *     @type array  $prefill         Pre-fill create-account form:
     *                                   first_name, last_name, account_type
     *     @type bool   $allow_withdraw  Show Withdraw button in balance panel (SaaS owner only)
     * }
     * @return string
     */
    public function generateEmbed(
        string $externalSubscriberId,
        string $email = '',
        string $type = 'deposit',
        array $options = []
    ): string {
        $token = $this->client->generateWidgetToken(
            $externalSubscriberId,
            $email,
            $type,
            $options['return_url'] ?? '',
            $options,
            $options['prefill'] ?? []
        );

        $containerId    = $options['container_id']    ?? ('smlv-' . $type . '-' . substr(md5(uniqid('', true)), 0, 8));
        $containerClass = $options['container_class'] ?? '';

        $jsConfig   = $this->buildJsConfig($token, $type, $options, '#' . $containerId);
        $langTag    = $this->buildLangScriptTag($options['language'] ?? 'en');
        $scriptTag  = $this->buildScriptTag();
        $initScript = $this->buildInitScript($jsConfig);

        $divAttrs = 'id="' . htmlspecialchars($containerId, ENT_QUOTES, 'UTF-8') . '"';
        if ($containerClass !== '') {
            $divAttrs .= ' class="' . htmlspecialchars($containerClass, ENT_QUOTES, 'UTF-8') . '"';
        }

        return implode("\n", [
            "<div {$divAttrs}></div>",
            $langTag,
            $scriptTag,
            $initScript,
        ]);
    }

    // ─── Granular helpers ────────────────────────────────────────────────────

    /**
     * Returns just the <script src="..."> CDN tag.
     * Place it once in your <head> or before </body>.
     *
     * @param bool $defer Add the `defer` attribute (recommended when placing in <head>)
     * @return string
     */
    public function buildScriptTag(bool $defer = false): string
    {
        $src   = htmlspecialchars($this->getScriptUrl(), ENT_QUOTES, 'UTF-8');
        $attrs = 'src="' . $src . '" crossorigin="anonymous"';
        $attrs .= $defer ? ' defer' : ' async';
        return '<script ' . $attrs . '></script>';
    }

    /**
     * Returns a <script> tag loading the translations file for the given language.
     * Automatically included by generateEmbed(); call manually if using buildScriptTag() separately.
     *
     * @param string $lang  Language code, e.g. 'en', 'ru', 'lv'
     * @param bool   $defer
     * @return string
     */
    public function buildLangScriptTag(string $lang = 'en', bool $defer = false): string
    {
        $langCode = preg_replace('/[^a-z0-9]/', '', strtolower($lang)) ?: 'en';
        $src      = htmlspecialchars(
            $this->cdnUrl . '/' . $this->scriptVersion . '/lang/' . $langCode . '.js',
            ENT_QUOTES,
            'UTF-8'
        );
        $attrs = 'src="' . $src . '" crossorigin="anonymous"';
        $attrs .= $defer ? ' defer' : ' async';
        return '<script ' . $attrs . '></script>';
    }

    /**
     * Returns just the inline <script> that queues a single widget init.
     * Pair this with buildScriptTag() loaded elsewhere in the layout.
     *
     * @param string $externalSubscriberId  Unique subscriber entity ID in the SaaS system.
     * @param string $email
     * @param string $type     deposit|balance|transactions|management
     * @param array  $options  Same keys as generateEmbed()
     * @param string $selector CSS selector for the target container, e.g. '#my-div'
     * @return string
     */
    public function generateInitSnippet(
        string $externalSubscriberId,
        string $email = '',
        string $type = 'deposit',
        array $options = [],
        string $selector = ''
    ): string {
        $token = $this->client->generateWidgetToken(
            $externalSubscriberId,
            $email,
            $type,
            $options['return_url'] ?? '',
            $options,
            $options['prefill'] ?? []
        );
        $jsConfig = $this->buildJsConfig($token, $type, $options, $selector);
        return $this->buildInitScript($jsConfig);
    }

    /**
     * Returns only the JWT token (for custom JS widget init).
     */
    public function generateToken(
        string $externalSubscriberId,
        string $email = '',
        string $type = 'deposit',
        array $options = []
    ): string {
        return $this->client->generateWidgetToken(
            $externalSubscriberId,
            $email,
            $type,
            $options['return_url'] ?? '',
            $options,
            $options['prefill'] ?? []
        );
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    /**
     * Build the plain-PHP array that will be JSON-encoded into the JS init call.
     */
    private function buildJsConfig(
        string $token,
        string $type,
        array $options,
        string $selector
    ): array {
        $config = [
            'container' => $selector,
            'token'     => $token,
            'type'      => $type,
            'theme'     => $options['theme']    ?? 'light',
            'lang'      => $options['language'] ?? 'en',
        ];

        // Inject apiUrl: option overrides constructor default
        $apiUrl = $options['api_url'] ?? $this->apiUrl;
        if ($apiUrl) {
            $config['apiUrl'] = $apiUrl;
        }

        // Xdebug support: if xdebug option is set, widget appends XDEBUG_SESSION_START to API requests
        if (!empty($options['xdebug'])) {
            $config['xdebug'] = true;
        }

        if (!empty($options['return_url'])) {
            $config['returnUrl'] = $options['return_url'];
        }
        if (!empty($options['per_page'])) {
            $config['perPage'] = (int) $options['per_page'];
        }
        // Forward prefill data to the widget (pre-fills create-account form)
        if (!empty($options['prefill']) && is_array($options['prefill'])) {
            $config['prefill'] = $options['prefill'];
        }
        // Forward syncData to the widget (used by account renderer's "Update from SaaS" button)
        if (!empty($options['syncData']) && is_array($options['syncData'])) {
            $config['syncData'] = $options['syncData'];
        }
        // URL of SMLV deposit page — shows a Deposit button in the balance panel
        if (!empty($options['deposit_url'])) {
            $config['depositUrl'] = $options['deposit_url'];
        }
        // Allow withdrawal — shows Withdraw button in the balance panel (SaaS owner only)
        if (!empty($options['allow_withdraw'])) {
            $config['allowWithdraw'] = true;
        }
        // Merchant owner mode — skip account resolution, show wallet balances directly (no Create button)
        if (!empty($options['is_merchant_owner'])) {
            $config['isMerchantOwner'] = true;
        }

        return $config;
    }

    /**
     * Wrap the JS config in the async-queue inline script.
     *
     * Uses window._smlvQueue so it works regardless of whether the CDN
     * script has already loaded or not.
     */
    private function buildInitScript(array $jsConfig): string
    {
        $json = json_encode($jsConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return <<<HTML
<script>
(function(){
  var cfg={$json};
  if(typeof SmlvWidget!=='undefined'){SmlvWidget.init(cfg);}
  else{window._smlvQueue=window._smlvQueue||[];window._smlvQueue.push(cfg);}
})();
</script>
HTML;
    }

    /**
     * Returns the absolute URL to the widget JS bundle on the CDN.
     */
    private function getScriptUrl(): string
    {
        return $this->cdnUrl . '/' . $this->scriptVersion . '/smlv-widget.js';
    }
}
