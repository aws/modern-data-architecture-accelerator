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

### 5. New CDK Nag Suppressions (High risk — requires compliance review)

Changes that add new CDK Nag rule suppressions:

- New `NagPackSuppression` entries in construct code or config-level `nag_suppressions`
- Suppressions that bypass encryption requirements (e.g., `AwsSolutions-S3-*`, `NIST.800.53.R5-*Encrypted*`)
- Suppressions that bypass access control requirements (e.g., `AwsSolutions-IAM4`, `AwsSolutions-IAM5`)
- Suppressions with vague or missing reasons

**Why this is dangerous:**
- Each suppression is an explicit opt-out from a compliance control
- Suppressions accumulate over time and can erode the security baseline
- Vague reasons make it impossible to audit whether the suppression is still justified

**Action:** Flag for compliance review. Every new suppression must have a specific, documented reason that references the AWS service authorization documentation. Verify the suppression is scoped as narrowly as possible (resource-level, not stack-level). See the `compliance-review` steering file for suppression reason standards.

### 6. Safe Diffs (Approve)

Changes that modify resource properties without replacement:

- Adding or updating tags
- Changing IAM policy statements that narrow scope (adding conditions, reducing actions)
- Updating Lambda code or configuration
- Adding new resources (check new IAM resources for privilege escalation)
- Changing non-replacement properties (e.g., `VisibilityTimeout` on SQS, `ReadCapacityUnits` on DynamoDB)

**Action:** Approve after confirming the change is intentional and matches the code change.

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

### 4. Produce Assessment

For each changed baseline, output:

```
Baseline: {filename}
Risk: SAFE | HIGH | BLOCKING

Resource changes:
  - {LogicalId}: {ResourceType} — {change description} — {risk level}
  - {LogicalId}: {ResourceType} — {change description} — {risk level}

Blocking issues:
  - {description of why this cannot be deployed as-is}

Required actions:
  - {what must happen before this can merge}
```

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
