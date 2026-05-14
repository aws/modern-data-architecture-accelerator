# Tools

Operational applications that support CI/CD pipelines and development workflows for MDAA.

Unlike the standalone shell scripts in `scripts/`, tools in this directory are full applications with their own dependencies, tests, and packaging. They are structured as installable packages rather than single-file scripts.

## Convention

- `scripts/` — standalone shell scripts and thin wrappers for CI jobs
- `tools/` — proper applications that support CI/CD and operations
- `packages/` — the MDAA product (CDK constructs, CLI, utilities)

CI/CD entry points remain in `scripts/` as thin wrappers that delegate to the tools here, so the existing convention of "look in `scripts/` for CI jobs" is preserved.

## Tools

| Tool | Description |
|------|-------------|

