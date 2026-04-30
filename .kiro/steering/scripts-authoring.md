---
inclusion: fileMatch
fileMatchPattern: 'scripts/**'
---

# Scripts Authoring Standards

Standards for writing and organizing scripts under `./scripts/`. Activates automatically when any file under `scripts/` is read or modified.

## Directory Structure

Scripts are organized by **purpose**, not by language:

```
scripts/
├── build/          # Package and repo build orchestration
├── ci/             # CI pipeline helpers (credential vending, branch checks)
├── generate_docs/  # Documentation generation (MkDocs, schema docs)
├── nx/             # Nx workspace helpers (affected detection, dependency trees)
├── publish/        # Package publishing and release automation
├── quality/        # Code quality checks (linting, prettier, validation)
├── review/         # Kiro-enabled review tools (baseline review, thread posting)
│   ├── lib/        # Shared library modules (reusable across review tools)
│   ├── baseline/   # Baseline-specific review logic
│   └── python-tests/
└── test/           # Test runners and helpers
```

### When to create a new directory

Create a new top-level directory under `scripts/` only when:
- The purpose is clearly distinct from all existing directories
- At least 2-3 scripts share the purpose
- The scripts will be maintained as a cohesive unit

Do NOT create a new directory for a single script. Place it in the most relevant existing directory instead.

### When to create subdirectories

Use subdirectories within a purpose directory when:
- A group of scripts forms a reusable library (`lib/`) that other scripts in the same or different directories import
- A group of scripts is domain-specific within the purpose (e.g., `review/baseline/` for baseline-specific review logic)
- Tests need their own directory (`python-tests/`)

## Naming Conventions

### Shell scripts
- Use `snake_case` with descriptive verbs: `build_package.sh`, `validate_dependencies.sh`
- Repo-level orchestrators end with `_repo.sh`: `test_repo.sh`, `lint_repo.sh`
- Package-level scripts end with `_package.sh`: `build_package.sh`, `test_python_package.sh`
- Always include `#!/bin/bash` and `set -e`

### Python scripts
- Use `snake_case`: `baseline_review.py`, `post_baseline_threads.py`
- Standalone CLI scripts have a `main()` function and `if __name__ == "__main__": main()`
- Library modules (under `lib/`) are imported, not executed directly

### JavaScript/Node scripts
- Use `kebab-case`: `baseline-diff-helper.mjs`
- Prefer `.mjs` for ES module scripts

## Reuse Over Sprawl

### Before writing a new script

1. **Check existing scripts** — search `scripts/` for similar functionality. Many patterns already exist (git diff collection, nx affected detection, CI variable resolution).
2. **Check for extractable utilities** — if you need GitLab API calls, Kiro CLI invocation, nx graph resolution, or thread management, use the shared library under `scripts/review/lib/` rather than reimplementing.
3. **Check shell script patterns** — `scripts/nx/affected-base.sh` is sourced by multiple scripts for consistent NX_BASE/NX_HEAD resolution. Prefer sourcing shared scripts over duplicating logic.

### Shared libraries

Reusable Python modules live under `lib/` subdirectories:

```python
# scripts/review/lib/gitlab_threads.py — reusable GitLab API
from review.lib.gitlab_threads import create_discussion, resolve_discussion

# scripts/review/lib/kiro_integration.py — reusable Kiro CLI
from review.lib.kiro_integration import run_kiro_assessment

# scripts/review/lib/nx_graph.py — reusable dependency resolution
from review.lib.nx_graph import _get_transitive_deps
```

When adding new functionality:
- If it's specific to one review type → put it in the domain subdirectory (e.g., `review/baseline/`)
- If it could be used by multiple review types → put it in `lib/`
- If it's a general utility (git operations, file parsing) → consider `lib/` or a new shared location

### Anti-patterns

- **One-off scripts with hardcoded paths** — parameterize with arguments or environment variables
- **Duplicated git/nx/CI logic** — source `scripts/nx/affected-base.sh` or import from `lib/`
- **Python scripts without tests** — any Python script with non-trivial logic should have tests under `python-tests/`
- **Shell scripts doing complex data processing** — use Python instead; shell is for orchestration and glue
- **Importing across purpose directories** — `scripts/build/` should not import from `scripts/review/lib/`. If shared logic is needed across purposes, discuss whether it belongs in a top-level `scripts/lib/`

## Python Script Standards

### Dependencies
- Use only Python stdlib — no external pip dependencies in scripts
- Exception: test dependencies (`pytest`, `pytest-cov`) managed via `python-tests/pyproject.toml` and `uv`

### Testing
- Tests live in `python-tests/` alongside the scripts they test
- One `pyproject.toml` per test directory, managed by `uv`
- Tests run as part of `npm run test:python` via `scripts/test/test_python_repo.sh`
- Test pure functions (parsing, formatting, grouping) — don't test subprocess calls or API interactions

### Project root resolution
- Use `Path(__file__).resolve().parent` chains to compute paths relative to the script location
- Never hardcode absolute paths or assume the working directory

### CI environment variables
- Document required CI variables in the script's docstring
- Use `os.environ.get()` with sensible defaults for optional variables
- Fail fast with clear error messages when required variables are missing

## Shell Script Standards

### Sourcing shared scripts
```bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/../nx/affected-base.sh"
```

### NX_RUN_ALL pattern
Scripts that support both affected-only and full-repo modes should follow:
```bash
if [ "${NX_RUN_ALL:-false}" = "true" ]; then
  npx nx run-many -t <target> --all "$@"
else
  npx nx affected -t <target> --base="$NX_BASE" --head="$NX_HEAD" "$@"
fi
```

### Error handling
- Always `set -e` at the top
- Use `|| true` only when failure is explicitly acceptable
- Print clear error messages to stderr before exiting

### Exception handling in Python
- Library functions (`lib/`) must **never** call `sys.exit()`. Raise meaningful exceptions instead and let the caller decide how to handle them.
- Define custom exception classes for distinct failure modes (e.g., `KiroNotFoundError`, `KiroTimeoutError`).
- Only CLI entry points (`main()` functions) should call `sys.exit()`.
- Catch specific exceptions at the boundary, not broad `except Exception` in library code.
