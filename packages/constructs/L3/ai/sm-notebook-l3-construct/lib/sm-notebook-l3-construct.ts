/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaNoteBook, MdaaNoteBookProps } from '@aws-mdaa/sagemaker-constructs';
import { AssetDeploymentProps, AssetProps, LifeCycleConfigHelper, LifecycleScriptProps } from '@aws-mdaa/sm-shared';
import { Stack } from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CfnNotebookInstanceLifecycleConfig, CfnNotebookInstanceLifecycleConfigProps } from 'aws-cdk-lib/aws-sagemaker';

/**
 * Q-ENHANCED-INTERFACE
 * SageMaker notebook lifecycle configuration interface for notebook instance startup and creation script management. Defines lifecycle scripts that execute during notebook instance creation and startup, enabling custom environment setup, package installation, and configuration management for ML development environments.
 *
 * Use cases: Notebook environment setup; Custom package installation; ML library configuration; Development environment preparation; Automated notebook configuration
 *
 * AWS: SageMaker notebook instance lifecycle configuration with onCreate and onStart script execution for custom environment setup
 *
 * Validation: onCreate and onStart scripts must be valid lifecycle script configurations; scripts must be executable in SageMaker notebook environment
 */
export interface NotebookLifeCycleConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle script configuration for SageMaker notebook instance creation enabling custom environment setup during instance initialization. Defines scripts that execute when the notebook instance is first created, providing initial environment configuration, package installation, and setup tasks for ML development environments.
   *
   * Use cases: Initial environment setup; Package installation; Notebook creation configuration; ML environment initialization; Custom setup scripts
   *
   * AWS: SageMaker notebook instance onCreate lifecycle script for initial environment setup and configuration
   *
   * Validation: Must be valid LifecycleScriptProps if provided; scripts must be executable in SageMaker environment; optional for creation-time configuration
   **/
  readonly onCreate?: LifecycleScriptProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle script configuration for SageMaker notebook instance startup enabling custom environment preparation on each instance start. Defines scripts that execute every time the notebook instance starts, providing recurring environment setup, package updates, and configuration tasks for consistent ML development environments.
   *
   * Use cases: Startup environment preparation; Package updates; Recurring configuration; Environment consistency; Startup automation
   *
   * AWS: SageMaker notebook instance onStart lifecycle script for startup environment preparation and configuration
   *
   * Validation: Must be valid LifecycleScriptProps if provided; scripts must be executable in SageMaker environment; optional for startup-time configuration
   **/
  readonly onStart?: LifecycleScriptProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker notebook asset deployment configuration interface for automated asset management with S3 integration and Lambda-based deployment. Defines asset deployment properties including S3 bucket configuration, IAM role specification, and deployment parameters for automated notebook asset provisioning and management.
 *
 * Use cases: Automated asset deployment; Notebook resource provisioning; S3 asset management; Lambda-based deployment; ML asset automation
 *
 * AWS: S3 bucket and Lambda function configuration for automated SageMaker notebook asset deployment and management
 *
 * Validation: assetBucketName must be valid S3 bucket name; assetDeploymentRoleArn must be valid IAM role ARN with S3 and Lambda permissions; memoryLimitMB must be valid Lambda memory allocation
 */
export interface NotebookAssetDeploymentConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for SageMaker notebook asset storage enabling centralized asset management and deployment. Defines the S3 bucket that will store notebook assets including notebooks, scripts, and data files for automated deployment to SageMaker notebook instances.
   *
   * Use cases: Asset storage; Centralized asset management; Notebook deployment; S3-based asset distribution; ML asset organization
   *
   * AWS: Amazon S3 bucket name for SageMaker notebook asset storage and automated deployment
   *
   * Validation: Must be valid S3 bucket name; required for asset storage and deployment
   **/
  readonly assetBucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for SageMaker notebook asset deployment Lambda function enabling secure asset deployment operations. Defines the IAM role that will be used by the Lambda function responsible for deploying assets to notebook instances, requiring S3 and SageMaker permissions.
   *
   * Use cases: Secure asset deployment; Lambda execution role; IAM permissions; Asset deployment automation; Security configuration
   *
   * AWS: AWS IAM role ARN for Lambda function asset deployment with S3 and SageMaker permissions
   *
   * Validation: Must be valid IAM role ARN with required permissions; required for asset deployment Lambda function
   **/
  readonly assetDeploymentRoleArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 object prefix for SageMaker notebook asset organization enabling structured asset storage and deployment. Defines the S3 key prefix that will be used for organizing assets within the bucket, providing logical separation and organization of different asset types or environments.
   *
   * Use cases: Asset organization; S3 key structure; Logical asset separation; Environment-based organization; Asset categorization
   *
   * AWS: Amazon S3 object prefix for SageMaker notebook asset organization and structured storage
   *
   * Validation: Must be valid S3 key prefix if provided; optional for asset organization
   **/
  readonly assetPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function memory limit in megabytes for SageMaker notebook asset deployment function enabling performance optimization. Defines the memory allocation for the Lambda function responsible for asset deployment, allowing performance tuning based on asset size and deployment complexity.
   *
   * Use cases: Lambda performance tuning; Memory optimization; Deployment performance; Resource allocation; Function configuration
   *
   * AWS: AWS Lambda function memory limit for SageMaker notebook asset deployment performance optimization
   *
   * Validation: Must be valid Lambda memory value (128-10240 MB) if provided; optional for performance tuning
   **/
  readonly memoryLimitMB?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named asset collection interface for SageMaker notebook asset management with string-based naming for organized asset deployment. Enables configuration of multiple notebook assets with unique identifiers, supporting organized asset management and automated deployment of notebooks, scripts, and data files for ML development environments.
 *
 * Use cases: Notebook asset organization; Named asset collections; ML asset management; Automated asset deployment; Development environment setup
 *
 * AWS: S3 asset deployment with organized naming for SageMaker notebook asset management and automated provisioning
 *
 * Validation: Asset names must be valid identifiers; each AssetProps must be valid asset configuration; names must be unique within collection
 */
export interface NamedAssetProps {
  /** @jsii ignore */
  readonly [name: string]: AssetProps;
}
export interface SagemakerNotebookL3ConstructProps extends MdaaL3ConstructProps {
  readonly assetDeployment?: NotebookAssetDeploymentConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of lifecycle configuration names to lifecycle configurations for notebook instance management enabling automated setup and maintenance scripts. Provides lifecycle configurations for notebook instances with onCreate and onStart scripts for environment setup and maintenance.
   *
   * Use cases: Notebook lifecycle management; Environment setup; Automated configuration; Instance maintenance
   *
   * AWS: SageMaker notebook lifecycle configurations for automated instance setup and maintenance
   *
   * Validation: Must be valid NamedLifecycleConfigProps if provided; enables notebook lifecycle management and automation
   **/
  readonly lifecycleConfigs?: NamedLifecycleConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of notebook names to notebook configurations for SageMaker notebook instance deployment enabling interactive ML development and experimentation. Provides notebook instance configurations with VPC networking, security settings, and compute resources for ML development workflows.
   *
   * Use cases: Notebook deployment; ML development; Interactive experimentation; Data science workflows
   *
   * AWS: SageMaker notebook instances for interactive ML development and data science experimentation
   *
   * Validation: Must be valid NotebookWithIdProps if provided; enables notebook instance deployment and ML development
   *   **/
  readonly notebooks?: NotebookWithIdProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for notebook encryption enabling customer-controlled encryption and enhanced security compliance. When provided, uses existing KMS key for encrypting notebook storage; otherwise creates customer-managed key for data protection and security compliance.
   *
   * Use cases: Notebook encryption; Customer-controlled keys; Security compliance; Data protection
   *
   * AWS: KMS key ARN for SageMaker notebook encryption and customer-controlled data protection
   *
   * Validation: Must be valid KMS key ARN if provided; enables customer-controlled encryption for notebook storage
   **/
  readonly kmsKeyArn?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * SageMaker notebook instance metadata service configuration interface for EC2 instance metadata security settings. Defines Instance Metadata Service (IMDS) configuration for SageMaker notebook instances including metadata service version requirements for enhanced security and compliance with security best practices.
 * Use cases: Instance metadata security; IMDS version control; Security compliance; Notebook instance hardening; Metadata access control
 * AWS: SageMaker notebook instance metadata service configuration for enhanced security and IMDS version control
 * Validation: minimumInstanceMetadataServiceVersion must be valid IMDS version (e.g., '1' or '2'); version 2 recommended for enhanced security
 */
export interface InstanceMetadataServiceConfiguration {
  readonly minimumInstanceMetadataServiceVersion: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named lifecycle configuration collection interface for SageMaker notebook lifecycle management with string-based naming for organized script deployment. Enables configuration of multiple lifecycle configurations with unique identifiers, supporting organized notebook environment setup and automated script execution for ML development environments.
 * Use cases: Lifecycle script organization; Named configuration collections; Notebook environment management; Automated setup scripts; Development environment standardization
 * AWS: SageMaker notebook lifecycle configurations with organized naming for automated environment setup and script management
 * Validation: Configuration names must be valid identifiers; each NotebookLifeCycleConfigProps must be valid lifecycle configuration; names must be unique within collection
 */
export interface NamedLifecycleConfigProps {
  /**
   * Lifecycle config scripts
   */
  /** @jsii ignore */
  readonly [name: string]: NotebookLifeCycleConfigProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named SageMaker notebook collection interface for managing multiple notebook instances with string-based naming for organized ML development environments. Enables configuration of multiple notebook instances with unique identifiers, supporting team-based ML development and organized notebook management for data science workflows.
 * Use cases: Multi-notebook deployments; Team notebook organization; Named notebook collections; ML development environments; Data science team management
 * AWS: Multiple SageMaker notebook instances with organized naming for team-based ML development and notebook management
 * Validation: Notebook names must be valid identifiers; each NotebookProps must be valid notebook configuration; names must be unique within collection
 */
export interface NotebookWithIdProps {
  /** @jsii ignore */
  readonly [name: string]: NotebookProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Individual SageMaker notebook configuration interface for notebook instance deployment providing ML development settings. Defines notebook-specific properties including instance configuration, networking, security settings, and lifecycle management for ML experimentation and development workflows within secure, compliant environments.
 * Use cases: Individual notebook deployment; ML development environments; Data science workspaces; Secure notebook instances; Custom ML environments
 * AWS: SageMaker notebook instance configuration with VPC networking, security groups, and lifecycle management for ML development
 * Validation: vpcId must be valid VPC identifier; subnetIds must be valid subnet identifiers; instanceType must be valid SageMaker instance type; roleArn must have SageMaker permissions
 */
export interface NotebookProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom name for the SageMaker notebook instance enabling personalized notebook identification and management. Provides a descriptive name for the notebook instance that will be used for identification, logging, and management within the SageMaker environment and MDAA deployment.
   *
   * Use cases: Notebook identification; Instance naming; Management clarity; Operational visibility; Custom naming
   *
   * AWS: Amazon SageMaker notebook instance name for identification and management
   *
   * Validation: Must be valid SageMaker instance name if provided; optional for custom notebook naming
   **/
  readonly notebookName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier for SageMaker notebook instance deployment enabling network isolation and security boundaries. Defines the Virtual Private Cloud that will host the notebook instance providing network-level security and isolation for ML development and data science workflows.
   *
   * Use cases: Network isolation; VPC deployment; Security boundaries; Private ML environments; Network-level security
   *
   * AWS: Amazon VPC identifier for SageMaker notebook instance deployment and network isolation
   *
   * Validation: Must be valid VPC identifier; required for VPC-based notebook deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required subnet identifier for SageMaker notebook instance placement enabling network segmentation and availability zone selection. Defines the specific subnet within the VPC where the notebook instance will be deployed, providing network segmentation and availability zone control for ML development environments.
   *
   * Use cases: Network segmentation; Availability zone placement; Subnet-level isolation; Network architecture; Instance placement
   *
   * AWS: Amazon VPC subnet identifier for SageMaker notebook instance placement and network segmentation
   *
   * Validation: Must be valid subnet identifier; required for notebook instance deployment; subnet must be in specified VPC
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required EC2 instance type for SageMaker notebook instance enabling compute resource specification and performance optimization. Defines the compute capacity and performance characteristics of the notebook instance for ML development, data science workflows, and model experimentation.
   *
   * Use cases: Compute resource specification; Performance optimization; Cost optimization; Workload-appropriate sizing; ML compute selection
   *
   * AWS: Amazon EC2 instance type for SageMaker notebook instance compute resource specification
   *
   * Validation: Must be valid SageMaker-supported instance type; required for notebook instance deployment
   **/
  readonly instanceType: string;
  readonly securityGroupId?: string;
  readonly securityGroupIngress?: MdaaSecurityGroupRuleProps;
  readonly securityGroupEgress?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role reference for SageMaker notebook instance enabling secure access to AWS services and resources. Defines the IAM role that will be assumed by the notebook instance for accessing S3, other AWS services, and data resources required for ML development and data science workflows.
   *
   * Use cases: IAM permissions; Secure service access; Resource access control; ML service integration; Data access management
   *
   * AWS: AWS IAM role for SageMaker notebook instance service access and resource permissions
   *
   * Validation: Must be valid MdaaRoleRef with SageMaker permissions; required for notebook instance deployment
   **/
  readonly notebookRole: MdaaRoleRef;
  readonly acceleratorTypes?: string[];
  readonly additionalCodeRepositories?: string[];
  readonly defaultCodeRepository?: string;
  readonly instanceMetadataServiceConfiguration?: InstanceMetadataServiceConfiguration;
  readonly platformIdentifier?: string;
  readonly volumeSizeInGb?: number;
  readonly rootAccess?: boolean;
  readonly lifecycleConfigName?: string;
}

//This stack creates and manages a SageMaker Studio Domain
export class SagemakerNotebookL3Construct extends MdaaL3Construct {
  protected readonly props: SagemakerNotebookL3ConstructProps;

  constructor(stack: Stack, id: string, props: SagemakerNotebookL3ConstructProps) {
    super(stack, id, props);
    this.props = props;
    const lifecycleConfigsMap = props.lifecycleConfigs ? this.createLifecycleConfigs(props.lifecycleConfigs) : {};
    if (this.props.notebooks) this.createNotebooks(this.props.notebooks, lifecycleConfigsMap);
  }

  private createLifecycleConfigs(lifecycleConfigs: NamedLifecycleConfigProps): {
    [k: string]: CfnNotebookInstanceLifecycleConfig;
  } {
    return Object.fromEntries(
      Object.entries(lifecycleConfigs).map(entry => {
        const lifecycleName = entry[0];
        const lifecycleProps = entry[1];
        const lifecycleConfig = this.createLifecycleConfig(lifecycleName, lifecycleProps);
        return [lifecycleName, lifecycleConfig];
      }),
    );
  }

  private createNotebooks(
    notebooks: NotebookWithIdProps,
    lifecycleConfigsMap: { [k: string]: CfnNotebookInstanceLifecycleConfig },
  ) {
    if (Object.keys(notebooks).length > 0) {
      const resolvedRoles = Object.fromEntries(
        Object.entries(notebooks).map(entry => {
          const resolved = this.props.roleHelper.resolveRoleRefWithRefId(entry[1].notebookRole, entry[0]);
          return [entry[0], resolved];
        }) || [],
      );

      const kmsKey = this.props.kmsKeyArn
        ? Key.fromKeyArn(this, `imported-key`, this.props.kmsKeyArn)
        : this.createKMSKey(
            'notebooks',
            Object.entries(resolvedRoles).map(x => x[1].arn()),
          );

      Object.entries(notebooks).forEach(entry => {
        const notebookId = entry[0];
        const notebookProps = entry[1];
        this.createNotebook(notebookId, notebookProps, kmsKey, lifecycleConfigsMap, resolvedRoles);
      });
    }
  }

  private createNotebook(
    notebookId: string,
    notebookProps: NotebookProps,
    kmsKey: IKey,
    lifecycleConfigsMap: { [k: string]: CfnNotebookInstanceLifecycleConfig },
    resolvedRoles: { [k: string]: MdaaResolvableRole },
  ) {
    const securityGroup = notebookProps.securityGroupId
      ? SecurityGroup.fromSecurityGroupId(this, `${notebookId}-sg`, notebookProps.securityGroupId)
      : this.createSecurityGroup(notebookId, notebookProps);

    const lifecycleConfigName: string | undefined = notebookProps.lifecycleConfigName
      ? this.resolveLifecycleConfigName(notebookProps.lifecycleConfigName, lifecycleConfigsMap)
      : undefined;

    // Create notebook instance
    const createNotebookProps: MdaaNoteBookProps = {
      notebookInstanceId: notebookId,
      naming: this.props.naming,
      notebookInstanceName: notebookProps.notebookName ?? notebookId,
      instanceType: notebookProps.instanceType,
      roleArn: resolvedRoles[notebookId].arn(),
      kmsKeyId: kmsKey.keyArn,
      acceleratorTypes: notebookProps.acceleratorTypes,
      additionalCodeRepositories: notebookProps.additionalCodeRepositories,
      defaultCodeRepository: notebookProps.defaultCodeRepository,
      instanceMetadataServiceConfiguration: notebookProps.instanceMetadataServiceConfiguration,
      lifecycleConfigName: lifecycleConfigName,
      platformIdentifier: notebookProps.platformIdentifier,
      volumeSizeInGb: notebookProps.volumeSizeInGb,
      securityGroupIds: [securityGroup.securityGroupId],
      subnetId: notebookProps.subnetId,
      rootAccess: notebookProps.rootAccess != undefined && notebookProps.rootAccess ? 'Enabled' : undefined,
    };

    new MdaaNoteBook(this, notebookId, createNotebookProps);
  }

  /** @jsii ignore */
  private resolveLifecycleConfigName(
    lifecycleConfigName: string,
    lifecycleConfigsMap: { [name: string]: CfnNotebookInstanceLifecycleConfig },
  ): string {
    if (lifecycleConfigName.startsWith('external:')) {
      return lifecycleConfigName.replace(/^external:/, '');
    } else {
      const nameRef = lifecycleConfigsMap[lifecycleConfigName]?.notebookInstanceLifecycleConfigName;
      if (!nameRef) {
        throw new Error(`Non-existant lifecycle config referenced: ${lifecycleConfigName}`);
      }
      return nameRef;
    }
  }

  private createSecurityGroup(notebookId: string, notebookProps: NotebookProps): SecurityGroup {
    const notebookVpc = Vpc.fromVpcAttributes(this, 'vpc of' + notebookId, {
      availabilityZones: ['dummy'],
      vpcId: notebookProps.vpcId,
    });
    const customEgress: boolean =
      (notebookProps.securityGroupEgress?.ipv4 && notebookProps.securityGroupEgress?.ipv4.length > 0) ||
      (notebookProps.securityGroupEgress?.prefixList && notebookProps.securityGroupEgress?.prefixList.length > 0) ||
      (notebookProps.securityGroupEgress?.sg && notebookProps.securityGroupEgress?.sg.length > 0) ||
      false;

    const securityGroupProps: MdaaSecurityGroupProps = {
      securityGroupName: notebookId,
      vpc: notebookVpc,
      naming: this.props.naming,
      ingressRules: notebookProps.securityGroupIngress,
      egressRules: notebookProps.securityGroupEgress,
      allowAllOutbound: !customEgress,
      addSelfReferenceRule: false,
    };

    const securityGroup = new MdaaSecurityGroup(this, `${notebookId}-sg`, securityGroupProps);
    return securityGroup;
  }

  private createKMSKey(notebookName: string, roleArns: string[]): IKey {
    const kmsKey = new MdaaKmsKey(this, `kmskey-${notebookName}`, {
      alias: `kmskey-${notebookName}`,
      naming: this.props.naming,
    });

    // Allow execution role to use the key
    const kmsEncryptDecryptPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: ['*'],
      actions: [
        ...DECRYPT_ACTIONS,
        ...ENCRYPT_ACTIONS,
        'kms:GenerateDataKeyWithoutPlaintext',
        'kms:CreateGrant',
        'kms:DescribeKey',
        'kms:ListAliases',
      ],
    });
    roleArns.forEach(roleArn => kmsEncryptDecryptPolicy.addArnPrincipal(roleArn));
    kmsKey.addToResourcePolicy(kmsEncryptDecryptPolicy);
    return kmsKey;
  }

  private createLifecycleConfig(
    lifecycleName: string,
    lifecycleConfigProps: NotebookLifeCycleConfigProps,
  ): CfnNotebookInstanceLifecycleConfig {
    const assetDeployment: AssetDeploymentProps | undefined = this.props.assetDeployment
      ? {
          scope: this,
          assetBucket: Bucket.fromBucketName(
            this,
            `asset-bucket-${lifecycleName}`,
            this.props.assetDeployment.assetBucketName,
          ),
          assetDeploymentRole: Role.fromRoleArn(
            this,
            `asset-role-${lifecycleName}`,
            this.props.assetDeployment.assetDeploymentRoleArn,
          ),
          assetPrefix: this.props.assetDeployment?.assetPrefix || `sagemaker-lifecycle-assets/notebooks`,
          memoryLimitMB: this.props.assetDeployment?.memoryLimitMB,
        }
      : undefined;

    const onStartContent = lifecycleConfigProps.onStart
      ? LifeCycleConfigHelper.createLifecycleConfigContents(lifecycleConfigProps.onStart, 'onStart', assetDeployment)
      : undefined;
    const onCreateContent = lifecycleConfigProps.onCreate
      ? LifeCycleConfigHelper.createLifecycleConfigContents(lifecycleConfigProps.onCreate, 'onCreate', assetDeployment)
      : undefined;

    const cfnLifecycleConfigProps: CfnNotebookInstanceLifecycleConfigProps = {
      notebookInstanceLifecycleConfigName: this.props.naming.resourceName(lifecycleName),
      onStart: onStartContent ? [{ content: onStartContent }] : undefined,
      onCreate: onCreateContent ? [{ content: onCreateContent }] : undefined,
    };
    const lifecycleConfig = new CfnNotebookInstanceLifecycleConfig(
      this,
      `${lifecycleName}-lifecycle`,
      cfnLifecycleConfigProps,
    );
    new MdaaParamAndOutput(this, {
      naming: this.props.naming,
      resourceId: lifecycleName,
      resourceType: 'lifecycle-config',
      name: 'name',
      value: lifecycleConfig.getAtt('NotebookInstanceLifecycleConfigName').toString(),
    });
    return lifecycleConfig;
  }
}
