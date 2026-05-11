# Migrating from `@aws-mdaa/gaia` (v1) to `@aws-mdaa/gaia-v2`

`@aws-mdaa/gaia` (v1) is deprecated in favor of `@aws-mdaa/gaia-v2`. This guide describes what changed, what does not have a drop-in equivalent, and how to migrate an existing deployment.

> **Status:** v1 remains published and functional. New features land in v2 only. v1 will be removed in a future release; no removal date is committed yet.

## Why v2 exists

v2 is a re-architected GAIA backend. v1 and v2 are not bytecode-compatible, config-compatible, or data-compatible. The two modules ship as separately named packages so they can coexist in the same workspace.

Summary of architectural differences:

| Area | v1 (`@aws-mdaa/gaia`) | v2 (`@aws-mdaa/gaia-v2`) |
|---|---|---|
| API entry point | API Gateway REST + WebSocket APIs | AppSync Events + API Gateway REST |
| Auth | Cognito with custom authorizers | Cognito with direct AppSync/API Gateway authorization |
| Real-time transport | WebSocket via API Gateway | AppSync Events |
| Message brokering | SNS topic + SQS queues | Direct Lambda invocation via AppSync |
| Model interface | SageMaker + Bedrock Lambdas behind SQS | Bedrock-first via Lambda data sources |
| RAG engines | Aurora PgVector, Kendra | Bedrock Knowledge Bases (via `@aws-mdaa/bedrock-builder`) |
| Ingestion pipeline | S3 event -> ingestion SQS -> Step Functions | S3 event -> Bedrock Knowledge Base sync |
| Frontend delivery | Customer-provided, hosted externally | Optional CloudFront distribution serving `aws-exports.json` |
| WAF | Fronting API Gateway | Fronting CloudFront |

## Compatibility and upgrade path

There is **no in-place upgrade** from v1 to v2. Deployed v1 resources are not migrated to v2 by running the v2 module against an existing v1 config. Plan migration as a parallel deployment followed by cutover.

Recommended approach:

1. **Deploy v2 alongside v1** in a new domain or environment inside your existing `mdaa.yaml`. Let both run side by side during migration.
2. **Re-create your knowledge content** in v2's Bedrock Knowledge Base. v1's RAG stores (Aurora PgVector indices, Kendra indices) do not port directly.
3. **Update your frontend** to target v2's AppSync Events endpoint and REST endpoint. The API shapes differ. See [`packages/apps/ai/gaia-v2-app/SCHEMA.md`](../gaia-v2-app/SCHEMA.md) for the v2 surface.
4. **Cut over traffic** once you have validated v2. Leave v1 deployed until you are confident in v2, then destroy the v1 stack.

## Config migration

v1 and v2 configs are not interchangeable. Some key-by-key pointers:

### Things that map cleanly

- **`gaia.waf`** - conceptually the same. v2's WAF sits in front of CloudFront, not API Gateway. Configuration shape is similar but property names differ. Review `@aws-mdaa/gaia-v2`'s schema.
- **`gaia.cognito`** - user pool and identity pool config concepts carry over. v2 adds `authProvider` for autologin via federated IdPs (for example `EntraID-OIDC`).
- **`nag_suppressions`** - identical shape; move any suppressions from the v1 config into the v2 config as-is.
- **`sagemakerBlueprint`**, **`service_catalog_product_config`** - shared across v1 and v2.

### Things that change

- **`gaia.ragEngines`** - v1 supported Aurora PgVector and Kendra as first-class RAG stores. v2 delegates RAG to `@aws-mdaa/bedrock-builder`, which uses Bedrock Knowledge Bases backed by OpenSearch Serverless by default. Existing indices will not port; re-ingest your documents through the bedrock-builder module.
- **`gaia.llms`** - v1 had per-provider Lambda model interfaces (SageMaker, Bedrock). v2 targets Bedrock models and foundation-model-hosted endpoints. Custom SageMaker endpoints are not natively wired in v2; if you need them, configure them through `bedrock-builder`'s custom data source or contribute a v2 enhancement.
- **`gaia.adminUi`** (v2-only) - configures the optional CloudFront-served admin UI. No v1 equivalent.

### Things that go away

- **SQS ingestion queue / SNS broker config** - v2 has no SQS/SNS in the request path. Any tuning of queue visibility timeouts or SNS filter policies is not applicable.
- **Step Functions ingestion workflow** - v2 uses Bedrock Knowledge Base native sync. Custom Step Functions branches are not supported in the built-in ingestion path.
- **Custom API Gateway authorizers** - v2 uses Cognito authorizers directly; custom Lambda authorizer config does not carry over.

## Frontend considerations

v1 exposed a REST API and a WebSocket API at API Gateway. v2 exposes a REST API at API Gateway and an AppSync Events endpoint for streaming. If you have an existing frontend built against v1:

- **REST calls** will need endpoint URL updates and response schema changes. Check v2's `config-schema.json` for the new shapes.
- **WebSocket consumers** must migrate to an AppSync Events client. There is no adapter.
- **Auth flow** is simpler in v2 because there are no custom authorizers. If you were using the v1 custom authorizer to inject per-user attributes, that logic moves into v2's Cognito user pool triggers (`PreTokenGeneration`) or into your client.

## Roll-back

If you deploy v2 but decide to stay on v1, deleting the v2 stack returns you to the v1 state with no side effects, because the two run in isolated resource namespaces. Revert your `mdaa.yaml` to point at `@aws-mdaa/gaia` and redeploy. Your v1 data (DynamoDB tables, Aurora databases, S3 buckets) remains untouched by v2.

## Open questions / out of scope

- **Aurora PgVector data migration to OpenSearch Serverless** - not provided. If you have production data in v1's RAG store, plan to re-ingest documents rather than migrate vector data directly.
- **Chat history migration** - v1 stores chat sessions in DynamoDB tables created by the v1 stack. v2 uses its own session tables with a different schema. A scripted migration tool is not provided; if required, file a feature request.
- **Kendra migration** - v2 does not ship a Kendra data source out of the box. Continuing Kendra use is possible through `bedrock-builder` with a custom data source, but it is not a default.

## Questions or gaps

If you hit a migration scenario not covered here, open an issue against the MDAA repository and tag it `gaia-v2-migration`. We'll either extend this guide or point you at a workaround.
