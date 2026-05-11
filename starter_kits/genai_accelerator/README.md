# GenAI Accelerator - Chatbot Starter Kit

This sample configuration deploys a production-ready GenAI chatbot **backend** using Amazon Bedrock Knowledge Bases, Guardrails, and serverless APIs.

> **Important:** MDAA deploys the backend infrastructure only. You'll need to provide your own frontend application (React, Vue, Angular, etc.) that integrates with the APIs.

## What Gets Deployed

- **Cognito User Pool**: Authentication with email/password or enterprise SSO
- **Bedrock Knowledge Base**: RAG pipeline with OpenSearch Serverless vector store
- **Bedrock Guardrails**: Content filtering and PII protection
- **S3 Data Lake**: Encrypted document storage
- **REST API** (API Gateway): Session management, feedback, admin operations
- **WebSocket API** (AppSync Events): Real-time chat streaming
- **Lambda Functions**: VPC-deployed serverless compute
- **CloudFront**: CDN serving `aws-exports.json` configuration
- **WAF**: Web application firewall (optional)

## What You Need to Provide

- **Frontend Application**: A web or mobile app that integrates with the APIs (see [API Reference](#api-reference) below)
- **Documents**: Content for the knowledge base (PDF, TXT, MD, HTML, DOCX)

## Prerequisites

1. **AWS Account Setup**
   - AWS CLI configured with credentials
   - CDK bootstrapped: `npx cdk bootstrap aws://<account>/<region>`
   - Bedrock model access enabled in the console

2. **Network Infrastructure**
   - VPC with private subnets
   - NAT Gateway OR VPC Endpoints for AWS services
   - Subnet IDs available (or stored in SSM parameters)
   - For AWS RAM shared VPCs: the network account ID that owns the VPC

   > **Don't have a VPC?** See [Optional: Deploy Reference VPC](#optional-deploy-reference-vpc) below.
   
   > **Using AWS RAM shared VPC?** If your VPC is shared from a central network account, you'll need to configure `vpcOwnerAccountId` in `gaia.yaml`. See [AWS RAM Shared VPCs](#aws-ram-shared-vpcs) below.

3. **MDAA Installed**
   - Clone and install the MDAA framework
   - `npm install` in the installer directory

## Optional: Deploy Reference VPC

If you don't have an existing VPC, you can deploy the included reference infrastructure:

```bash
cd infrastructure/

# Deploy with NAT Gateway (required for Lambda internet access)
aws cloudformation deploy \
  --template-file genai-vpc.yaml \
  --stack-name genai-reference-infra \
  --parameter-overrides EnvironmentName=dev ActivateNatGateway=true

# View outputs
aws cloudformation describe-stacks --stack-name genai-reference-infra \
  --query "Stacks[0].Outputs" --output table
```

This creates:

- VPC with public and private subnets across 2 AZs
- NAT Gateway for outbound internet access (~$32/month)
- SSM parameters for easy reference in your MDAA config

After deployment, copy the VPC and subnet IDs from the stack outputs into the `context:` block of your `mdaa.yaml` (see the Quick Start section below). The reference-infra stack also publishes SSM parameters at `/genai/vpc-id`, `/genai/app-subnet-1`, `/genai/app-subnet-2`, `/genai/data-subnet-1`, `/genai/data-subnet-2` for programmatic retrieval:

```bash
aws ssm get-parameter --name /genai/vpc-id --query "Parameter.Value" --output text
```

Paste the values directly into `context:`. VPC / subnet IDs must be concrete values at CDK synth time; `{{resolve:ssm:...}}` placeholders are not resolved before MDAA performs VPC attribute lookups.

> **Cost Note:** NAT Gateway costs ~$32/month + data transfer. For development, you can disable it and use VPC Endpoints instead, but this requires additional configuration.

---

## Quick Start

### 1. Configure Your Deployment

Edit `mdaa.yaml`:

```yaml
organization: myorg  # Your org identifier (lowercase, no spaces)
region: us-east-1    # Or your preferred region

# In the context section:
context:
  vpc_id: vpc-xxxxxxxxx              # CHANGE THIS — your VPC ID
  app_subnet_id_1: subnet-xxxxxxxxx  # CHANGE THIS — application subnet 1 (must have NAT Gateway route)
  app_subnet_id_2: subnet-xxxxxxxxx  # CHANGE THIS — application subnet 2 (must have NAT Gateway route)
  data_subnet_id_1: subnet-xxxxxxxxx # CHANGE THIS — data subnet 1 (can be same as app subnets)
  data_subnet_id_2: subnet-xxxxxxxxx # CHANGE THIS — data subnet 2 (can be same as app subnets)

domains:
  shared:
    environments:
      dev:
        modules:
          # IAM roles for all other modules (must deploy first)
          roles:
            module_path: "@aws-mdaa/roles"
            module_configs:
              - ./config/roles.yaml

          # S3 data lake buckets for documents and assets
          datalake:
            module_path: "@aws-mdaa/datalake"
            module_configs:
              - ./config/datalake.yaml

          # Bedrock Knowledge Base and Guardrails
          bedrock-builder:
            module_path: "@aws-mdaa/bedrock-builder"
            module_configs:
              - ./config/bedrock-builder.yaml

          # GAIA v2 chatbot backend (REST API, WebSocket, Lambda, CloudFront, Cognito, WAF)
          gaia-chatbot:
            module_path: "@aws-mdaa/gaia-v2"
            module_configs:
              - ./config/gaia.yaml
```
### 2. Deploy

```bash
mdaa deploy -c /path/to/starter_kits/genai_accelerator/mdaa.yaml
```

### 3. Upload Documents

```bash
# Get bucket name from stack outputs or SSM
aws s3 cp ./documents/ s3://<org>-<env>-<domain>-datalake-knowledge-base/data/bedrock-knowledge-base/ --recursive

# Sync the knowledge base in Bedrock console
```

### 4. Get Stack Outputs

```bash
# Get all outputs at once
aws cloudformation describe-stacks --stack-name <org>-<env>-<domain>-genai-chatbot \
  --query "Stacks[0].Outputs" --output table
```

Key outputs for your frontend:

- `UserInterfaceDomainName` → CloudFront URL serving `aws-exports.json`
- `UserPoolId` → Cognito User Pool ID
- `UserPoolWebClientId` → Cognito App Client ID

---

## Frontend Development

To build a frontend that integrates with the deployed backend:

### 1. Configure MDAA for Local Development

Your `gaia.yaml` must include localhost in the OAuth URLs:

```yaml
auth:
  cognitoDomain: "{{org}}-{{domain}}-{{env}}"
  cognitoAddAsIdentityProvider: true  # REQUIRED for email/password auth
    # Add other callback and logout URLs based on what domains you plan to use
  oAuthCallbackUrls:
    - http://localhost:5173
    - http://localhost:3000
  oAuthLogoutUrls:
    - http://localhost:5173
    - http://localhost:3000
```

### 2. Configure WAF (if enabled)

Add your IP addresses to the WAF allowlist. **You need THREE types of IPs:**

```yaml
waf:
  # By default, both regional and global WAF are created automatically when
  # deploying to us-east-1. For non-us-east-1 deployments, add additional_stacks
  # to the module in mdaa.yaml to enable global WAF:
  #
  #   additional_stacks:
  #     - region: 'us-east-1'
  #
  # To skip global WAF entirely (not recommended for production):
  #   skipGlobalDefaultWaf: true
  allowedCidrs:
    # 1. Your IPv4 address (for browser requests)
    - 203.0.113.50/32           # curl -4 ifconfig.me
    # 2. Your IPv6 address (browsers may connect via IPv6)
    - 2001:db8:1234:5678::/64   # curl -6 ifconfig.me (use /64 prefix)
    # 3. NAT Gateway IP (REQUIRED for Lambda → AppSync responses)
    - 198.51.100.10/32          # aws ec2 describe-nat-gateways
```

> **Why IPv6?** Many ISPs use dual-stack networking. Your browser may connect via IPv6 even if you only know your IPv4 address. If you get 403 errors, check WAF logs for blocked IPv6 requests.

> **Why NAT Gateway IP?** Lambda functions run in your VPC and send chat responses back through AppSync. These requests exit via the NAT Gateway, so WAF must allow that IP. Without it, chat messages will hang indefinitely.

### 3. Redeploy After Config Changes

```bash
mdaa deploy -c /path/to/starter_kits/genai_accelerator/mdaa.yaml
```

### 4. Fetch Configuration in Your Frontend

Your frontend should fetch `/aws-exports.json` from the CloudFront URL to get Cognito and API configuration:

```javascript
const config = await fetch('https://<cloudfront-url>/aws-exports.json').then(r => r.json());

// config contains:
// - Auth.Cognito.userPoolId
// - Auth.Cognito.userPoolClientId
// - API.Events.endpoint (WebSocket for chat)
```

### 5. Recommended Libraries

- **AWS Amplify** - Authentication and API integration
- **@aws-amplify/api-graphql** - AppSync Events subscription for real-time chat
- **React Query / TanStack Query** - REST API data fetching

---
---

## AWS RAM Shared VPCs

If your organization uses AWS RAM to share VPCs from a central network account to workload accounts, you need to configure the `vpcOwnerAccountId` setting.

### When to Use

- Your VPC is shared via AWS RAM from a different AWS account
- The subnets you're using belong to a network account, not the account where GAIA is deployed

### Configuration

1. **Add the network account ID to your context** in `mdaa.yaml`:

   ```yaml
   context:
     vpc_id: vpc-0123456789abcdef0
     app_subnet_id_1: subnet-0123456789abcdef0
     app_subnet_id_2: subnet-0123456789abcdef1
     vpc_owner_account_id: "222222222222"  # Network account that owns the VPC
   ```

2. **Reference it in `gaia.yaml`** (already configured in the starter kit):

   ```yaml
   vpc:
     vpcId: "{{context:vpc_id}}"
     appSubnets:
       - "{{context:app_subnet_id_1}}"
       - "{{context:app_subnet_id_2}}"
     vpcOwnerAccountId: "{{context:vpc_owner_account_id}}"
   ```

### Why Is This Needed?

When Lambda functions create network interfaces (ENIs) in shared subnets, the IAM policy must reference the VPC ARN with the network account ID (the account that owns the VPC), not the workload account ID. Without this setting, Lambda functions will fail with authorization errors when trying to create ENIs.

### Not Using Shared VPCs?

If your VPC exists in the same account where GAIA is deployed, you can either:
- Remove the `vpcOwnerAccountId` line from `gaia.yaml`, or
- Remove `vpc_owner_account_id` from the context in `mdaa.yaml`

The deployment will work without this setting when using same-account VPCs.

---

## Troubleshooting

### 403 Forbidden on Cognito Login

**Symptoms:** Clicking "Sign In" returns a 403 error page.

**Causes & Solutions:**

1. **Missing `cognitoAddAsIdentityProvider: true`**
   - Required when using email/password auth (no external IdP)
   - Add to `gaia.yaml` under `auth:` and redeploy

2. **WAF blocking your IP**
   - Check if your IPv6 is in the allowlist (not just IPv4!)
   - Find your IPv6: `curl -6 ifconfig.me`
   - Add to `allowedCidrs` with /64 prefix

3. **Check WAF logs for blocked requests:**

   ```bash
   aws logs filter-log-events \
     --log-group-name "aws-waf-logs-/<org>-<env>-<domain>-regional-default-waf" \
     --start-time $(( $(date +%s) - 3600 ))000 \
     --query "events[*].message" --output text | jq -r '.clientIp, .action'
   ```

### Chat Messages Hang / No Response

**Symptoms:** You send a message in the chat, but nothing happens. The UI shows a loading state indefinitely.

**Cause:** WAF is blocking the Lambda function from sending responses back through AppSync Events. The Lambda runs in your VPC and exits through the NAT Gateway, so its public IP must be in the WAF allowlist.

**Solution:** Add your NAT Gateway's public IP to the WAF allowlist:

```bash
# Find your NAT Gateway IP
aws ec2 describe-nat-gateways \
  --filter "Name=state,Values=available" "Name=vpc-id,Values=<your-vpc-id>" \
  --query 'NatGateways[*].[NatGatewayId,NatGatewayAddresses[0].PublicIp]' \
  --output table
```

Then add it to `gaia.yaml`:

```yaml
waf:
  allowedCidrs:
    - 203.0.113.50/32           # Your IPv4
    - 2001:db8:1234:5678::/64   # Your IPv6
    - 198.51.100.10/32          # NAT Gateway IP ← ADD THIS
```

> **Why is this needed?** The chat flow is: Browser → AppSync → Lambda → Bedrock → Lambda → AppSync → Browser. When Lambda sends the response back to AppSync, it goes through the NAT Gateway. WAF sees this as a new request from the NAT Gateway IP, which must be allowed.

### Lambda Timeouts / Connection Errors

**Cause:** VPC networking issue - Lambda can't reach AWS services.

**Solutions:**

1. Ensure subnets have NAT Gateway with route to internet
2. Or add VPC Endpoints for: Bedrock, DynamoDB, S3, Secrets Manager, CloudWatch Logs

### Knowledge Base Not Finding Documents

1. Verify documents uploaded to correct S3 prefix: `data/bedrock-knowledge-base/`
2. Sync the knowledge base in Bedrock console
3. Check supported file formats: PDF, TXT, MD, HTML, DOC/DOCX

## Configuration Reference

### Key Files

| File | Purpose |
|------|---------|
| `mdaa.yaml` | Main deployment config: region, org, VPC settings |
| `config/gaia.yaml` | Application config: auth, WAF, model selection |
| `config/bedrock-builder.yaml` | Knowledge base and guardrails |
| `config/roles.yaml` | IAM roles and policies |
| `config/datalake.yaml` | S3 buckets and access policies |
| `tags.yaml` | Resource tags for cost allocation |
| `infrastructure/genai-vpc.yaml` | Optional reference VPC (CloudFormation) |

### Common Customizations

**Change the foundation model:**

```yaml
# In gaia.yaml
webSocketApi:
  bedrockRagDataSource:
    modelId: "anthropic.claude-3-5-haiku-20241022-v1:0"
```

**Adjust guardrail sensitivity:**

```yaml
# In bedrock-builder.yaml
guardrails:
  chatbot-guardrail:
    contentFilters:
      sexual:
        inputStrength: HIGH  # NONE, LOW, MEDIUM, HIGH
        outputStrength: HIGH
```

**Enable chat history cleanup:**

```yaml
# In gaia.yaml
chatHistory:
  chatRetentionInMinutes: 1440  # 24 hours
```

---

## Security Best Practices

1. **Network Security**
   - Use VPC endpoints where available
   - Enable VPC flow logs

2. **Access Control**
   - Enable MFA for admin users in Cognito
   - Use least-privilege IAM roles (already configured)
   - Rotate secrets regularly

3. **Data Protection**
   - S3 encryption enabled by default
   - Enable S3 versioning for document recovery
   - Configure guardrails for PII protection

4. **Monitoring**
   - Enable CloudTrail for API audit
   - Set up CloudWatch alarms for errors
   - Monitor WAF blocked requests

---

## API Reference

The GenAI Accelerator exposes two APIs for building chat applications:

### WebSocket API (Real-time Chat)

The WebSocket API uses **AWS AppSync Events** for real-time, streaming chat responses.

**Endpoint:** Available in `aws-exports.json` as `API.Events.endpoint`

**Authentication:** Cognito JWT token

**How it works:**

1. Connect to the AppSync Events endpoint with a Cognito token
2. Subscribe to a channel for your session (e.g., `chat/<session-id>`)
3. Publish messages to trigger AI responses
4. Receive streaming responses as events on the channel

**Configuration file:** The CloudFront distribution serves `/aws-exports.json` containing:

```json
{
  "Auth": {
    "Cognito": {
      "userPoolId": "...",
      "userPoolClientId": "...",
      "region": "..."
    }
  },
  "API": {
    "Events": {
      "endpoint": "https://xxx.appsync-api.region.amazonaws.com/event",
      "region": "...",
      "defaultAuthMode": "userPool"
    }
  }
}
```

### REST API (Management Operations)

The REST API handles session management, feedback, and admin operations.

**Base URL:** `https://<cloudfront-url>/api/v1`

**Authentication:** All endpoints require a Cognito JWT token in the `Authorization` header.

#### Session Endpoints (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions` | List user's chat sessions |
| `GET` | `/sessions/<session_id>` | Get session with full chat history |
| `DELETE` | `/sessions` | Delete all user's sessions |
| `DELETE` | `/sessions/<session_id>` | Delete a specific session |

#### Feedback Endpoints (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/feedback` | Submit feedback for a response |
| `GET` | `/feedback` | Get user's feedback history |
| `GET` | `/feedback/<feedback_id>` | Get specific feedback entry |

**Feedback payload:**

```json
{
  "session_id": "uuid",
  "message_id": "uuid",
  "rating": "thumbs_up | thumbs_down",
  "reason": "accuracy",
  "text_feedback": "Optional detailed feedback"
}
```

**Valid feedback reasons:** Configured in `gaia.yaml` under `userFeedback.reasons`

#### Admin Endpoints (Requires admin group membership)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/sessions` | List all sessions (paginated) |
| `GET` | `/users/<user_id>/sessions` | List sessions for a user |
| `GET` | `/users/<user_id>/sessions/<session_id>` | Get specific user's session |
| `GET` | `/admin/feedback?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | Get feedback in date range |

#### Bot Management Endpoints (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bot-management/health` | Health check |
| `GET` | `/bot-management/service-types` | List available service types |
| `GET` | `/bot-management/interruptions` | Get all interruption statuses |
| `GET` | `/bot-management/interruptions/<service_type>` | Get specific interruption status |
| `POST` | `/bot-management/interruptions` | Activate service interruption |
| `DELETE` | `/bot-management/interruptions/<service_type>` | Deactivate interruption |

**Service types:** `global`, `bedrock-rag`, `bedrock-invoke-model`, `bedrock-strands-agents`

**Activate interruption payload:**

```json
{
  "service_type": "global",
  "message": "System maintenance in progress",
  "reason": "Scheduled maintenance",
  "duration_minutes": 60
}
```

### Authentication Flow

1. **Get Cognito configuration** from `aws-exports.json`
2. **Authenticate user** via Cognito Hosted UI or SDK
3. **Get JWT tokens** (ID token, access token, refresh token)
4. **Include token in requests:**
   - REST API: `Authorization: Bearer <id_token>`
   - WebSocket: Pass token during connection

**Cognito Hosted UI URL pattern:**

```
https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/authorize?
  client_id=<client_id>&
  response_type=code&
  scope=openid+email+profile&
  redirect_uri=<your-callback-url>
```

---

## Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AppSync Events Documentation](https://docs.aws.amazon.com/appsync/latest/eventapi/)
- [Bedrock Knowledge Bases Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Bedrock Guardrails Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Bedrock Model Availability by Region](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html)
- [WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)
