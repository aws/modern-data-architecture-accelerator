# NPM Publishing Process for MDAA

This document describes the NPM publishing process for Modern Data Architecture Accelerator (MDAA) packages, including the scripts and CI/CD pipeline integration.

## Prerequisites

### Local Development Environment

Before using the NPM publishing scripts, ensure your local environment has the required tools:

```bash
# Required tools
node --version    # Node.js 22+ required
npm --version     # NPM 8+ required
jq --version      # jq for JSON processing
aws --version     # AWS CLI v2 for CodeArtifact access
```

### Installation Steps

1. **Install Node.js and NPM**:

   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 22
   nvm use 22
   ```

2. **Install jq**:

   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # CentOS/RHEL
   sudo yum install jq
   ```

3. **Install AWS CLI v2**:

   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

4. **Configure AWS credentials**:

   ```bash
   aws configure
   # Or use AWS SSO, IAM roles, or environment variables
   ```

5. **Install project dependencies**:

   ```bash
   npm run install:all
   ```

### NPM Registry Setup

For public NPM publishing, ensure you have:

- NPM account with publish permissions for @aws-mdaa scope
- 2FA enabled (recommended)
- Access token or login credentials

```bash
# Login to NPM
npm login

# Verify access to @aws-mdaa scope
npm access list packages @aws-mdaa
```

## Overview

MDAA uses a multi-stage publishing process that validates packages in AWS CodeArtifact before publishing to public NPM. The process includes:

1. **CodeArtifact Testing** - Validate packages in private repository
2. **NPM Readiness Check** - Download and validate packages for public NPM
3. **Public NPM Publishing** - Publish to public NPM registry

## Scripts

### 1. test_published_artifacts.sh

**Purpose**: Tests published NPM artifacts in CodeArtifact and downloads them for local testing.

**Usage**:

```bash
./scripts/test_published_artifacts.sh <version> <repo> <domain> <account> <branch> [--download]
```

**Parameters**:

- `version`: Package version to test
- `repo`: CodeArtifact repository name
- `domain`: CodeArtifact domain
- `account`: AWS account ID
- `branch`: Branch name for testing
- `--download`: Optional flag to download packages locally

**Key Features**:

- **Modular architecture** with separate functions for each test phase
- **Automatic cleanup** of temporary directories using exit traps
- Tests CLI functionality with published packages
- Discovers and verifies all @aws-mdaa packages
- Validates package metadata (license, repository)
- Downloads packages to `target/codeartifact-download/extracted/`
- Cross-platform sed compatibility (macOS/Linux)
- **Enhanced error handling** with detailed error messages and proper exit codes

### 2. validate_dependencies.sh

**Purpose**: Validates package dependencies and NPM publishing readiness.

**Usage**:

```bash
./scripts/validate_dependencies.sh [--npm-ready]
```

**Features**:

- Validates package-lock.json sync with package.json
- With `--npm-ready`: Validates downloaded packages for NPM publishing
- Checks required fields (name, version, license)
- Verifies built files exist (lib/, dist/, build/)

### 3. test_npm_readiness.sh

**Purpose**: Tests NPM publishing readiness with optional actual publishing to public NPM.

**Usage**:

```bash
./scripts/test_npm_readiness.sh [--publish] [--limit N] [--otp CODE]
```

**Parameters**:

- `--publish`: Enable actual publishing (default is dry-run only)
- `--limit N`: Limit number of packages to publish per run
- `--otp CODE`: One-time password for 2FA authentication

**Key Features**:

- **Modular function-based design** for better maintainability
- **Idempotent**: Skips already published packages
- **Version caching**: Local cache to avoid repeated NPM registry checks
- **Enhanced error handling**: Detailed error messages with recovery instructions
- **Progress tracking**: Shows published/skipped/failed counts
- **2FA support**: Handles OTP expiration with recovery guidance
- **Fail-fast**: Exits on first failure with detailed error analysis
- **Automatic cleanup**: Ensures resources are properly cleaned up

## CI/CD Integration

### Pipeline Integration

The NPM publishing process can be integrated into CI/CD pipelines. Here's an example workflow:

```yaml
npm_readiness_check:
  stage: publish
  script:
    - RELEASE_VERSION=$(jq -r .version < lerna.json)
    - ./scripts/test_published_artifacts.sh $RELEASE_VERSION <repo> <domain> <account> <branch> --download
    - ./scripts/validate_dependencies.sh --npm-ready
    - ./scripts/test_npm_readiness.sh
```

### Pipeline Dependencies

Ensure the NPM publishing stage depends on the readiness check to validate packages before publishing.

## Publishing Workflow

### 1. Development Phase

```bash
# Build and test packages locally
lerna run build
lerna run test
```

### 2. CodeArtifact Publishing

Packages are first published to AWS CodeArtifact for validation before public NPM publishing.

### 3. Readiness Validation

```bash
# Download packages from CodeArtifact
./scripts/test_published_artifacts.sh 1.2.0 repo domain account main --download

# Validate NPM readiness
./scripts/validate_dependencies.sh --npm-ready

# Test publishing readiness (dry-run)
./scripts/test_npm_readiness.sh
```

### 4. Public NPM Publishing

#### Dry-run Testing

```bash
# Test without publishing
./scripts/test_npm_readiness.sh
```

#### Actual Publishing

```bash
# Publish all packages
./scripts/test_npm_readiness.sh --publish --otp 123456

# Publish limited number (useful for large package sets)
./scripts/test_npm_readiness.sh --publish --limit 10 --otp 123456
```

## Enhanced Error Handling

All scripts include comprehensive error handling:

- **Strict error checking** with `set -euo pipefail`
- **Automatic cleanup** of temporary directories and resources
- **Detailed parameter validation** with helpful error messages
- **Proper exit codes** for CI/CD integration
- **Recovery instructions** for common failure scenarios
- **Progress preservation** - scripts can resume from where they left off

## Error Handling and Recovery

### OTP Expiration

If OTP expires during publishing:

1. Get new 6-digit code from authenticator app
2. Re-run with new OTP: `./scripts/test_npm_readiness.sh --publish --limit N --otp <NEW_CODE>`
3. Script automatically skips already published packages

### Common Errors

- **E402 Payment Required**: Use `--access public` flag (handled automatically)
- **E403 Forbidden**: Check publish permissions for @aws-mdaa scope
- **Version conflicts**: Script validates versions before publishing

## Package Requirements

For successful NPM publishing, packages must have:

- Valid `package.json` with name, version, license
- Built files in `lib/`, `dist/`, or `build/` directories
- Proper repository URL
- @aws-mdaa scope

## Caching

The system uses local caching (`target/npm-cache/package-versions.json`) to:

- Avoid repeated NPM registry checks
- Speed up subsequent runs
- Track publishing status across runs

## Security Considerations

- Uses `--access public` for scoped packages
- Supports 2FA with OTP codes
- Validates repository URLs
- **Dynamic credential cleanup** - Automatically detects and clears any CodeArtifact authentication tokens
- **No hardcoded account numbers** - All AWS account references are passed as parameters
- Clears CodeArtifact credentials before NPM publishing

## Troubleshooting

### Common Issues

- **Script failures**: All scripts use strict error handling and will exit immediately on errors
- **Temporary directories**: Automatically cleaned up even if script exits unexpectedly
- **Parameter validation**: Scripts validate all required parameters before execution
- **Function isolation**: Each major operation is in a separate function for easier debugging

### Debugging Tips

- Check script exit codes for CI/CD integration issues
- Review detailed logging output for specific failure points
- Use the modular function structure to isolate and test specific operations
- Temporary files and directories are cleaned up automatically

## Monitoring and Validation

Each script provides detailed output including:

- **Modular progress reporting** from each function
- Package discovery and validation
- Version comparisons
- Publishing progress with detailed status
- Error details with recovery instructions
- Summary statistics and final status
- **Enhanced logging** with clear success/failure indicators

This process ensures reliable, secure, and traceable NPM publishing for all MDAA packages.