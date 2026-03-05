# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/smlv/sdk/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/smlv/sdk/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/smlv/sdk/releases/tag/v1.0.0
