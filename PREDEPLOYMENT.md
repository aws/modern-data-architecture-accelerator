# Predeployment Guide

## Overview

Predeployment prepares your AWS accounts for MDAA (Modern Data Architecture Accelerator) deployment by bootstrapping the AWS CDK (Cloud Development Kit) toolkit stack into each target account and region. This step is required before any MDAA modules can be deployed and only needs to be performed once per account/region combination.

You should complete predeployment if:

- You are deploying MDAA for the first time in an AWS account
- You are deploying to a new region within an existing account
- You are adding a new target account in a multi-account setup

![MDAA Pre-Deployment](docs/MDAA-Predeployment.png)

---

## Terminology

The following terms are used throughout this guide. Familiarize yourself with them before proceeding to the bootstrap steps.

- **Deployment Account** — The AWS account where deployment activities occur. This includes source control for MDAA, artifact building and publishing, and MDAA CLI execution.
- **Target Account** — The AWS account where data analytics environment resources are ultimately deployed by MDAA. The Target Account can be the same as the Deployment Account (single-account setup) or a different account (multi-account setup).
- **CDK Bootstrap** — The process of provisioning initial resources (S3 bucket, IAM roles, SSM parameters) that the AWS CDK needs to perform deployments in a given account and region.
- **Trust Relationship** — In a multi-account setup, the permission grant that allows the Deployment Account to deploy resources into a Target Account.

---

## Prerequisites

Before starting the bootstrap process, ensure you have the following:

1. **AWS CLI** installed and configured with credentials for the account you are bootstrapping. See the [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
2. **AWS CDK CLI** installed globally (`npm install -g aws-cdk`). See the [CDK getting started guide](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html).
3. **Node.js 22.x** and **npm 10.x** installed. See the [Node.js downloads page](https://nodejs.org/).

### Required IAM Permissions

The AWS credentials used for bootstrapping must have sufficient permissions to create the following resources in the target account:

- **IAM Roles** — CDK creates execution roles used during deployment
- **S3 Buckets** — CDK creates a staging bucket for deployment assets
- **SSM Parameters** — CDK stores bootstrap version metadata

At minimum, your credentials need permissions for `iam:CreateRole`, `iam:AttachRolePolicy`, `s3:CreateBucket`, `s3:PutBucketPolicy`, `ssm:PutParameter`, and `cloudformation:CreateStack`. If your organization uses a custom IAM policy for CDK bootstrapping, use that policy instead.

> **Tip:** If you are unsure whether your credentials have sufficient permissions, contact your AWS account administrator or refer to your organization's IAM policy documentation.

---

## Choosing Your Bootstrap Scenario

MDAA supports two bootstrap scenarios. Choose the one that matches your deployment topology:

| Scenario | When to Use |
|---|---|
| **Single-Account** | The Deployment Account and Target Account are the same AWS account. This is the simplest setup and is recommended for getting started. |
| **Multi-Account** | The Deployment Account is separate from one or more Target Accounts. Use this when your organization requires environment isolation (e.g., dev, staging, prod in separate accounts). |

---

## Single-Account Bootstrap

Use this scenario when you are deploying MDAA from and to the same AWS account.

### Steps

1. **Obtain AWS credentials** for the account and configure them in your credentials file or environment variables.

2. **Run the CDK bootstrap command.** Replace `<AWS Account Number>` with your 12-digit AWS account ID and `<Target Region>` with the AWS region(s) where you will deploy MDAA (e.g., `us-east-1`, `ca-central-1`).

   You can specify multiple regions in a single command:

   ```bash
   export CDK_NEW_BOOTSTRAP=1
   cdk bootstrap aws://<AWS Account Number>/<Target Region>
   ```

   **Example** — Bootstrap account `123456789012` in two regions:

   ```bash
   export CDK_NEW_BOOTSTRAP=1
   cdk bootstrap aws://123456789012/ca-central-1 aws://123456789012/us-east-1
   ```

---

## Multi-Account Bootstrap

Use this scenario when the Deployment Account is different from the Target Account(s). Repeat these steps for each Target Account.

### Steps

1. **Obtain AWS credentials** for the Target Account and configure them in your credentials file or environment variables.

2. **Run the CDK bootstrap command with trust.** Replace the following placeholders:

   - `<CDK Deployment IAM Policy ARNs>` — The ARN(s) of IAM policies that CloudFormation should assume during deployment. These should be sufficient to deploy MDAA resources but not overly permissive (e.g., `arn:aws:iam::aws:policy/AdministratorAccess` for initial setup, or a scoped-down custom policy for production).
   - `<Source Account Number>` — The 12-digit AWS account ID of your Deployment Account.
   - `<Target AWS Account Number>` — The 12-digit AWS account ID of the Target Account being bootstrapped.
   - `<Target Region>` — The AWS region(s) for deployment.

   ```bash
   export CDK_NEW_BOOTSTRAP=1
   cdk bootstrap \
     --cloudformation-execution-policies <CDK Deployment IAM Policy ARNs> \
     --trust <Source Account Number> \
     aws://<Target AWS Account Number>/<Target Region>
   ```

   **Example** — Bootstrap target account `987654321098` in `us-east-1`, trusting deployment account `123456789012`:

   ```bash
   export CDK_NEW_BOOTSTRAP=1
   cdk bootstrap \
     --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
     --trust 123456789012 \
     aws://987654321098/us-east-1
   ```

> **Note:** The permissions specified with `--cloudformation-execution-policies` are granted to CloudFormation during deployment into the account. For production environments, use a scoped-down policy rather than `AdministratorAccess`.

---

## Verification

After bootstrapping, verify that the CDK toolkit stack was created successfully:

1. **Check the CloudFormation stack** in the AWS Console or via the CLI:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name CDKToolkit \
     --region <Target Region>
   ```

2. **Confirm the stack status** is `CREATE_COMPLETE` or `UPDATE_COMPLETE`. The output should include a stack with `StackName: CDKToolkit` and a status indicating successful creation.

3. **Verify the staging bucket exists:**

   ```bash
   aws s3 ls | grep -i cdk
   ```

   You should see an S3 bucket with a name starting with `cdk-` in the output.

If any step fails, check that your credentials have the [required IAM permissions](#required-iam-permissions) and that you specified the correct account number and region.

---

## Next Steps

Your AWS account(s) are now prepared for MDAA deployment. Proceed to the [Deployment Guide](DEPLOYMENT.md) to deploy your first MDAA modules.
