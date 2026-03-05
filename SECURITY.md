# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to:

**security@smlvcoin.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

## Security Best Practices

When using SMLV SDK:

1. **Never commit API credentials** - Use environment variables
2. **Always verify webhook signatures** - Use built-in verification
3. **Use HTTPS only** - Never send credentials over HTTP
4. **Validate all input** - Sanitize user data before API calls
5. **Keep dependencies updated** - Run `composer update` regularly
6. **Use latest SDK version** - Check for security updates

## Disclosure Policy

- We will confirm receipt of your report within 48 hours
- We will provide a fix timeframe within 7 days
- We will notify you when the fix is released
- We will credit you in the release notes (unless you prefer to remain anonymous)

Thank you for helping keep SMLV SDK secure! 🔒
