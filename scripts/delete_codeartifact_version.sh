#!/bin/bash
# Script to delete all packages of a specific version from CodeArtifact
# Usage: ./delete_codeartifact_version.sh <version> <repo> <domain> <account> <region> <namespace> [--dryrun]

set -euo pipefail

# Global variables
VERSION=""
CODEARTIFACT_REPO=""
CODEARTIFACT_DOMAIN=""
CODEARTIFACT_ACCOUNT=""
CODEARTIFACT_REGION=""
CODEARTIFACT_NAMESPACE=""
NPM_NAMESPACE=""
DRYRUN=false

# Counters
deleted_count=0
not_found_count=0
failed_count=0
would_delete_count=0

# Parse command line arguments
parse_arguments() {
    VERSION="$1"
    CODEARTIFACT_REPO="$2"
    CODEARTIFACT_DOMAIN="$3"
    CODEARTIFACT_ACCOUNT="$4"
    CODEARTIFACT_REGION="$5"
    CODEARTIFACT_NAMESPACE="$6"
    NPM_NAMESPACE="@${CODEARTIFACT_NAMESPACE}"
    
    # Check for optional --dryrun flag
    if [ "${7:-}" = "--dryrun" ]; then
        DRYRUN=true
    fi
}

# Validate required parameters
validate_parameters() {
    if [ -z "$VERSION" ] || [ -z "$CODEARTIFACT_REPO" ] || [ -z "$CODEARTIFACT_DOMAIN" ] || [ -z "$CODEARTIFACT_ACCOUNT" ] || [ -z "$CODEARTIFACT_REGION" ] || [ -z "$CODEARTIFACT_NAMESPACE" ]; then
        echo "ERROR: Missing required parameters"
        echo "Usage: $0 <version> <repo> <domain> <account> <region> <namespace> [--dryrun]"
        exit 1
    fi
}

# Display configuration
show_configuration() {
    echo "=========================================="
    if [ "$DRYRUN" = true ]; then
        echo "DRY RUN - Listing CodeArtifact Packages"
    else
        echo "Deleting CodeArtifact Package Versions"
    fi
    echo "=========================================="
    echo "Version: $VERSION"
    echo "Repository: $CODEARTIFACT_REPO"
    echo "Domain: $CODEARTIFACT_DOMAIN"
    echo "Account: $CODEARTIFACT_ACCOUNT"
    if [ "$DRYRUN" = true ]; then
        echo "Mode: DRY RUN (no deletions will be performed)"
    fi
    echo "=========================================="
    echo ""
}

# Get list of local packages from monorepo
get_local_packages() {
    local project_dir="${CI_PROJECT_DIR:-$(dirname "$0")/..}"
    
    {
        # Find all package.json files in packages/ directory
        find "$project_dir/packages" -name "package.json" -not -path "*/node_modules/*" -exec jq -r '.name' {} \;
        
        # Also check for schemas package at root level
        if [ -f "$project_dir/schemas/package.json" ]; then
            jq -r '.name' "$project_dir/schemas/package.json"
        fi
    } | grep "^${NPM_NAMESPACE}/" | \
        sed "s|^${NPM_NAMESPACE}/||" | \
        sort -u
}

# Delete a package version from CodeArtifact
delete_package_version() {
    local package_name="$1"
    local full_package_name="${NPM_NAMESPACE}/${package_name}"
    
    echo "Checking: $full_package_name@$VERSION"
    
    # Check if version exists
    local version_info
    if ! version_info=$(aws codeartifact describe-package-version \
        --domain "$CODEARTIFACT_DOMAIN" \
        --domain-owner "$CODEARTIFACT_ACCOUNT" \
        --repository "$CODEARTIFACT_REPO" \
        --format npm \
        --namespace "$CODEARTIFACT_NAMESPACE" \
        --package "$package_name" \
        --package-version "$VERSION" \
        --region "$CODEARTIFACT_REGION" \
        2>&1); then
        
        if [[ "$version_info" == *"ResourceNotFoundException"* ]] || [[ "$version_info" == *"does not exist"* ]]; then
            echo "  ⏭️  Version does not exist - skipping"
            not_found_count=$((not_found_count + 1))
            return 0
        else
            echo "  ⚠️  Error checking version: $version_info"
            failed_count=$((failed_count + 1))
            return 1
        fi
    fi
    
    # Version exists
    if [ "$DRYRUN" = true ]; then
        echo "  🔍 Would delete this version (dry run)"
        would_delete_count=$((would_delete_count + 1))
        return 0
    fi
    
    # Delete it
    echo "  🗑️  Deleting version..."
    if aws codeartifact delete-package-versions \
        --domain "$CODEARTIFACT_DOMAIN" \
        --domain-owner "$CODEARTIFACT_ACCOUNT" \
        --repository "$CODEARTIFACT_REPO" \
        --format npm \
        --namespace "$CODEARTIFACT_NAMESPACE" \
        --package "$package_name" \
        --versions "$VERSION" \
        --region "$CODEARTIFACT_REGION" \
        >/dev/null 2>&1; then
        
        echo "  ✅ Deleted successfully"
        deleted_count=$((deleted_count + 1))
        return 0
    else
        echo "  ❌ Failed to delete"
        failed_count=$((failed_count + 1))
        return 1
    fi
}

# Process all packages
process_packages() {
    local expected_packages
    expected_packages=$(get_local_packages)
    
    if [ -z "$expected_packages" ]; then
        echo "ERROR: No ${NPM_NAMESPACE} packages found in repository"
        exit 1
    fi
    
    echo "Found packages to process:"
    echo "$expected_packages" | sed 's/^/  - /'
    echo ""
    
    while IFS= read -r pkg; do
        if [ -n "$pkg" ] && [ "$pkg" != "None" ]; then
            delete_package_version "$pkg"
        fi
    done <<< "$expected_packages"
}

# Show summary
show_summary() {
    echo ""
    echo "=========================================="
    if [ "$DRYRUN" = true ]; then
        echo "Dry Run Summary"
    else
        echo "Deletion Summary"
    fi
    echo "=========================================="
    
    if [ "$DRYRUN" = true ]; then
        echo "🔍 Would delete: $would_delete_count"
        echo "⏭️  Not found: $not_found_count"
        echo "❌ Failed checks: $failed_count"
    else
        echo "✅ Deleted: $deleted_count"
        echo "⏭️  Not found: $not_found_count"
        echo "❌ Failed: $failed_count"
    fi
    echo "=========================================="
    
    if [ "$failed_count" -gt 0 ]; then
        echo ""
        echo "⚠️  Some operations failed. Check the output above for details."
        exit 1
    fi
    
    if [ "$DRYRUN" = true ]; then
        if [ "$would_delete_count" -eq 0 ] && [ "$not_found_count" -eq 0 ]; then
            echo ""
            echo "⚠️  No packages were found."
            exit 1
        fi
        echo ""
        echo "✅ Dry run completed successfully"
        if [ "$would_delete_count" -gt 0 ]; then
            echo "   Run without --dryrun to delete $would_delete_count package(s)"
        fi
    else
        if [ "$deleted_count" -eq 0 ] && [ "$not_found_count" -eq 0 ]; then
            echo ""
            echo "⚠️  No packages were processed."
            exit 1
        fi
        echo ""
        echo "✅ Cleanup completed successfully"
    fi
}

# Main execution
main() {
    parse_arguments "$@"
    validate_parameters
    show_configuration
    process_packages
    show_summary
}

# Run main function with all arguments
main "$@"
