# Development

## Development Approach

MDAA development follows a working-backwards process, starting from the user experience and ending with tested, compliant infrastructure code.

1. **Work backwards from capabilities and user experience.** Determine whether the change extends an existing module or requires a new one. Define the desired end-state from the user's perspective — what should they be able to configure, and what should happen when they deploy?

2. **Design sample configs before writing code.** Draft sample module configurations (`sample-config-minimal.yaml`, `sample-config-comprehensive.yaml`) that reflect the intended user experience. Focus on easy-to-use defaults with optional exposure of more complex fine-tuning options. Review these configs with stakeholders before proceeding.

3. **Map configs to constructs.** Walk through each config property and determine which underlying AWS resources and CDK constructs it maps to. Identify whether new L3 or L2 constructs are needed, or if existing ones can be extended.

4. **Implement constructs following the architecture.** Build from the bottom up — L2 constructs enforce compliance (encryption, access controls, CDK Nag rules) as reusable building blocks, L3 constructs compose them into compliant architectural patterns, and the App layer wires configuration to L3 props. See [Architecture Overview](#architecture-overview) for layer responsibilities.

5. **Ensure full testing compliance.** Every layer requires tests — L2/L3 constructs need CDK Assertions and CDK Nag compliance tests, Apps need diff baseline tests covering every config property. All packages must meet coverage thresholds. See [TESTING.md](TESTING.md) for requirements.

## Architecture Overview

- **Apps / Modules**: Configuration-driven CDK apps that translate user-provided YAML configuration into L3 construct props, applying schema validation and deploying compliant infrastructure as CloudFormation stacks. Start here when exposing a new configuration surface to end users or adding a new deployable module.

- **L2 Constructs**: Wrap CDK L1/L2 constructs with compliance controls, standardized props typing, and MDAA naming conventions. Available in TypeScript, Python, Java, and .NET via JSII. This is where encryption defaults, access policies, and CDK Nag suppressions live. Start here when adding a new AWS resource type or fixing a compliance gap.

- **L3 Constructs**: Implement architectural patterns and multi-resource integrations. Compose L2 constructs into higher-level abstractions. TypeScript-only. Start here when building a new module pattern that orchestrates multiple resources (e.g., a data lake with buckets, encryption, Lake Formation permissions).

![MDAA Code Architecture](docs/MDAA-Code-Architecture.png)

## Setting up MDAA Dev Environment

### Prerequisites

- **Node.js 22.x** and **npm 10.x** — See the [Node.js downloads page](https://nodejs.org/).
- **uv** — Required for Python tests. See the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).

### Quick Start

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/aws/modern-data-architecture-accelerator
   cd modern-data-architecture-accelerator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build all packages**

   ```bash
   npm run build:all
   ```

4. **Run tests to verify your setup**

   ```bash
   npm test
   ```

## Common Commands

All commands are run from the repository root.

### Building

```bash
npm run build:all              # Build all packages (no cache)
./scripts/build/build.sh       # Build via lerna (uses cache)
```

### Linting and Formatting

```bash
npm run lint                   # ESLint on affected packages
npm run lint:all               # ESLint on all packages (no cache)
npm run prettier               # Prettier on affected packages
npm run prettier:all           # Prettier on all packages (no cache)
```

### Testing

```bash
npm test                       # Affected TS tests + all Python tests
npm run test:all               # All TS tests (no cache)
npm run test:python            # Python tests on affected packages
npm run test:python:all        # Python tests on all packages
npm run test:update-baselines  # Regenerate diff baselines
```

For test types, coverage requirements, how to write tests, and CI pipeline details, see [TESTING.md](TESTING.md).

### Pre-push Validation

Run the full MR pipeline check locally before pushing:

```bash
npm run prepush                # Affected only, uses cache (fast)
npm run prepush:all            # All packages, no cache (thorough)
```

This runs: validate packages → validate deps → lint → lint Python → prettier → build + test.

## Coding Guidelines

### TypeScript / CDK

MDAA enforces code quality through ESLint, Prettier, and strict TypeScript compiler settings. Run `npm run lint` before pushing to catch issues early.

**Formatting (Prettier)**:
- 2-space indentation
- Single quotes
- 120-character line width
- Trailing commas everywhere
- No parens on single arrow function parameters

**TypeScript compiler**:
- Strict mode is on — `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters` are all enforced
- Prefix unused parameters with `_` (e.g., `_event`) to satisfy the no-unused-vars rule
- Target: ES2020, Module: CommonJS

**Construct patterns**:
- L2 constructs wrap CDK constructs with MDAA compliance defaults (encryption, public access blocking, SSL enforcement, etc.). Props interfaces extend `MdaaConstructProps`.
- L3 constructs compose L2 constructs into higher-level modules. Props interfaces extend `MdaaL3ConstructProps`.
- Constructor signature follows `(scope: Construct, id: string, props: <YourProps>)`.
- Use `MdaaParamAndOutput` to publish resource identifiers as SSM parameters.
- Use `MdaaNagSuppressions.addCodeResourceSuppressions()` when suppressing CDK Nag rules — always include a reason.

### Python

- Target runtime: Python 3.13
- Use [pytest](https://docs.pytest.org/) for testing and [uv](https://docs.astral.sh/uv/) for dependency management
- Security scanning via [Bandit](https://bandit.readthedocs.io/)
- See [PYTHON_TESTING.md](PYTHON_TESTING.md) for the full Python testing setup

## Scripts Directory

Scripts are organized by purpose under `scripts/`:

| Directory | Purpose |
|---|---|
| `scripts/build/` | Build, install, packaging, license headers, schema updates |
| `scripts/ci/` | CI-specific orchestration (merge_main, test_ci, python_test_ci) |
| `scripts/quality/` | Linting, SAST, SonarQube, validation, pre-push checks |
| `scripts/test/` | Test runners — unit, snapshot, integration, Python, baselines |
| `scripts/publish/` | Artifact publishing, versioning, CodeArtifact management |
| `scripts/generate_docs/` | Documentation generation |
| `scripts/nx/` | Nx-related helpers |
