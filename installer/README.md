# MDAA Installer Pipeline

This README describes the MDAA Installer pipeline and provides instructions for deployment using AWS CDK or CloudFormation.

## Pipeline Overview

The MDAA Installer pipeline is a CI/CD pipeline built using AWS CDK. It supports two source options:

1. GitHub repository
2. S3 bucket
    1. this must be in the same region as the deployment
    2. The key must be pointing to a zip file
    3. the zip file contains the project. The project contains `package-lock.json` at the very top level.

The pipeline consists of two main stages:

1. Source: Retrieves code from either GitHub or S3
2. Build: Executes a build script to deploy the MDAA infrastructure

## Deployment Instructions
For internal development, the following two methods are used. However, ultimately, the deliverable is the synthesized artifact: CloudFormation template. That is what users of this AWS Solution will be using to test out the deployment.

### Setup with S3 Option
S3 is mostly for testing only in the absence of a github repo. Before using S3, the bucket needs to be set up.

Note that the bucket must be in the same region as the CloudFormation stack that will create the CodePipeline in that region.

1. Create verion-enabled bucket:
```bash
aws s3api create-bucket \
--bucket your-bucket-name \
--region your-region \
--create-bucket-configuration LocationConstraint=your-region

aws s3api put-bucket-versioning \
--bucket your-bucket-name \
--versioning-configuration Status=Enabled

```
2. Create a folder and place the zip file of mdaa repo in it. (Remember that the top level should already be the top level of the repo. The repo cannot be inside a folder!)
3. Upload the zip file
```bash
aws cp mdaa.zip s3://your-bucket-name/release/mdaa.zip
```


### Option 1: CDK Deploy

To deploy using CDK directly:

1. Ensure you have the AWS CDK CLI installed and configured
2. Clone this repository
3. Navigate to the project directory
4. Install dependencies:
   ```
   npm install
   ```
5. Deploy the stack:
   ```
   cdk deploy --parameters RepositorySource=github \
              --parameters RepositoryOwner= \
              --parameters RepositoryName= \
              --parameters RepositoryBranchName=main
   ```

   For S3 source, use:
   ```
   cdk deploy --parameters RepositorySource=s3 \
              --parameters RepositoryBucketName= \
              --parameters RepositoryBucketObject=
   ```

### Option 2: Generate CloudFormation Template

To generate a CloudFormation template for distribution:

1. Follow steps 1-4 from the CDK Deploy option
2. Synthesize the CloudFormation template:
   ```
   cdk synth > installer.yaml
   ```
3. Distribute the `installer.yaml` file to users who prefer CloudFormation

Users can then deploy the stack using the AWS Management Console, AWS CLI, or AWS SDKs.

## Developing the build script
CodeBuild's buidspec runs a series of scripts. In the `emulator` folder you will find the following:
- a Dockerfile that will emulate the current CodeBuild environment. It is basically a trimmed down version of CodeBuild Dockerfile with just the core and nodejs installed.
- a CloudFormation template to deploy an EC2 instance that has nodejs version needed and also the CodeBuild image we are using.

### Setup
If you are using `S3` mode: Create a folder and place the zip file of mdaa repo in it. (Remember that the top level should already be the top level of the repo. The repo cannot be inside a folder!)

If you are using `github`, you need to have a clean-checkout of the github repo of MDAA and switch to the branch you are testing.

#### Environment

There are a few ways to set up the environment: run a docker container or an EC2 instance.

For the Docker option:

#### Build your own image
```bash
docker build -t codebuild-test-env .
```

#### Use the codebuild image
See how to get a list of images [here](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available-get.html)
```bash
docker pull public.ecr.aws/codebuild/amazonlinux2-x86_64-standard:5.0
```

#### Run the container with your source code mounted
The `-v` should be whichever folder contains the zip file.
```bash
docker run -it -v $(pwd):/workdir codebuild-test-env
```

#### EC2
You can deploy the supplied ec2-emulator.yaml file and you will have an EC2 instance accessible by SSM. There you have nodejs and also the same docker image pulled.

### Run the script
From either the EC2 instance or within a bash shell of the docker container:
1. Run `export` for all the require environment variables as listed in the `build` section
2. Run the lines of the `command` to confirm a bug or add changes to implement a new way to run buildspec

## Uninstall
### Manual way
1. Delete all the stacks that start with the organization name
2. Delete also the stack that the installer template created
3. Delete all the S3 buckets with the organization name as prefix in the bucket name

## Additional Notes

- If using private GitHub repository, ensure the GitHub token is stored in AWS Secrets Manager with the name "github-token" before deployment
- If working with a non-github repository, you'd use the S3 option. The simplest way to zip the whole repository is, from the top level of the local repository folder, run:
   - To zip the `HEAD`: `git archive --format=zip -o mdaa.zip HEAD`
   - To zip the current state of the local folder, including uncommitted changes: `git ls-files -c -o --exclude-standard | zip -@ ../mdaa.zip`

For more information on AWS CDK, refer to the [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html).

