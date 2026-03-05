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
 *   echo $generator->generateDepositWidget($user->id, $user->email, '/thanks');
 *
 *   // Or: CDN script tag once in <head>, inline init wherever needed:
 *   echo $generator->buildScriptTag(defer: true); // in layout
 *   echo $generator->generateInitSnippet($user->id, $user->email, 'deposit', [], '#my-div');
 *
 * ─── Flow ────────────────────────────────────────────────────────────────────
 *
 *   1. Server generates JWT with external_user_id + email → injects into page
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

    /**
     * @param SmlvClient  $client
     * @param string|null $cdnUrl        Override CDN base URL (useful for staging)
     * @param string      $scriptVersion Script version segment ('v2' by default)
     */
    public function __construct(
        SmlvClient $client,
        ?string $cdnUrl = null,
        string $scriptVersion = 'v2'
    ) {
        $this->client        = $client;
        $this->cdnUrl        = rtrim($cdnUrl ?? 'https://cdn.smlvcoin.com', '/');
        $this->scriptVersion = $scriptVersion;
    }

    // ─── Embed methods ───────────────────────────────────────────────────────

    /**
     * Deposit widget embed.
     *
     * @param string $externalUserId Unique subscriber ID in the SaaS system
     * @param string $email          Subscriber e-mail
     * @param string $returnUrl      Redirect after the user confirms the deposit
     * @param array  $options        See generateEmbed() for available keys
     * @return string HTML snippet (safe to echo directly)
     */
    public function generateDepositWidget(
        string $externalUserId,
        string $email,
        string $returnUrl,
        array $options = []
    ): string {
        return $this->generateEmbed($externalUserId, $email, 'deposit', array_merge(
            ['return_url' => $returnUrl],
            $options
        ));
    }

    /** Balance widget embed. */
    public function generateBalanceWidget(
        string $externalUserId,
        string $email,
        array $options = []
    ): string {
        return $this->generateEmbed($externalUserId, $email, 'balance', $options);
    }

    /** Transactions history widget embed. */
    public function generateTransactionsWidget(
        string $externalUserId,
        string $email,
        array $options = []
    ): string {
        return $this->generateEmbed($externalUserId, $email, 'transactions', $options);
    }

    /** Account management widget embed (full CRUD + Danger Zone). */
    public function generateManagementWidget(
        string $externalUserId,
        string $email,
        array $options = []
    ): string {
        return $this->generateEmbed($externalUserId, $email, 'management', $options);
    }

    /**
     * Core embed builder — generates container div + CDN script tag + inline init.
     *
     * @param string $externalUserId
     * @param string $email
     * @param string $type   deposit|balance|transactions|management
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
     * }
     * @return string
     */
    public function generateEmbed(
        string $externalUserId,
        string $email,
        string $type,
        array $options = []
    ): string {
        $token = $this->client->generateWidgetToken(
            $externalUserId,
            $email,
            $type,
            $options['return_url'] ?? '',
            $options,
            $options['prefill'] ?? []
        );

        $containerId    = $options['container_id']    ?? ('smlv-' . $type . '-' . substr(md5(uniqid('', true)), 0, 8));
        $containerClass = $options['container_class'] ?? '';

        $jsConfig   = $this->buildJsConfig($token, $type, $options, '#' . $containerId);
        $scriptTag  = $this->buildScriptTag();
        $initScript = $this->buildInitScript($jsConfig);

        $divAttrs = 'id="' . htmlspecialchars($containerId, ENT_QUOTES, 'UTF-8') . '"';
        if ($containerClass !== '') {
            $divAttrs .= ' class="' . htmlspecialchars($containerClass, ENT_QUOTES, 'UTF-8') . '"';
        }

        return implode("\n", [
            "<div {$divAttrs}></div>",
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
     * Returns just the inline <script> that queues a single widget init.
     * Pair this with buildScriptTag() loaded elsewhere in the layout.
     *
     * @param string $externalUserId
     * @param string $email
     * @param string $type     deposit|balance|transactions|management
     * @param array  $options  Same keys as generateEmbed()
     * @param string $selector CSS selector for the target container, e.g. '#my-div'
     * @return string
     */
    public function generateInitSnippet(
        string $externalUserId,
        string $email,
        string $type,
        array $options,
        string $selector
    ): string {
        $token = $this->client->generateWidgetToken(
            $externalUserId,
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
        string $externalUserId,
        string $email,
        string $type,
        array $options = []
    ): string {
        return $this->client->generateWidgetToken(
            $externalUserId,
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

        if (!empty($options['return_url'])) {
            $config['returnUrl'] = $options['return_url'];
        }
        if (!empty($options['api_url'])) {
            $config['apiUrl'] = $options['api_url'];
        }
        if (!empty($options['per_page'])) {
            $config['perPage'] = (int) $options['per_page'];
        }
        // Forward prefill data to the widget (pre-fills create-account form)
        if (!empty($options['prefill']) && is_array($options['prefill'])) {
            $config['prefill'] = $options['prefill'];
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
