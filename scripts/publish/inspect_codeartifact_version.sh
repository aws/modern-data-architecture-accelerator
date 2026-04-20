#!/bin/bash
# Script to inspect all packages of a specific version from CodeArtifact
# Usage: ./inspect_codeartifact_version.sh <version> <repo> <domain> <account> <region> <namespace>

set -euo pipefail

# Global variables
VERSION=""
CODEARTIFACT_REPO=""
CODEARTIFACT_DOMAIN=""
CODEARTIFACT_ACCOUNT=""
CODEARTIFACT_REGION=""
CODEARTIFACT_NAMESPACE=""
NPM_NAMESPACE=""

# Counters
found_count=0
not_found_count=0
failed_count=0

# Parse command line arguments
parse_arguments() {
    VERSION="$1"
    CODEARTIFACT_REPO="$2"
    CODEARTIFACT_DOMAIN="$3"
    CODEARTIFACT_ACCOUNT="$4"
    CODEARTIFACT_REGION="$5"
    CODEARTIFACT_NAMESPACE="$6"
    NPM_NAMESPACE="@${CODEARTIFACT_NAMESPACE}"
}

# Validate required parameters
validate_parameters() {
    if [ -z "$VERSION" ] || [ -z "$CODEARTIFACT_REPO" ] || [ -z "$CODEARTIFACT_DOMAIN" ] || [ -z "$CODEARTIFACT_ACCOUNT" ] || [ -z "$CODEARTIFACT_REGION" ] || [ -z "$CODEARTIFACT_NAMESPACE" ]; then
        echo "ERROR: Missing required parameters"
        echo "Usage: $0 <version> <repo> <domain> <account> <region> <namespace>"
        exit 1
    fi
}

# Display configuration
show_configuration() {
    echo "=========================================="
    echo "Inspecting CodeArtifact Package Versions"
    echo "=========================================="
    echo "Version: $VERSION"
    echo "Repository: $CODEARTIFACT_REPO"
    echo "Domain: $CODEARTIFACT_DOMAIN"
    echo "Account: $CODEARTIFACT_ACCOUNT"
    echo "=========================================="
    echo ""
}

# Get list of packages from CodeArtifact repository
get_codeartifact_packages() {
    echo "Fetching packages from CodeArtifact repository..." >&2
    
    local next_token=""
    local all_packages=""
    
    while true; do
        local cmd="aws codeartifact list-packages \
            --domain \"$CODEARTIFACT_DOMAIN\" \
            --domain-owner \"$CODEARTIFACT_ACCOUNT\" \
            --repository \"$CODEARTIFACT_REPO\" \
            --format npm \
            --namespace \"$CODEARTIFACT_NAMESPACE\" \
            --region \"$CODEARTIFACT_REGION\""
        
        if [ -n "$next_token" ]; then
            cmd="$cmd --next-token \"$next_token\""
        fi
        
        local response
        if ! response=$(eval "$cmd" 2>&1); then
            echo "ERROR: Failed to list packages from CodeArtifact" >&2
            echo "$response" >&2
            exit 1
        fi
        
        # Extract package names from this page
        local page_packages
        page_packages=$(echo "$response" | jq -r '.packages[]?.package // empty')
        
        if [ -n "$page_packages" ]; then
            if [ -z "$all_packages" ]; then
                all_packages="$page_packages"
            else
                all_packages="$all_packages"$'\n'"$page_packages"
            fi
        fi
        
        # Check for next token
        next_token=$(echo "$response" | jq -r '.nextToken // empty')
        
        if [ -z "$next_token" ]; then
            break
        fi
    done
    
    if [ -z "$all_packages" ]; then
        echo "WARNING: No packages found with namespace '$CODEARTIFACT_NAMESPACE' in repository" >&2
        return 1
    fi
    
    echo "$all_packages" | sort -u
}

# Inspect a package version from CodeArtifact
inspect_package_version() {
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
            echo "  ⏭️  Version does not exist"
            not_found_count=$((not_found_count + 1))
            return 0
        else
            echo "  ⚠️  Error checking version: $version_info"
            failed_count=$((failed_count + 1))
            return 1
        fi
    fi
    
    # Version exists - display details
    echo "  ✅ Found version"
    found_count=$((found_count + 1))
    
    # Extract and display key information
    local status
    local published_time
    status=$(echo "$version_info" | jq -r '.packageVersion.status // "unknown"')
    published_time=$(echo "$version_info" | jq -r '.packageVersion.publishedTime // "unknown"')
    
    echo "     Status: $status"
    echo "     Published: $published_time"
    
    return 0
}

# Process all packages
process_packages() {
    local codeartifact_packages
    if ! codeartifact_packages=$(get_codeartifact_packages); then
        exit 1
    fi
    
    local package_count
    package_count=$(echo "$codeartifact_packages" | wc -l | tr -d ' ')
    
    echo "Found $package_count package(s) to inspect:"
    echo "$codeartifact_packages" | sed 's/^/  - /'
    echo ""
    
    while IFS= read -r pkg; do
        if [ -n "$pkg" ] && [ "$pkg" != "None" ]; then
            inspect_package_version "$pkg"
        fi
    done <<< "$codeartifact_packages"
}

# Show summary
show_summary() {
    echo ""
    echo "=========================================="
    echo "Inspection Summary"
    echo "=========================================="
    echo "✅ Found: $found_count"
    echo "⏭️  Not found: $not_found_count"
    echo "❌ Failed: $failed_count"
    echo "=========================================="
    
    if [ "$failed_count" -gt 0 ]; then
        echo ""
        echo "⚠️  Some operations failed. Check the output above for details."
        exit 1
    fi
    
    if [ "$found_count" -eq 0 ] && [ "$not_found_count" -eq 0 ]; then
        echo ""
        echo "⚠️  No packages were found."
        exit 1
    fi
    
    echo ""
    echo "✅ Inspection completed successfully"
    if [ "$found_count" -gt 0 ]; then
        echo "   Found $found_count package(s) with version $VERSION"
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
