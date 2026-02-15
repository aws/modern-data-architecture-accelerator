#!/bin/bash
# Script to test published NPM artifacts in CodeArtifact and download for local testing
# Usage: ./test_published_artifacts.sh <version> <repo> <domain> <account> [branch] [--download]

set -euo pipefail

# Constants
readonly REGION="us-east-1"
readonly NAMESPACE="@aws-mdaa"
readonly SAMPLE_CONFIG_DIR="starter_kits/basic_datalake"

# Global variables
SNAPSHOT_VERSION=""
MDAA_CODEARTIFACT_REPO=""
MDAA_CODEARTIFACT_DOMAIN=""
MDAA_CODEARTIFACT_ACCOUNT=""
BRANCH_NAME=""
DOWNLOAD_MODE=false
TEST_DIR=""

# Parse command line arguments
parse_arguments() {
    SNAPSHOT_VERSION="$1"
    MDAA_CODEARTIFACT_REPO="$2"
    MDAA_CODEARTIFACT_DOMAIN="$3"
    MDAA_CODEARTIFACT_ACCOUNT="$4"
    BRANCH_NAME="${5:-}"
    
    if [ "${6:-}" = "--download" ]; then
        DOWNLOAD_MODE=true
    fi
}

# Validate required parameters
validate_parameters() {
    if [ -z "$SNAPSHOT_VERSION" ] || [ -z "$MDAA_CODEARTIFACT_REPO" ] || [ -z "$MDAA_CODEARTIFACT_DOMAIN" ] || [ -z "$MDAA_CODEARTIFACT_ACCOUNT" ]; then
        echo "ERROR: Missing required parameters"
        echo "Usage: $0 <version> <repo> <domain> <account> [branch] [--download]"
        exit 1
    fi
}

# Display configuration
show_configuration() {
    echo "=========================================="
    echo "Testing Published NPM Artifacts"
    echo "=========================================="
    echo "Version: $SNAPSHOT_VERSION"
    echo "Repository: $MDAA_CODEARTIFACT_REPO"
    echo "Domain: $MDAA_CODEARTIFACT_DOMAIN"
    echo "Account: $MDAA_CODEARTIFACT_ACCOUNT"
    echo "Branch name: $BRANCH_NAME"
    echo "Download mode: $DOWNLOAD_MODE"
    echo "=========================================="
}

# Setup test environment
setup_test_environment() {
    TEST_DIR=$(mktemp -d)
    echo "Created test directory: $TEST_DIR"
    
    if [ ! -d "$SAMPLE_CONFIG_DIR" ]; then
        echo "ERROR: Sample config directory not found: $SAMPLE_CONFIG_DIR"
        exit 1
    fi
    
    cp -r "$SAMPLE_CONFIG_DIR"/* "$TEST_DIR/"
    cd "$TEST_DIR"
    
    # Update organization field in YAML
    update_yaml_config
}

# Update YAML configuration
update_yaml_config() {
    if [ -n "$BRANCH_NAME" ] && [ -f "mdaa.yaml" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS (BSD sed)
            sed -i '' "s/^organization:.*/organization: \"test-pub-${BRANCH_NAME}\"/" mdaa.yaml
        else
            # Linux (GNU sed)
            sed -i "s/^organization:.*/organization: \"test-pub-${BRANCH_NAME}\"/" mdaa.yaml
        fi
        echo "Updated organization to: test-pub-${BRANCH_NAME}"
    fi
}

# Login to CodeArtifact
login_to_codeartifact() {
    echo "Logging into CodeArtifact..."
    aws codeartifact login \
        --tool npm \
        --repository "$MDAA_CODEARTIFACT_REPO" \
        --domain "$MDAA_CODEARTIFACT_DOMAIN" \
        --domain-owner "$MDAA_CODEARTIFACT_ACCOUNT" \
        --namespace "$NAMESPACE" \
        --region "$REGION"
}

# Test 1: Basic CLI functionality
test_cli_functionality() {
    echo "Test 1: Testing CLI installation and basic functionality..."
    
    if ! npx --yes "${NAMESPACE}/cli@${SNAPSHOT_VERSION}" -c mdaa.yaml synth --mdaa_version "$SNAPSHOT_VERSION"; then
        echo "❌ CLI synth test failed"
        return 1
    fi
    
    echo "✅ CLI synth test passed"
    return 0
}

# Get list of local packages from monorepo
get_local_packages() {
    find "${CI_PROJECT_DIR:-$(dirname "$0")/..}/packages" -name "package.json" -exec jq -r '.name' {} \; | \
        grep "^${NAMESPACE}/" | \
        sed "s|^${NAMESPACE}/||" | \
        sort -u
}

# Test 2: Discover and verify published packages
test_package_discovery() {
    echo "Test 2: Discovering published packages..."
    
    local expected_packages
    expected_packages=$(get_local_packages)

    if [ -z "$expected_packages" ]; then
        echo "❌ No @aws-mdaa packages found in repository"
        return 1
    fi
    
    echo "Found packages:"
    local failed_packages=""
    
    while IFS= read -r pkg; do
        if [ -n "$pkg" ] && [ "$pkg" != "None" ]; then
            if npm view "${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}" version >/dev/null 2>&1; then
                echo "✅ ${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}"
            else
                echo "❌ ${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION} not found"
                failed_packages="$failed_packages $pkg"
            fi
        fi
    done <<< "$expected_packages"
    
    if [ -n "$failed_packages" ]; then
        echo "ERROR: Some packages not found at version $SNAPSHOT_VERSION:$failed_packages"
        return 1
    fi
    
    echo "✅ All packages verified at version $SNAPSHOT_VERSION"
    return 0
}

# Test 3: Validate package metadata
test_package_metadata() {
    echo "Test 3: Validating package metadata..."
    
    local expected_packages
    expected_packages=$(get_local_packages)
    
    while IFS= read -r pkg; do
        if [ -n "$pkg" ] && [ "$pkg" != "None" ]; then
            local pkg_info
            pkg_info=$(npm view "${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}" --json 2>/dev/null || echo '{}')
            
            if [ "$pkg_info" != "{}" ]; then
                local license repository
                license=$(echo "$pkg_info" | jq -r '.license // "unknown"')
                repository=$(echo "$pkg_info" | jq -r '.repository.url // "unknown"')
                echo "  📦 ${NAMESPACE}/${pkg}: license=$license, repo=$repository"
            fi
        fi
    done <<< "$expected_packages"
}

# Test 4: Test different config scenarios
test_config_scenarios() {
    echo "Test 4: Testing different configuration scenarios..."
    
    if [ -f "mdaa-minimal.yaml" ]; then
        echo "  Testing minimal config..."
        if npx --yes "${NAMESPACE}/cli@${SNAPSHOT_VERSION}" -c mdaa-minimal.yaml synth --mdaa_version "$SNAPSHOT_VERSION" >/dev/null; then
            echo "  ✅ Minimal config test passed"
        else
            echo "  ❌ Minimal config test failed"
            return 1
        fi
    fi
    
    echo "Published artifacts are ready for use at version: $SNAPSHOT_VERSION"
    return 0
}

# Download packages for local testing
download_packages() {
    local download_dir="${CI_PROJECT_DIR:-$(pwd)}/target/codeartifact-download"
    echo "Downloading packages for local testing..."
    mkdir -p "$download_dir"
    cd "$download_dir"
    
    local expected_packages
    expected_packages=$(get_local_packages)
    
    # Download packages
    while IFS= read -r package; do
        if [ -n "$package" ] && [ "$package" != "None" ]; then
            echo "Downloading ${NAMESPACE}/${package}..."
            if ! npm pack "${NAMESPACE}/${package}"; then
                echo "Failed to download ${NAMESPACE}/${package}"
                continue
            fi
        fi
    done <<< "$expected_packages"
    
    extract_packages
    validate_package_integrity
}

# Extract downloaded packages
extract_packages() {
    echo "Extracting packages..."
    mkdir -p extracted
    
    for tarball in *.tgz; do
        if [ -f "$tarball" ]; then
            local package_dir="extracted/${tarball%.tgz}"
            mkdir -p "$package_dir"
            tar -xzf "$tarball" -C "$package_dir" --strip-components=1
            echo "Extracted: $tarball"
        fi
    done
}

# Test 5: Validate downloaded package integrity
validate_package_integrity() {
    echo "Test 5: Validating downloaded package integrity..."
    local package_count=0
    
    for pkg_dir in extracted/*/; do
        if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then
            local pkg_name pkg_version
            pkg_name=$(jq -r '.name' "$pkg_dir/package.json" 2>/dev/null || echo "unknown")
            pkg_version=$(jq -r '.version' "$pkg_dir/package.json" 2>/dev/null || echo "unknown")
            
            echo "  ✅ $pkg_name@$pkg_version: package.json found"
            package_count=$((package_count + 1))
            
            # Check for common required files
            [ -f "$pkg_dir/README.md" ] && echo "    ✅ README.md found" || echo "    ⚠️ README.md missing"
            [ -f "$pkg_dir/lib/index.js" ] && echo "    ✅ lib/index.js found" || echo "    ⚠️ lib/index.js missing"
        else
            echo "  ❌ $pkg_dir: Invalid package structure"
        fi
    done
    
    echo "Packages downloaded to: $(pwd)"
    echo "Total packages validated: $package_count"
}

# Cleanup test directory
cleanup() {
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        echo "Cleaned up test directory: $TEST_DIR"
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    validate_parameters
    show_configuration
    
    # Setup cleanup trap
    trap cleanup EXIT
    
    setup_test_environment
    login_to_codeartifact
    
    # Run tests
    test_cli_functionality
    test_package_discovery
    test_package_metadata
    test_config_scenarios
    
    # Download packages if requested
    if [ "$DOWNLOAD_MODE" = true ]; then
        download_packages
    fi
    
    echo "✅ All tests completed successfully"
}

# Run main function with all arguments
main "$@"