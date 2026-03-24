# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.4] - 2026-03-24

### Fixed

- Mini widget: label changed from `'SMLV'` to `'Balance:'` for clarity
- Mini widget: deposit button width/height style tweak
- `.smlv-btn-ok` now uses `background-color !important` to prevent host-page CSS override

## [2.2.3] - 2026-03-24

### Changed

- Mini widget: deposit button replaced text label with `+` icon (round 22×22 px button) and a `title` tooltip for accessibility

## [2.2.2] - 2026-03-24

### Added

- `SmlvBalanceWidget` (Yii2): auto-generates `deposit_url` for the `mini` type using `SmlvComponent::generateDepositUrl()` — no extra config needed in the navbar

## [2.2.1] - 2026-03-24

### Fixed

- `SmlvComponent::getWidgetGenerator()` had `'v2'` hardcoded as `$scriptVersion`, ignoring the `SmlvWidgetGenerator` default. Now uses `$this->widgetScriptVersion ?? 'v2.2'`
- Added `$widgetScriptVersion` property to `SmlvComponent` (nullable string, default `null`)

## [2.2.0] - 2026-03-24

### Added

- **`mini` widget type** (`Renderers.mini`) — single-line inline bar for navbar embedding:
    - Shows `Balance: <amount> <currency>` + a `+` deposit button
    - `skipResolve: true` — calls `/balance` directly, no account resolution flow
    - CSS classes: `.smlv-mini-bar`, `.smlv-mini-label`, `.smlv-mini-amt`, `.smlv-mini-dep`
- **`SmlvWidgetGenerator::generateMiniWidget()`** — generates mini bar embed
- **`Smlv\Sdk\Yii2\SmlvBalanceWidget`** — Yii2 widget class; `$widgetType` property routes to `mini` (default), `balance`, or `account` generator method
- CDN version bumped to **`v2.2`** (`cdn.smlvcoin.com/v2.2/smlv-widget.js`)
- `SmlvWidgetGenerator` default `$scriptVersion` changed from `'v2'` to `'v2.2'`

## [2.1.0] - 2026-03-22

### Added

- **`account` widget type** (`Renderers.account`) — unified subscriber widget with `skipResolve: true`:
    - No account: shows compact "Create SMLV Account" button (auto-creates if `prefill.email` + `first_name` present)
    - Account exists: 4-tab dashboard — _Balance_ | _Transactions_ | _Overview_ | _Danger Zone_
    - Merchant-owner mode (`cfg.isMerchantOwner`): bypasses account resolution, shows wallet balance + transactions
- **`SmlvWidgetGenerator::generateAccountWidget()`** — generates unified account widget embed; merges email into `prefill` automatically
- **`generateDepositUrl()`** on `SmlvComponent` — generates a signed JWT redirect URL to the SMLV platform deposit page (`partner-widget/deposit`)
- `sync_data` / `syncData` option forwarded to JS config for the "Update from SaaS" button on the Overview tab

## [2.0.0] - 2026-06-01

This release is a **complete rewrite** of the widget layer. No database changes required on the SaaS side.

### Breaking Changes

- `SmlvWidgetGenerator` methods now accept `(externalUserId, email, ...)` instead of `(accountReference, ...)`.  
  The old `$accountReference` parameter is **removed** — the widget resolves the account automatically.
- Widget is no longer delivered as an iframe. It renders directly into the host page DOM via a CDN JS bundle.
- JWT token is injected into an inline `<script>` block. It is **never** placed in a URL query string.
- `SmlvClient::generateWidgetToken()` signature changed:  
  `generateWidgetToken(string $accountReference, ...)` → `generateWidgetToken(string $externalUserId, string $email, ...)`

### Added

- **Auto account resolution** — every widget mount calls `POST /v1/widget/account/resolve`.  
  On first visit (404), the widget shows an inline account-creation form — no SaaS code required.
- **`Renderers.management`** — full 3-tab account management UI:
    - _Overview_ tab: read-only account details
    - _Edit_ tab: PATCH `/account` with form validation
    - _Danger Zone_ tab: deactivate / reactivate, delete with typed-confirmation dialog
- **`Renderers.balance`** — Sync button calls `POST /balance/sync` to force a real-time balance update.
- **`Renderers.deposit`** — currency selector → wallet address card with one-click copy and memo support.
- **`Renderers.transactions`** — paginated table with prev / next navigation.
- **JS callbacks** in widget options: `onReady`, `onSuccess`, `onError`, `onClose`.
- **Dark theme** support via `options.theme = 'dark'`.
- **`SmlvApi`** HTTP client in the JS bundle: `get / post / patch / del`, Bearer JWT auth, unified error handling.
- **`SmlvWidgetGenerator::buildScriptTag(bool $defer)`** — generates CDN `<script>` tag separately.
- **`SmlvWidgetGenerator::generateInitSnippet(...)`** — generates inline init `<script>` separately.
- **`SmlvWidgetGenerator::generateToken(...)`** — returns signed JWT only (for manual queue push).
- **`jti` claim** in JWT — one-time-use enforcement, prevents token replay.
- JWT TTL reduced from 3600 s to **900 s**.
- `composer.json` `extra.widget-bundle` and `extra.widget-cdn` fields for tooling.

### Removed

- iframe-based widget delivery — replaced by direct DOM rendering.
- `SmlvWidgetGenerator` methods with `accountReference` parameter.
- Duplicate `*ForUser()` method variants (never shipped, cleaned up during development).

### Security

- JWT token moved from URL parameter to inline `<script>` block.
- `jti` claim prevents token reuse.
- Short TTL (900 s) limits exposure window.

---

## [1.0.0] - 2026-03-05

### Added

- Initial release of SMLV SDK
- Full API integration for SMLV platform
- Framework-agnostic core with Yii2 and Laravel integrations
- Widget system for iframe embedding
- Webhook handling with HMAC-SHA256 signature verification
- Balance checking with in-memory caching
- Exception hierarchy (`SmlvException`, `SmlvApiException`, `SmlvAuthException`, `SmlvValidationException`)
- Complete documentation and examples

[Unreleased]: https://github.com/FilSM/smlv-sdk/compare/v2.2.4...HEAD
[2.2.4]: https://github.com/FilSM/smlv-sdk/compare/v2.2.3...v2.2.4
[2.2.3]: https://github.com/FilSM/smlv-sdk/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/FilSM/smlv-sdk/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/FilSM/smlv-sdk/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/FilSM/smlv-sdk/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/FilSM/smlv-sdk/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/FilSM/smlv-sdk/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/smlv/sdk/releases/tag/v1.0.0
