# Contributing to MDAA

Welcome, and thank you for considering a contribution to the Modern Data Architecture Accelerator (MDAA). All contributions are welcome, no matter how small. Whether you're fixing a typo, reporting a bug, proposing a new feature, or building a starter kit, your input helps make MDAA better for everyone.

> **Note:** MDAA is maintained by a core team at AWS. Before starting any work, please [open a GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) describing your proposed change. The team will review it and let you know whether the contribution aligns with the project's direction. This helps avoid duplicated effort and ensures your time is well spent.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Pull Request Process](#pull-request-process)
- [Pull Request Checklist](#pull-request-checklist)
- [Code of Conduct](#code-of-conduct)
- [Security Issue Notifications](#security-issue-notifications)
- [Licensing](#licensing)

## Design Philosophy

MDAA is built on two core principles that guide every contribution:

**Compliance by default.** Security and regulatory compliance are not optional add-ons — they are baked into every construct. L2 constructs enforce encryption, access controls, and logging out of the box. CDK Nag validates against NIST 800-53, HIPAA, PCI-DSS, and AWS Solutions rulesets automatically. Contributors should never require users to opt in to secure behavior; instead, secure is the default and escape hatches are explicit and auditable.

**User experience first.** MDAA users are data engineers and platform teams, not CDK experts. Module configurations should be simple YAML with sensible defaults that produce production-ready infrastructure. Complex tuning options should be available but never required. When designing a new feature, start with the sample config a user would write, not the CDK code — if the config isn't intuitive, the implementation doesn't matter. See the [Development Approach](DEVELOPMENT.md#development-approach) for how this translates into practice.

## Ways to Contribute

For all contribution types, **start by opening a GitHub issue** so the core team can review and approve the change before you begin work.

- **Bug Reports** — Found something that doesn't work as expected? Open a [GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) with a clear description, steps to reproduce, and any relevant logs or screenshots.
- **Feature Requests** — Have an idea for a new capability or improvement? Open a [GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) describing the use case and expected behavior.
- **Documentation Improvements** — Spotted a typo, unclear instruction, or missing information? For small fixes like typos, submit a PR directly. For larger documentation changes, open an issue first to discuss the scope.
- **Code Contributions** — Fix bugs, add features, or improve existing modules. Open an issue first, then see [DEVELOPMENT.md](DEVELOPMENT.md) to get started once approved.
- **Sample Configuration Contributions** — Build new sample configurations for common use cases and contribute the same to the [sample configurations repository](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator).

When filing an issue, please check existing open or recently closed issues to avoid duplicates. Include as much detail as you can:

- A reproducible test case or series of steps
- The version of MDAA you're using
- Any modifications you've made relevant to the issue
- Anything unusual about your environment or deployment

## Getting Started

- [DEVELOPMENT.md](DEVELOPMENT.md) — Environment setup, build commands, coding guidelines, and scripts
- [TESTING.md](TESTING.md) — Testing strategy, coverage requirements, and CI pipeline
- [PYTHON_TESTING.md](PYTHON_TESTING.md) — Python-specific testing documentation

## Pull Request Process

1. **Open a GitHub issue first** and wait for approval from the MDAA core team before starting work.
2. **Create a branch** from `main` for your changes. Use a descriptive branch name with a conventional prefix: `feat/`, `fix/`, `docs/`, or `chore/` (e.g., `feat/add-redshift-module`, `fix/s3-encryption-bug`).
3. **Make your changes**, focusing on a single concern per PR. If you also reformat unrelated code, it will be harder to review your contribution.
4. **Run all checks** to make sure nothing is broken:
   ```bash
   npm run prepush
   ```
   Or for a thorough check with no cache:
   ```bash
   npm run prepush:all
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
- [ ] I have run `npm run prepush` and all checks pass (build, test, lint, prettier)
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
