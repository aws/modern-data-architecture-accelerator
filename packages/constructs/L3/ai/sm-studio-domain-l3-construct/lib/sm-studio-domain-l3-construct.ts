/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { IMdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import {
  LifecycleConfigAppType,
  MdaaStudioDomain,
  MdaaStudioLifecycleConfig,
  MdaaStudioLifecycleConfigProps,
} from '@aws-mdaa/sagemaker-constructs';
import { AssetDeploymentProps, LifeCycleConfigHelper, LifecycleScriptProps } from '@aws-mdaa/sm-shared';
import { CfnTag } from 'aws-cdk-lib';
import { ISecurityGroup, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';

import { CfnDomain, CfnUserProfile } from 'aws-cdk-lib/aws-sagemaker';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR

import { Construct } from 'constructs';

export type AuthMode = 'SSO' | 'IAM';

/**
 * Q-ENHANCED-INTERFACE
 * DomainUserSettings interface.
 *
 * Use cases: Data mesh domain isolation; Multi-domain deployments; Domain-specific resource targeting; Cross-domain governance; Organizational data boundaries
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface DomainUserSettings {
  /**
   * The Jupyter server's app settings.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-jupyterserverappsettings
   */
  readonly jupyterServerAppSettings?: CfnDomain.JupyterServerAppSettingsProperty;
  /**
   * The JupyterLab app settings.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-jupyterlabappsettings
   */
  readonly jupyterLabAppSettings?: CfnDomain.JupyterLabAppSettingsProperty;
  /**
   * The kernel gateway app settings.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-kernelgatewayappsettings
   */
  readonly kernelGatewayAppSettings?: CfnDomain.KernelGatewayAppSettingsProperty;
  /**
   * A collection of settings that configure the `RSessionGateway` app.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-rsessionappsettings
   */
  readonly rSessionAppSettings?: CfnDomain.RSessionAppSettingsProperty;
  /**
   * A collection of settings that configure user interaction with the `RStudioServerPro` app.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-rstudioserverproappsettings
   */
  readonly rStudioServerProAppSettings?: CfnDomain.RStudioServerProAppSettingsProperty;
  /**
   * The security groups for the Amazon Virtual Private Cloud (VPC) that Studio uses for communication.
   * Optional when the `CreateDomain.AppNetworkAccessType` parameter is set to `PublicInternetOnly` .
   * Required when the `CreateDomain.AppNetworkAccessType` parameter is set to `VpcOnly` , unless specified as part of the `DefaultUserSettings` for the domain.
   * Amazon SageMaker adds a security group to allow NFS traffic from SageMaker Studio. Therefore, the number of security groups that you can specify is one less than the maximum number shown.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-securitygroups
   */
  readonly securityGroups?: string[];
  /**
   * Specifies options for sharing SageMaker Studio notebooks.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-sharingsettings
   */
  readonly sharingSettings?: CfnDomain.SharingSettingsProperty;
  readonly studioWebPortal?: 'ENABLED' | 'DISABLED';
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker Studio Domain configuration interface for ML development platform deployment with VPC networking, authentication, and user management. Defines Studio domain properties including authentication mode selection, VPC integration, user profile management, and administrative access control for collaborative ML development environments.
 *
 * Use cases: ML development platform; Collaborative data science; Studio domain deployment; VPC-isolated ML environments; Team-based ML development; Secure ML workspaces
 *
 * AWS: Amazon SageMaker Studio Domain with VPC networking, IAM/SSO authentication, and user profile management for collaborative ML development platform
 *
 * Validation: authMode must be 'SSO' or 'IAM'; vpcId must be valid VPC identifier; subnetIds must be valid subnet identifiers; dataAdminRoles must have appropriate SageMaker permissions
 */
export interface DomainProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM role references that will receive administrator access to SageMaker Studio domain resources enabling administrative control and management. Provides administrative privileges for domain management, user profile administration, and resource governance within the Studio environment.
   *
   * Use cases: Domain administration; User management; Resource governance; Administrative access control; Studio management
   *
   * AWS: IAM roles with SageMaker Studio domain administrator permissions for domain management and user administration
   *
   * Validation: Must be array of valid MdaaRoleRef if provided; roles must have appropriate SageMaker permissions; optional for domain administration
   **/
  readonly dataAdminRoles?: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required authentication mode for SageMaker Studio domain access controlling user authentication method and identity management. Determines whether users authenticate via AWS SSO (Single Sign-On) or IAM (Identity and Access Management) for Studio access and user management.
   *
   * Use cases: User authentication; Identity management; SSO integration; IAM-based access; Authentication method selection
   *
   * AWS: Amazon SageMaker Studio domain authentication mode for user access control and identity management
   *
   * Validation: Must be 'SSO' or 'IAM'; required for domain authentication configuration
   **/
  readonly authMode: AuthMode;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier where SageMaker Studio domain and user applications will be deployed enabling network isolation and security. Defines the Virtual Private Cloud that will host all Studio resources providing network-level security and isolation for ML development activities.
   *
   * Use cases: Network isolation; VPC deployment; Security boundaries; Private ML environments; Network-level security
   *
   * AWS: Amazon VPC identifier for SageMaker Studio domain deployment and network isolation
   *
   * Validation: Must be valid VPC identifier; required for VPC-based Studio deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet identifiers where SageMaker Studio user applications will be deployed enabling multi-AZ deployment and network distribution. Defines the specific subnets within the VPC that will host Studio user applications providing availability and network segmentation.
   *
   * Use cases: Multi-AZ deployment; Network segmentation; Availability distribution; Subnet-level isolation; Network architecture
   *
   * AWS: Amazon VPC subnet identifiers for SageMaker Studio user application deployment and network distribution
   *
   * Validation: Must be array of valid subnet identifiers; required for Studio application deployment; subnets must be in specified VPC
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional default user settings configuration for SageMaker Studio user applications enabling consistent user experience and application behavior. Defines default settings that will be applied to all user profiles including Jupyter server settings, kernel gateway configuration, and application preferences.
   *
   * Use cases: Consistent user experience; Default application settings; User profile standardization; Application configuration
   *
   * AWS: Amazon SageMaker Studio default user settings for consistent user application configuration
   *
   * Validation: Must be valid DomainUserSettings if provided; optional for default user configuration
   **/
  readonly defaultUserSettings?: DomainUserSettings;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing security group identifier for SageMaker Studio domain network security enabling custom network access control. Provides ability to use an existing security group instead of creating a new one for Studio domain network security and access control.
   *
   * Use cases: Custom security groups; Existing network security; Security group reuse; Network access control
   *
   * AWS: Amazon EC2 security group identifier for SageMaker Studio domain network security
   *
   * Validation: Must be valid security group identifier if provided; optional for custom security group usage
   **/
  readonly securityGroupId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group ingress rules configuration for SageMaker Studio domain inbound network access control. Defines inbound network traffic rules that will be applied to the Studio domain security group for controlled access to Studio resources.
   *
   * Use cases: Inbound access control; Network security rules; Traffic filtering; Access restriction
   *
   * AWS: Amazon EC2 security group ingress rules for SageMaker Studio domain inbound network access
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; optional for custom ingress rules
   **/
  readonly securityGroupIngress?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group egress rules configuration for SageMaker Studio domain outbound network access control. Defines outbound network traffic rules that will be applied to the Studio domain security group for controlled external access from Studio resources.
   *
   * Use cases: Outbound access control; Network security rules; External access control; Traffic filtering
   *
   * AWS: Amazon EC2 security group egress rules for SageMaker Studio domain outbound network access
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; optional for custom egress rules
   **/
  readonly securityGroupEgress?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional default execution role reference for SageMaker Studio domain providing IAM permissions for Studio applications and ML workloads. Defines the IAM role that will be used by default for all Studio applications when users don't specify a custom execution role.
   *
   * Use cases: Default IAM permissions; Studio application execution; ML workload permissions; Role standardization
   *
   * AWS: IAM role for Amazon SageMaker Studio default execution permissions and ML workload access
   *
   * Validation: Must be valid MdaaRoleRef if provided; role must have appropriate SageMaker permissions; optional for default execution role
   **/
  readonly defaultExecutionRole?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain bucket configuration for SageMaker Studio data storage and artifact management enabling custom S3 bucket usage. Provides ability to specify an existing S3 bucket for Studio domain storage or configure a new bucket with custom settings.
   *
   * Use cases: Custom S3 storage; Domain data management; Artifact storage; Bucket configuration
   *
   * AWS: Amazon S3 bucket configuration for SageMaker Studio domain data storage and artifact management
   *
   * Validation: Must be valid DomainBucketProps if provided; optional for custom bucket configuration
   **/
  readonly domainBucket?: DomainBucketProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for SageMaker Studio domain encryption enabling data encryption at rest for EFS storage. Provides customer-managed encryption key for Studio domain EFS file system encryption ensuring data security and compliance requirements.
   *
   * Use cases: Data encryption; EFS encryption; Security compliance; Customer-managed keys
   *
   * AWS: AWS KMS key ARN for Amazon SageMaker Studio domain EFS encryption and data security
   *
   * Validation: Must be valid KMS key ARN if provided; optional for custom encryption key
   **/
  readonly kmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional named user profiles configuration for SageMaker Studio domain user management enabling individual user access and customization. Defines specific user profiles that will be created in the domain with user-specific settings and permissions based on authentication mode.
   *
   * Use cases: User management; Individual user access; User-specific settings; Profile customization
   *
   * AWS: Amazon SageMaker Studio user profiles for individual user access and domain user management
   *
   * Validation: Must be valid NamedUserProfileProps if provided; user names must match SSO User ID (SSO mode) or Session Name (IAM mode); optional for user profile creation
   **/
  readonly userProfiles?: NamedUserProfileProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 prefix for shared notebook storage location enabling organized notebook sharing and collaboration. Defines the S3 prefix where shared notebooks will be stored within the domain bucket for team collaboration and notebook sharing.
   *
   * Use cases: Notebook sharing; Team collaboration; Organized storage; Shared resources
   *
   * AWS: Amazon S3 prefix for SageMaker Studio shared notebook storage and collaboration
   *
   * Validation: Must be valid S3 prefix string if provided; defaults to "sharing/" if not specified; optional for custom sharing location
   **/
  readonly notebookSharingPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 prefix for lifecycle asset storage location enabling organized lifecycle configuration management. Defines the S3 prefix where lifecycle configuration assets will be stored within the domain bucket for lifecycle script and configuration management.
   *
   * Use cases: Lifecycle asset management; Configuration storage; Organized assets; Script management
   *
   * AWS: Amazon S3 prefix for SageMaker Studio lifecycle asset storage and configuration management
   *
   * Validation: Must be valid S3 prefix string if provided; defaults to "lifecycle-assets/" if not specified; optional for custom asset location
   **/
  readonly assetPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle configurations for SageMaker Studio domain applications enabling custom startup and shutdown scripts. Defines lifecycle configuration scripts that will be executed during Studio application startup and shutdown for environment customization and resource management.
   *
   * Use cases: Environment customization; Startup scripts; Shutdown procedures; Application lifecycle management
   *
   * AWS: Amazon SageMaker Studio lifecycle configurations for application startup and shutdown script management
   *
   * Validation: Must be valid StudioLifecycleConfigProps if provided; optional for lifecycle configuration management
   **/
  readonly lifecycleConfigs?: StudioLifecycleConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional memory allocation in MB for lifecycle asset deployment Lambda function enabling resource optimization for asset deployment operations. Defines the memory limit for the Lambda function that deploys lifecycle assets to S3 for Studio domain configuration.
   *
   * Use cases: Resource optimization; Lambda performance; Asset deployment; Memory allocation
   *
   * AWS: AWS Lambda memory allocation for SageMaker Studio lifecycle asset deployment function
   *
   * Validation: Must be valid memory size in MB if provided; may need increase for large asset deployments; optional for Lambda resource configuration
   **/
  readonly assetDeploymentMemoryLimitMB?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker Studio lifecycle configuration interface for domain-level environment setup with JupyterServer, JupyterLab, and KernelGateway script management. Defines lifecycle scripts that execute during Studio app startup, enabling custom environment configuration, package installation, and standardized development environment setup across all domain users.
 *
 * Use cases: Studio environment standardization; Custom package installation; Development environment setup; Domain-wide configuration; ML environment preparation; Team environment consistency
 *
 * AWS: SageMaker Studio Domain lifecycle configuration with JupyterServer, JupyterLab, and KernelGateway script execution for standardized ML development environments
 *
 * Validation: jupyterServerAppSettings, jupyterLabAppSettings, and kernelGatewayAppSettings must be valid lifecycle script configurations; scripts must be executable in Studio environment
 */
export interface StudioLifecycleConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional JupyterServer lifecycle script configuration for Studio domain-wide Jupyter environment setup enabling custom package installation and environment standardization. Defines scripts that execute when JupyterServer applications start, providing consistent development environment setup across all domain users. Used by Studio Classic.
   *
   * Use cases: Jupyter environment setup; Custom package installation; Development environment standardization; Domain-wide Jupyter configuration; ML library installation; Studio Classic support
   *
   * AWS: SageMaker Studio JupyterServer lifecycle configuration for domain-wide Jupyter environment setup and standardization
   *
   * Validation: Must be valid LifecycleScriptProps if provided; scripts must be executable in Studio JupyterServer environment; optional for Jupyter configuration
   **/
  readonly jupyter?: LifecycleScriptProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional JupyterLab lifecycle script configuration for Studio domain-wide JupyterLab environment setup enabling custom package installation and environment standardization. Defines scripts that execute when JupyterLab applications start, providing consistent development environment setup across all domain users. Used by Studio (Latest).
   *
   * Use cases: JupyterLab environment setup; Custom package installation; Development environment standardization; Domain-wide JupyterLab configuration; ML library installation; Studio Latest support
   *
   * AWS: SageMaker Studio JupyterLab lifecycle configuration for domain-wide JupyterLab environment setup and standardization
   *
   * Validation: Must be valid LifecycleScriptProps if provided; scripts must be executable in Studio JupyterLab environment; optional for JupyterLab configuration
   **/
  readonly jupyterLab?: LifecycleScriptProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KernelGateway lifecycle script configuration for Studio domain-wide kernel environment setup enabling custom kernel configuration and package management. Defines scripts that execute when KernelGateway applications start, providing consistent kernel environment setup and ML library availability across all domain users.
   *
   * Use cases: Kernel environment setup; ML library installation; Kernel configuration; Domain-wide kernel standardization; Custom kernel packages
   *
   * AWS: SageMaker Studio KernelGateway lifecycle configuration for domain-wide kernel environment setup and standardization
   *
   * Validation: Must be valid LifecycleScriptProps if provided; scripts must be executable in Studio KernelGateway environment; optional for kernel configuration
   **/
  readonly kernel?: LifecycleScriptProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named user profile configuration interface for SageMaker Studio with systematic user profile organization and management capabilities. Defines named user profile mappings for organized ML development environments including profile sets and systematic user administration within Studio domains.
 *
 * Use cases: Named user profile sets; User profile organization; Systematic user administration; Multi-user ML environments
 *
 * AWS: Amazon SageMaker Studio named user profile configuration with systematic organization and management
 *
 * Validation: String keys must be unique user profile names; values must be valid UserProfileProps configurations
 */
export interface NamedUserProfileProps {
  /** @jsii ignore */
  [name: string]: UserProfileProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker Studio user profile configuration interface for individual user workspace deployment with execution role and app settings management. Defines user-specific properties including IAM execution roles, JupyterServer settings, and KernelGateway configuration for personalized ML development environments within Studio domains.
 *
 * Use cases: Individual user workspaces; Personalized ML environments; User-specific configurations; IAM-based user management; Custom user settings; ML developer profiles
 *
 * AWS: SageMaker Studio user profiles with IAM execution roles and personalized app settings for individual ML development workspaces
 *
 * Validation: executionRole must be valid IAM role ARN with SageMaker permissions when domain is in IAM mode; app settings must be valid Studio configuration
 */
export interface UserProfileProps {
  /**
   * Required if the domain is in IAM AuthMode. This is the role
   * from which the user will launch the user profile in Studio.
   * The role's id will be combined with the userid
   * to grant the user access to launch the user profile.
   */
  readonly userRole?: MdaaRoleRef;
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker Studio Domain bucket configuration interface for shared notebook storage and lifecycle asset management with S3 integration. Defines domain-specific bucket properties for notebook sharing, lifecycle asset deployment, and collaborative ML development with IAM role-based access control for secure asset management.
 *
 * Use cases: Shared notebook storage; Lifecycle asset management; Domain-specific S3 buckets; Collaborative ML development; Asset deployment automation; Secure notebook sharing
 *
 * AWS: S3 bucket configuration with IAM roles for SageMaker Studio Domain shared storage and lifecycle asset deployment
 *
 * Validation: domainBucketName must be valid S3 bucket name; assetDeploymentRole must have S3 write permissions and be assumable by Lambda; role must have access to specified bucket prefix
 */
export interface DomainBucketProps {
  /**
   * If specified, will be used as the bucket for the domain,
   * where notebooks will be shared, and lifecycle assets will be uploaded.
   * Otherwise a new bucket will be created.
   */
  readonly domainBucketName: string;
  /**
   * If defined, this role will be used to deploy lifecycle assets.
   * Should be assumable by lambda, and have write access
   * to the domain bucket under the assetPrefix.
   * Must be specified if an existing domainBucketName is also specified.
   * Otherwise, a new role will be created with access to the generated
   * domain bucket.
   */
  readonly assetDeploymentRole: MdaaRoleRef;
}
export interface SagemakerStudioDomainL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SageMaker Studio domain configuration defining ML development environment setup including authentication, networking, and user management. Provides complete domain configuration with VPC security, user profiles, lifecycle configurations, and administrative access for ML development workflows.
   *
   * Use cases: ML development environment; Domain configuration; User management; Development platform setup
   *
   * AWS: SageMaker Studio domain configuration for ML development platform and user environment management
   *
   * Validation: Must be valid DomainProps; required for SageMaker Studio domain deployment and ML environment setup
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearch.DomainProps.html
   **/
  readonly domain: DomainProps;
}

//This stack creates and manages a SageMaker Studio Domain
export class SagemakerStudioDomainL3Construct extends MdaaL3Construct {
  protected readonly props: SagemakerStudioDomainL3ConstructProps;

  public readonly kmsKey: IKey;
  public readonly securityGroup: ISecurityGroup;
  public readonly domain: MdaaStudioDomain;

  constructor(scope: Construct, id: string, props: SagemakerStudioDomainL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const resolvableDefaultExecutionRole = props.domain.defaultExecutionRole
      ? this.props.roleHelper.resolveRoleRefWithRefId(props.domain.defaultExecutionRole, 'ex-role')
      : undefined;

    const defaultExecutionRole = resolvableDefaultExecutionRole
      ? MdaaRole.fromRoleArn(this, 'ex-role', resolvableDefaultExecutionRole.arn())
      : this.createDefaultExecutionRole();

    const resolvableDeploymentRole = props.domain.domainBucket
      ? this.props.roleHelper.resolveRoleRefWithRefId(
          props.domain.domainBucket.assetDeploymentRole,
          `asset-deployment-role`,
        )
      : undefined;

    const assetDeploymentRole = resolvableDeploymentRole
      ? MdaaRole.fromRoleArn(this, `asset-deployment-role`, resolvableDeploymentRole.arn())
      : this.createAssetDeploymentRole();

    this.kmsKey = props.domain.kmsKeyArn
      ? Key.fromKeyArn(this, 'kmsKey', props.domain.kmsKeyArn)
      : this.createDomainEfsKmsKey(defaultExecutionRole, assetDeploymentRole);

    const notebookSharingPrefix = props.domain.notebookSharingPrefix || 'sharing/';
    const assetPrefix = props.domain.assetPrefix || 'lifecycle-assets';

    const domainBucket: IBucket = props.domain.domainBucket
      ? Bucket.fromBucketName(this, 'existing-domain-bucket', props.domain.domainBucket.domainBucketName)
      : this.createDomainBucket(
          this.kmsKey,
          defaultExecutionRole,
          notebookSharingPrefix,
          assetPrefix,
          assetDeploymentRole,
        );

    this.securityGroup = props.domain.securityGroupId
      ? SecurityGroup.fromSecurityGroupId(this, `domain-sg`, props.domain.securityGroupId)
      : this.createDomainSecurityGroup(
          this.props.domain.vpcId,
          this.props.domain.subnetIds,
          this.props.domain.securityGroupIngress,
          this.props.domain.securityGroupEgress,
        );

    this.domain = this.createDomain(
      defaultExecutionRole,
      this.securityGroup,
      this.kmsKey,
      domainBucket,
      assetPrefix,
      assetDeploymentRole,
      props.domain.assetDeploymentMemoryLimitMB,
    );
    this.createBasicExecutionPolicy(this.domain.attrDomainId, defaultExecutionRole, this.kmsKey);
    this.createSageMakerStudioUserProfiles(
      defaultExecutionRole,
      this.kmsKey,
      domainBucket,
      this.domain.attrDomainId,
      notebookSharingPrefix,
    );
  }

  private createAssetDeploymentRole(): IRole {
    return new MdaaLambdaRole(this.scope, `asset-deployment-role`, {
      roleName: 'deployment',
      naming: this.props.naming,
      logGroupNames: [`*CustomCDK*`],
    });
  }

  private createStudioLifecycleConfig(
    lifecycleConfig: LifecycleScriptProps,
    lifecycleType: LifecycleConfigAppType,
    domainBucket: IBucket,
    assetPrefix: string,
    assetDeploymentRole: IRole,
    assetDeploymentMemoryLimitMB?: number,
  ): MdaaStudioLifecycleConfig {
    const assetDeployment: AssetDeploymentProps = {
      scope: this,
      assetBucket: domainBucket,
      assetPrefix: assetPrefix,
      assetDeploymentRole: assetDeploymentRole,
      memoryLimitMB: assetDeploymentMemoryLimitMB,
    };

    const studioLifecycleConfigProps: MdaaStudioLifecycleConfigProps = {
      lifecycleConfigName: lifecycleType,
      lifecycleConfigContent: LifeCycleConfigHelper.createLifecycleConfigContents(
        lifecycleConfig,
        lifecycleType,
        assetDeployment,
      ),
      lifecycleConfigAppType: lifecycleType,
      naming: this.props.naming,
    };
    return new MdaaStudioLifecycleConfig(this, `lifecycle-config-${lifecycleType}`, studioLifecycleConfigProps);
  }

  private createDomain(
    defaultExecutionRole: IRole,
    securityGroup: ISecurityGroup,
    kmsKey: IKey,
    domainBucket: IBucket,
    assetPrefix: string,
    assetDeploymentRole: IRole,
    assetDeploymentMemoryLimitMB?: number,
  ): MdaaStudioDomain {
    const jupyterLifecycleConfig = this.props.domain.lifecycleConfigs?.jupyter
      ? this.createStudioLifecycleConfig(
          this.props.domain.lifecycleConfigs.jupyter,
          'JupyterServer',
          domainBucket,
          assetPrefix,
          assetDeploymentRole,
          assetDeploymentMemoryLimitMB,
        )
      : undefined;

    const jupyterLabLifecycleConfig = this.props.domain.lifecycleConfigs?.jupyterLab
      ? this.createStudioLifecycleConfig(
          this.props.domain.lifecycleConfigs.jupyterLab,
          'JupyterLab',
          domainBucket,
          assetPrefix,
          assetDeploymentRole,
          assetDeploymentMemoryLimitMB,
        )
      : undefined;

    const kernelLifecycleConfig = this.props.domain.lifecycleConfigs?.kernel
      ? this.createStudioLifecycleConfig(
          this.props.domain.lifecycleConfigs.kernel,
          'KernelGateway',
          domainBucket,
          assetPrefix,
          assetDeploymentRole,
          assetDeploymentMemoryLimitMB,
        )
      : undefined;

    if (jupyterLifecycleConfig && kernelLifecycleConfig) {
      kernelLifecycleConfig.node.addDependency(jupyterLifecycleConfig);
    }
    if (jupyterLabLifecycleConfig && kernelLifecycleConfig) {
      kernelLifecycleConfig.node.addDependency(jupyterLabLifecycleConfig);
    }
    if (jupyterLifecycleConfig && jupyterLabLifecycleConfig) {
      jupyterLabLifecycleConfig.node.addDependency(jupyterLifecycleConfig);
    }

    const jupyterServerAppSettings = jupyterLifecycleConfig
      ? {
          defaultResourceSpec: {
            lifecycleConfigArn: jupyterLifecycleConfig.arn,
          },
          lifecycleConfigArns: [jupyterLifecycleConfig.arn],
        }
      : undefined;

    const jupyterLabAppSettings = jupyterLabLifecycleConfig
      ? {
          defaultResourceSpec: {
            lifecycleConfigArn: jupyterLabLifecycleConfig.arn,
          },
          lifecycleConfigArns: [jupyterLabLifecycleConfig.arn],
        }
      : undefined;

    const kernelGatewayAppSettings = kernelLifecycleConfig
      ? {
          defaultResourceSpec: {
            lifecycleConfigArn: kernelLifecycleConfig.arn,
          },
          lifecycleConfigArns: [kernelLifecycleConfig.arn],
        }
      : undefined;

    const defaultUserSettingsWithLifecycle: CfnDomain.UserSettingsProperty = {
      executionRole: defaultExecutionRole.roleArn,
      jupyterServerAppSettings: jupyterServerAppSettings,
      jupyterLabAppSettings: jupyterLabAppSettings,
      kernelGatewayAppSettings: kernelGatewayAppSettings,
    };
    // nosemgrep
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const _ = require('lodash');
    function customizer(objValue: unknown[], srcValue: unknown): void | unknown[] {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }

    const defaultUserSettings: CfnDomain.UserSettingsProperty = _.mergeWith(
      this.props.domain.defaultUserSettings,
      defaultUserSettingsWithLifecycle,
      customizer,
    );

    const domainProps = {
      authMode: this.props.domain.authMode,
      vpcId: this.props.domain.vpcId,
      subnetIds: this.props.domain.subnetIds,
      kmsKeyId: kmsKey.keyId,
      defaultUserSettings: defaultUserSettings,
      naming: this.props.naming,
      securityGroupId: securityGroup.securityGroupId,
      executionRole: defaultExecutionRole,
    };

    const domain = new MdaaStudioDomain(this, 'domain', domainProps);
    if (jupyterLifecycleConfig) domain.node.addDependency(jupyterLifecycleConfig);
    if (jupyterLabLifecycleConfig) domain.node.addDependency(jupyterLabLifecycleConfig);
    if (kernelLifecycleConfig) domain.node.addDependency(kernelLifecycleConfig);
    return domain;
  }

  private createDefaultExecutionRole(): Role {
    // Create a default ExecutionRole. This role will be used by users logging into SageMaker Studio
    // in order to initialize their basic environment. This role has no access to data.
    const defaultExecutionRole = new MdaaRole(this, 'default-execution-role', {
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
      roleName: 'default-execution-role',
      naming: this.props.naming,
    });
    defaultExecutionRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:SetSourceIdentity'],
        principals: [new ServicePrincipal('sagemaker.amazonaws.com')],
        effect: Effect.ALLOW,
      }),
    );
    return defaultExecutionRole;
  }

  private createBasicExecutionPolicy(domainId: string, executionRole: IRole, kmsKey: IKey): IMdaaManagedPolicy {
    const basicExecutionPolicy = new ManagedPolicy(this, 'basic-execution-policy', {
      managedPolicyName: this.props.naming.resourceName('basic-execution'),
      roles: [executionRole],
    });

    const kmsUsageStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [kmsKey.keyArn],
      actions: [
        ...DECRYPT_ACTIONS,
        ...ENCRYPT_ACTIONS,
        'kms:GenerateDataKeyWithoutPlaintext',
        'kms:CreateGrant',
        'kms:DescribeKey',
        'kms:ListAliases',
      ],
    });
    basicExecutionPolicy.addStatements(kmsUsageStatement);

    //Allow ExecutionRole creation of SageMaker Studio apps and spaces
    const studioAppStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:app/${domainId}/*`,
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:space/${domainId}/*`,
      ],
      actions: [
        'sagemaker:CreateApp',
        'sagemaker:DeleteApp',
        'sagemaker:DescribeApp',
        'sagemaker:CreateSpace',
        'sagemaker:UpdateSpace',
        'sagemaker:DeleteSpace',
        'sagemaker:DescribeSpace',
      ],
    });
    basicExecutionPolicy.addStatements(studioAppStatement);

    //Allow ExecutionRole to Describe the SageMaker Domain
    const studioDescribeDomainStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:domain/${domainId}`],
      actions: ['sagemaker:DescribeDomain'],
    });
    basicExecutionPolicy.addStatements(studioDescribeDomainStatement);

    //Allow ExecutionRole list SageMaker Studio Lifecycle Configs
    const studioLifecycleListStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`*`],
      actions: ['sagemaker:ListStudioLifecycleConfigs'],
    });
    basicExecutionPolicy.addStatements(studioLifecycleListStatement);

    //Allow ExecutionRole describe SageMaker Studio Lifecycle Configs
    const studioLifecycleDescStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:studio-lifecycle-config/*`],
      actions: ['sagemaker:DescribeStudioLifecycleConfig'],
    });
    basicExecutionPolicy.addStatements(studioLifecycleDescStatement);

    //Allow ExecutionRole to describe SageMaker images and image versions
    const sagemakerImageStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:image/*`,
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:image-version/*/*`,
      ],
      actions: ['sagemaker:DescribeImage', 'sagemaker:DescribeImageVersion'],
    });
    basicExecutionPolicy.addStatements(sagemakerImageStatement);

    //Allow ExecutionRole to write studio cloudwatch logs
    const studioCloudwatchGroupStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams'],
      resources: [`arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/sagemaker/studio`],
    });
    basicExecutionPolicy.addStatements(studioCloudwatchGroupStatement);

    //Allow ExecutionRole to write studio cloudwatch logs
    const studioCloudwatchStreamStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [
        `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/sagemaker/studio:log-stream:*`,
      ],
    });
    basicExecutionPolicy.addStatements(studioCloudwatchStreamStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(basicExecutionPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'User Profile and App names not known at deployment time. ListStudioLifecycleConfigs does not take resource. LogStream names not know at deployment time.',
      },
    ]);

    return basicExecutionPolicy;
  }
  private createDomainEfsKmsKey(executionRole: IRole, deploymentRole: IRole): IKey {
    const efsKmsKey = new MdaaKmsKey(this, 'efs-key', {
      alias: 'efs',
      naming: this.props.naming,
    });
    const keyUsageStatement = new PolicyStatement({
      actions: [...ENCRYPT_ACTIONS, ...DECRYPT_ACTIONS],
      principals: [executionRole, deploymentRole],
      effect: Effect.ALLOW,
    });
    efsKmsKey.addToResourcePolicy(keyUsageStatement);
    return efsKmsKey;
  }

  private createDomainSecurityGroup(
    vpcId: string,
    subnetIds: string[],
    securityGroupIngress?: MdaaSecurityGroupRuleProps,
    securityGroupEgress?: MdaaSecurityGroupRuleProps,
  ): SecurityGroup {
    // Import vpc
    const vpc = Vpc.fromVpcAttributes(this.scope, `vpc`, {
      vpcId: vpcId,
      availabilityZones: ['dummy'],
      privateSubnetIds: subnetIds,
    });

    const customEgress: boolean =
      (securityGroupEgress?.ipv4 && securityGroupEgress?.ipv4.length > 0) ||
      (securityGroupEgress?.prefixList && securityGroupEgress?.prefixList.length > 0) ||
      (securityGroupEgress?.sg && securityGroupEgress?.sg.length > 0) ||
      false;

    const securityGroupProps: MdaaSecurityGroupProps = {
      securityGroupName: this.props.naming.resourceName(),
      vpc: vpc,
      allowAllOutbound: !customEgress,
      naming: this.props.naming,
      ingressRules: securityGroupIngress,
      egressRules: securityGroupEgress,
      addSelfReferenceRule: true, // Required for intercontainer traffic and EFS
    };

    // Create security group
    return new MdaaSecurityGroup(this.scope, `security-group`, securityGroupProps);
  }

  private createSageMakerStudioUserProfiles(
    executionRole: IRole,
    kmsKey: IKey,
    domainBucket: IBucket,
    studioDomainId: string,
    notebookSharingPrefix: string,
  ) {
    Object.entries(this.props.domain.userProfiles || {}).forEach(userProfileEntry => {
      const userid = userProfileEntry[0];
      const userProfileProps = userProfileEntry[1];

      const profileTags: CfnTag[] = [];

      if (this.props.domain.authMode == 'IAM') {
        if (!userProfileProps.userRole) {
          throw new Error("'userRole' must be defined on user profile when domain is in IAM authMode");
        } else {
          const resolvedRole = this.props.roleHelper.resolveRoleRefWithRefId(userProfileProps.userRole, userid);
          const tag = {
            key: 'userid',
            value: `${resolvedRole.id()}:${userid}`,
          };
          profileTags.push(tag);
        }
      }

      new CfnUserProfile(this, `user-profile-${userid}`, {
        domainId: studioDomainId,
        userProfileName: userid.replace(/\W/g, '-'),
        singleSignOnUserValue: this.props.domain.authMode == 'SSO' ? userid : undefined,
        singleSignOnUserIdentifier: this.props.domain.authMode == 'SSO' ? 'UserName' : undefined,
        userSettings: {
          executionRole: executionRole.roleArn,
          sharingSettings: {
            notebookOutputOption: 'Allowed',
            s3KmsKeyId: kmsKey.keyId,
            s3OutputPath: domainBucket.s3UrlForObject(notebookSharingPrefix),
          },
        },
        tags: profileTags,
      });
    });
  }
  private createDomainBucket(
    domainKmsKey: IMdaaKmsKey,
    defaultExecutionRole: IRole,
    notebookSharingPrefix: string,
    assetPrefix: string,
    assetDeploymentRole: IRole,
  ): MdaaBucket {
    if (!this.props.domain.dataAdminRoles) {
      throw new Error('dataAdminRoles must be defined if creating a Notebook Sharing Bucket');
    }
    const dataAdminRoleIds = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.domain.dataAdminRoles, 'DataAdmin')
      .map(x => x.id());

    const domainBucket = new MdaaBucket(this.scope, `Bucketsharing`, {
      encryptionKey: domainKmsKey,
      naming: this.props.naming,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      domainBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
      ],
      true,
    );

    //Allow data admins to manage the bucket
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: domainBucket,
      s3Prefix: '/',
      readWriteSuperRoleIds: dataAdminRoleIds,
    });
    rootPolicy.statements().forEach(statement => domainBucket.addToResourcePolicy(statement));

    //Allow athena users to use the bucket
    const notebooksPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: domainBucket,
      s3Prefix: notebookSharingPrefix,
      readWritePrincipals: [defaultExecutionRole],
    });
    notebooksPolicy.statements().forEach(statement => domainBucket.addToResourcePolicy(statement));

    //Allow athena users to use the bucket
    const assetsPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: domainBucket,
      s3Prefix: assetPrefix,
      readWritePrincipals: [assetDeploymentRole],
      readPrincipals: [defaultExecutionRole],
    });
    assetsPolicy.statements().forEach(statement => domainBucket.addToResourcePolicy(statement));

    //Default Deny Policy
    //Any role not specified in config is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: domainBucket,
      roleExcludeIds: [...dataAdminRoleIds],
      principalExcludes: [defaultExecutionRole.roleArn, assetDeploymentRole.roleArn],
    });
    domainBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    domainBucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);

    const allowBucketListingStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [assetDeploymentRole, defaultExecutionRole],
      actions: ['s3:List*', 's3:GetBucket*'],
      resources: [domainBucket.bucketArn],
    });
    domainBucket.addToResourcePolicy(allowBucketListingStatement);
    return domainBucket;
  }
}
