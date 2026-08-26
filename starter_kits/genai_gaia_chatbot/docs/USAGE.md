# GAIA Chatbot — Usage Guide

## Deployed Resources

Once deployed, you should see the following in your AWS account:

**Naming convention:** `<org>-<env>-<domain>-<module>-<resource>`

**SSM parameters:** `/<org>/<domain>/<module>/<resource-type>/<resource-name>/<attribute>`

| Resource | Deployed Name / SSM Path | Config Reference |
|----------|--------------------------|------------------|
| Bedrock Knowledge Base | `<org>-dev-gaia-bedrock-builder-bedrock-knowledge-base`<br>`/<org>/gaia/bedrock-builder/knowledge-base/bedrock-knowledge-base/name` | `knowledgeBases.bedrock-knowledge-base` in [`config/bedrock-builder.yaml`](../config/bedrock-builder.yaml) |
| Aurora PostgreSQL Serverless v2 Cluster (pgvector vector store) | `<org>-dev-gaia-bedrock-builder-knowledge-base-vector-store`<br>`/<org>/gaia/bedrock-builder/cluster/knowledge-base-vector-store/endpoint` | `vectorStores.knowledge-base-vector-store` in [`config/bedrock-builder.yaml`](../config/bedrock-builder.yaml) |
| S3 Bucket | `<org>-dev-gaia-datalake-knowledge-base`<br>`/<org>/gaia/datalake/bucket/knowledge-base/name` | `buckets.knowledge-base` in [`config/datalake.yaml`](../config/datalake.yaml) |
| CloudFront Distribution | `<org>-dev-gaia-gaia-chatbot`<br>`/<org>/gaia/gaia-chatbot/distribution/name` | configured in [`config/gaia.yaml`](../config/gaia.yaml) |
| Cognito User Pool | `<org>-dev-gaia-gaia-chatbot`<br>`/<org>/gaia/gaia-chatbot/user-pool/name` | `auth` in [`config/gaia.yaml`](../config/gaia.yaml) |
| IAM Role | `<org>-dev-gaia-roles-data-admin`<br>`/<org>/gaia/generated-role/data-admin/id` | `generateRoles.data-admin` in [`config/roles.yaml`](../config/roles.yaml) |
| IAM Role | `<org>-dev-gaia-roles-data-user`<br>`/<org>/gaia/generated-role/data-user/id` | `generateRoles.data-user` in [`config/roles.yaml`](../config/roles.yaml) |

## Post-Deployment Steps

After deployment:

1. Upload documents to the knowledge base S3 bucket and sync in the Bedrock console.
2. Get stack outputs (`aws cloudformation describe-stacks`) for Cognito and API configuration.
3. Build a frontend that fetches `/aws-exports.json` from the CloudFront URL for auth and API config.

## Frontend Development

To build a frontend that integrates with the deployed backend:

### Configure MDAA for Local Development

Your `gaia.yaml` must include localhost in the OAuth URLs:

```yaml
auth:
  cognitoDomain: "{{org}}-{{domain}}-{{env}}"
  cognitoAddAsIdentityProvider: true  # REQUIRED for email/password auth
  oAuthCallbackUrls:
    - http://localhost:5173
    - http://localhost:3000
  oAuthLogoutUrls:
    - http://localhost:5173
    - http://localhost:3000
```

### Configure WAF (if enabled)

Add your IP addresses to the WAF allowlist. **You need THREE types of IPs:**

```yaml
waf:
  allowedCidrs:
    # 1. Your IPv4 address (for browser requests)
    - 203.0.113.50/32           # curl -4 ifconfig.me
    # 2. Your IPv6 address (browsers may connect via IPv6)
    - 2001:db8:1234:5678::/64   # curl -6 ifconfig.me (use /64 prefix)
    # 3. NAT Gateway IP (REQUIRED for Lambda → AppSync responses)
    - 198.51.100.10/32          # aws ec2 describe-nat-gateways
```

> **Why IPv6?** Many ISPs use dual-stack networking. Your browser may connect via IPv6 even if you only know your IPv4 address.

> **Why NAT Gateway IP?** Lambda functions run in your VPC and send chat responses back through AppSync. These requests exit via the NAT Gateway, so WAF must allow that IP.

### Fetch Configuration in Your Frontend

Your frontend should fetch `/aws-exports.json` from the CloudFront URL:

```javascript
const config = await fetch('https://<cloudfront-url>/aws-exports.json').then(r => r.json());

// config contains:
// - Auth.Cognito.userPoolId
// - Auth.Cognito.userPoolClientId
// - API.Events.endpoint (WebSocket for chat)
```

### Recommended Libraries

- **AWS Amplify** — Authentication and API integration
- **@aws-amplify/api-graphql** — AppSync Events subscription for real-time chat
- **React Query / TanStack Query** — REST API data fetching

---

## AWS RAM Shared VPCs

If your VPC is shared via AWS RAM from a central network account:

1. Add `vpc_owner_account_id` to your context in `mdaa.yaml`
2. Reference it in `gaia.yaml` under `vpc.vpcOwnerAccountId`

This is needed because Lambda ENI creation requires the VPC ARN with the owning account ID. Without it, Lambda functions fail with authorization errors.

If your VPC is in the same account, remove `vpcOwnerAccountId` from `gaia.yaml`.

---

## API Reference

### WebSocket API (Real-time Chat)

Uses AWS AppSync Events for streaming chat responses.

**Endpoint:** Available in `aws-exports.json` as `API.Events.endpoint`

**Flow:**
1. Connect with Cognito token
2. Subscribe to `chat/<session-id>` channel
3. Publish messages to trigger AI responses
4. Receive streaming responses as events

### REST API (Management Operations)

**Base URL:** `https://<cloudfront-url>/api/v1`

**Authentication:** Cognito JWT token in `Authorization` header.

#### Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions` | List user's chat sessions |
| `GET` | `/sessions/<session_id>` | Get session with history |
| `DELETE` | `/sessions` | Delete all sessions |
| `DELETE` | `/sessions/<session_id>` | Delete specific session |

#### Feedback Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/feedback` | Submit feedback |
| `GET` | `/feedback` | Get feedback history |

#### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/sessions` | List all sessions |
| `GET` | `/admin/feedback?start_date=...&end_date=...` | Get feedback in range |

#### Bot Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bot-management/health` | Health check |
| `POST` | `/bot-management/interruptions` | Activate interruption |
| `DELETE` | `/bot-management/interruptions/<type>` | Deactivate interruption |

**Service types:** `global`, `bedrock-rag`, `bedrock-invoke-model`, `bedrock-strands-agents`

### Authentication Flow

1. Get Cognito configuration from `aws-exports.json`
2. Authenticate via Cognito Hosted UI or SDK
3. Include ID token in requests: `Authorization: Bearer <id_token>`

---

## Configuration Reference

| File | Purpose |
|------|---------|
| `mdaa.yaml` | Main deployment config: region, org, VPC settings, resource tags |
| `config/gaia.yaml` | Application config: auth, WAF, model selection |
| `config/bedrock-builder.yaml` | Knowledge base and guardrails |
| `config/roles.yaml` | IAM roles and policies |
| `config/datalake.yaml` | S3 buckets and access policies |

---

## Teardown

```bash
npx @aws-mdaa/cli destroy -c mdaa.yaml
```

**Expect the chatbot stack to take about 20 minutes.** Its Lambdas run in your VPC, and Lambda takes up to 20 minutes to release the network interfaces attached to the `chatbot-api-sg` security group. CloudFormation waits for that, so one Lambda sits in `DELETE_IN_PROGRESS` with no other output. That is expected, not a hang — let it finish, and do not start deleting resources by hand.

Teardown can fail on that security group:

```
DependencyViolation: resource sg-xxxxxxxx has a dependent object
```

Wait 20–30 minutes and re-run `destroy`. **Do not delete the IAM roles first** — Lambda needs the function execution role to release its interfaces.

### What teardown leaves behind

These are retained by design. The Aurora cluster is the one to watch: it keeps billing until you delete it.

| Module | Retained |
|---|---|
| `bedrock-builder` | Aurora PostgreSQL Serverless v2 cluster and its 2 instances — the knowledge base vector store |
| `gaia-chatbot` | 3 DynamoDB tables (chat sessions, user feedback, service interruption), Cognito user pool, 4 S3 buckets (client and admin UI, plus logging) |
| `datalake` | Knowledge base S3 bucket — uploaded documents survive |

Each module also retains its KMS key and log groups.

**Deletion protection is enabled** on the Aurora cluster and all three DynamoDB tables, so they cannot be deleted until you turn it off:

```bash
aws rds modify-db-cluster --db-cluster-identifier <id> --no-deletion-protection --apply-immediately
aws dynamodb update-table --table-name <name> --no-deletion-protection-enabled
```

Chat history, user feedback, and Cognito user records all survive teardown as a result.

Manual cleanup steps: [Deployment Guide](../../../DEPLOYMENT.md#teardown).
