# GitHub Publication Guide

This guide explains how to publish SMLV SDK to GitHub and install it from there.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new (or your organization)
2. Create a new repository:
   - **Name**: `smlv-sdk` (or `sdk`)
   - **Description**: "Drop-in billing solution for SaaS applications"
   - **Visibility**: Public (for open-source) or Private
   - **Initialize**: Don't initialize with README (we already have one)

## Step 2: Initialize Git Repository

Open terminal in `packages/smlv-sdk/` directory:

```bash
cd e:\!WWW\eGram\packages\smlv-sdk

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial release v1.0.0"

# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/smlv-sdk.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Create First Release

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Description:
   ```markdown
   ## SMLV SDK v1.0.0
   
   First stable release of SMLV SDK - a drop-in billing solution for SaaS applications.
   
   ### Features
   - ✅ Complete API integration
   - ✅ Balance checking with caching
   - ✅ Widget generator (iframe embedding)
   - ✅ Webhook handling
   - ✅ Yii2 & Laravel integrations
   - ✅ Comprehensive documentation
   
   ### Installation
   
   \`\`\`bash
   composer require smlv/sdk
   \`\`\`
   
   See [README.md](README.md) for full documentation.
   ```
6. Click "Publish release"

## Step 4: Installation from GitHub

### Option A: Via Composer (Packagist)

If you publish to Packagist (packagist.org):

```bash
composer require smlv/sdk
```

### Option B: Via Composer (GitHub directly)

Add to your project's `composer.json`:

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/YOUR_USERNAME/smlv-sdk.git"
        }
    ],
    "require": {
        "smlv/sdk": "^1.0"
    }
}
```

Then run:

```bash
composer install
```

### Option C: Local Development Path (current method)

Keep using local path for development:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "./packages/smlv-sdk"
        }
    ],
    "require": {
        "smlv/sdk": "*"
    }
}
```

## Step 5: Publishing to Packagist (Optional)

To make installation easier via `composer require smlv/sdk`:

1. Go to https://packagist.org/
2. Click "Submit" in the top menu
3. Enter your GitHub repository URL
4. Click "Check"
5. Click "Submit"

Packagist will automatically update when you push new releases to GitHub.

## Step 6: Update eGram Installation

### For GitHub Installation

Update `e:\!WWW\eGram\composer.json`:

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/YOUR_USERNAME/smlv-sdk.git"
        }
    ],
    "require": {
        "smlv/sdk": "^1.0"
    }
}
```

### For Packagist Installation

Simply:

```bash
composer require smlv/sdk
```

## Recommended GitHub Repository Settings

### Branch Protection

1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging

### Topics

Add topics for discoverability:
- `php`
- `sdk`
- `payment`
- `billing`
- `saas`
- `yii2`
- `laravel`
- `composer`

### About Section

- **Description**: "Drop-in billing solution for SaaS applications"
- **Website**: https://smlvcoin.com
- **Topics**: (as above)

## Versioning Strategy

Follow Semantic Versioning (semver.org):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### Creating New Releases

```bash
# Make changes
git add .
git commit -m "Add new feature"

# Tag new version
git tag v1.1.0
git push origin main --tags

# Create release on GitHub
```

## Alternative: Multiple Repositories

You can also split into multiple repos:

1. **smlv/sdk** - Core SDK (framework-agnostic)
2. **smlv/sdk-yii2** - Yii2 integration
3. **smlv/sdk-laravel** - Laravel integration

This allows users to install only what they need:

```bash
composer require smlv/sdk
composer require smlv/sdk-yii2  # Only if using Yii2
```

## Maintenance

### Regular Updates

1. Monitor issues and PRs
2. Release security patches quickly
3. Update dependencies regularly
4. Keep documentation in sync

### Changelog

Update `CHANGELOG.md` for every release:

```markdown
## [1.1.0] - 2026-04-01

### Added
- New feature X

### Fixed
- Bug Y
```

## Support

- **Documentation**: README.md, DEVELOPER_GUIDE.md
- **Issues**: GitHub Issues
- **Email**: support@smlvcoin.com
- **Website**: https://smlvcoin.com

---

**Ready to publish?** Follow the steps above and your SDK will be available on GitHub! 🚀
