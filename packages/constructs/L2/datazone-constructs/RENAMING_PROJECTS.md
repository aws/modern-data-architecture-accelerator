# Renaming an already-deployed DataZone/SMUS project

Applies to `@aws-mdaa/sagemaker-project` and `@aws-mdaa/dataops-project`, both built on
`MdaaDatazoneProject`. Covers using `nameOverride` to rename a project that is already
deployed and `ACTIVE`. For naming a brand-new project, just set `nameOverride` - none of
this is needed; skip to [New projects](#new-projects).

## Why this needs an extra step

`nameOverride` sets the DataZone project's `Name` in place, with no replacement -
CloudFormation classifies `Name` as *No interruption*. But if your project config also
sets `environmentConfigs` (per-environment parameter overrides, e.g. `glueDbName` - both
`@aws-mdaa/sagemaker-project` and `@aws-mdaa/dataops-project` use this same config key),
CloudFormation resends that entire property on every update to the project, even when
its content hasn't changed and even though `cdk diff` won't show it. DataZone accepts
that property addressed by `environmentConfigurationName` only while an environment is
still being created - once it's `ACTIVE`, DataZone rejects it with:

```
AWS::DataZone::Project  HandlerErrorCode: InvalidRequest
"environmentConfigurationName without environmentResolvedAccount is not supported.
Pass environmentId to update existing environments..."
```

This fires on *any* update to an already-`ACTIVE` project that has `environmentConfigs`
set - a `nameOverride` change is just the first one most people hit. The fix is to
address the environment by its ID instead of its configuration name.

## Do you even need this?

Check your project's config for an `environmentConfigs` block - both
`@aws-mdaa/sagemaker-project` and `@aws-mdaa/dataops-project` use this same key.

- **Not set:** just add `nameOverride` and deploy. Nothing else to do.
- **Set:** you need `environmentId` on each entry whose environment is already `ACTIVE`
  before you can make this change (or any other change) - see below.

## Setting `environmentId`

1. **Get the environment's ID.** Either look it up:

   ```bash
   aws datazone list-environments \
     --domain-identifier <domain-id> \
     --project-identifier <project-id> \
     --name Tooling --query 'items[0].id' --output text
   ```

   Or read the SSM parameter at `<ssmPath>/project/<key>-env-<configKey>/environment-id`
   (see [How it works](#how-it-works)) - no API call needed if it already holds a real
   ID rather than the `UNRESOLVED` placeholder.

2. **Set it in config:**

   ```yaml
   projects:
     my-project:
       nameOverride: "Customer SQL Reporting"   # the new name, or any other change
       environmentConfigs:
         Tooling:
           environmentId: "<the id from step 1>"
           parameters: {}   # keep whatever you already had here
   ```

   A literal ID works, but so does an `ssm:` reference to the published parameter above,
   as long as it already holds a real ID.

3. **Deploy.** It addresses the environment by ID instead of configuration name, so the
   update succeeds.

## How it works

A best-effort custom resource looks up each configured entry's live environment ID by
configuration name and publishes it to SSM at
`<ssmPath>/project/<key>-env-<configKey>/environment-id`, for step 1 above to read
instead of calling `list-environments` yourself.

This only happens once, when the entry is first created - not on every deploy. If the
environment isn't `ACTIVE` yet within that first attempt's short retry budget
(provisioning commonly takes several minutes), the parameter is left holding a
placeholder (`UNRESOLVED`) permanently. If you find it stuck there, use
`aws datazone list-environments` directly instead of waiting on it.

## New projects

Nothing to configure. A new project's environments don't exist yet, so MDAA addresses
them by `environmentConfigurationName`, the only valid addressing mode before an
environment is created. Once the environment is `ACTIVE`, follow
[Setting environmentId](#setting-environmentid) before making your next change to the
project.

## Rollback behavior

If a deploy fails after setting `environmentId`, CloudFormation rolls back cleanly - the
project keeps its original name and the environments are unaffected. Re-check that the
`environmentId` you set actually resolved to a real, `ACTIVE` environment ID before
retrying.
