# Contributing to MDAA

Welcome, and thank you for considering a contribution to the Modern Data Architecture Accelerator (MDAA). All contributions are welcome, no matter how small. Whether you're fixing a typo, reporting a bug, proposing a new feature, or building a starter kit, your input helps make MDAA better for everyone.

> **Note:** MDAA is maintained by a core team at AWS. Before starting any work, please [open a GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) describing your proposed change. The team will review it and let you know whether the contribution aligns with the project's direction. This helps avoid duplicated effort and ensures your time is well spent.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Environment Setup](#development-environment-setup)
- [Running Tests](#running-tests)
- [Coding Guidelines](#coding-guidelines)
- [Pull Request Process](#pull-request-process)
- [Pull Request Checklist](#pull-request-checklist)
- [Code of Conduct](#code-of-conduct)
- [Security Issue Notifications](#security-issue-notifications)
- [Licensing](#licensing)
- [Additional Resources](#additional-resources)

## Ways to Contribute

There are many ways to contribute to MDAA. For all contribution types, **start by opening a GitHub issue** so the core team can review and approve the change before you begin work.

- **Bug Reports** — Found something that doesn't work as expected? Open a [GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) with a clear description, steps to reproduce, and any relevant logs or screenshots.
- **Feature Requests** — Have an idea for a new capability or improvement? Open a [GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) describing the use case and expected behavior.
- **Documentation Improvements** — Spotted a typo, unclear instruction, or missing information? For small fixes like typos, submit a PR directly. For larger documentation changes, open an issue first to discuss the scope.
- **Code Contributions** — Fix bugs, add features, or improve existing modules. Open an issue first, then see the [Development Environment Setup](#development-environment-setup) section to get started once approved.
- **Sample Configuration Contributions** — Build new sample configurations for common use cases and contribute the same to the [sample configurations repository](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator).

When filing an issue, please check existing open or recently closed issues to avoid duplicates. Include as much detail as you can:

- A reproducible test case or series of steps
- The version of MDAA you're using
- Any modifications you've made relevant to the issue
- Anything unusual about your environment or deployment

## Development Environment Setup

### Prerequisites

Before setting up your development environment, ensure you have the following tools installed:

- **Node.js 22.x** and **npm 10.x** — Required for building and testing all TypeScript/CDK packages. See the [Node.js downloads page](https://nodejs.org/).
- **uv** — Required for running Python tests (Lambda functions, Glue jobs). See the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).

> **Note:** MDAA pins these specific versions to ensure consistent builds and compliance test results across all contributors. Version requirements are tracked in the root `package.json` and individual package configurations.

### Setup Steps

Follow these steps to set up your local development environment:

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/aws/modern-data-architecture-accelerator
   cd modern-data-architecture-accelerator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npx lerna run build
   ```

4. **Run linting**

   ```bash
   npx lerna run lint
   ```

5. **Run tests to verify your setup**

   ```bash
   npx lerna run test
   ```

If all tests pass, your environment is ready. For more detailed development guidance, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Running Tests

MDAA has both TypeScript and Python test suites. Run them before submitting any pull request.

### TypeScript Tests

```bash
npx lerna run test
```

This runs all TypeScript/CDK unit tests across every package. You should see output for each package with a pass/fail summary. All tests must pass before submitting a PR.

To run tests for a single package you've modified:

```bash
npm run build && npm run test
```

Run this from within the individual package directory.

### Linting

```bash
npx lerna run lint
```

This runs linting across all packages. Fix any reported issues before submitting a PR.

### Python Tests

```bash
npm run test:python:all
```

This runs all Python tests across the repository (Lambda functions, Glue jobs, and other Python components). You'll need [uv](https://docs.astral.sh/uv/getting-started/installation/) installed as a prerequisite. See [PYTHON_TESTING.md](PYTHON_TESTING.md) for detailed Python testing documentation.

## Coding Guidelines


### TypeScript / CDK

MDAA enforces code quality through ESLint, Prettier, and strict TypeScript compiler settings. Run `npx lerna run lint` before submitting to catch issues early.

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

**Testing**:
- Test files use `*.test.ts` naming and Jest as the runner.
- Every construct and stack must have CDK Nag compliance tests using `testApp.checkCdkNagCompliance()`. MDAA validates against NIST 800-53, HIPAA, and PCI-DSS rulesets.
- Use the [CDK Assertions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html) library (`Template`, `Match`) to verify CloudFormation resource properties.
- Use `MdaaTestApp` from `@aws-mdaa/testing` to set up test stacks.

### Python

- Target runtime: Python 3.13
- Use [pytest](https://docs.pytest.org/) for testing and [uv](https://docs.astral.sh/uv/) for dependency management
- Security scanning via [Bandit](https://bandit.readthedocs.io/)
- See [PYTHON_TESTING.md](PYTHON_TESTING.md) for the full Python testing setup

#

## Pull Request Process

1. **Open a GitHub issue first** and wait for approval from the MDAA core team before starting work.
2. **Create a branch** from `main` for your changes. Use a descriptive branch name with a conventional prefix: `feat/`, `fix/`, `docs/`, or `chore/` (e.g., `feat/add-redshift-module`, `fix/s3-encryption-bug`).
3. **Make your changes**, focusing on a single concern per PR. If you also reformat unrelated code, it will be harder to review your contribution.
4. **Run all tests** to make sure nothing is broken:
   ```bash
   npx lerna run build && npx lerna run test
   npx lerna run lint
   npm run test:python:all
   ```
5. **Commit with clear messages** describing what changed and why.
6. **Open a pull request** against the `main` branch, referencing the approved issue in the PR description.
7. **Respond to review feedback** and address any automated CI failures. Automated checks run on all pull requests — ensure the CI pipeline passes before requesting review.

GitHub has additional documentation on [forking a repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) and [creating a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request).

## Pull Request Checklist

Before submitting your PR, please confirm the following:

- [ ] I have an approved GitHub issue for this change
- [ ] I have read the [Contributing Guidelines](CONTRIBUTING.md)
- [ ] My changes are based on the latest `main` branch
- [ ] I have run `npx lerna run build` and all builds succeed
- [ ] I have run `npx lerna run test` and all TypeScript tests pass
- [ ] I have run `npx lerna run lint` and linting passes
- [ ] I have run `npm run test:python:all` and all Python tests pass (if applicable)
- [ ] I have added or updated tests for my changes
- [ ] I have updated relevant documentation (if applicable)
- [ ] My commit messages are clear and descriptive
- [ ] I have checked that no existing issues or PRs already address this change

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct). For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security Issue Notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.

## Additional Resources

- [README.md](README.md) — Project overview, quick start, and navigation hub
- [DEVELOPMENT.md](DEVELOPMENT.md) — Detailed development environment setup and testing guidance
- [PYTHON_TESTING.md](PYTHON_TESTING.md) — Python-specific testing documentation
- [CHANGELOG.md](CHANGELOG.md) — Release history and version-by-version change log
