#!/bin/bash
# Script to test published NPM artifacts in CodeArtifact.
# Verifies all packages are published, then runs a comprehensive CDK synth
# against every app's sample config to validate packages are functional.
#
# Usage: ./test_published_artifacts.sh <version> <repo> <domain> <account> [branch] [--download] [--apps app1,app2,...]

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Constants
readonly REGION="us-east-1"
readonly NAMESPACE="@aws-mdaa"

# Packages to exclude from comprehensive synth (not deployable apps)
# Excluded packages and reasons:
#   @aws-mdaa/app        - Base framework class, not a deployable CDK app
#   @aws-mdaa/bootstrap  - CDK bootstrap utility, not a deployable module
#   @aws-mdaa/testing    - Internal test utility, not published for customers
#   @aws-mdaa/dataops-shared - Shared library (lives in apps/ but has no bin entrypoint)
readonly EXCLUDED_PACKAGES="@aws-mdaa/app @aws-mdaa/bootstrap @aws-mdaa/testing @aws-mdaa/dataops-shared"

# Global variables
SNAPSHOT_VERSION=""
MDAA_CODEARTIFACT_REPO=""
MDAA_CODEARTIFACT_DOMAIN=""
MDAA_CODEARTIFACT_ACCOUNT=""
BRANCH_NAME=""
DOWNLOAD_MODE=false
FILTER_APPS=""
KEEP_TEST_DIR=false
TEST_DIR=""
PROJECT_DIR="${CI_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Parse command line arguments
parse_arguments() {
    SNAPSHOT_VERSION="$1"
    MDAA_CODEARTIFACT_REPO="$2"
    MDAA_CODEARTIFACT_DOMAIN="$3"
    MDAA_CODEARTIFACT_ACCOUNT="$4"
    BRANCH_NAME="${5:-}"

    shift 4
    shift || true
    for arg in "$@"; do
        case "$arg" in
            --download) DOWNLOAD_MODE=true ;;
            --apps=*) FILTER_APPS="${arg#--apps=}" ;;
            --apps) echo "ERROR: --apps requires a value (e.g. --apps=app1,app2)"; exit 1 ;;
            --keep) KEEP_TEST_DIR=true ;;
        esac
    done
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
    echo "Filter apps: ${FILTER_APPS:-all}"
    echo "Project dir: $PROJECT_DIR"
    echo "=========================================="
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

# Get list of local packages from monorepo, applying --apps filter and exclusions
get_local_packages() {
    local all_packages
    all_packages=$(find "$PROJECT_DIR/packages" -name "package.json" -not -path "*/node_modules/*" -not -path "*/test/*" -exec jq -r '.name // empty' {} \; | \
        grep "^${NAMESPACE}/" | \
        sort -u)

    local filtered=""

    if [ -n "$FILTER_APPS" ]; then
        # Validate each --apps entry exists, then use only those
        local not_found=""
        IFS=',' read -ra filter_list <<< "$FILTER_APPS"
        for f in "${filter_list[@]}"; do
            if echo "$all_packages" | grep -q "^${NAMESPACE}/${f}$"; then
                filtered="${filtered}${NAMESPACE}/${f}"$'\n'
            elif echo "$all_packages" | grep -q "^${f}$"; then
                filtered="${filtered}${f}"$'\n'
            else
                not_found="${not_found} ${f}"
            fi
        done
        if [ -n "$not_found" ]; then
            echo "ERROR: The following --apps entries did not match any package:${not_found}" >&2
            return 1
        fi
    else
        # No filter: include all except excluded packages
        while IFS= read -r pkg; do
            [ -z "$pkg" ] && continue
            local excluded=false
            for ex in $EXCLUDED_PACKAGES; do
                if [ "$pkg" = "$ex" ]; then
                    excluded=true
                    break
                fi
            done
            if [ "$excluded" = false ]; then
                filtered="${filtered}${pkg}"$'\n'
            fi
        done <<< "$all_packages"
    fi

    echo "$filtered" | sed '/^$/d' | sed "s|^${NAMESPACE}/||"
}

# --- Test 1: Verify all packages are published ---

test_package_discovery() {
    echo ""
    echo "=========================================="
    echo "Test 1: Verifying all packages are published"
    echo "=========================================="

    local expected_packages
    expected_packages=$(get_local_packages)

    if [ -z "$expected_packages" ]; then
        echo "ERROR: No @aws-mdaa packages found in repository"
        return 1
    fi

    local failed_packages=""
    local count=0

    while IFS= read -r pkg; do
        if [ -n "$pkg" ] && [ "$pkg" != "None" ]; then
            if npm view "${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}" version >/dev/null 2>&1; then
                echo "  OK: ${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}"
            else
                echo "  MISSING: ${NAMESPACE}/${pkg}@${SNAPSHOT_VERSION}"
                failed_packages="$failed_packages $pkg"
            fi
            count=$((count + 1))
        fi
    done <<< "$expected_packages"

    if [ -n "$failed_packages" ]; then
        echo ""
        echo "ERROR: Packages not found at version $SNAPSHOT_VERSION:$failed_packages"
        return 1
    fi

    echo ""
    echo "All $count packages verified at version $SNAPSHOT_VERSION"
    return 0
}

# --- Test 2: Comprehensive synth against all app sample configs ---

is_excluded() {
    local pkg="$1"
    for ex in $EXCLUDED_PACKAGES; do
        if [ "$pkg" = "$ex" ]; then
            return 0
        fi
    done
    return 1
}

discover_app_packages() {
    local apps_dir="$PROJECT_DIR/packages/apps"
    local packages=()
    local missing_config=()

    while IFS= read -r pkg_json; do
        local pkg_dir
        pkg_dir="$(dirname "$pkg_json")"
        local pkg_name
        pkg_name="$(jq -r '.name // empty' "$pkg_json")"

        if [ -z "$pkg_name" ]; then
            continue
        fi

        local short_name="${pkg_name#${NAMESPACE}/}"

        # If --apps is specified, only include matching packages
        if [ -n "$FILTER_APPS" ]; then
            local matched=false
            IFS=',' read -ra filter_list <<< "$FILTER_APPS"
            for f in "${filter_list[@]}"; do
                if [ "$f" = "$pkg_name" ] || [ "$f" = "$short_name" ]; then
                    matched=true
                    break
                fi
            done
            if [ "$matched" = false ]; then
                continue
            fi
        else
            # Apply exclusion list only when not using --apps
            if is_excluded "$pkg_name"; then
                continue
            fi
        fi

        local comprehensive_config="${pkg_dir}/sample_configs/sample-config-comprehensive.yaml"
        if [ -f "$comprehensive_config" ]; then
            packages+=("${pkg_name}|${pkg_dir}")
        else
            missing_config+=("$pkg_name")
        fi
    done < <(find "$apps_dir" -name "package.json" -not -path "*/node_modules/*" -not -path "*/test/*" | sort)

    if [ ${#missing_config[@]} -gt 0 ]; then
        echo "ERROR: The following apps are missing sample-config-comprehensive.yaml:" >&2
        for pkg in "${missing_config[@]}"; do
            echo "  - $pkg" >&2
        done
        echo "Either add the config or add them to the exclusion list." >&2
        return 1
    fi

    echo "${packages[@]}"
}

discover_context_variables() {
    local apps_dir="$PROJECT_DIR/packages/apps"
    find "$apps_dir" -name "sample-config-comprehensive.yaml" \
        -exec grep -oh '{{context:[^}]*}}' {} \; 2>/dev/null |
        sed 's/{{context://;s/}}//' |
        sort -u
}

generate_comprehensive_mdaa_yaml() {
    local test_dir="$1"
    shift
    local packages=("$@")

    local yaml_file="${test_dir}/mdaa.yaml"

    cat >"$yaml_file" <<'HEADER'
region: default
organization: "publish-validation-test"
tag_configs: []
HEADER

    local context_vars
    context_vars=$(discover_context_variables)

    # Build a map of context variable name -> stub account value
    # Stored as newline-separated "name=value" pairs for bash 3 compatibility
    local context_map=""
    if [ -n "$context_vars" ]; then
        echo "" >>"$yaml_file"
        echo "context:" >>"$yaml_file"
        local account_stub=111111111111
        while IFS= read -r var; do
            if [ -n "$var" ]; then
                echo "  ${var}: \"${account_stub}\"" >>"$yaml_file"
                context_map="${context_map}${var}=${account_stub}"$'\n'
                account_stub=$((account_stub + 111111111111))
            fi
        done <<<"$context_vars"
    fi

    cat >>"$yaml_file" <<'DOMAINS'

domains:
  validation:
    environments:
      test:
        account: default
        modules:
DOMAINS

    local module_index=0
    for entry in "${packages[@]}"; do
        IFS='|' read -r pkg_name pkg_dir <<<"$entry"

        local module_name
        module_name="$(echo "$pkg_name" | sed "s|^${NAMESPACE}/||")"

        local sample_configs_dir="${pkg_dir}/sample_configs"
        local target_configs_dir="${test_dir}/module-configs/${module_name}"

        mkdir -p "$target_configs_dir"
        cp -r "$sample_configs_dir"/* "$target_configs_dir/"

        local config_path="./module-configs/${module_name}/sample-config-comprehensive.yaml"

        # Find account context variables referenced by this module's sample config
        local module_account_vars
        module_account_vars=$(grep -oh '{{context:account[^}]*}}' \
            "${pkg_dir}/sample_configs/sample-config-comprehensive.yaml" 2>/dev/null | \
            sed 's/{{context://;s/}}//' | sort -u || true)

        cat >>"$yaml_file" <<EOF
          ${module_name}-${module_index}:
            module_path: "${pkg_name}"
            module_configs:
              - ${config_path}
EOF

        if [ -n "$module_account_vars" ]; then
            echo "            additional_accounts:" >>"$yaml_file"
            while IFS= read -r acc_var; do
                if [ -n "$acc_var" ]; then
                    local acc_value
                    acc_value=$(echo "$context_map" | grep "^${acc_var}=" | cut -d= -f2)
                    if [ -n "$acc_value" ]; then
                        echo "              - '${acc_value}'" >>"$yaml_file"
                    fi
                fi
            done <<<"$module_account_vars"
        fi

        module_index=$((module_index + 1))
    done

    echo "Generated mdaa.yaml with $module_index modules"

    # Create placeholder files for any relative paths referenced outside sample_configs
    # (e.g., seedCodePath: "../test/test-seed-code.zip")
    mkdir -p "$test_dir/module-configs/test"
    touch "$test_dir/module-configs/test/test-seed-code.zip"
}

test_comprehensive_synth() {
    echo ""
    echo "=========================================="
    echo "Test 2: Comprehensive synth (all apps)"
    echo "=========================================="

    local package_list
    package_list=$(discover_app_packages)

    local packages=()
    read -ra packages <<<"$package_list"

    if [ ${#packages[@]} -eq 0 ]; then
        echo "ERROR: No app packages discovered for comprehensive synth."
        return 1
    fi

    echo "Discovered ${#packages[@]} app packages to validate."

    # Generate comprehensive config
    generate_comprehensive_mdaa_yaml "$TEST_DIR" "${packages[@]}"

    # Run synth
    echo ""
    echo "Running comprehensive synth..."
    local npm_tag_arg=""
    if [ -n "$BRANCH_NAME" ]; then
        npm_tag_arg="--tag $BRANCH_NAME"
    fi

    cd "$TEST_DIR"
    local artifact_dir="${CI_PROJECT_DIR:-$TEST_DIR}/publish-validation-artifacts"
    mkdir -p "$artifact_dir"

    # Copy generated configs for debugging/artifact download
    cp "$TEST_DIR/mdaa.yaml" "$artifact_dir/"
    cp -r "$TEST_DIR/module-configs" "$artifact_dir/"

    local synth_log="$artifact_dir/synth-output.log"
    if ! npx --yes "${NAMESPACE}/cli@${SNAPSHOT_VERSION}" \
        -c "$TEST_DIR/mdaa.yaml" \
        synth \
        --mdaa_version "$SNAPSHOT_VERSION" \
        $npm_tag_arg > "$synth_log" 2>&1; then
        echo ""
        echo "ERROR: Comprehensive synth failed. Last 200 lines of output:"
        tail -200 "$synth_log"
        echo ""
        echo "Full artifacts available at: publish-validation-artifacts/"
        return 1
    fi

    echo ""
    echo "Comprehensive synth passed for all ${#packages[@]} apps"
    return 0
}

# --- Test 3: Download and validate packages (optional) ---

download_packages() {
    local download_dir="${PROJECT_DIR}/target/codeartifact-download"
    echo ""
    echo "=========================================="
    echo "Test 3: Download and validate packages"
    echo "=========================================="
    mkdir -p "$download_dir"
    cd "$download_dir"

    local expected_packages
    expected_packages=$(get_local_packages)

    while IFS= read -r package; do
        if [ -n "$package" ] && [ "$package" != "None" ]; then
            echo "Downloading ${NAMESPACE}/${package}..."
            if ! npm pack "${NAMESPACE}/${package}"; then
                echo "Failed to download ${NAMESPACE}/${package}"
                continue
            fi
        fi
    done <<< "$expected_packages"

    validate_tarball_paths
    extract_packages
    echo ""
    echo "Packages downloaded to: $(pwd)"
}

validate_tarball_paths() {
    echo "Validating tarball paths..."
    local failed=false

    for tarball in *.tgz; do
        if [ -f "$tarball" ]; then
            local bad_paths
            bad_paths=$(tar -tzf "$tarball" 2>/dev/null | grep '\.\.' || true)
            if [ -n "$bad_paths" ]; then
                echo "  ERROR: $tarball contains path traversal entries:"
                echo "$bad_paths"
                failed=true
            fi
        fi
    done

    if [ "$failed" = true ]; then
        echo "ERROR: One or more tarballs contain '..' path traversal."
        return 1
    fi
    echo "  All tarballs validated — no path traversal found."
}

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

# Cleanup test directory
cleanup() {
    if [ "$KEEP_TEST_DIR" = true ]; then
        echo "Keeping test directory: $TEST_DIR"
        return
    fi
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

    TEST_DIR=$(mktemp -d)
    echo "Test directory: $TEST_DIR"
    trap cleanup EXIT

    login_to_codeartifact

    # Test 1: Verify all packages exist in CodeArtifact
    test_package_discovery

    # Test 2: Comprehensive synth with all app sample configs
    test_comprehensive_synth

    # Test 3: Download and validate (optional)
    if [ "$DOWNLOAD_MODE" = true ]; then
        download_packages
    fi

    echo ""
    echo "=========================================="
    echo "All tests completed successfully"
    echo "  Version: $SNAPSHOT_VERSION"
    echo "=========================================="
}

main "$@"
