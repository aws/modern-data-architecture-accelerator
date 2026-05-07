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

## CI Agent Usage

This section is used by the automated Compliance Review CI agent. When invoked by the agent,
Kiro receives the code diff, full source, test files, and dependency tree for a construct package,
and must produce structured JSON findings.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no explanation
outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "BLOCKING | HIGH | MEDIUM | LOW",
  "summary": "One paragraph explaining the overall compliance posture and key concerns.",
  "findings": [
    {
      "risk": "BLOCKING | HIGH | MEDIUM | LOW",
      "category": "encryption | access_control | nag_suppression | iam_policy | security_group | logging",
      "file": "path/to/file.ts",
      "line": 42,
      "resource": "AWS::S3::Bucket (if applicable)",
      "detail": "What's wrong and what should be done."
    }
  ]
}
```

### Risk Classification for CI Agent

- **BLOCKING:** Missing encryption on stateful resources (S3, DynamoDB, RDS, OpenSearch, EFS), removed security controls that were previously enforced, new resource created without any compliance controls
- **HIGH:** Vague nag suppression reasons (no AWS service authorization reference), broad IAM wildcards (`Resource: '*'`) without justification, removed IAM conditions (`aws:SourceArn`, `aws:SourceAccount`)
- **MEDIUM:** Nag suppressions with specific but improvable reasons, IAM policies that could be tighter, security group rules that could be narrower
- **LOW:** Minor documentation gaps on suppressions, style issues in suppression reason formatting

### Rules for CI Agent Findings

- One finding per compliance issue. If a resource has multiple concerns, create separate findings.
- Every finding must include `file` and `line` pointing to the construct source where the issue is.
- Only include findings for code that was CHANGED in this MR. Do not flag pre-existing issues.
- Order findings: BLOCKING first, then HIGH, then MEDIUM, then LOW.
- Omit LOW findings if there are BLOCKING or HIGH findings.
- Use only ASCII characters in all string values.
- **Do NOT report missing tests or test coverage gaps.** Testing is handled by the Test Standards agent. Focus exclusively on the compliance posture of the implementation code itself.

### Line Number Anchoring (CRITICAL for stability)

Line numbers must be deterministic across runs. **Incorrect line numbers cause duplicate review threads and block the pipeline.** You MUST follow these rules exactly:

**Step 1: Identify the problematic statement.** Find the specific TypeScript statement that IS the compliance issue.

**Step 2: Report the line number of THAT statement's opening keyword.** Not a nearby line. Not a related line. THE line.

| Finding type | The line MUST contain |
|---|---|
| Nag suppression | `NagSuppressions.addResourceSuppressions(` or `MdaaNagSuppressions.addCodeResourceSuppressions(` or `addNagSuppression` |
| IAM policy | `new PolicyStatement({` (the line with `new PolicyStatement`) |
| Missing encryption | `new Bucket({` or `new Queue({` or `new Table({` (the resource constructor) |
| Security group | `.addIngressRule(` or `new SecurityGroup({` |
| Resource policy | `.addToResourcePolicy(` |

**Example:** Given this code:
```
181  // Intentionally broad IAM policy
182  const adminStatement = new PolicyStatement({
183    sid: 'AdminAccess',
184    effect: Effect.ALLOW,
185    actions: ['sqs:*'],
186    resources: ['*'],
187  });
188  adminStatement.addAnyPrincipal();
189  this.addToResourcePolicy(adminStatement);
190
191  MdaaNagSuppressions.addCodeResourceSuppressions(
192    this,
193    [{ id: 'AwsSolutions-SQS4', reason: 'Required for functionality' }],
194    true,
195  );
```

- IAM policy finding → `"line": 182` (the `new PolicyStatement({` line)
- Nag suppression finding → `"line": 191` (the `MdaaNagSuppressions.addCodeResourceSuppressions(` line)

**WRONG answers:** 180 (super call), 181 (comment), 188 (addAnyPrincipal), 189 (addToResourcePolicy), 193 (suppression object)

**Rules:**
- NEVER use the line of `super(`, a comment, a closing brace, or a method call on the result
- NEVER estimate — count from the source file content provided
- If you cannot find the exact line, use `0`
