---
inclusion: manual
---

# Improve NagSuppression Reasons

When asked to improve NagSuppression reasons in this codebase, follow these rules:

## Structure

- One sentence per service/action group, each with its own AWS service authorization reference URL inline.
- Use glob-style shorthand for action groups where possible (e.g. `datazone:Get*/List*`).
- Keep it concise — no filler words.

## Content

- State which actions do not support resource-level permissions.
- Link to the specific service authorization reference page: `https://docs.aws.amazon.com/service-authorization/latest/reference/list_<servicename>.html`
- If additional scoping exists (conditions like `aws:ViaAWSService`, resource ARN patterns), mention it in the same sentence as the relevant action.

## Example

```typescript
reason:
  'datazone:Get*/List* do not support resource-level permissions ' +
  '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html). ' +
  'iam:GetRole does not support resource-level permissions ' +
  '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_iam.html) ' +
  'and is further scoped via aws:ViaAWSService condition.',
```

## Process

1. Read the policy statements near the suppression to understand which actions use wildcard resources.
2. Look up each service's authorization reference page to confirm resource-level permission support.
3. Write one sentence per service with the reference URL.
4. Mention any IAM conditions or resource ARN scoping that further limits the wildcard.
