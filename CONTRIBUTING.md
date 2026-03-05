# Contributing to SMLV SDK

Thank you for considering contributing to SMLV SDK! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- PHP version and framework (if applicable)
- Code samples (if possible)

### Suggesting Features

Feature requests are welcome! Please create an issue with:
- A clear description of the feature
- Use cases and benefits
- Proposed API (if applicable)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes**:
   - Write clean, readable code
   - Follow PSR-12 coding standards
   - Add PHPDoc comments
   - Update documentation if needed
3. **Test your changes**:
   - Ensure existing tests pass
   - Add new tests for new features
   - Test with different PHP versions (7.4+)
4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issues if applicable (e.g., "Fix #123")
5. **Submit a pull request**:
   - Describe what you changed and why
   - Link to related issues

## Development Setup

```bash
# Clone the repository
git clone https://github.com/smlv/sdk.git
cd sdk

# Install dependencies
composer install

# Run tests
composer test

# Check code style
composer cs-check

# Fix code style
composer cs-fix
```

## Code Style

We follow PSR-12 coding standards. Use PHP CS Fixer:

```bash
composer cs-fix
```

## Testing

Write tests for new features using PHPUnit:

```bash
composer test
```

## Documentation

- Update README.md for API changes
- Update DEVELOPER_GUIDE.md for new features
- Add code examples
- Keep documentation clear and concise

## Questions?

Create an issue or email: support@smlvcoin.com

Thank you for contributing! 🚀
