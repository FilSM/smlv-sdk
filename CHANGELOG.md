# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial SDK implementation
- Core API client with account/balance/transaction management
- Balance checker with caching
- Widget generator for iframe embedding
- Webhook handler with signature verification
- Yii2 integration (SmlvComponent, SmlvBalanceFilter)
- Laravel integration (SmlvBalanceMiddleware)
- Exception hierarchy (SmlvException, SmlvApiException, SmlvAuthException, SmlvValidationException)
- Comprehensive documentation (README, DEVELOPER_GUIDE, INTEGRATION_EXAMPLE)

## [1.0.0] - 2026-03-05

### Added
- Initial release of SMLV SDK
- Full API integration for SMLV platform
- Framework-agnostic core with Yii2 and Laravel integrations
- Widget system for easy UI embedding
- Webhook handling with security verification
- Balance checking with in-memory caching
- Complete documentation and examples

[Unreleased]: https://github.com/smlv/sdk/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/smlv/sdk/releases/tag/v1.0.0
