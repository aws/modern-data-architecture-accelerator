#!/bin/bash
set -e

echo "Validating package dependencies..."

# Check if package-lock.json is in sync with package.json
if ! npm ci --dry-run --ignore-scripts > /tmp/npm_ci_output 2>&1; then
    echo "ERROR: package-lock.json is out of sync with package.json"
    echo "Details:"
    cat /tmp/npm_ci_output | grep -E "(Missing|npm error|EUSAGE)" || cat /tmp/npm_ci_output
    echo ""
    echo "To fix: Run 'npm install' to update the lock file"
    exit 1
fi

echo "✓ Dependencies are in sync"

# Add NPM publishing validation
if [ "$1" = "--npm-ready" ]; then
    PACKAGE_DIR="target/codeartifact-download/extracted"
    
    if [ -d "$PACKAGE_DIR" ]; then
        echo "Validating packages for NPM publishing in: $PACKAGE_DIR"
        
        if ! find "$PACKAGE_DIR" -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | while read -r pkg_file; do
            pkg_name=$(jq -r '.name' "$pkg_file" 2>/dev/null) || { echo "Error reading $pkg_file"; continue; }
            pkg_dir=$(dirname "$pkg_file") || { echo "Error getting directory for $pkg_file"; continue; }
            
            if [[ "$pkg_name" == @aws-mdaa/* ]]; then
                echo "Checking: $pkg_name"
                
                # Check required fields
                for field in "name" "version" "license"; do
                    if field_value=$(jq -r ".$field" "$pkg_file" 2>/dev/null) && [ "$field_value" = "null" ]; then
                        echo "  ❌ Missing $field"
                    elif [ -z "$field_value" ]; then
                        echo "  ❌ Error reading $field from $pkg_file"
                    fi
                done
                
                # Check for built files
                if [ ! -d "$pkg_dir/lib" ] && [ ! -d "$pkg_dir/dist" ] && [ ! -d "$pkg_dir/build" ]; then
                    echo "  ❌ No built files"
                fi
                
                echo "  ✅ $pkg_name validated"
            fi
        done; then
            echo "Error processing package files"
            exit 1
        fi
        
        echo "NPM publishing validation complete."
    else
        echo "No downloaded packages found. Run test_published_artifacts.sh --download first."
    fi
fi