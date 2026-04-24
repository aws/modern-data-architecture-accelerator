---
inclusion: manual
---

# Compliance Review - Steering Guide

Review and improve compliance controls, CDK Nag validation, and nag suppression documentation across MDAA constructs and modules. This steering file covers the full scope of MDAA's security and compliance posture.

#[[file:CONTRIBUTING.md]]
#[[file:TESTING.md]]

## Scope

- **L2 constructs**: `packages/constructs/L2/` — compliance defaults (encryption, access controls, logging)
- **L3 constructs**: `packages/constructs/L3/` — compliance controls where L2 constructs don't exist
- **App modules**: `packages/apps/` — compliance inherited from constructs, plus module-level nag suppressions
- **CDK Nag rulesets**: AwsSolutions, NIST 800-53 R5, HIPAA Security, PCI DSS 3.2.1

## Compliance Philosophy

The compliance philosophy and construct patterns are defined in CONTRIBUTING.md (pulled in via `#[[file:CONTRIBUTING.md]]` above). This steering file focuses on the review process and nag suppression improvement workflow.

## What to Review

### Construct Compliance Controls
- Every L2 construct enforces encryption, access controls, and logging appropriate to its resource type
- Every L3 construct validates compliance for resources not covered by existing L2 constructs
- All compliance controls have explicit test assertions (not just coverage)
- CDK Nag compliance is checked in every construct test via `testApp.checkCdkNagCompliance()`

### Nag Suppression Quality
- Every suppression has a documented reason explaining why the rule is suppressed
- Reasons reference specific AWS service authorization documentation
- Suppressions are scoped as narrowly as possible (resource-level, not stack-level)

### Security Patterns
- IAM policies use resource-scoped permissions, not `*`
- KMS key policies follow the admin/user separation pattern
- Security groups follow least-privilege ingress/egress rules
- Cross-account access uses proper trust relationships

## Improving Nag Suppression Reasons

When improving suppression reasons, follow this structure:

- One sentence per service/action group, each with its own AWS service authorization reference URL inline
- Use glob-style shorthand for action groups where possible (e.g., `datazone:Get*/List*`)
- Keep it concise — no filler words

### Content Rules

- State which actions do not support resource-level permissions
- Link to the specific service authorization reference page: `https://docs.aws.amazon.com/service-authorization/latest/reference/list_<servicename>.html`
- If additional scoping exists (conditions like `aws:ViaAWSService`, resource ARN patterns), mention it in the same sentence

### Example

```typescript
reason:
  'datazone:Get*/List* do not support resource-level permissions ' +
  '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html). ' +
  'iam:GetRole does not support resource-level permissions ' +
  '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_iam.html) ' +
  'and is further scoped via aws:ViaAWSService condition.',
```

### Process

1. Read the policy statements near the suppression to understand which actions use wildcard resources
2. Look up each service's authorization reference page to confirm resource-level permission support
3. Write one sentence per service with the reference URL
4. Mention any IAM conditions or resource ARN scoping that further limits the wildcard

## Validation

After making compliance changes:

1. Run `npm run test` in the affected package — all CDK Nag compliance tests must pass
2. Run `npm run lint` — no linting errors
3. If nag suppressions were added or modified, verify the reason text follows the structure above
4. If compliance controls were added, verify they have explicit test assertions
