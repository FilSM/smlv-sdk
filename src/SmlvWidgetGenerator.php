<?php

namespace Smlv\Sdk;

/**
 * SMLV Widget Generator
 * 
 * Generate HTML for embedding SMLV widgets (iframes)
 */
class SmlvWidgetGenerator
{
    /** @var SmlvClient */
    private $client;

    /** @var string */
    private $widgetBaseUrl = 'https://widget.smlv.com';

    /**
     * @param SmlvClient $client
     * @param string|null $widgetBaseUrl Custom widget base URL
     */
    public function __construct(SmlvClient $client, ?string $widgetBaseUrl = null)
    {
        $this->client = $client;

        if ($widgetBaseUrl) {
            $this->widgetBaseUrl = rtrim($widgetBaseUrl, '/');
        }
    }

    /**
     * Generate deposit widget HTML
     * 
     * @param string $accountReference Account reference ID
     * @param string $returnUrl URL to return after operation
     * @param array $options Widget options
     * @return string HTML iframe code
     */
    public function generateDepositWidget(
        string $accountReference,
        string $returnUrl,
        array $options = []
    ): string {
        return $this->generateWidget($accountReference, 'deposit', $returnUrl, $options);
    }

    /**
     * Generate balance widget HTML
     * 
     * @param string $accountReference Account reference ID
     * @param array $options Widget options
     * @return string HTML iframe code
     */
    public function generateBalanceWidget(
        string $accountReference,
        array $options = []
    ): string {
        return $this->generateWidget($accountReference, 'balance', null, $options);
    }

    /**
     * Generate transactions history widget HTML
     * 
     * @param string $accountReference Account reference ID
     * @param array $options Widget options
     * @return string HTML iframe code
     */
    public function generateTransactionsWidget(
        string $accountReference,
        array $options = []
    ): string {
        return $this->generateWidget($accountReference, 'transactions', null, $options);
    }

    /**
     * Generate account management widget HTML
     * 
     * @param string $accountReference Account reference ID
     * @param array $options Widget options
     * @return string HTML iframe code
     */
    public function generateManagementWidget(
        string $accountReference,
        array $options = []
    ): string {
        return $this->generateWidget($accountReference, 'management', null, $options);
    }

    /**
     * Generate generic widget HTML
     * 
     * @param string $accountReference Account reference ID
     * @param string $widgetType Widget type (deposit, balance, transactions, management)
     * @param string|null $returnUrl URL to return after operation
     * @param array $options Widget options
     * @return string HTML iframe code
     */
    public function generateWidget(
        string $accountReference,
        string $widgetType,
        ?string $returnUrl = null,
        array $options = []
    ): string {
        // Generate JWT token for authentication
        $token = $this->client->generateWidgetToken(
            $accountReference,
            $widgetType,
            $returnUrl ?? '',
            $options
        );

        // Build widget URL
        $url = $this->buildWidgetUrl($widgetType, $token, $options);

        // Generate iframe HTML
        return $this->generateIframeHtml($url, $widgetType, $options);
    }

    /**
     * Build widget URL with parameters
     * 
     * @param string $widgetType Widget type
     * @param string $token JWT token
     * @param array $options Additional options
     * @return string Complete widget URL
     */
    private function buildWidgetUrl(string $widgetType, string $token, array $options): string
    {
        $params = [
            'token' => $token,
        ];

        // Add optional parameters
        if (isset($options['theme'])) {
            $params['theme'] = $options['theme'];
        }
        if (isset($options['language'])) {
            $params['lang'] = $options['language'];
        }

        $query = http_build_query($params);

        return "{$this->widgetBaseUrl}/{$widgetType}?{$query}";
    }

    /**
     * Generate iframe HTML code
     * 
     * @param string $url Widget URL
     * @param string $widgetType Widget type
     * @param array $options Display options
     * @return string HTML code
     */
    private function generateIframeHtml(string $url, string $widgetType, array $options): string
    {
        // Default dimensions per widget type
        $dimensions = $this->getDefaultDimensions($widgetType);

        $width = $options['width'] ?? $dimensions['width'];
        $height = $options['height'] ?? $dimensions['height'];

        $style = "border: none; width: {$width}; height: {$height};";

        if (isset($options['border_radius'])) {
            $style .= " border-radius: {$options['border_radius']};";
        }

        $html = sprintf(
            '<iframe src="%s" style="%s" allow="payment" class="smlv-widget smlv-widget-%s"></iframe>',
            htmlspecialchars($url, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($style, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($widgetType, ENT_QUOTES, 'UTF-8')
        );

        // Add responsive wrapper if requested
        if ($options['responsive'] ?? false) {
            $html = $this->wrapResponsive($html);
        }

        return $html;
    }

    /**
     * Get default dimensions for widget type
     * 
     * @param string $widgetType Widget type
     * @return array Width and height
     */
    private function getDefaultDimensions(string $widgetType): array
    {
        $dimensions = [
            'deposit' => ['width' => '600px', 'height' => '500px'],
            'balance' => ['width' => '400px', 'height' => '200px'],
            'transactions' => ['width' => '800px', 'height' => '600px'],
            'management' => ['width' => '700px', 'height' => '800px'],
        ];

        return $dimensions[$widgetType] ?? ['width' => '600px', 'height' => '400px'];
    }

    /**
     * Wrap iframe in responsive container
     * 
     * @param string $iframeHtml Iframe HTML
     * @return string Wrapped HTML
     */
    private function wrapResponsive(string $iframeHtml): string
    {
        return sprintf(
            '<div class="smlv-widget-responsive" style="position: relative; padding-bottom: 75%%; height: 0; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%;">
                    %s
                </div>
            </div>',
            $iframeHtml
        );
    }

    /**
     * Generate widget URL for direct link (without iframe)
     * 
     * @param string $accountReference Account reference ID
     * @param string $widgetType Widget type
     * @param string|null $returnUrl Return URL
     * @param array $options Options
     * @return string Direct widget URL
     */
    public function generateWidgetUrl(
        string $accountReference,
        string $widgetType,
        ?string $returnUrl = null,
        array $options = []
    ): string {
        $token = $this->client->generateWidgetToken(
            $accountReference,
            $widgetType,
            $returnUrl ?? '',
            $options
        );

        return $this->buildWidgetUrl($widgetType, $token, $options);
    }
}
