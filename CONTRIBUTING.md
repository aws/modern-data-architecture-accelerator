# Contributing to MDAA

Welcome, and thank you for considering a contribution to the Modern Data Architecture Accelerator (MDAA). All contributions are welcome, no matter how small. Whether you're fixing a typo, reporting a bug, proposing a new feature, or building a starter kit, your input helps make MDAA better for everyone.

> **Note:** MDAA is maintained by a core team at AWS. Before starting any work, please [open a GitHub issue](https://github.com/aws/modern-data-architecture-accelerator/issues/new) describing your proposed change. The team will review it and let you know whether the contribution aligns with the project's direction. This helps avoid duplicated effort and ensures your time is well spent.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Kiro-Assisted Development](#kiro-assisted-development)
- [Sample Configuration Standards](#sample-configuration-standards)
- [Module Documentation Standards](#module-documentation-standards)
- [Developing Modules](#developing-modules)
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

## Kiro-Assisted Development

This repository is designed for use with [Kiro](https://kiro.dev), an AI-powered development environment that dramatically accelerates development across MDAA. Kiro steering files in `.kiro/steering/` provide guided workflows that automate complex, multi-step processes that would otherwise take hours of manual work — auditing sample config coverage across 45+ modules, ensuring README consistency, improving schema documentation, and more.

**Available steering files:**

| Steering File | What It Automates |
|---|---|
| `code-documentation` | Code documentation standards for all MDAA code (auto-included in every session) |
| `coding-standards` | Detailed process for config schema JSDoc auditing and improvement |
| `compliance-review` | Reviews compliance controls, CDK Nag validation, and improves nag suppression documentation |
| `testing-standards` | Enforces testing strategy, diff baselines, coverage requirements, and Python test patterns |
| `diff-risk-assessment` | Reviews baseline diffs for breaking changes, data loss risks, and construct ID scoping issues |
| `module-quality` | Audits and improves module README documentation and sample config schema coverage |
| `module-creation` | Scaffolds new app modules and constructs with proper skeleton packages |

To use a steering file, reference it by name in Kiro (e.g., `#module-quality`). The steering files encode the standards from this document into executable workflows — they know the rules, the file paths, the analysis steps, and the validation checks.

We strongly recommend using Kiro for any task that touches multiple modules or requires consistency across the codebase.

## Sample Configuration Standards

Every app module under `packages/apps/` must include sample configuration files that demonstrate the module's capabilities and exercise its config schema. Sample configs serve as both test fixtures and user-facing reference examples.

### File Naming

- `sample-config-minimal.yaml` — simplest valid deployment that creates the module's core resource
- `sample-config-comprehensive.yaml` — exercises every compatible, non-excluded schema property at full depth
- `sample-config-{variant}.yaml` — for mutually exclusive configuration branches (e.g., `sample-config-noproject.yaml`)
- Names like `advanced-config.yaml`, `basic-config.yaml`, or `sample-config.yaml` (without suffix) are not allowed

### Coverage Rules

- **Comprehensive** = 100% coverage of compatible properties. If a property exists in the schema, is not excluded, and is not mutually exclusive with the config's choices, it must be present.
- **Minimal** = only required properties, plus enough to deploy the module's core resource. A minimal config that only deploys supporting infrastructure (KMS keys, IAM roles) without the module's namesake resource is a bug.
- Every enum value must be exercised across the set of sample configs.
- Mutually exclusive schema branches (`oneOf`/`anyOf`) each need their own sample config file.

### Template Variables

Never hardcode AWS account IDs, regions, or partitions in sample configs:

- `{{account}}` for the deployment account, `{{context:account-2}}` / `{{context:account-3}}` for cross-account references
- `{{region}}` for region segments
- `arn:{{partition}}:` for ARN prefixes (never `arn:aws:`)
- Single-quote template variables when they are the entire YAML value: `account: '{{context:account-2}}'`
- No spaces inside braces: `{{region}}` not `{{ region }}`

### Inline Documentation

Every property in a sample config must have a preceding comment derived from the schema's `description` field:

- Optional properties get a `# (Optional)` prefix; required is implied
- Append enum values: `(enum: gp2, gp3, io1, io2)`
- Append defaults: `(default: value)`
- Wrap at 100 characters across multiple `#` lines
- Each sample config starts with a header comment describing the module and what the config demonstrates

### Role References

- Prefer `name:` or `arn:` over `id:` — only use `id:` in datalake-app as a reference example
- `generated-role-id:` and `ssm:` prefixed values are acceptable everywhere
- Add `# See CONFIGURATION.md for role reference options (name, arn, id).` once per file above the first role reference

### Cross-Module Resource References

When a config value references a resource from another module or external infrastructure, add a two-line comment:

```yaml
# VPC ID for cluster deployment
# Often created by your VPC/networking stack.
# Example SSM: ssm:/path/to/vpc/id
vpcId: vpc-testvpc
```

### Test Requirements

Every sample config file must have corresponding:

- **Diff baseline test** — `baselineDiffTestApp` call in `{module}.diff.test.ts`
- **Synth test** — validates the config synthesizes without errors
- **Snapshot test** — `snapShotTestApp` with `Create.appProvider` (not `snapShotTest`)

### README Integration

Every sample config must be referenced in the module's README under `### Module Config Samples and Variants`, ordered: minimal → comprehensive → variants. Each config gets:

1. An `####` heading describing the variant
2. A 1-2 sentence user-facing description with a use case sentence
3. A markdown link to the file
4. A fenced code block with MkDocs snippet include

Use user-facing language in descriptions — not "exercises every property" but "covers all available options."

> **Kiro:** The `module-quality` steering file automates the entire process — schema analysis, gap identification, sample config generation, test creation, and README updates. Use it to bring a module to full coverage in a single session.

## Module Documentation Standards

Every app module must have a README.md following a consistent structure. These READMEs serve as both developer documentation and the source for the generated MkDocs site.

### Required README Structure

1. **Title + description** — Module name as H1, followed by a paragraph explaining what the module deploys and why. End with a usage scenario sentence.
2. **Deployed Resources** — `**Resource Name** - description` format. Descriptions must be factual (what it is, what it does). No compliance language here.
3. **Architecture diagram** — `![...]()` reference to L3 construct docs image
4. **Related Modules** — Linked list with relationship descriptions explaining how modules connect. Placed after Deployed Resources.
5. **Security/Compliance Details** — Standard intro paragraph, then categorized sub-bullets: Encryption at Rest, Encryption in Transit, Least Privilege, Separation of Duties, Network Isolation, etc.
6. **Configuration > MDAA Config** — `mdaa.yaml` wiring snippet
7. **Configuration > Module Config Samples and Variants** — Sample configs with dual-include pattern (see [Sample Configuration Standards](#sample-configuration-standards))

### Key Rules

- Compliance language (encryption enforcement, access grants, security group defaults) belongs in Security/Compliance, not Deployed Resources
- Use `**Bold Name** - description` format for resources, not bullet lists with colons
- Related Modules use relative paths and explain the relationship, not just "Related module"
- Never refer to modules as "CDK applications" — they are configurable modules

> **Kiro:** The `module-quality` steering file also automates README auditing and improvement across all modules — it checks structure, content quality, link integrity, and sample config references, then implements fixes.

## Developing Modules

Whether adding a new module or enhancing an existing one, MDAA follows a "working backwards" approach — start from the user's configuration experience, then work inward to the constructs that implement it. See the [Development Approach](DEVELOPMENT.md#development-approach) for the full process.

> **Kiro:** The `module-creation` steering file automates scaffolding new app modules and constructs with proper skeleton packages, configuration files, test scaffolding, and documentation templates.

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
