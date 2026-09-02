# Bedrock AgentCore Runtime

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/ai/bedrock-agentcore-runtime-app/index.html).

Deploys Amazon Bedrock AgentCore Runtimes with custom Docker containers, VPC networking, JWT authentication, and lifecycle management. Supports both pre-built ECR images and building from local source code. Use this module when you need to run custom AI agent logic in your own containers with full control over the runtime environment and authentication.

---

## Deployed Resources

This module deploys and integrates the following resources:

<!-- TODO: Add architecture diagram -->

- **Bedrock AgentCore Runtime** — Custom agent runtime deployed in VPC mode. Supports Docker containers from ECR or built from source at deploy time.
- **Bedrock AgentCore Resource-Based Policy** (Optional) — Resource-based policy restricting runtime invocations to traffic originating from the configured VPC. Created when `enforceVpcOnly` is true.
- **AgentCore Interface VPC Endpoint** (Optional) — Interface endpoint for `com.amazonaws.{region}.bedrock-agentcore` with Private DNS, a least-privilege endpoint policy, and a security group restricting ingress to the runtime's application security groups. Created when `networkConfiguration.vpcEndpoint` is configured; can also create supporting endpoints (ECR, STS, CloudWatch Logs). See [AWS Service Endpoints](#aws-service-endpoints).
- **Bedrock AgentCore Runtime Endpoint** (Optional) — API endpoint for invoking the agent runtime via Bedrock AgentCore APIs.
- **Cognito User Pool + App Client** (Optional) — Identity provider for JWT inbound auth, created when `authorizerConfiguration.customJwtAuthorizer.cognito` is configured. Includes threat protection, a strong password policy, required MFA, and agentic-workload token defaults. With `hostedUi`, also creates a **User Pool Domain** and a **Managed Login Branding** style (Cognito activates managed login only for a client that has one), and optionally an enterprise SAML/OIDC **Identity Provider**. See [Inbound Authorization](#inbound-authorization).
- **ECR Docker Image Asset** — Container image built and pushed to ECR at deploy time (when using `codePath`).
- **IAM Execution Role + Managed Policy** — Runtime execution role with permissions for ECR image access, CloudWatch Logs, X-Ray tracing, CloudWatch Metrics, Bedrock AgentCore workload identity tokens, and Bedrock model invocation. Can use an existing role via `roleArn` or auto-create one.
- **CloudWatch Log Group** — Log group for runtime execution logs.
- **KMS Key** — Customer-managed encryption key for the CloudWatch log groups. Also reused to encrypt a module-created alarm SNS topic when `alarms.createNotificationTopic` is true.
- **CloudWatch Data Protection Policy** — PII masking policy applied to the log groups on ingestion. Extendable via `dataProtection.additionalIdentifiers`.
- **CloudWatch Alarms** (Optional) — Error-rate and/or throttle-count alarms on the AgentCore service metrics (namespace `AWS/Bedrock-AgentCore`), created when an `alarms` block is configured. Notify an SNS topic on breach.
- **SNS Topic** (Optional) — CMK-encrypted topic for alarm notifications, created when `alarms.createNotificationTopic` is true. Alternatively, alarms notify an existing topic via `alarms.notificationTopicArn`.
- **SSM Parameters** — Runtime ARN, Runtime ID, Runtime Name, and optionally Endpoint ARN/ID, stored in Parameter Store for cross-module reference. A created Cognito pool publishes its pool ID, client ID, discovery URL, and (with a hosted UI) domain. A created alarm SNS topic and the alarms publish their own SSM parameters (topic and alarm ARN/name) via the underlying MDAA constructs.

---

## Related Modules

- [Bedrock Builder](../bedrock-builder-app/README.md) — Deploy managed Bedrock Agents as an alternative to custom AgentCore runtimes
- [Bedrock Settings](../bedrock-settings-app/README.md) — Configure Bedrock model invocation audit logging for runtime model calls
- [Roles](../../governance/roles-app/README.md) — Create IAM execution roles for AgentCore runtimes

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Encryption at Rest**:
  - CloudWatch log groups are always encrypted with a module-created customer-managed KMS key (built-in, cannot be disabled)
  - CloudWatch Data Protection always masks a built-in comprehensive set of PII identifiers on log ingestion (built-in, cannot be disabled; extendable via `dataProtection.additionalIdentifiers`)
  - Container images stored in ECR with default encryption
- **Encryption in Transit**:
  - All runtime API communications use TLS
  - X-Ray tracing data transmitted securely
- **Least Privilege**:
  - Execution role scoped to specific permissions for ECR access, CloudWatch Logs, X-Ray, and Bedrock model invocation
  - Supports using an existing role or auto-creating one with minimal required permissions
- **Network Isolation**:
  - Runtimes deployed in VPC mode with no public internet access unless explicitly configured via VPC routing
  - JWT authentication (custom or standard) controls runtime endpoint access
- **Inbound Authorization**:
  - An MDAA-created Cognito pool requires MFA by default, enables threat protection, requires an 8+ character mixed-class password, restricts user creation to administrators, and limits account recovery to email (see [Inbound Authorization](#inbound-authorization))
  - Required MFA obliges each user to register a TOTP authenticator before their first token — see [MFA enrolment](#mfa-enrolment), and set `mfa: optional` for callers with no human present to enrol
  - Tokens default to a 15-minute lifetime rather than Cognito's 60-minute default, and the refresh token is bound to 1 day rather than Cognito's 30, so a leaked token of either kind has a comparable revocation gap
  - The app client has OAuth disabled unless a hosted UI is explicitly configured, so no implicit grant or default callback URL is created
  - SRP is always available and the plaintext-password auth flow is enabled only where no alternative exists — a hosted-UI deployment signs in through the authorization code grant instead
  - The pool is retained on stack deletion with Cognito deletion protection enabled, so an identity store cannot be destroyed by tearing down the stack
  - **Runtime does not validate that a caller owns the session it names** — a valid token plus another user's session ID is accepted. Session-to-user binding is an application responsibility under the AgentCore shared responsibility model; see [Session-to-user binding](#session-to-user-binding) for where the check belongs and a race-free pattern
- **Observability & Monitoring**:
  - Agent spans are routed to the runtime's own log group rather than the account-shared `aws/spans` group, bringing span content (prompts, model I/O, tool arguments and results) inside the same CMK encryption, retention, and PII-masking boundary as the agent's logs (see [Observability & Tracing](#observability--tracing))
  - Optional CloudWatch alarms on error rate and throttle count for production incident detection (see [Alarms](#cloudwatch-alarms))
  - Optional EventBridge rules alerting on individual security events — auth failures and out-of-band configuration changes — with optional customer-supplied remediation (see [EventBridge Alerting](#eventbridge-alerting))
  - A module-created alarm SNS topic is CMK-encrypted and enforces TLS for delivery

### Organization-Level Prerequisites

The controls above are what this module deploys. The org-level guardrails around them — SCPs, CloudTrail data events, cross-account telemetry aggregation — are documented in [AgentCore Security Prerequisites](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator/blob/main/agentic_app/security-best-practices/YOUR-RESPONSIBILITIES.md), alongside the AgentCore sample configuration.

Two items from it affect how this module behaves:

- **CloudTrail data events are off by default.** `InvokeAgentRuntime` is a data event, so until they are enabled there is no invocation audit trail and the `auth-failure` [EventBridge rule](#eventbridge-alerting) matches nothing. Enable them with the audit-trail module's [`dataEventSelectors`](../../governance/audit-trail-app/README.md#data-event-selectors), using `resourceType: AWS::BedrockAgentCore::Runtime`.
- **SCPs do not restrict OAuth/JWT callers.** For a runtime using `customJwtAuthorizer` the resource-based policy is the perimeter, which is what [`enforceVpcOnly`](#vpc-only-enforcement-variant) generates.

### Containment and Incident Response

Stopping a misbehaving agent is an out-of-band operator action against a deployed runtime, so this module ships no kill switch — [`eventBridgeAlerts`](#eventbridge-alerting) exposes `targetLambdaArn` for a remediation function you write. An operator mid-incident should not have to follow a link to find the options, so they are listed here in the order to reach for them:

| #   | Mechanism                                                                                                                    | Scope                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | **IAM/SCP deny** on `bedrock-agentcore:InvokeAgentRuntime*`                                                                  | A role, an account, or an OU        |
| 2   | **Remove the invocation path** — `DeleteAgentRuntimeEndpoint`, or `UpdateAgentRuntime` to an authorizer admitting no callers | One runtime                         |
| 3   | **Cut egress** — modify the security group or VPC routing                                                                    | One runtime's network               |
| 4   | **`StopRuntimeSession`**                                                                                                     | One session, by `runtimeSessionId`  |
| 5   | **`forceAuthentication: true`** on `GetResourceOauth2Token` — agent-code change, not an operator action                      | Forces a fresh 3LO; revokes nothing |
| 6   | **Shorten the inbound token lifetime** (preventive)                                                                          | Every future token                  |
| 7   | **Rotate IdP signing keys** (break glass)                                                                                    | Every token from that IdP           |

Three things to settle before an incident, not during one:

- **There is no single-token revocation API.** JWT validation is offline against a cached JWKS, so disabling a user or client at your IdP does not invalidate tokens already issued — they stay valid until `exp`. The smallest unit you can actually cut off out of band is a single live session (4) or the agent's IAM role; no documented API revokes a stored user+agent credential.
- **Mechanism 1 does not reach OAuth/JWT callers**, for the same reason SCPs do not (above). On a `customJwtAuthorizer` runtime the first response has to be 2 or 3 instead, so know which inbound mode each of your runtimes uses.
- **Mechanism 6 caps how long an agent can run.** It shortens maximum invocation length as well as the revocation gap — read [Session Lifecycle and Token Expiry](#session-lifecycle-and-token-expiry) before tightening it, and on the `cognito` path note the knob is `idTokenValidityMinutes`.

Decision detail for each mechanism — when it fits, who needs the permission, and what to test in advance — is in [YOUR-RESPONSIBILITIES.md § 5](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator/blob/main/agentic_app/security-best-practices/YOUR-RESPONSIBILITIES.md#5-containment-and-incident-response), which is the canonical list. One correction worth carrying: **there is no "disable runtime" action** despite AgentCore enablement material implying one — neither AgentCore API has any `Disable*`/`Enable*` operation, and `UpdateAgentRuntime` exposes no such field. Mechanism 2 is that intent's real form.

---

## Inbound Authorization

A runtime uses either AWS IAM (SigV4) or JWT bearer tokens for inbound auth — never both. Omit `authorizerConfiguration` entirely and the runtime uses IAM, which is the default. Configure `customJwtAuthorizer` and it uses `CUSTOM_JWT`.

On the JWT path, exactly one of two fields names the identity provider. They differ only in **who provisions it**:

| Field          | Who creates the IdP | When to use                                                          |
| -------------- | ------------------- | -------------------------------------------------------------------- |
| `discoveryUrl` | You                 | You already run an OIDC-compliant IdP (Cognito, Okta, Entra ID, ...) |
| `cognito`      | MDAA                | You want an IdP deployed and configured alongside the runtime        |

Specifying both fails at synth; so does specifying neither.

### Bring your own IdP: `discoveryUrl`

MDAA creates no Cognito resources and passes your values through:

```yaml
authorizerConfiguration:
  customJwtAuthorizer:
    discoveryUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/openid-configuration'
    allowedAudience:
      - 'my-existing-client-id'
```

### MDAA-managed IdP: `cognito`

`cognito: {}` accepts every default. MDAA composes the OIDC discovery URL from the created pool and adds the created app client to `allowedAudience`, so you supply neither:

```yaml
authorizerConfiguration:
  customJwtAuthorizer:
    cognito: {}
```

Defaults applied to the pool and client:

| Setting          | Default                                                | Why                                                                                               |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Feature plan     | `PLUS` with threat protection `ENFORCED`               | Cognito acts on detected risk rather than only recording it                                       |
| Password policy  | 8+ chars, upper/lower/digit/symbol                     | CDK-nag `AwsSolutions-COG1`                                                                       |
| User creation    | Administrators only                                    | A runtime's callers are provisioned deliberately                                                  |
| Account recovery | Email only                                             | SMS recovery is vulnerable to SIM-swap                                                            |
| MFA              | `required` (TOTP)                                      | Compliance-clean by default; see [MFA enrolment](#mfa-enrolment) before deploying                 |
| Token validity   | 15 minutes (ID and access)                             | AgentCore guidance for agentic workloads; Cognito's own default is 60 minutes                     |
| Refresh token    | 1 day                                                  | Cognito's 30-day default would let a leaked refresh token mint access tokens for a month          |
| Auth flows       | SRP always; plaintext password only without `hostedUi` | `USER_PASSWORD_AUTH` sends the password itself, so it is enabled only where no alternative exists |
| Client secret    | None                                                   | The caller authenticates as a user, so a shared secret binds no identity                          |
| OAuth            | Disabled unless `hostedUi` is configured               | Avoids CDK's implicit grant and `https://example.com` callback defaults                           |
| Removal policy   | `retain`, with deletion protection                     | A wrongly destroyed identity store loses every user record irrecoverably                          |

Token validity is configurable from 5 to 60 minutes via `idTokenValidityMinutes`. That range is an MDAA policy choice — Cognito itself permits 5 minutes to 1 day, and the 60-minute cap keeps this module from being configured less securely than an unconfigured pool.

Each branch has its own sample config, because they are mutually exclusive and cannot be combined in one file:

**Federation requires `hostedUi`.** Cognito signs federated users in only through the hosted-UI Login and Authorize endpoints — never `InitiateAuth` — so `cognito.federation` without `cognito.hostedUi` is rejected at synth rather than deploying an identity provider no caller could reach.

| Config                                                                                      | Demonstrates                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [sample-config-cognito.yaml](sample_configs/sample-config-cognito.yaml)                     | Pool defaults, hosted UI, and SAML federation     |
| [sample-config-cognito-hosted-ui.yaml](sample_configs/sample-config-cognito-hosted-ui.yaml) | Hosted-UI authorization code grant, no federation |
| [sample-config-cognito-oidc.yaml](sample_configs/sample-config-cognito-oidc.yaml)           | OIDC enterprise federation                        |

### MFA enrolment

**Read this before deploying with the default `mfa: required`.** TOTP from an authenticator app is the only second factor this pool enables, and Cognito requires every user to register one before they can obtain their first token. Who drives that registration depends on your configuration — and one case cannot do it at all:

| Your callers                                   | Configure                      | Who enrols the user                                                 |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| People signing in through a browser            | `hostedUi` (any `mfa`)         | Cognito's managed login prompts for MFA setup and shows the QR code |
| People signing in through your own UI          | `mfa: required`, no `hostedUi` | **Your application** — see the flow below                           |
| A service, job, or agent with no human present | `mfa: optional`                | Nobody. MFA does not apply                                          |

If you configure `hostedUi`, you have nothing further to do: MDAA creates the hosted-UI domain and a managed-login branding style, and managed login then prompts each user through TOTP registration. (The branding style is required — Cognito activates managed login only for a client that has one, and assigns a default solely through the console, not the API.) Otherwise your application implements it, which is four calls threading a session through:

1. `InitiateAuth` (`USER_PASSWORD_AUTH`) returns an **`MFA_SETUP`** challenge instead of tokens
2. `AssociateSoftwareToken`, authorized with the challenge `Session`, returns the shared secret
3. Present that secret to the user as a QR code; they scan it into an authenticator app and enter the generated code, which you confirm with `VerifySoftwareToken`
4. `RespondToAuthChallenge` with `ChallengeName: MFA_SETUP` and the verified session completes sign-in

On every subsequent sign-in the user gets a `SOFTWARE_TOKEN_MFA` challenge and supplies a fresh code. This is ordinary application code for any app enforcing MFA — Amplify's `setUpTOTP` and `confirmSignIn` wrap the same sequence — and you would write it regardless of who provisioned the pool. It is called out here because a deployment that does not expect it will find that **users simply cannot authenticate**, and the failure surfaces as an unexpected challenge response rather than an error mentioning MFA. MDAA emits a synth warning (`cognitoRequiredMfaWithoutHostedUi`) for this combination.

**Set `mfa: optional` when no human is present to enrol.** A service caller authenticating with `USER_PASSWORD_AUTH` cannot register an authenticator, and storing a TOTP seed beside the password would make the "second" factor a second copy of the first — so MFA is not weakened by this setting, it is inapplicable. That pool carries documented CDK-nag suppressions for the MFA rules; a pool left on the default carries none.

### Callers present the ID token

Cognito puts the app client ID in the **ID token's `aud`** claim but in the **access token's `client_id`** claim. AgentCore validates every claim filter that is configured, so setting `allowedAudience` and `allowedClients` together requires a token to satisfy both — which no Cognito token does.

MDAA therefore populates `allowedAudience` on the `cognito` path, never sets `allowedClients`, and **rejects a config that combines the two at synth** rather than deploying a pool that refuses every caller. **Access-token callers are not supported on this path**; use `discoveryUrl` with a hand-configured `allowedClients` for those. This is also why `idTokenValidityMinutes` is the security-relevant knob.

Tokens must carry user context: AgentCore Identity binds on `iss`+`sub` throughout, so tokens minted from one shared client with no user context collapse every caller into a single identity and reuse the same Token Vault credentials across users. A user-context token from this pool has `sub` populated.

### Session-to-user binding

Everything above establishes _who the caller is_. It does not establish _which session they may use_ — **AgentCore does not check that a caller owns the session it names.** Runtime validates the token's signature, issuer, and configured claim filters, and stops there. So a caller holding a valid JWT and another user's `runtimeSessionId` is admitted:

| Request element                               | Value                                           | Runtime's check                    |
| --------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `Authorization`                               | User A's valid token                            | Signature and claims verified ✓    |
| `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` | User B's session ID                             | **Not compared against the token** |
| Outcome                                       | Accepted — user A resumes user B's conversation |                                    |

This is deliberate, and documented as your responsibility:

> AgentCore does not enforce session-to-user mappings - your client backend should maintain the relationship between users and their session IDs. Additionally, your client backend should implement logic for user to session lifecycle management like maximum number of sessions per user.
>
> — [Use isolated sessions for agents](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html)

[Security best practices for AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html) lists session-to-user mapping enforcement under **Your responsibilities** in the shared responsibility model. Treat it as durable: no public AWS source indicates native enforcement is planned.

**Where the check runs.** Two options, and they cost differently:

|                                                     | MDAA configuration needed                                              | Agent code needed                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Your client backend** — the documented pattern    | None                                                                   | None                                                                                   |
| **Inside the agent** — optional defence in depth    | `requestHeaderConfiguration.requestHeaderAllowlist: ['Authorization']` | Entrypoint signature `def invoke(payload, context)`, reading `context.request_headers` |

The agent-side option needs **both**, and neither is a default: without the allowlist the inbound JWT never reaches the container, and without the second entrypoint parameter the agent cannot read request headers. See [Propagate a JWT token to AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html). Runtime has already validated the signature by then, so the agent decodes the claims without re-verifying them.

**The pattern:**

1. Generate session IDs that are unguessable and **at least 33 characters** — the documented minimum. Use the hyphenated UUID v4 string (`str(uuid.uuid4())`, 36 chars); `uuid.uuid4().hex` is only 32 characters and is rejected at invoke time.
2. Persist the `runtimeSessionId` → `userId` mapping in a backend store; DynamoDB is a natural fit.
3. On every invocation, confirm the caller's `sub` matches the recorded owner.
4. Reject a mismatch with 403.
5. Cap concurrent sessions per user — 5 is a reasonable starting point.
6. Remove mappings on sign-out and when a session idles out.

**Registration has to be a conditional write.** A read-then-write is a race in which two concurrent first invocations both find no owner and both claim the session, and it also lets anyone who learns a session ID before its first use pre-claim it.

```python
def claim_or_verify_session(jwt_claims: dict, session_id: str) -> bool:
    """True if the caller owns this session. Safe under concurrent first invocations."""
    user_id = jwt_claims["sub"]
    try:
        # Succeeds only if nobody has claimed this session yet.
        table.put_item(
            Item={"session_id": session_id, "user_id": user_id},
            ConditionExpression="attribute_not_exists(session_id)",
        )
        return True
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        # Already claimed — the caller must be the recorded owner.
        existing = table.get_item(Key={"session_id": session_id}, ConsistentRead=True)
        return existing.get("Item", {}).get("user_id") == user_id
```

### Operational notes

- **The pool is retained by default** and carries Cognito deletion protection, so deleting the stack leaves it behind. Set `removalPolicy: destroy` for ephemeral deployments that should tear down cleanly — that deletes the pool and every user record in it.
- **Cognito domain prefixes are globally unique per region.** The naming-derived default for `hostedUi` can collide with another account's pool; if deployment reports the domain already exists, set `cognitoDomainPrefix` explicitly.
- **The pool and runtime deploy in one stack.** This is required, not merely convenient: the runtime validates the discovery URL at synth time, and a CloudFormation dynamic reference (`{{resolve:ssm:...}}`) does not match the required pattern — so publishing the URL to SSM for a separate stack to reference back cannot work. An unresolved CDK token does match.

---

## Session Lifecycle and Token Expiry

Four separate limits bound a long-running agent. Readers routinely conflate them, and **three default to 15 minutes while being unrelated mechanisms with different failure modes** — merging them leads to wrong conclusions about all of them.

| Limit                                              | What it bounds                                              | Where it comes from                                                                                                              | Default     |
| -------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `min(inbound token remaining TTL, WAT TTL)`        | A single invocation                                         | WAT TTL is fixed by the service; the inbound half is [`idTokenValidityMinutes`](#mdaa-managed-idp-cognito) on the `cognito` path | 15 min each |
| Request timeout (service quota)                    | A single synchronous invocation                             | AgentCore service quota — not adjustable by any means                                                                            | 15 min      |
| `lifecycleConfiguration.idleRuntimeSessionTimeout` | The gap between invocations before the microVM is torn down | MDAA config, 60–28800 seconds                                                                                                    | 15 min      |
| `lifecycleConfiguration.maxLifetime`               | The whole session compute lifecycle                         | MDAA config, 60–28800 seconds                                                                                                    | 8 hours     |

The [request timeout](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html) is the one limit you cannot raise, and for a synchronous invocation it — not the WAT TTL — is the documented ceiling. It applies to synchronous requests only: streaming connections may run 60 minutes and asynchronous jobs 8 hours, and in both of those the WAT TTL binds first instead.

The `min(inbound token remaining TTL, WAT TTL)` bound is a design assumption rather than documented behaviour — public docs do not state that an in-flight invocation is truncated when the inbound token's `exp` passes. Size tokens as if it were, but do not rely on it as an enforcement mechanism.

`lifecycleConfiguration` is optional — omit it and the AgentCore defaults above apply. See [SCHEMA.md](SCHEMA.md#lifecycleConfiguration) for the property reference.

### Workload access tokens

A **workload access token (WAT)** is AgentCore-specific rather than an industry concept, so it is worth stating plainly. Runtime mints one by exchanging your inbound IdP JWT (via `GetWorkloadAccessTokenForJWT`), binding agent identity to user identity from the token's `iss` and `sub` claims, and delivers it to your container in the `WorkloadAccessToken` payload header. Its only use is calling first-party AgentCore Identity services such as the Token Vault and credential providers — per public docs, workload access tokens "are exclusively for accessing AWS first-party AgentCore services and cannot be used for external services."

**Its TTL is 15 minutes and fixed.** The developer guide states the figure directly — the WAT is "short-lived (15-minute TTL), cryptographically signed by the AgentCore Identity service, and opaque to all participants" ([Policy sessions and identity propagation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-session-based-temporal.html)) — and no AgentCore API exposes it for configuration. The preventive design advice below holds regardless.

**Expiry surfaces as a misleading error.** A call to `GetResourceOauth2Token` fails with:

```
AccessDeniedException: Token has expired. Please generate a new token.
```

This refers to **the WAT authenticating that call**, not to the OAuth2 token being retrieved. Reading it as an expired third-party credential is an easy and costly detour.

> **Not the same string as the `AccessDenied` CloudTrail value.** [EventBridge Alerting](#eventbridge-alerting) warns at length that CloudTrail records IAM denials as `AccessDenied` and never as `AccessDeniedException`. Both are correct and they describe different layers: `AccessDeniedException` is the SDK error your agent code catches, `AccessDenied` is the normalised value in a CloudTrail record. Catch the former in code; never put it in `errorCodes`.

### Handling expiry: client re-invocation

This is the supported path for this module:

1. The agent catches `AccessDeniedException: Token has expired`
2. It stops work and returns the condition to the client
3. The client re-invokes with the **same session ID** and a currently-valid JWT
4. Runtime injects a fresh WAT
5. The agent resumes

**Step 5 carries a precondition, and it is the pattern's real failure mode.** Session context survives re-invocation only while the session is still alive. Public docs state the microVM is terminated after `idleRuntimeSessionTimeout` or `maxLifetime`, and that "any data stored in memory or written to disk persists only for the compute lifecycle." So if the re-invoke round trip — including any human re-authentication — outlasts the idle timeout, in-memory state is gone. Two consequences:

- Size `idleRuntimeSessionTimeout` against expected re-invoke latency, not only against cost
- Durable filesystem state requires configured session storage, and structured state belongs in AgentCore Memory. Neither is present by default

**In-process re-minting is not available to this module.** A pattern circulates in which the agent catches the exception and calls `GetWorkloadAccessTokenForJWT` from inside its own code. For Runtime-managed agents such as the ones this module deploys, the developer guide rules that out:

> **Security by design** – Runtime-managed agent identities cannot retrieve workload access tokens directly, preventing token extraction and misuse
>
> — [Get workload access token](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/get-workload-access-token.html)

The same page gives the error for this case: _"WorkloadIdentity is linked to a service and cannot retrieve an access token by the caller."_ MDAA runtimes have service-created workload identities, so in-process re-minting most likely applies only to self-hosted agents. The execution role does grant all three `GetWorkloadAccessToken*` actions, but IAM permission is not the binding constraint here — the service-managed-identity restriction is.

### Designing within the window

These recommendations hold regardless of the open questions below:

- Size the inbound JWT TTL to exceed your longest expected invocation
- Break long tasks into sub-tasks, each comfortably under the **WAT TTL** — that is the 15-minute limit at issue here, not the idle timeout
- Pre-fetch every credential the agent needs early in execution
- Move work that may exceed the window into an async workflow

**Two behaviours are not specified.** Design so that neither answer matters, rather than assuming one:

- Whether Runtime re-mints the WAT mid-invocation or injects it once per invocation. Public docs say only that generation happens "when an agent is invoked", and a practitioner reading the WAT fresh on every use — no caching — reports expiry _within_ a single invocation.
- Whether a Runtime-managed identity can re-mint at all. The restriction quoted above suggests not.

---

## AWS Service Endpoints

The following VPC endpoints may be required if public AWS service endpoint connectivity is unavailable (e.g., private subnets without NAT gateway, firewalled environments, or PrivateLink-only architectures):

| AWS Service         | Endpoint Service Name                      | Type      |
| ------------------- | ------------------------------------------ | --------- |
| Bedrock AgentCore   | `com.amazonaws.{region}.bedrock-agentcore` | Interface |
| Bedrock Runtime     | `com.amazonaws.{region}.bedrock-runtime`   | Interface |
| ECR API             | `com.amazonaws.{region}.ecr.api`           | Interface |
| ECR Docker          | `com.amazonaws.{region}.ecr.dkr`           | Interface |
| CloudWatch Logs     | `com.amazonaws.{region}.logs`              | Interface |
| SSM Parameter Store | `com.amazonaws.{region}.ssm`               | Interface |
| STS                 | `com.amazonaws.{region}.sts`               | Interface |
| S3                  | `com.amazonaws.{region}.s3`                | Gateway   |
| X-Ray               | `com.amazonaws.{region}.xray`              | Interface |

> **Note:** The AgentCore endpoint service name is `bedrock-agentcore` — not `bedrock-agent-runtime` (the older Bedrock Agents endpoint) or `bedrock-runtime` (foundation model invocation). Using the wrong service name is the most common AgentCore VPC configuration mistake and results in DNS resolution failures or timeouts when invoking the runtime. The single `bedrock-agentcore` endpoint serves AgentCore Runtime, Tools, Memory, and Identity.

### MDAA-Managed VPC Endpoint Creation

Rather than creating the AgentCore VPC endpoint manually, this module can create and manage it by configuring `networkConfiguration.vpcEndpoint` (presence of the block opts in; an empty block `{}` accepts all defaults). MDAA provisions the endpoint with secure defaults:

- Correct service name (`com.amazonaws.{region}.bedrock-agentcore`) with **Private DNS enabled**, so the default regional endpoint resolves privately with no code changes
- A dedicated endpoint security group allowing inbound HTTPS (443) **only from the runtime's application security groups** — not the entire VPC CIDR
- An endpoint policy restricted to AgentCore invoke actions; principals default to `*` (required for OAuth/JWT callers, which have no IAM identity visible to endpoint policies) or can be restricted to specific IAM principal ARNs via `endpointPolicy.allowPrincipals`
- Optionally, supporting interface endpoints for private subnets (`createSupportingEndpoints: true` adds ECR API, ECR Docker, STS, and CloudWatch Logs — those four only, so validate your runtime's own egress before removing a NAT gateway)

The endpoint ID is published to SSM Parameter Store for cross-module reference.

**Relationship to `enforceVpcOnly`:** the resource-based policy created by `enforceVpcOnly` conditions on `aws:SourceVpc`, which is only present on requests arriving through a VPC endpoint. Without a `bedrock-agentcore` endpoint in the VPC, an `enforceVpcOnly` runtime cannot be invoked at all. If you enable `enforceVpcOnly` without configuring `vpcEndpoint`, MDAA emits a synth-time warning reminding you that an endpoint must exist.

**If your VPC already has a `bedrock-agentcore` endpoint** (e.g., created by AWS Landing Zone Accelerator or a central networking team), omit the `vpcEndpoint` block entirely — the existing endpoint serves the traffic, and MDAA does not need to know about it. Only one endpoint with Private DNS is allowed per service per VPC; a second one will fail to deploy. For the same reason, if multiple runtime module deployments share a VPC, only one of them should configure `vpcEndpoint`. Note that an MDAA-created endpoint is owned by that module's CloudFormation stack and is removed when the stack is destroyed, so create it from whichever deployment you consider the network owner in that VPC.

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
bedrock-agentcore-runtime: # Module Name can be customized
  module_path: '@aws-mdaa/bedrock-agentcore-runtime' # Must match module NPM package name
  module_configs:
    - ./bedrock-agentcore-runtime.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./bedrock-agentcore-runtime.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Contains only required properties for deploying an agent runtime with a pre-built container image and VPC networking. Start here for a quick proof-of-concept runtime using an existing ECR image.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration (Pre-built Container Image)

Deploys an agent runtime using a pre-built ECR container image with VPC networking, JWT authentication, IAM policies, header forwarding, lifecycle management, and CloudWatch alarms. Start here when evaluating all available options for securing and managing a production AgentCore runtime.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-comprehensive.yaml"
```

#### Model-Scoped Permissions Variant

Restricts the execution role's Bedrock model invocation permissions to specific model ARNs. Choose this variant when you need least-privilege access — for example, limiting agents to specific models for cost control, compliance, or blast radius reduction.

[sample-config-model-scoped.yaml](sample_configs/sample-config-model-scoped.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-model-scoped.yaml"
```

#### Local Code Path Variant

Builds the container image from a local Dockerfile instead of referencing a pre-built ECR image. Choose this variant when developing custom agent runtimes from source code and you want CDK to build and push the image at deploy time. Also demonstrates the alternative `jwtAuthorizer` (vs `customJwtAuthorizer` in the comprehensive config).

[sample-config-codepath.yaml](sample_configs/sample-config-codepath.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-codepath.yaml"
```

#### VPC-Only Enforcement Variant

Restricts runtime invocations to traffic originating from the configured VPC using a resource-based policy, and creates the AgentCore interface VPC endpoint that provides the private invocation path. Choose this variant when JWT/OAuth callers must be restricted to VPC-only access — SCPs and VPC endpoint policies cannot restrict non-IAM principals, so a resource-based policy with an `aws:SourceVpc` condition is required. The VPC endpoint is what produces that `aws:SourceVpc` request context, so the two features pair naturally (see [AWS Service Endpoints](#aws-service-endpoints)).

[sample-config-resource-policy.yaml](sample_configs/sample-config-resource-policy.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-resource-policy.yaml"
```

#### MDAA-Managed Cognito Variant

Has MDAA create and configure the Cognito user pool that issues the runtime's JWTs, rather than requiring a pre-existing identity provider. Choose this variant when you have no OIDC-compliant IdP to point at, or want one deployed with agentic-workload security defaults alongside the runtime. Shows the pool's security defaults together with a hosted UI and SAML federation. Requires its own config because `cognito` is mutually exclusive with the comprehensive config's `discoveryUrl` (see [Inbound Authorization](#inbound-authorization)).

[sample-config-cognito.yaml](sample_configs/sample-config-cognito.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-cognito.yaml"
```

#### MDAA-Managed Cognito with Hosted UI Variant

Adds the Cognito hosted UI to the MDAA-managed pool, enabling the authorization code grant for callers that sign a user in through a browser front end. Choose this variant when a web front end logs the user in, rather than the caller invoking `InitiateAuth` directly. Shows a hosted UI on its own, with no federation — the plain browser-sign-in case.

[sample-config-cognito-hosted-ui.yaml](sample_configs/sample-config-cognito-hosted-ui.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-cognito-hosted-ui.yaml"
```

#### MDAA-Managed Cognito with OIDC Federation Variant

Federates the MDAA-managed pool to an enterprise OIDC identity provider, enabling it on the app client alongside Cognito-native sign-in. Choose this variant when users authenticate through a corporate IdP that speaks OIDC. Requires its own config because `cognito.federation` accepts at most one of `saml` or `oidc`, so this branch cannot coexist with the SAML example.

> **Supply `oidc.clientSecret` as a Secrets Manager dynamic reference, not plaintext.** Cognito requires the secret's value when the identity provider is registered, so whatever you put in config is what CloudFormation receives — a literal string is rendered in cleartext into the template's `ProviderDetails` and is then readable by anyone with `cloudformation:GetTemplate` on the stack. Reference the secret instead, and CloudFormation resolves it at deploy time while the template stores only the pointer:
>
> ```yaml
> clientSecret: '{{resolve:secretsmanager:arn:aws:secretsmanager:us-east-1:111122223333:secret:my-oidc-secret:SecretString:clientSecret}}'
> ```
>
> Write the ARN out in full: MDAA's `{{region}}` and `{{account}}` placeholders are not substituted inside a `{{resolve:...}}` reference, because the nested braces defeat the substitution.
>
> The same applies to `saml` federation only if your IdP requires a secret; SAML metadata URLs are not sensitive.

[sample-config-cognito-oidc.yaml](sample_configs/sample-config-cognito-oidc.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-cognito-oidc.yaml"
```

### CloudWatch Alarms

Add an optional `alarms` block to create CloudWatch alarms on the AgentCore service operational metrics (CloudWatch namespace `AWS/Bedrock-AgentCore`) and notify an SNS topic on breach. The presence of the `alarms` block enables alarms — there is no separate `enabled` flag, and omitting the block deploys no alarms. The comprehensive config above includes a populated `alarms` block.

Two alarms are supported, each opt-in via its threshold:

- **Error rate** (`errorRateThreshold`) — a metric-math alarm on `SystemErrors + UserErrors` as a percentage of `Invocations` over the evaluation period. Useful for detecting error spikes and bursts of failed (e.g. auth-denied) invocations.
- **Throttle count** (`throttleCountThreshold`) — an alarm on the sum of the `Throttles` metric, indicating quota exhaustion or abuse.

At least one threshold must be set. Provide a notification target via exactly one of:

- `notificationTopicArn` — an existing SNS topic ARN, or
- `createNotificationTopic: true` — have MDAA create a CMK-encrypted SNS topic (reusing the runtime's log-group KMS key) and export its ARN to SSM.

#### Subscribing to the notification topic

Creating a topic is not the same as being notified by it. **A topic with no subscribers accepts every alarm notification and discards it.** This same topic is also the sole delivery path for the [EventBridge rules](#eventbridge-alerting), so an unsubscribed topic silences both features.

Set `notificationEmails` to subscribe one or more addresses. Each recipient receives an SNS confirmation request and must confirm before delivery begins:

```yaml
alarms:
  throttleCountThreshold: 100
  createNotificationTopic: true
  notificationEmails:
    - 'agentcore-ops@example.com'
    - 'oncall@example.com'
```

Two guardrails:

- If `createNotificationTopic: true` and no `notificationEmails` are supplied, MDAA emits a **synth-time warning** — the topic will receive notifications that go nowhere. It is a warning rather than an error because subscriptions can legitimately be managed out-of-band (a chatbot integration, or an existing distribution list attached outside MDAA) using the topic ARN exported to SSM.
- `notificationEmails` combined with `notificationTopicArn` **fails at synth**. MDAA does not modify a topic it did not create, and the deploying role would not hold `sns:Subscribe` on an externally-owned one. Subscribe on the existing topic directly, or switch to `createNotificationTopic: true`.

Alarms are scoped to the deployed runtime automatically, using the **full dimension set the AgentCore service publishes** — `Resource` (the runtime ARN), `Operation` (`InvokeAgentRuntime`), and `Name` (`<runtime-name>::<qualifier>`). All three are required: CloudWatch matches dimensions _exactly_ rather than as a subset, so an alarm naming only some of them receives zero datapoints and stays in `OK`. There is normally no reason to set `dimensions` yourself — doing so replaces the whole derived set.

Note that because the `Name` dimension embeds the endpoint qualifier, the service emits a **separate metric stream per endpoint**. The alarms observe the endpoint this module creates (or `DEFAULT` when no `runtimeEndpoint` is configured); invocations through a different endpoint are not counted. CloudWatch's `SEARCH()` would span all qualifiers but is not supported on alarms.

`metricNamespace`, `periodSeconds`, `evaluationPeriods`, and `datapointsToAlarm` are also overridable. `periodSeconds` must be 1, 5, 10, 30, or a multiple of 60.

On low-traffic runtimes the default of a single 5-minute evaluation period makes the error-rate alarm noisy: one error out of one invocation is a 100% error rate. Pair `evaluationPeriods` with `datapointsToAlarm` to require several breaching periods, as the comprehensive config does.

Both alarms use `treatMissingData: notBreaching`, so an idle runtime that emits no datapoints reports `OK` rather than `INSUFFICIENT_DATA`. Note the consequence: a runtime serving zero invocations is indistinguishable from a healthy idle one.

```yaml
alarms:
  # Alarm when the error rate exceeds 10% of invocations over the period
  errorRateThreshold: 10
  # Alarm when the throttle count exceeds 100 over the period
  throttleCountThreshold: 100
  # Create a CMK-encrypted SNS topic for notifications (mutually exclusive
  # with notificationTopicArn)
  createNotificationTopic: true
  # Require 2 of 3 breaching 5-minute periods before paging
  evaluationPeriods: 3
  datapointsToAlarm: 2
```

To notify an existing SNS topic instead of creating one, use the `notificationTopicArn` path shown in the [Existing Notification Topic Variant](#existing-notification-topic-variant) below.

#### Existing Notification Topic Variant

Notifies an existing SNS topic via `alarms.notificationTopicArn` instead of creating one. Choose this variant when you already manage a central notification or incident topic and want the runtime's alarms to publish to it. This has its own sample because `notificationTopicArn` and `createNotificationTopic` (used in the comprehensive config) are mutually exclusive.

Note that MDAA cannot inspect or modify a topic it does not own, so it emits a synth-time warning: ensure the topic is CMK-encrypted, allows `cloudwatch.amazonaws.com` (and `events.amazonaws.com`, if you also enable `eventBridgeAlerts`) to `sns:Publish` and to use its key, and has at least one subscriber.

[sample-config-alarms-existing-topic.yaml](sample_configs/sample-config-alarms-existing-topic.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/ai/bedrock-agentcore-runtime-app/sample_configs/sample-config-alarms-existing-topic.yaml"
```

### EventBridge Alerting

Where alarms detect _statistical_ conditions (a rate or a count over a period), EventBridge rules detect _individual_ events as they happen. Add an optional `eventBridgeAlerts` block to create rules matching this runtime's AgentCore CloudTrail events. As with `alarms`, the presence of the block enables it — there is no separate `enabled` flag. The comprehensive config above includes a populated block.

**`eventBridgeAlerts` requires an `alarms` block** that either creates a notification topic (`createNotificationTopic: true`) or references one (`notificationTopicArn`). That topic is the default target for every rule; configuring `eventBridgeAlerts` without one fails at synth rather than deploying rules that notify nothing.

**Prerequisite: a CloudTrail trail** in the account/region logging the AgentCore events you want to match. CloudTrail delivers API-call events to the default event bus, which is what these rules match. Management events (the lifecycle APIs such as `UpdateAgentRuntime`) are logged by default on any trail; **data events (invocation) are off by default** and must be enabled explicitly. A rule whose events are not covered by a trail will never match.

Deploy the trail with the [audit-trail](../../governance/audit-trail-app/README.md) module. The two rules have different requirements: `config-change` matches management events, so any trail satisfies it, while `auth-failure` matches an invocation **data** event and needs a `dataEventSelectors` entry for `AWS::BedrockAgentCore::Runtime`. See [Enabling EventBridge alerting on AgentCore invocations](../../governance/audit-trail-app/README.md#enabling-eventbridge-alerting-on-agentcore-invocations) for a worked trail config, and [Data Event Selectors](../../governance/audit-trail-app/README.md#data-event-selectors) for the property reference, cost scoping, and the EventBridge delivery lag. For enabling data events on a trail MDAA does not own, see [AgentCore Security Prerequisites](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator/blob/main/agentic_app/security-best-practices/YOUR-RESPONSIBILITIES.md#3-cloudtrail-data-events).

**Keep `includeManagementEvents: true` on that trail.** Advanced event selectors replace a trail's default selectors, so a trail carrying only data selectors logs no control plane events at all — which silences `config-change` while leaving it deployed and apparently healthy.

Rules are a **keyed map**. Each key becomes part of the rule's resource name, so keep keys stable across deployments. Each rule matches on `errorCodes`, `eventNames`, or both:

- `errorCodes` — CloudTrail `errorCode` values (e.g. `AccessDenied`), for detecting repeated auth failures.

  > **These are CloudTrail `errorCode` values, not SDK exception names — and for authorization failures the two differ.** An IAM denial is returned to the caller as `AccessDeniedException`, but CloudTrail records it as plain **`AccessDenied`**. **Do not configure `AccessDeniedException`** — a rule using it will never match. The exception name is not fictional; agent code catches exactly that string on [workload access token](#workload-access-tokens) expiry. It is simply not what lands in a CloudTrail record.
  >
  > Service-specific API errors _do_ keep the suffix (`ResourceNotFoundException`, `ValidationException`), so the distinction is between IAM's normalized denial and a service's own error — not a per-error quirk. Confirm the exact value in a real record before adding a code:
  >
  > ```bash
  > aws cloudtrail lookup-events \
  >   --lookup-attributes AttributeKey=EventSource,AttributeValue=bedrock-agentcore.amazonaws.com \
  >   --query 'Events[].CloudTrailEvent' --output text | python3 -c "
  > import json,sys
  > for line in sys.stdin: print(json.loads(line).get('errorCode','(none)'))"
  > ```
  >
  > Note `InvokeAgentRuntime` is a CloudTrail **data** event, so it never appears in `lookup-events` — read those records from the trail's S3 bucket instead.

- `eventNames` — AgentCore API names (e.g. `UpdateAgentRuntime`, `DeleteAgentRuntime`), for detecting configuration changes made outside IaC.

At least one of the two is required. Note that setting **both ANDs them**: the rule then matches only calls to one of those APIs that failed with one of those error codes.

Configuration supplies only those two fields. MDAA owns the rest of the event pattern — the `source`, the `detail-type` (`AWS API Call via CloudTrail`), the `eventSource`, and the scoping to this runtime. A raw `pattern` passthrough is deliberately **not** exposed, since a pattern that matches nothing still deploys successfully and gives no indication that it is inert.

Two details of the generated pattern are worth knowing, because they explain how the rules find your runtime:

- **Rules are scoped by every identity form CloudTrail records** — `requestParameters.agentRuntimeId`, `requestParameters.agentRuntimeArn`, and `resources[].ARN` — combined with `$or`. All three are needed because the field carrying the runtime's identity differs per API: `InvokeAgentRuntime` events carry a **null** `requestParameters` and identify the runtime _only_ in the `resources` array, while the lifecycle APIs use `requestParameters`. An EventBridge pattern naming a field the event lacks does not match.
- **The AgentCore CloudTrail source is matched, with a forward-compatible fallback.** AgentCore is served by two endpoints (control plane and data plane), but CloudTrail records both under the single `eventSource` `bedrock-agentcore.amazonaws.com`. The `bedrock-agentcore-control` variant is also listed in case the service later splits them; since an EventBridge list is an OR, a value that never appears cannot narrow matching.

Notification is **EventBridge → SNS**, with an input transformer rendering a readable message (principal, error code, source IP, event name). No Lambda is created for notification — SNS already delivers to email, Slack, or PagerDuty via subscription.

`targetLambdaArn` optionally attaches a **customer-supplied** remediation function as an additional target. MDAA does not create or ship one: revoking an execution role or stopping sessions is destructive and site-specific, so kill-switch actions remain a deliberate customer decision. The rule grants EventBridge `lambda:InvokeFunction` on a same-account function; a cross-account function must grant that permission on its own side.

If your `alarms` block references an existing topic by ARN, MDAA cannot modify that topic's resource policy and emits a synth-time warning: ensure the topic allows the `events.amazonaws.com` service principal to `sns:Publish` (and, if the topic is CMK-encrypted, to use the key), or the rules will match but deliver nothing.

```yaml
eventBridgeAlerts:
  rules:
    auth-failure:
      description: 'Denied AgentCore invocations'
      # 'AccessDenied' — the value CloudTrail records for an IAM denial.
      # NOT 'AccessDeniedException', which CloudTrail never emits for authorization.
      errorCodes: ['AccessDenied']
      # Notifies the alarms topic above by default
    config-change:
      description: 'Out-of-band runtime configuration change'
      eventNames: ['UpdateAgentRuntime', 'DeleteAgentRuntime']
      # (Optional) Also invoke a customer-supplied remediation function
      targetLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:agentcore-remediation'
```

### Observability & Tracing

Traces come from two places that are easy to confuse: **spans are emitted by your container** and **routed by this module**. The module cannot emit them on your behalf, and the container cannot choose where they land.

#### Container prerequisites — required, and silent when missing

Emitting spans at all requires two things inside your image:

```dockerfile
# 1. The ADOT SDK, in pyproject.toml / requirements.txt
#    aws-opentelemetry-distro>=0.18.0
#    boto3

# 2. An entrypoint that runs under opentelemetry-instrument
CMD ["opentelemetry-instrument", "python", "main.py"]
```

> **Without both, the runtime deploys successfully, reports healthy, and emits no traces.** The CloudWatch console cannot distinguish this from an agent receiving no traffic — there is no error, no failed deployment, and no empty-state warning. If you expect traces and see none, check these two things first.
>
> The `>=0.18.0` floor is what makes the span destination below take effect. Earlier versions install and run fine but ignore the setting and deliver to the shared `aws/spans` log group, so spans land outside the protections described here.

#### What this module provides

- **Span destination** — MDAA sets `UNIFIED_TRACES_DESTINATION_ENABLED: 'true'` on every runtime, so spans go to the `spans` log stream of the agent's own log group (`/aws/bedrock-agentcore/runtimes/{agentId}-{qualifier}`) rather than the account-shared `aws/spans` group.

  This matters because a span tree records the agent's decision path — prompts, model inputs and outputs, tool arguments, and tool results — which is the most PII-dense telemetry an agent produces. The per-agent log group already carries this module's always-on CMK encryption, retention policy, and PII masking; `aws/spans` carries **none** of them, and any principal with read access to that one shared group can read span data from every agent in the account.

  MDAA sets this explicitly rather than relying on the service default, which is not stable: per AWS, agents in Regions that support the unified destination default to the agent's log group, while agents created before their Region supported it keep `aws/spans`. Left unset, a deployment's span destination depends on Region and creation date rather than on configuration.

- **Execution-role permission** — the role is granted `logs:PutResourcePolicy`, which AgentCore uses to authorize X-Ray to deliver spans to the log group. It is scoped to **this agent's own log groups** (`/aws/bedrock-agentcore/runtimes/{thisRuntimeName}-*`), not to all runtimes, so one agent's role cannot rewrite another agent's log-group policy. Granted only when the span destination is in use — opt out and the statement is omitted entirely. If you supply your own role via `roleArn`, add this permission yourself — MDAA cannot modify a role it did not create.

- **Transaction Search** — enabled by default via `enableTransactionSearch` (a singleton per account per Region; see [Configuration](#configuration)). Span delivery to the agent's log group requires it.

#### What the service provides — do not override

AgentCore Runtime configures the ADOT SDK's `OTEL_*` variables inside the container. **You do not need to set them, and MDAA deliberately sets none.**

Overriding them replaces a service-maintained configuration with a hand-copied one. `OTEL_SERVICE_NAME` is the sharpest example: per the OpenTelemetry specification it takes precedence over the `service.name` resource attribute the service supplies, so setting it changes the service identity shown in the CloudWatch GenAI Observability console — breaking dashboards, alarms, and saved queries keyed on the previous name.

Recipes that list `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_*`, `AGENT_OBSERVABILITY_ENABLED`, and similar variables are for agents hosted **outside** AgentCore Runtime, which have no service configuring anything for them. They do not apply to this module.

#### Escape hatches

Both are set through `environmentVariables`, where a value you supply always wins over the MDAA default:

```yaml
environmentVariables:
  # Centralize on the shared aws/spans log group instead of this agent's own.
  # Note this forfeits the CMK encryption, retention, and PII masking above.
  UNIFIED_TRACES_DESTINATION_ENABLED: 'false'

  # Unset the service's ADOT defaults entirely, for a third-party observability platform.
  DISABLE_ADOT_OBSERVABILITY: 'true'
```

Changing the destination does not move spans already delivered; only new spans are affected. If you have consumers reading `aws/spans` directly — dashboards, SIEM ingestion, saved Logs Insights queries — repoint them at the per-agent log group. Note also that spans and application logs then share one log group, so that group's retention policy governs both signals and its ingestion volume rises.

#### Trace context propagation

Pass these headers when invoking the runtime to correlate traces across services:

| Header                                        | Purpose                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `traceparent`                                 | W3C standard trace context — cross-service correlation with modern tracing systems |
| `X-Amzn-Trace-Id`                             | X-Ray format equivalent (`Root=…;Parent=…;Sampled=1`)                              |
| `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` | Session identifier, for session-based analytics and troubleshooting                |

> **Never put credentials, tokens, or PII in `baggage` values.** The `baggage` header propagates as cleartext HTTP headers across every downstream service and third-party API your agent calls, with no integrity checking and no encryption. Unlike log content, baggage is not covered by the PII masking on the log group — it leaves the boundary entirely. Use it only for non-sensitive routing context.

### Troubleshooting

For common deployment issues and their solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Common issues:

- [X-Ray Transaction Search Config Already Exists](./TROUBLESHOOTING.md#x-ray-transaction-search-config-already-exists) - `AlreadyExists` error during deployment
- [Cross-Account ECR Access Denied](./TROUBLESHOOTING.md#cross-account-ecr-access-denied) - `Failed to pull image` error in cloudwatch logs

---

[Config Schema Docs](SCHEMA.md)
