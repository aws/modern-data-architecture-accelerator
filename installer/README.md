# MDAA Installer

> **Note:** This folder is used internally to generate the CloudFormation template published on the
> [AWS Solutions page](https://aws.amazon.com/solutions/implementations/modern-data-architecture-accelerator/).
> If you are looking to deploy MDAA, please follow the instructions in the
> [main README](../README.md) at the root of this repository. MDAA can be integrated into any CI/CD
> pipeline of your choice (Jenkins, GitLab CI, GitHub Actions, etc.). The use of CodeBuild here is
> just one example of how to run MDAA from a CI/CD tool.

This README describes the MDAA Installer and provides instructions for deployment using AWS CDK or CloudFormation.

## Overview

The MDAA Installer creates a CodeBuild project that clones the MDAA repository from GitHub and deploys the selected sample configuration. After deploying the CloudFormation stack, you manually start the CodeBuild project to begin the MDAA deployment.

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| RepositoryBranchName | GitHub branch to clone (e.g., `release/v1.4.0`) | `release/v{version}` |
| SampleName | Sample configuration to deploy | `basic_datalake` |
| OrgName | Organization name for MDAA deployment (required) | - |
| MdaaVersion | Version of MDAA modules to deploy (e.g., `latest`, `1.3.0`) | `latest` |
| VpcId | VPC ID (required by CloudFormation; only used by `basic_datascience_platform`) | - |
| SubnetId | Subnet ID (required by CloudFormation; only used by `basic_datascience_platform`) | - |

## Deployment Instructions

### Option 1: CloudFormation Console (Recommended for Users)

1. Synthesize the CloudFormation template:
   ```bash
   cd installer
   npm install
   cdk synth > installer.yaml
   ```
2. Upload `installer.yaml` to CloudFormation console or deploy via CLI
3. After stack creation, go to the CodeBuild console (link provided in stack outputs)
4. Click "Start build" to begin the MDAA deployment

### Option 2: CDK Deploy (For Development/Testing)

```bash
cd installer
npm install
export AWS_REGION=<region>

# Bootstrap CDK (one-time setup per account/region)
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text --no-paginate)/$AWS_REGION

cdk deploy \
   --parameters OrgName=myorg \
   --parameters SampleName=basic_datalake \
   --require-approval never
```

For `basic_datascience_platform`, also include VPC and Subnet:
```bash
export AWS_REGION=<region>
cdk deploy \
   --parameters OrgName=myorg \
   --parameters SampleName=basic_datascience_platform \
   --parameters VpcId=vpc-xxxxx \
   --parameters SubnetId=subnet-xxxxx \
   --require-approval never
```

## CDK Context Options

| Context | Description | Default |
|---------|-------------|---------|
| `sampleConfigFolder` | Folder containing sample configs | `starter_kits` |

Example using older branch with `sample_configs` folder:
```bash
cdk synth -c sampleConfigFolder=sample_configs
```


## Stack Outputs

After deployment, the stack provides:
- **CodeBuildProjectUrl**: Direct link to the CodeBuild project console
- **CodeBuildProjectName**: Name of the CodeBuild project

## Developing the Build Script

CodeBuild's buildspec runs a series of commands. In the `emulation` folder you will find:
- A CloudFormation template to deploy an EC2 instance that emulates the CodeBuild environment

### Environment Variables

The CodeBuild project uses these environment variables:
- `REPOSITORY_BRANCH_NAME`: GitHub branch to clone
- `SAMPLE_NAME`: Sample configuration name
- `SAMPLE_CONFIG_FOLDER`: Folder containing sample configs
- `ORG_NAME`: Organization name
- `MDAA_VERSION`: Version of MDAA modules to deploy
- `VPC_ID`: VPC ID (for data science sample)
- `SUBNET_ID`: Subnet ID (for data science sample)

## Uninstall

1. Delete all CloudFormation stacks that start with the organization name, in reverse chronological order
2. Clean up any protected resources (S3 buckets, KMS keys, etc.) that CloudFormation cannot delete automatically
3. Delete the installer stack

## End-to-End Testing

An automated test script validates the full installer flow: synth, lint, unit tests, deploy, CodeBuild run, and stack verification.

```bash
cd installer
./test-installer.sh --region <region> [--sample-config-folder sample_configs] [--skip-cleanup]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--region` | AWS region to deploy into (required) | - |
| `--org-name` | Organization name for the test deployment | `mdaa-inst-test` |
| `--sample-config-folder` | Override the sample config folder name at synth time | `starter_kits` |
| `--skip-cleanup` | Leave the installer stack in place after the test | `false` |

The script auto-discovers a VPC and subnet in the target region for CloudFormation parameter validation. MDAA stacks deployed by CodeBuild are not automatically deleted; see the Uninstall section above.

## Additional Notes

For more information on AWS CDK, refer to the [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html).
