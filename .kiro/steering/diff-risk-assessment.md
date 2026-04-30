---
inclusion: fileMatch
fileMatchPattern: '**/*.baseline.json,**/*.diff.test.ts'
---

# Diff Risk Assessment - Steering Guide

Assess infrastructure diff risks when baseline changes are detected. This steering file activates automatically when baseline files or diff tests are modified, and guides review of changes that could cause deployment failures or data loss.

#[[file:TESTING.md]]
#[[file:CONTRIBUTING.md]]

## When to Use

- Reviewing a PR that updates `.baseline.json` files
- After running `npm run test:update-baselines` and before committing
- When a construct refactor changes the construct tree structure
- When reviewing any change to L2/L3 construct IDs or scoping

## Risk Categories

### 1. Breaking Diffs (Block — must not merge)

Changes that would cause CloudFormation deployment failures in existing environments:

- Logical ID renames on stateful resources (S3, DynamoDB, RDS, OpenSearch, EFS)
- Resource property changes that require replacement (`BucketName`, `TableName`, `RoleName`)
- Removal of resources referenced by other stacks or external systems (exports, SSM parameters, IAM roles)

**Action:** Block the change. Require a migration plan or CloudFormation resource import strategy before proceeding.

### 2. Data Loss Diffs (Block — requires explicit justification)

Changes that delete or replace data-containing resources:

- `Action: DELETE` or `Action: REPLACE` on: S3 buckets, DynamoDB tables, RDS/Aurora instances, OpenSearch domains, EFS file systems, Glue databases/tables, Secrets Manager secrets
- Even if the replacement resource is identical, data in the original is lost

**Action:** Block unless the PR includes documented justification for why data loss is acceptable or a data migration plan.

### 3. Construct ID / Scoping Changes (High risk — requires careful review)

Changes to the CDK construct tree that silently change CloudFormation logical IDs:

- A resource disappearing at one logical ID and reappearing at another with identical properties
- Changes to construct `id` parameters in constructors
- Moving constructs between scopes (e.g., from stack root into a nested construct)
- Refactoring that adds or removes intermediate constructs in the tree

**Symptoms in the diff:**
- Paired additions and deletions of resources with the same type and similar properties
- Logical ID changes where only the hash suffix differs
- Resource count stays the same but logical IDs shift

**Why this is dangerous:**
- CloudFormation creates the new resource before deleting the old one
- If the resource has a fixed physical name (bucket name, role name, SSM path), creation fails with "already exists"
- If creation succeeds, the old resource is orphaned or deleted with its data

**Action:** Flag for review. If the logical ID change is unavoidable, require a CloudFormation resource import plan or a two-phase deployment strategy.

### 4. Privilege Escalation Diffs (High risk — requires security review)

Changes that increase permissions or broaden access:

- IAM policy statements with added actions, especially `*` actions or sensitive actions (`iam:PassRole`, `sts:AssumeRole`, `kms:Decrypt`, `s3:GetObject` on new buckets)
- Removal of IAM policy conditions (`aws:SourceArn`, `aws:SourceAccount`, `aws:ViaAWSService`) that previously scoped access
- Broadened resource ARNs (e.g., `arn:aws:s3:::my-bucket/prefix/*` → `arn:aws:s3:::my-bucket/*` or `*`)
- New `Principal` entries in resource policies (S3 bucket policies, KMS key policies, SNS/SQS policies)
- Changes to trust policies that allow new roles or accounts to assume a role
- Security group ingress rule additions, especially `0.0.0.0/0` or broader CIDR ranges
- KMS key policy changes that grant new principals encrypt/decrypt access
- Removal of `DeletionPolicy: Retain` or `UpdateReplacePolicy: Retain`

**Why this is dangerous:**
- Privilege escalation may not cause deployment failures — it deploys successfully but silently weakens the security posture
- Broadened IAM policies can grant unintended cross-account or cross-service access
- Removed conditions on policies can expose resources to the entire account or AWS partition

**Action:** Flag for security review. Verify the privilege increase is intentional, justified, and follows least-privilege principles. Check that CDK Nag suppressions are updated with documented reasons if new suppressions are needed.

### 5. IAM Permission Removal Diffs (High risk — potentially breaking)

Changes that completely remove IAM permissions or policy statements:

- Entire IAM policy statements removed from a role or managed policy
- Actions deleted from an existing policy statement without replacement
- Managed policy attachments removed from a role
- Inline policies removed from a role
- Resource policy statements removed (S3 bucket policies, KMS key policies, SQS/SNS policies)
- Service-linked role or service principal access removed

**Why this is dangerous:**
- Permission removal deploys successfully but can immediately break running workloads that depend on the removed permission
- The failure is not visible at deployment time — it manifests as `AccessDenied` errors at runtime when the affected code path is exercised
- The blast radius can extend to associated accounts if the removed permission was used in cross-account workflows
- Unlike privilege escalation (which weakens security silently), permission removal breaks functionality loudly but unpredictably

**How to distinguish from tightening:**
- **Removal** = an action, statement, or policy is deleted entirely. The capability no longer exists.
- **Tightening** = the same actions remain but are scoped more narrowly (added conditions, reduced resource ARNs, restricted principals). The capability still exists but is more constrained.

**Action:** Flag as high risk. Verify that no existing code paths, Lambda functions, custom resources, or blueprint provisioning workflows depend on the removed permission. Check both the main account and all associated account stacks.

### 6. IAM Permission Tightening Diffs (Medium risk — requires review)

**MEDIUM is reserved exclusively for the cases listed in sections 6, 6a, and 7.** Do not use MEDIUM for any other type of change. If a change does not match these sections, it is either HIGH (sections 1-5) or LOW (section 8). There is no discretionary MEDIUM category.

Changes that narrow the scope of existing IAM permissions without removing them:

- Adding conditions to existing policy statements (`aws:SourceArn`, `aws:SourceAccount`, `StringEquals`, `ArnLike`)
- Narrowing resource ARNs (e.g., `*` → specific ARN, `arn:aws:s3:::bucket/*` → `arn:aws:s3:::bucket/prefix/*`)
- Reducing the set of principals in a resource policy while keeping the statement
- Adding `StringLike`/`StringEquals` conditions that restrict which values are accepted
- Scoping `kms:CreateGrant` with `kms:GrantIsForAWSResource` or `kms:ViaService` conditions

**Why this needs review:**
- Tightening is generally a security improvement, but overly aggressive scoping can break legitimate access patterns
- Condition keys may not match all valid request contexts (e.g., `aws:SourceArn` doesn't propagate through all service chains)
- Resource ARN narrowing may exclude valid object paths or resource names that exist in deployed environments

**Action:** Flag as medium risk. Verify the tightened scope still covers all legitimate access patterns. Check that condition keys are appropriate for the service and action being constrained.

### 6a. Test/Debug Values in Non-Test Code (Medium risk)

Changes where hardcoded test or debug values appear in production code paths (construct `lib/` directories, not `test/` or `sample_configs/`):

- Hardcoded strings like `'test'`, `'test5'`, `'debug'`, `'TODO'`, `'FIXME'` as resource names, parameter values, or configuration
- Placeholder values that are clearly not production-ready (e.g., `name: 'test'`, `value: 'test'`)
- Code that appears to be debug instrumentation committed to a shared construct

**Why this needs review:**
- Test values in shared L2/L3 constructs propagate to every module that uses them
- They create spurious resources (SSM parameters, CloudFormation outputs) in production deployments
- They are likely accidental commits that should be caught before merge

**Action:** Flag as medium risk. Verify with the author whether the change is intentional or accidental debug code.

### 7. New CDK Nag Suppressions (Medium or High risk — requires compliance review)

Changes that add new CDK Nag rule suppressions:

- New `NagPackSuppression` entries in construct code or config-level `nag_suppressions`
- Suppressions that bypass encryption requirements (e.g., `AwsSolutions-S3-*`, `NIST.800.53.R5-*Encrypted*`)
- Suppressions that bypass access control requirements (e.g., `AwsSolutions-IAM4`, `AwsSolutions-IAM5`)
- Suppressions with vague or missing reasons

**Risk classification:**
- **MEDIUM** — The suppression has a specific, descriptive reason that references AWS service authorization documentation or explains the technical justification for why the suppression is necessary.
- **HIGH** — The suppression has a vague, generic, or missing reason (e.g., "Required for functionality", "Needed", "N/A", or empty string). Vague reasons make it impossible to audit whether the suppression is still justified.

**Why this is dangerous:**
- Each suppression is an explicit opt-out from a compliance control
- Suppressions accumulate over time and can erode the security baseline
- Vague reasons make it impossible to audit whether the suppression is still justified

**Action:** Flag for compliance review. Every new suppression must have a specific, documented reason that references the AWS service authorization documentation. Verify the suppression is scoped as narrowly as possible (resource-level, not stack-level). See the `compliance-review` steering file for suppression reason standards.

### 8. Low Risk Diffs (Approve)

Changes that modify resource properties without replacement:

- Adding or updating tags
- Updating Lambda code or configuration
- Adding new resources (check new IAM resources for privilege escalation)
- Changing non-replacement properties (e.g., `VisibilityTimeout` on SQS, `ReadCapacityUnits` on DynamoDB)
- Any resource change traced entirely to a sample config edit (`sample_configs/*.yaml`). Sample configs are test fixtures, not production infrastructure — changes to them have no deployment impact. **This rule takes precedence over all other risk categories.** Even if a sample config change causes a logical ID rename on a stateful resource, it is LOW because sample configs are never deployed to real environments.

**Action:** Approve after confirming the change is intentional and matches the code change.

### 9. Wide Impact Root Causes (Escalate based on number of impacted modules)

When a single root cause produces diffs across multiple modules, the risk level is escalated based on the breadth of impact. The escalation is graduated:

- **3+ impacted modules** — increase risk one level (e.g., LOW → MEDIUM)
- **5+ impacted modules** — increase risk two levels (e.g., LOW → HIGH)
- **10+ impacted modules** — increase risk three levels (e.g., LOW → HIGH, MEDIUM → HIGH)
- **Maximum escalated level is HIGH** — wide impact alone never reaches BLOCKING

Note: "impacted modules" means distinct app modules (not stacks — a module with 3 stacks counts as 1 module).

Wide impact changes warrant escalation because:

- **Unintended scope:** A change in a shared L2 construct can silently propagate to dozens of modules. Even if each individual diff looks safe, the aggregate effect may not have been intended by the author.
- **Deployment coordination:** Wide-reaching changes may require coordinated deployments across multiple modules and accounts. Deploying them piecemeal can leave environments in inconsistent states.
- **Regression risk:** The more baselines affected, the higher the probability that at least one downstream module has an edge case where the change causes unexpected behavior.
- **Review fatigue:** When many baselines change, reviewers tend to spot-check rather than review each one. Escalation forces deliberate review of the root cause itself.

**Action:** Escalate the root cause thread to the appropriate level and require explicit acknowledgment. The reviewer should verify the author intended the change to propagate this widely and that all affected modules have been considered.

## Review Process

### 1. Identify Changed Baselines

```bash
git diff --name-only | grep '\.baseline\.json$'
```

### 2. For Each Changed Baseline, Inspect the Diff

```bash
git diff -- path/to/test/__snapshots__/sample-config-comprehensive.baseline.json
```

### 3. Classify Each Resource Change

For every resource in the diff, determine:

- **What changed?** — Property update, addition, deletion, or logical ID rename
- **Is it stateful?** — Does this resource contain data (S3, DynamoDB, RDS, etc.)?
- **Does it require replacement?** — Check the [CloudFormation resource reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) for the property's update behavior
- **Is it a logical ID change?** — Same resource type and properties at a different logical ID

### 4. Root Cause Attribution

For every resource change, trace it back to the specific source file and line that caused it. Be extremely rigorous:

- A resource change must only be attributed to a source file if there is a direct, concrete path from the code change to the resource change
- If a code change is in a different module, different construct, or different stack than the resource that changed, it is NOT the root cause unless the CDK diff explicitly shows the change propagating through
- Only include findings for resources that actually appear in THIS baseline's CDK diff — do not create findings for changes in other baselines or other modules
- When in doubt, mark the source as "Unknown - Please Investigate" rather than guessing

- When attributing a source, always use the **first line of the relevant code change** (the start of the diff hunk), not an arbitrary line within the change. Multiple baselines affected by the same code change must all attribute to the exact same source file and line. If a single addition spans lines 94-101, every baseline affected by that addition must attribute to line 94. Inconsistent line attribution across baselines causes duplicate review threads.

### 5. Produce Assessment

For each changed baseline, output:

```
Baseline: {filename}
Risk: LOW | MEDIUM | HIGH | BLOCKING

Resource changes:
  - {LogicalId}: {ResourceType} — {change description} — {risk level}
  - {LogicalId}: {ResourceType} — {change description} — {risk level}

Blocking issues:
  - {description of why this cannot be deployed as-is}

Required actions:
  - {what must happen before this can merge}
```

### Assessment Rules

- Only include findings for resources that actually appear in THIS baseline's CDK diff. Do not create findings for changes in other baselines or other modules, even if those changes appear in the source code diff context.
- One finding per resource change. If a resource has multiple concerns, pick the highest risk.
- Omit LOW findings if there are BLOCKING or HIGH findings.
- Order findings by severity: BLOCKING first, then HIGH, then MEDIUM, then LOW.
- Only classify IAM changes as LOW if they add new permissions to a new resource that did not previously exist (e.g., a new bucket gets a new bucket policy). All other IAM changes are at least MEDIUM.

## Anti-Patterns

### Blindly updating baselines

```bash
# ❌ Never do this without reviewing the diff
npm run test:update-baselines
git add .
git commit -m "update baselines"

# ✅ Always review first
npm run test:update-baselines
git diff -- '**/*.baseline.json'
# Review each change, classify risk, then commit with explanation
```

### Ignoring logical ID renames

```diff
# ❌ Looks harmless — same bucket, different logical ID
- "MyBucketABC123": {
+ "MyBucketDEF456": {
    "Type": "AWS::S3::Bucket",
    "Properties": { "BucketName": "my-org-dev-shared-data" }

# This will FAIL deployment: CloudFormation tries to create a new bucket
# with the same name while the old one still exists
```

### Assuming property changes are non-breaking

```diff
# ❌ Changing BucketName requires REPLACEMENT — data loss
  "Properties": {
-   "BucketName": "my-org-dev-shared-data"
+   "BucketName": "my-org-dev-shared-data-v2"

# CloudFormation will delete the old bucket (with all data) and create a new one
```
