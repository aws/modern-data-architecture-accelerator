---
scope: auto
description: Code documentation standards for all MDAA code
---

# Code Documentation Standards

Standards for documenting code across the MDAA repository. Apply these when writing or modifying any code.

## General Rules

- Comments explain *why*, not *what*. Don't restate what the code already says.
- All exported symbols (classes, functions, interfaces, types) must have JSDoc.
- Internal/private code needs comments only when the intent isn't obvious from the code itself.
- Keep comments concise. One sentence is better than a paragraph when it conveys the same information.

## Construct Classes

Every construct class needs a class-level JSDoc explaining:
- What AWS resources it deploys
- What compliance controls it enforces
- What the construct is used for

```typescript
/**
 * Deploys an encrypted S3 bucket with versioning, access logging, and public access blocking.
 * Enforces KMS encryption and SSL-only access via bucket policy.
 */
export class MdaaBucket extends Construct {
```

## Config-Exposed Interface Properties

Properties on interfaces that flow into JSON schemas via `typescript-json-schema` have the highest documentation bar. These descriptions become the user-facing schema documentation.

- Document every config-exposed property with JSDoc
- Do NOT document top-level module config interfaces (e.g., `AuditConfigContents`) — their description is not exposed in the generated schema
- Use the template:
  ```typescript
  /**
   * [What this configures and why]
   *
   * Use cases: [2-4 specific use cases]
   *
   * AWS: [Service/resource this maps to]
   *
   * Validation: [Required/Optional; Type; Constraints; Valid values]
   * @default [value] (if applicable)
   */
  ```
- Document L3 interface properties thoroughly — they flow into the app schema
- In app configs, only document app-specific overrides or transformations
- Nested L3 interfaces appear as separate schema definitions — each needs standalone documentation

For the full config schema documentation process (gathering context, cleanup, validation, anti-patterns), use the `developer-coding-standards` steering file.

## Non-Config Interfaces and Types

Exported interfaces and types that are not config-exposed still need JSDoc, but lighter:

```typescript
/** Options for resolving IAM role references to role IDs via custom resource. */
export interface RoleResolutionOptions {
  /** Maximum number of concurrent role resolution API calls. */
  readonly concurrency?: number;
}
```

## CDK Nag Suppressions

Suppression reasons must be specific and reference AWS documentation:
- One sentence per service/action group with an inline service authorization reference URL
- State which actions do not support resource-level permissions
- Mention any IAM conditions or resource ARN scoping

## Inline Comments

- Use `//` for single-line explanations of non-obvious logic
- Don't comment obvious code (`// increment counter` above `counter++`)
- Use `// TODO:` for known improvements with a brief description
- Don't leave commented-out code — remove it (git has history)

## CHANGELOG Entries

Entries are release notes for users, not design documents. Keep them scannable.

- **One or two sentences per entry** (repo convention: most entries are 10–25 words; treat ~50 as the ceiling). Split unrelated changes into separate bullets rather than one long paragraph.
- State **what changed and the user-visible effect**. Omit the mechanism — no policy-statement names, condition keys, IAM semantics, or verification history.
- Link to the module README or SCHEMA.md for detail instead of inlining it.
- Flag behavior changes to already-released features with a short `Breaking change:` or `Upgrade impact:` clause — one sentence, not a paragraph.

```markdown
<!-- Bad — explains the entire design and its rationale -->
- **MDAA-managed VPC endpoint** (`@aws-mdaa/x`, `@aws-mdaa/y`): Added optional `foo` configuration to create ... with secure defaults — Private DNS enabled, an endpoint ENI security group scoped to HTTPS (443) from ... . Presence of the block opts in (an empty `{}` accepts all defaults); omit it to ... . Supports `bar` to restrict ... and `baz` to additionally create ... . This provides the private invocation path that `qux` requires, since the resource policy's `aws:SourceVpc` condition is only populated on ... .

<!-- Good — what changed, user-visible effect, link for detail -->
- Added optional `foo` to create the AgentCore interface VPC endpoint with Private DNS, an app-SG-scoped security group, and an invoke-only endpoint policy. Presence opts in; omit to use a pre-existing endpoint. See the [module README](path/to/README.md).
```
