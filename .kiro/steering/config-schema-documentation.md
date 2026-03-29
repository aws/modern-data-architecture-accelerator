---
inclusion: manual
---

# Config Schema Documentation - Steering Guide

Improve TypeScript interface JSDoc on config-exposed interfaces across MDAA modules. This documentation flows into JSON schemas via `typescript-json-schema` during build.

## Scope

- **App config interfaces**: `mdaa/packages/apps/{category}/{module}-app/lib/*-config.ts`
- **L3 construct interfaces**: `mdaa/packages/constructs/L3/{category}/{module}-l3-construct/lib/*.ts` imported and exposed through app configs
- **Only `.ts` source files** — never edit `.d.ts` files (these are generated declaration outputs and will be overwritten on build)

## Process

### 1. Gather Context

For each module, read:

1. **App README** (`README.md`) — deployed resources, AWS services, configuration purpose
2. **L3 Construct README** — deployed resources, architecture, compliance
3. **App config** (`lib/*-config.ts`) — interfaces, L3 imports, overrides
4. **L3 construct source** (`lib/*.ts`) — imported interfaces, nested types, property relationships
5. **Test config** (`test/test-config.yaml`) — usage patterns, inline comments with valid values and constraints

### 2. Write Documentation

Enhance documentation on ALL config-exposed properties — whether they have existing docs, Q-ENHANCED docs, or no docs at all. Write concise JSDoc using context from the README and code.

Do NOT document the top-level module config interface (e.g., `AuditConfigContents`, `MacieSessionConfigContents`). These are the root schema type passed to `typescript-json-schema` and their description is not exposed in the generated schema. Instead, inject module-level context into the individual property docs within the interface.

### 3. Cleanup

- If Q-ENHANCED documentation is on a non-config-exposed property (e.g., `*L3ConstructProps` members), replace it with a concise single-line developer-oriented comment.
- If Q-ENHANCED documentation is out of place (class members, constructor parameters, class-level docs, or other non-interface locations), remove it entirely — only interface properties flow into schemas.
- Non-Q-ENHANCED developer comments on non-config-exposed code (class docs, method docs, inline comments) should be left in place.

### 4. Validate

- No TypeScript syntax errors
- Documentation consistent with README
- All config-exposed properties documented

## Critical: Documentation-Only Changes

This task MUST produce documentation-only changes. No property declarations, imports, exports, class definitions, or any executable code may be added, removed, or modified. The following rules are absolute:

### Never Delete or Modify Code

When replacing a multi-line JSDoc comment with a single-line comment on a property:

1. The replacement comment MUST be immediately followed by the original `readonly` property declaration — verify it is still present after the edit
2. Never delete the `readonly` line, the interface closing `}`, or the `/**` opening of the next block
3. After every edit, confirm the property declaration that follows the comment is unchanged

The most common failure mode is: replacing a multi-line comment above a property eats the property declaration itself, the closing `}` of the interface, and/or the opening `/**` of the next interface. This produces a "comment shift" where each comment labels the wrong property and multiple properties silently disappear.

### Verify Interface Integrity After Each File

After editing any file containing interfaces, run this check:

```bash
# Compare property declarations before and after
diff <(git show HEAD:path/to/file.ts | grep "readonly " | sort) <(grep "readonly " path/to/file.ts | sort)
```

If any `readonly` lines differ, the edit introduced a code change and must be reverted and redone.

### Never Modify Object Literals or Non-JSDoc Code

Comments inside object literals (e.g., `{ id: 'rule-id', reason: '...' }`) are NOT JSDoc and must not be replaced. The `id` field in NagPackSuppression objects is code, not documentation — replacing it with a comment breaks the build.

### Imports Must Not Change

If a property is removed (even accidentally), its type import may also be removed. After editing, verify imports match the original:

```bash
diff <(git show HEAD:path/to/file.ts | grep "^import ") <(grep "^import " path/to/file.ts)
```

### Build Verification

After completing all edits for a module, run `npx lerna run build` and verify zero errors before moving to the next module.

## Template

```typescript
/**
 * [What this configures and why — from README and code]
 * [Behavior, relationships, or important context]
 *
 * Use cases: [2-4 specific use cases]
 *
 * AWS: [Service/resource this maps to]
 *
 * Validation: [Required/Optional; Type; Constraints; Valid values]
 * @default [value] (if applicable)
 */
```

## Cross-Layer Rules

- Document L3 interface properties thoroughly — they flow into the app schema
- In app configs, only document app-specific overrides or transformations
- Don't duplicate L3 documentation in app config wrappers
- Nested L3 interfaces appear as separate schema definitions — each needs standalone documentation

## Anti-Patterns

### Comment Replacement Eating Code (CRITICAL)

```typescript
// ❌ DANGEROUS: Replacing multi-line comment deletes property + interface boundary
// BEFORE (correct):
  /**
   * Q-ENHANCED-PROPERTY
   * KMS key ARN for encrypting credentials...
   */
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information that defines an Oracle endpoint...
 */
export interface OracleSettingsProperty {

// AFTER (broken — property, closing brace, and opening comment all deleted):
  /** KMS key ARN for encrypting credentials */
 * Provides information that defines an Oracle endpoint...
 */
export interface OracleSettingsProperty {

// ✅ CORRECT: Only the comment changes, everything else stays
  /** KMS key ARN for encrypting credentials */
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information that defines an Oracle endpoint...
 */
export interface OracleSettingsProperty {
```

### Replacing NagSuppression `id` Fields With Comments

```typescript
// ❌ BROKEN: Comment replaced the `id` property in an object literal
{
  /** CDK Nag rule identifier for retention period compliance */
  reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
}

// ✅ CORRECT: Object literal properties are code, not documentation targets
{
  id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod',
  reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
}
```

### Verbose Q-ENHANCED Docs

```typescript
// ❌ Verbose Q-ENHANCED with redundant phrasing
/**
 * Q-ENHANCED-PROPERTY
 * Optional VPC configuration for DataSync agent deployment enabling secure network
 * connectivity and private data transfer operations. Provides VPC networking setup
 * for agents requiring private network access to on-premises or VPC-based storage systems.
 *
 * Use cases: Private network connectivity; Secure data transfer; VPC-based agent
 * deployment for on-premises integration
 */

// ✅ Concise, README-informed
/**
 * VPC configuration for DataSync agent deployment and security group management.
 * MDAA creates a security group with required ingress rules and attaches to the
 * VPC endpoint for the DataSync service.
 *
 * Use cases: Agent network isolation; VPC endpoint integration; Security group automation
 *
 * AWS: VPC, security groups, VPC endpoints for DataSync service
 *
 * Validation: Valid VpcProps; optional; requires vpcId and vpcCidrBlock
 */
```

### Generic Filler Use Cases

```typescript
// ❌ Generic filler use cases
// Use cases: Data management; Configuration; Setup; Organization

// ✅ Specific use cases from README
// Use cases: CloudTrail log aggregation; S3 inventory collection; Cross-account audit centralization
```

### Documenting Top-Level Config Interfaces

```typescript
// ❌ Documenting top-level config interface (not exposed in schema)
/**
 * Configuration for the Audit module...
 */
export interface AuditConfigContents extends MdaaBaseConfigContents {

// ✅ Skip top-level interface doc, put context into properties instead
export interface AuditConfigContents extends MdaaBaseConfigContents {
  /**
   * Roles granted read access to audit logs and decrypt access to the audit KMS key.
   * The audit module deploys a secure S3 bucket for CloudTrail logs with KMS encryption
   * and Glue/Athena tables for querying.
   * ...
   */
  readonly readRoles?: MdaaRoleRef[];
```

## Module Paths

Apps: `mdaa/packages/apps/{ai,analytics,core,datalake,dataops,governance,utility}/*-app/`

L3 constructs: `mdaa/packages/constructs/L3/{same-category}/{module}-l3-construct/`
