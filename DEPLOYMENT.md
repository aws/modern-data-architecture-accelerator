# Deployment

## Deployment Overview

The following are procedures which can be executed in order to manually deploy CAEF to target accounts. These procedures assume that the appropriate [preparations](PREDEPLOYMENT.md) have been made within the organizations accounts.

## Deployment Patterns

CAEF may be deployed using a number of patterns:

### Same Deployment Source and Target Account (Centralized Data Environment)

![CAEF Deployment](docs/CAEF-Deployment-1.png)

### Single Deployment Source account, One or More Separate Target Accounts (Centralized deployment governance, decentralized Data Environments)

![CAEF Deployment](docs/CAEF-Deployment-2.png)

## Deployment Preparation

### Node Installation

Install a version of Node.js using a method appropriate to your system. **CAEF requires nodejs 16.x and npm/npx version 8.x or greater.**

### Environment Setup

Ensure your credentials are populated either in your environment or in your ~/.aws/credentials file.
Also, ensure your AWS region is specified either in your environment or in your ~/.aws/config file:

```bash
[default]
region=ca-central-1
```

### CAEF Installation

Ensure that your private NPM repo is accessible and contains the appropriate CAEF NPM artifacts. If using a localhost based NPM repo (such as Verdaccio), ensure it is running on localhost and updated with the latest CAEF packages from S3. (See [PREDEPLOYMENT](PREDEPLOYMENT.md))

Install CDK and CAEF, which can be installed from your private NPM repository using:

Global Installation:

```bash
npm install -g aws-cdk@2.x @aws-caef/cli
```

Optionally, both CDK and CAEF CLI can be instead installed locally:

```bash
npm install aws-cdk@2.x @aws-caef/cli
```

If CAEF CLI is installed locally, all CAEF commands will need to be executed using npx.

***

## CAEF Deployment using CLI

If CAEF CLI is installed globally, CAEF can be executed from a shell as follows:

```bash
caef <cdk action>
```

If CAEF CLI is installed locally, the command should be prefixed with 'npx':

```bash
npx caef <cdk action>
```

Use the -h parameter to print a list of all CAEF CLI parameters

```bash
caef -h
```

Use the -c parameter to specify a config config file. Otherwise CAEF CLI will attempt to use caef.yaml from the local directory.

```bash
caef -c <optional-path-to-caef-config-file> <cdk action>
```

To CDK synth all stacks:

```bash
caef synth
```

To CDK diff all stacks:

```bash
caef diff
```

To CDK deploy all stacks:

```bash
caef deploy
```

To CDK deploy only env=dev modules/stacks:

```bash
caef deploy -e dev
```

To CDK deploy only domain1 and domain2 modules/stacks:

```bash
caef deploy -i domain1,domain2
```

To CDK deploy only the test_roles_module and test_datalake_module modules/stacks:

```bash
caef deploy -m test_roles_module,test_datalake_module
```

***

## Deployment of CAEF Modules/CDK Apps using CDK CLI

CAEF Modules are developed as independant CDK apps which can be directly executed using the CDK CLI. This is generally useful for development and troubleshooting directly against the CAEF codebase.

To execute CAEF Modules/CDK apps using the CDK CLI:

1. Clone the CAEF source repo.
2. At the root of the repo, run `npm install` to install all packages required across all modules.
3. Change directory to the CAEF Modules/CDK apps source code directory (typically under packages/apps/< module category >/< module >)
4. Run the following CDK commands with the required context:

```bash
cdk synth -c org=<organization> -c env=<dev|test|prod> -c domain=<domain name> -c app_configs=<app_config_paths> -c tag_configs=<tag_config_paths> -c module_name=<module_name>
```

```bash
cdk synth -c org="sample-org" -c env="dev" -c domain="caef1" -c app_configs="warehouse.yaml" -c tag_configs="tags.yaml"  -c module_name="testing"
```

### Required Context

The following context values are required for all modules. Note that additional context values may be required if context is referenced from within the module/app config.

* **org** - Name of the organization

* **env** - Name of the target environment (ie. dev/test/prod)

* **domain** - Name of the deployment domain (allows multiple deployments in same org/env/account)

* **module_name** - Name of the CAEF module (allows multiple deployments of the same CDK app within same org/domain/env)

* **app_configs** - Comma separated list of paths to one or more app config files (see Configuration). Multiple config files will be merged, with later-listed config files taking precedence over earlier-listed config files.

* **tag_configs** - Comma separated list of paths to one or more tag config files (see Configuration). Multiple config files will be merged, with later-listed config files taking precedence over earlier-listed config files.
