#!/bin/bash
# Lint all Python tool projects under tools/

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

if ! command -v uv >/dev/null 2>&1; then
    echo "❌ uv is required but not found." >&2
    exit 1
fi

TOOL_PROJECTS=$(find "$PROJECT_ROOT/tools" -name "pyproject.toml" -maxdepth 2 -type f | sed 's|/pyproject.toml||')

if [ -z "$TOOL_PROJECTS" ]; then
    echo "No tool projects found."
    exit 0
fi

FAILED=()

for tool in $TOOL_PROJECTS; do
    name=$(basename "$tool")
    echo ""
    echo "========================================="
    echo "Linting: $name"
    echo "========================================="

    if uv run --project "$tool" ruff check "$tool"; then
        echo "✅ $name passed"
    else
        echo "❌ $name failed"
        FAILED+=("$name")
    fi
done

echo ""
echo "========================================="
echo "Lint Summary"
echo "========================================="

if [ ${#FAILED[@]} -gt 0 ]; then
    echo "Failed: ${FAILED[*]}"
    exit 1
fi

echo "All projects passed."
