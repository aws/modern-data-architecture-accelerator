# MDAA Installer

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
| VpcId | VPC ID (required for `basic_datascience_platform`) | - |
| SubnetId | Subnet ID (required for `basic_datascience_platform`) | - |

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

1. Delete all CloudFormation stacks that start with the organization name
2. Delete the installer stack
3. Delete all S3 buckets with the organization name as prefix

## Additional Notes

For more information on AWS CDK, refer to the [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html).
