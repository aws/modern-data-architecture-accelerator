---
inclusion: manual
---

# Architecture Review - Steering Guide

Review code changes for alignment with the MDAA construct hierarchy, dependency direction, and separation of concerns. This steering file covers the structural rules that keep the codebase maintainable.

#[[file:CONTRIBUTING.md]]

## Scope

- **L2 constructs**: `packages/constructs/L2/` — must be generic and reusable
- **L3 constructs**: `packages/constructs/L3/` — compose L2s, module-specific logic allowed
- **App modules**: `packages/apps/` — config translation only, no construct logic

## Architecture Rules

### Construct Hierarchy

- **L2 constructs** wrap CDK L1/L2 constructs with compliance defaults. They must be generic — usable by any L3 construct, not tied to a specific module.
- **L3 constructs** compose L2 constructs and CDK resources into module-specific patterns. They implement the module's architecture.
- **App modules** translate user YAML configuration into L3 construct props. They must NOT contain significant construct logic — if the app class is doing more than parsing config and calling the L3 constructor, the logic belongs in the L3.

### Dependency Direction

- Apps depend on L3 constructs: `packages/apps/` → `packages/constructs/L3/`
- L3 constructs depend on L2 constructs: `packages/constructs/L3/` → `packages/constructs/L2/`
- **Never reverse:** L2 must not import from L3. L3 must not import from apps.
- Utilities (`packages/utilities/`) can be used by any layer.

### Construct ID Stability

- Construct IDs (the `id` parameter in constructors) must be static strings, not derived from config values.
- Changing a construct ID changes the CloudFormation logical ID, which causes resource replacement.
- IDs like `bucket-${bucketName}` are acceptable when the variable is a fixed structural element (e.g., zone name), not user-provided config.

### Base Class Usage

- L3 constructs must extend `MdaaL3Construct` from `@aws-mdaa/l3-construct`
- L2 constructs use `MdaaConstructProps` from `@aws-mdaa/construct`
- App modules extend `MdaaCdkApp` from `@aws-mdaa/app`

### Dependency Management

- All imports in `lib/` files must have corresponding entries in `dependencies` in `package.json`
- `devDependencies` must not be used in production `lib/` code
- All `@aws-mdaa/*` packages must use the same version across the monorepo

### Reusability

- L2 constructs used by only one module should be evaluated — they may belong in the L3 instead
- L3 constructs reimplementing compliance controls that an L2 already provides is duplication

## CI Agent Usage

This section is used by the automated Architecture Review CI agent. When invoked by the agent,
Kiro receives the code diff, full source, package.json, dependency tree, and package type for
a single package, and must produce structured JSON findings.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no explanation
outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "HIGH | MEDIUM | LOW",
  "summary": "One paragraph summarizing the architecture alignment.",
  "findings": [
    {
      "risk": "HIGH | MEDIUM | LOW",
      "category": "layer_violation | dependency_direction | construct_id_stability | separation_of_concerns | reusability | dependency_declaration | version_consistency",
      "file": "path/to/file.ts",
      "line": 42,
      "detail": "What's misaligned and what should be done."
    }
  ]
}
```

### Severity Classification for CI Agent

- **HIGH:** Construct logic in app class (code that creates AWS resources or implements business logic in an app module instead of the L3 construct), reverse dependency (L2 importing L3, L3 importing app), construct IDs derived from user config values (causes logical ID instability), undeclared dependency used in production code
- **MEDIUM:** L2 construct only used by one module (may belong in L3), L3 reimplementing compliance controls that an existing L2 already provides, missing base class usage (`MdaaL3Construct`, `MdaaCdkApp`), `devDependency` used in `lib/` code, inconsistent `@aws-mdaa/*` versions across the monorepo
- **LOW:** Reusability improvements (extracting shared logic into utilities), minor layering suggestions

### Category Definitions

Each category has a strict scope. Do NOT stretch categories to cover concerns handled by other agents.

| Category | What it covers | What it does NOT cover |
|----------|---------------|----------------------|
| `layer_violation` | Code in the wrong layer: construct logic in app class, config parsing in L3, business logic in L2 | Missing JSDoc, missing documentation, config schema design |
| `dependency_direction` | Import direction violations: L2→L3, L3→app, circular dependencies | Missing test imports, test file organization |
| `construct_id_stability` | Construct IDs derived from user config values that would change logical IDs on config changes | Logical ID changes from refactoring (that's baseline review) |
| `separation_of_concerns` | Mixed responsibilities within a single file/class: a construct doing both resource creation AND config parsing, or an app class containing resource creation logic | Missing documentation, JSDoc quality, config usability |
| `reusability` | L2 constructs used by only one module, duplicated compliance logic across L3 constructs | Sample config coverage, README quality |
| `dependency_declaration` | Imports in `lib/` without corresponding `dependencies` entry in package.json | Test dependencies, devDependency organization |
| `version_consistency` | `@aws-mdaa/*` packages at different versions within the monorepo | External dependency version choices |

### DO NOT flag (handled by other agents)

- **Missing JSDoc or documentation** → Module Quality agent
- **Config schema design** (named maps, type safety, validation) → Module Quality agent
- **Sample config coverage or inline comments** → Module Quality agent
- **README structure or content** → Module Quality agent
- **Missing tests or test coverage** → Test Standards agent
- **Encryption, IAM policies, security controls** → Compliance agent
- **CDK Nag suppression quality** → Compliance agent
- **Infrastructure diff risks** → Baseline Review agent

### Rules for CI Agent Findings

- One finding per architectural concern.
- Every finding must include `file` and `line` pointing to the source.
- Only flag issues related to code that was CHANGED in this MR.
- Order findings: HIGH first, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.

### Line Number Anchoring (CRITICAL for stability)

Line numbers must be deterministic across runs. Incorrect line numbers cause duplicate review threads.

**Core rule: always anchor to the first line in the new file immediately after the diff hunk that contains the issue.**

This is the first context line (no `+` or `-` prefix) that follows the last changed line in the hunk. It always exists in the new file and is deterministic regardless of whether the change is an addition, deletion, or modification.

To determine the new-file line number:
1. Read the hunk header `@@ -old_start,old_count +new_start,new_count @@` — the `+new_start` is the new-file line number of the first line in the hunk.
2. Count forward through the hunk: context lines and `+` lines increment the new-file counter. `-` lines do NOT increment it.
3. The first context line after the last `+` or `-` line is your anchor.

**Rules:**
- NEVER use old-file line numbers for deletions — those lines don't exist in the new file
- NEVER guess or estimate — count from the hunk header
- If you cannot find the exact line, use `0`
