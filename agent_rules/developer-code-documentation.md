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
- **Use only ASCII characters** in comments, JSDoc, and Python docstrings. Config-property JSDoc is the source for the generated `SCHEMA.md`, so a non-ASCII character there propagates into a committed artifact; beyond that, non-ASCII characters are easy to introduce accidentally, hard to spot in review, and render inconsistently across terminals and diff tools.

  The characters that actually show up, and what to write instead. The banned column shows each glyph inside a code span so it is identifiable on sight rather than only by name:

  | Don't use | Codepoint | Write instead |
  |---|---|---|
  | `—` | U+2014 em dash | `-` or ` - ` |
  | `–` | U+2013 en dash | `-` |
  | `→` | U+2192 arrow | `->` |
  | `“` `”` | U+201C/U+201D smart double quotes | `"` |
  | `‘` `’` | U+2018/U+2019 smart single quotes / apostrophe | `'` |
  | `…` | U+2026 ellipsis | `...` |
  | `≥` `≤` | U+2265/U+2264 | `>=` `<=` |
  | ` ` (renders as a space) | U+00A0 non-breaking space | a normal space |

  This applies to comment and docstring text only - not to string literals that must carry a specific character for functional reasons, and not to this table, where the glyphs are the subject rather than punctuation.

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

### Document the constraint, not the investigation

Comments and JSDoc are read by developers and coding agents who were not present when the code was written. They need the constraint that makes the code non-obvious. They do not need the path that led to it.

Keep a comment when it states something the code cannot: a service behavior that forces this shape, an ordering dependency, a value that must match an external system, a failure mode that is silent.

Remove the surrounding narration:

| Don't | Do |
|---|---|
| "An earlier version used `TotalErrors` (taken from the CDK helpers rather than the service) and the alarm could therefore never fire." | "Runtime publishes `SystemErrors` and `UserErrors`; there is no `TotalErrors`." |
| "Verified on a live deployment: querying with only `Resource` returned 0 datapoints while the full triple returned the real value." | "CloudWatch matches dimensions exactly, so all three must be supplied - a partial set receives no datapoints." |
| "Verified against delivered CloudTrail logs and the `UpdateAgentRuntimeRequest` shape rather than inferred from the API." | (drop - the surrounding statement of fact already carries the weight) |
| "This was the exact silent failure this module is meant to avoid, fixed in review." | (drop) |

Specifically avoid:

- **Superseded alternatives.** A reader who never saw the earlier approach gains nothing from being told it was wrong, and now has two designs in their head instead of one.
- **Verification provenance.** "Verified against X", "confirmed in a live account", "checked across N services" - how a fact was established is not the fact. A brief pointer is fine when the reader may need to re-verify (`// confirm with: aws cloudwatch list-metrics --namespace ...`), but not a narrative.
- **Review history.** "Addressed in review", "per reviewer feedback", "pinned by a regression test". Git and the MR hold this.
- **The same rationale repeated.** State a constraint once at the place it binds, not at every site that depends on it.

One long comment justifying a decision is usually a sign the decision belongs in the story or the module README instead.

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
