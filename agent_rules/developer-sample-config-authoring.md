---
scope: fileMatch
globs:
  - 'packages/apps/**/sample_configs/*.yaml'
  - 'packages/cli/sample_configs/*.yaml'
---

# Sample Config Authoring (MDAA contributors)

Applies to sample configs inside the MDAA repository — `packages/apps/**/sample_configs/` and
`packages/cli/sample_configs/`. This is contributor process and is deliberately NOT bundled
into customer projects by `mdaa init`; the customer-facing half lives in
`user-config-authoring.md`.

## `packages/cli/sample_configs/` is exempt from the config-authoring rules

Those files are CLI command baseline fixtures, not deployable configs. They deliberately
hardcode values and carry adversarial shell payloads, and must not use SSM references —
those resolve inside a construct scope during synth and throw during CLI config resolution.
See [CLI](../TESTING.md#cli) in `TESTING.md` before editing one.

## Don't restate the schema in sample-config comments

The config interface's JSDoc is the canonical description — it generates `config-schema.json`
and `SCHEMA.md`, so a comment that paraphrases it creates a second copy that goes stale on
the next schema change. A sample-config comment answers only "what do I set here, and what
happens if I do?"; rationale, security background, version prerequisites, and warnings about
neighbouring properties belong in the JSDoc and the module README.

## Adding a new config field: extend the comprehensive sample by default

When you add a new optional config field to a module, **add it to the existing comprehensive sample config** (and let its baseline regenerate) rather than creating a new standalone `sample-config-<feature>.yaml`. Most fields are purely additive (like `dataProtection`, `logRetentionDays`, `alarms`) and belong alongside the other options in the comprehensive config, which exists to demonstrate every available option together.

**Only create a new dedicated sample config when the new field is incompatible with the comprehensive sample** — i.e. it is mutually exclusive with at least one field already present there, so the two cannot coexist in one valid config. Examples in the AgentCore Runtime module: `codePath` (mutually exclusive with the comprehensive config's `containerUri`) and `enforceVpcOnly` variants. In those cases the standalone config + its own `baselineDiffTestApp` entry + baseline are required, because the branch cannot be exercised from the comprehensive config.

This complements the testing-standards rule "mutually exclusive config branches each have dedicated sample configs and tests": that rule is the _exception_, and extending the comprehensive config is the _default_. Internal mutually-exclusive branches of an otherwise-additive field (e.g. `alarms.notificationTopicArn` vs `alarms.createNotificationTopic`) are covered by L3 construct unit tests, not by separate app-level sample configs.
