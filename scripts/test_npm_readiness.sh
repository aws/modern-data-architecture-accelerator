#!/bin/bash
# Test NPM publishing readiness with optional publishing
# Usage: ./test_npm_readiness.sh [--publish] [--limit N] [--otp CODE]

set -euo pipefail

# Constants
readonly PACKAGE_DIR="target/codeartifact-download/extracted"
readonly EXPECTED_REPO_URL="git+https://github.com/aws/modern-data-architecture-accelerator.git"
readonly NPM_REGISTRY="https://registry.npmjs.org/"

# Global variables
PUBLISH_MODE=false
LIMIT=0
OTP_CODE=""
SCRIPT_DIR="$(pwd)"
CACHE_DIR="$SCRIPT_DIR/target/npm-cache"
CACHE_FILE="$CACHE_DIR/package-versions.json"

# Counters
processed_count=0
success_count=0
published_count=0
skipped_count=0

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --publish)
                PUBLISH_MODE=true
                shift
                ;;
            --limit)
                LIMIT="$2"
                shift 2
                ;;
            --otp)
                OTP_CODE="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--publish] [--limit N] [--otp CODE]"
                exit 1
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    if [ ! -d "$PACKAGE_DIR" ]; then
        echo "Package directory not found: $PACKAGE_DIR"
        echo "Run: ./scripts/test_published_artifacts.sh <version> <repo> <domain> <account> <branch> --download"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        echo "Error: jq is required but not installed"
        exit 1
    fi
}

# Display configuration
show_configuration() {
    if [ "$PUBLISH_MODE" = true ]; then
        echo "NPM Publishing Mode (REAL PUBLISHING)"
        if [ "$LIMIT" -gt 0 ]; then
            echo "Limit: $LIMIT packages per run"
        fi
        if [ -z "$OTP_CODE" ]; then
            echo "⚠️  WARNING: No OTP provided. If your account requires 2FA, publishing will fail."
            echo "   Use: --otp <6-digit-code> from your authenticator app"
        else
            echo "🔐 Using OTP for 2FA authentication"
        fi
    else
        echo "Testing NPM publish readiness (DRY RUN ONLY)"
    fi
    echo "Package directory: $PACKAGE_DIR"
}

# Clear CodeArtifact registry configurations
clear_codeartifact_configs() {
    echo "Clearing @aws-mdaa scoped registry..."
    npm config delete @aws-mdaa:registry 2>/dev/null || true
    
    # Clear any CodeArtifact auth tokens dynamically
    local codeartifact_configs
    codeartifact_configs=$(npm config list | grep -E "//.*\.d\.codeartifact\..*.amazonaws\.com/npm/.*/:_authToken" | cut -d'=' -f1 || true)
    
    if [ -n "$codeartifact_configs" ]; then
        while IFS= read -r config_key; do
            if [ -n "$config_key" ]; then
                echo "Clearing CodeArtifact token: $config_key"
                npm config delete "$config_key" 2>/dev/null || true
            fi
        done <<< "$codeartifact_configs"
    fi
}

# Configure NPM registry
configure_npm_registry() {
    echo "Setting NPM registry to public NPM..."
    npm config set registry "$NPM_REGISTRY"
    
    clear_codeartifact_configs
    
    echo "Current registry: $(npm config get registry)"
}

# Initialize cache system
init_cache() {
    mkdir -p "$CACHE_DIR"
    
    if [ ! -f "$CACHE_FILE" ]; then
        echo '{}' > "$CACHE_FILE"
    fi
    
    echo "📁 Using local cache: $CACHE_FILE"
}

# Update package version cache
update_cache() {
    local pkg_name="$1"
    local version="$2"
    
    if jq --arg pkg "$pkg_name" --arg ver "$version" '.[$pkg] = $ver' "$CACHE_FILE" > "$CACHE_FILE.tmp" 2>/dev/null; then
        mv "$CACHE_FILE.tmp" "$CACHE_FILE" || echo "  ⚠️  Warning: Could not update cache"
    else
        echo "  ⚠️  Warning: Could not update cache"
        rm -f "$CACHE_FILE.tmp"
    fi
}

# Get NPM version from registry or cache
get_npm_version() {
    local pkg_name="$1"
    local cached_version
    
    cached_version=$(jq -r --arg pkg "$pkg_name" '.[$pkg] // "CACHE_MISS"' "$CACHE_FILE" 2>/dev/null || echo "CACHE_MISS")
    
    if [ "$cached_version" != "CACHE_MISS" ]; then
        echo "$cached_version"
        return
    fi
    
    local npm_check_output npm_check_exit npm_version
    npm_check_output=$(npm view "$pkg_name" version 2>&1)
    npm_check_exit=$?
    
    case "$npm_check_exit:$npm_check_output" in
        0:*)
            if [[ "$npm_check_output" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
                npm_version="$npm_check_output"
            else
                npm_version="NOT_FOUND"
            fi
            ;;
        *:*E404*|*:*"Not found"*|*:*404*)
            npm_version="NOT_FOUND"
            ;;
        *:*E403*|*:*Forbidden*)
            npm_version="ACCESS_DENIED"
            ;;
        *)
            npm_version="NOT_FOUND"
            ;;
    esac
    
    update_cache "$pkg_name" "$npm_version"
    echo "$npm_version"
}

# Check if package should be skipped
should_skip_package() {
    local pkg_name="$1"
    local local_version="$2"
    local npm_version="$3"
    
    # Skip if already published (idempotent)
    if [ "$npm_version" != "NOT_FOUND" ] && [ "$npm_version" != "ACCESS_DENIED" ] && [ "$npm_version" != "UNKNOWN" ] && [ "$local_version" = "$npm_version" ]; then
        echo "  ⏭️  Already published - skipping..."
        skipped_count=$((skipped_count + 1))
        return 0
    fi
    
    # Skip if local version is older
    if [ "$npm_version" != "NOT_FOUND" ] && [ "$npm_version" != "ACCESS_DENIED" ] && [ "$npm_version" != "UNKNOWN" ] && [[ "$local_version" < "$npm_version" ]]; then
        echo "  ❌ Local version is older - version bump needed"
        return 0
    fi
    
    return 1
}

# Validate package repository URL
validate_repository_url() {
    local repo_url
    if repo_url=$(jq -r '.repository.url // "unknown"' "package.json" 2>/dev/null); then
        if [ "$repo_url" != "$EXPECTED_REPO_URL" ] && [ "$repo_url" != "unknown" ]; then
            echo "  ⚠️  Repository URL: $repo_url"
        fi
    else
        echo "  ⚠️  Warning: Could not read repository URL from package.json"
    fi
}

# Handle publish errors with specific recovery instructions
handle_publish_error() {
    local pkg_name="$1"
    local publish_output="$2"
    
    echo "  ❌ Publish failed - EXITING ON FIRST FAILURE:"
    show_progress_summary "$pkg_name"
    
    if [[ "$publish_output" == *"EOTP"* ]] || [[ "$publish_output" == *"one-time password"* ]] || [[ "$publish_output" == *"OTP"* ]]; then
        echo "🔐 OTP EXPIRED OR INVALID"
        echo "Your one-time password has expired or is invalid."
        echo ""
        echo "To continue publishing:"
        echo "1. Get a new 6-digit code from your authenticator app"
        echo "2. Re-run the command with the new OTP:"
        echo "   ./scripts/test_npm_readiness.sh --publish --limit $LIMIT --otp <NEW_CODE>"
        echo ""
        echo "The script will automatically skip the $published_count already published packages"
        echo "and continue from where it left off."
    elif [[ "$publish_output" == *"E402"* ]] || [[ "$publish_output" == *"Payment Required"* ]]; then
        echo "    💳 Payment Required - Scoped packages need --access public flag"
    elif [[ "$publish_output" == *"E403"* ]] || [[ "$publish_output" == *"Forbidden"* ]]; then
        echo "    🚫 Forbidden - Check if you have publish permissions for @aws-mdaa scope"
    else
        echo "    ❌ Error: $publish_output"
    fi
}

# Show progress summary
show_progress_summary() {
    local failed_pkg="${1:-}"
    
    echo ""
    echo "=== PUBLISHING PROGRESS SUMMARY ==="
    echo "📊 Packages processed: $processed_count"
    echo "✅ Successfully published: $published_count"
    echo "⏭️ Already published (skipped): $skipped_count"
    if [ "$LIMIT" -gt 0 ]; then
        local remaining=$((LIMIT - published_count))
        echo "🎯 Remaining to reach limit: $remaining"
    fi
    if [ -n "$failed_pkg" ]; then
        echo "❌ Failed on package: $failed_pkg"
    fi
    echo ""
}

# Attempt to publish a package
publish_package() {
    local pkg_name="$1"
    local local_version="$2"
    
    echo "  🚀 Publishing to NPM..."
    
    local publish_cmd="npm publish --access public"
    if [ -n "$OTP_CODE" ]; then
        publish_cmd="$publish_cmd --otp=$OTP_CODE"
    fi
    
    local publish_output publish_exit_code
    if ! publish_output=$(eval "$publish_cmd" 2>&1); then
        publish_exit_code=$?
    else
        publish_exit_code=0
    fi
    
    if [ $publish_exit_code -eq 0 ]; then
        echo "  ✅ Published successfully"
        published_count=$((published_count + 1))
        success_count=$((success_count + 1))
        update_cache "$pkg_name" "$local_version"
        return 0
    fi
    
    # Handle specific success cases that appear as errors
    if [[ "$publish_output" == *"cannot publish over the previously published versions"* ]] || [[ "$publish_output" == *"You cannot publish over the previously published versions"* ]]; then
        echo "  ✅ Already published - version $local_version exists (npm cache not updated yet)"
        published_count=$((published_count + 1))
        success_count=$((success_count + 1))
        update_cache "$pkg_name" "$local_version"
        return 0
    elif [[ "$publish_output" == *"auto-corrected"* ]] && [[ "$publish_output" == *"+ @aws-mdaa"* ]]; then
        echo "  ✅ Published successfully (with auto-corrections)"
        published_count=$((published_count + 1))
        success_count=$((success_count + 1))
        update_cache "$pkg_name" "$local_version"
        return 0
    fi
    
    handle_publish_error "$pkg_name" "$publish_output"
    return 1
}

# Process a single package
process_package() {
    local pkg_file="$1"
    local pkg_name pkg_dir local_version npm_version
    
    pkg_name=$(jq -r '.name' "$pkg_file" 2>/dev/null)
    pkg_dir=$(dirname "$pkg_file")
    
    # Only process @aws-mdaa packages
    if [[ "$pkg_name" != @aws-mdaa/* ]]; then
        return 0
    fi
    
    # Check limit
    if [ "$LIMIT" -gt 0 ] && [ "$published_count" -ge "$LIMIT" ]; then
        echo "Reached limit of $LIMIT successful publishes, stopping"
        return 1
    fi
    
    echo "Processing: $pkg_name"
    
    if ! cd "$pkg_dir"; then
        echo "  ❌ Failed to change to package directory: $pkg_dir"
        return 0
    fi
    
    processed_count=$((processed_count + 1))
    
    local_version=$(jq -r '.version' "package.json" 2>/dev/null || echo "unknown")
    
    echo "  🌐 Checking NPM registry..."
    npm_version=$(get_npm_version "$pkg_name")
    echo "  📊 Local: $local_version, NPM: $npm_version"
    
    if should_skip_package "$pkg_name" "$local_version" "$npm_version"; then
        cd - >/dev/null 2>&1 || echo "  ⚠️  Warning: Failed to return to previous directory"
        return 0
    fi
    
    # Handle access denied case
    if [ "$npm_version" = "ACCESS_DENIED" ]; then
        echo "  ⚠️  Cannot check existing versions - no read access to @aws-mdaa scope"
        echo "  💡 This suggests you may not have publish permissions either"
    fi
    
    validate_repository_url
    
    # Test dry-run first
    if ! npm publish --dry-run >/dev/null 2>&1; then
        echo "  ❌ Dry-run failed - skipping"
        cd - >/dev/null 2>&1 || echo "  ⚠️  Warning: Failed to return to previous directory"
        return 0
    fi
    
    if [ "$PUBLISH_MODE" = true ]; then
        if ! publish_package "$pkg_name" "$local_version"; then
            cd - >/dev/null 2>&1 || echo "  ⚠️  Warning: Failed to return to previous directory"
            return 1
        fi
    else
        echo "  ✅ Dry-run successful - ready to publish"
        success_count=$((success_count + 1))
    fi
    
    cd - >/dev/null 2>&1 || echo "  ⚠️  Warning: Failed to return to previous directory"
    return 0
}

# Process all packages
process_packages() {
    while IFS= read -r -d '' pkg_file; do
        if ! process_package "$pkg_file"; then
            exit 1
        fi
    done < <(find "$PACKAGE_DIR" -name "package.json" -not -path "*/node_modules/*" -print0)
}
# Show final summary
show_final_summary() {
    if [ "$PUBLISH_MODE" = true ]; then
        echo "Publishing complete: $published_count published, $skipped_count skipped, $processed_count processed"
    else
        echo "Test complete: $success_count/$processed_count packages passed dry-run, $skipped_count already published"
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    validate_prerequisites
    show_configuration
    configure_npm_registry
    init_cache
    process_packages
    show_final_summary
}

# Run main function with all arguments
main "$@"