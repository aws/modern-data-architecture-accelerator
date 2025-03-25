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
import { NagSuppressions } from 'cdk-nag';

import { Construct } from 'constructs';

export type AuthMode = 'SSO' | 'IAM';

export interface DomainUserSettings {
  /**
   * The Jupyter server's app settings.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-jupyterserverappsettings
   */
  readonly jupyterServerAppSettings?: CfnDomain.JupyterServerAppSettingsProperty;
  /**
   * The kernel gateway app settings.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-kernelgatewayappsettings
   */
  readonly kernelGatewayAppSettings?: CfnDomain.KernelGatewayAppSettingsProperty;
  /**
   * A collection of settings that configure the `RSessionGateway` app.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-rsessionappsettings
   */
  readonly rSessionAppSettings?: CfnDomain.RSessionAppSettingsProperty;
  /**
   * A collection of settings that configure user interaction with the `RStudioServerPro` app.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-rstudioserverproappsettings
   */
  readonly rStudioServerProAppSettings?: CfnDomain.RStudioServerProAppSettingsProperty;
  /**
   * The security groups for the Amazon Virtual Private Cloud (VPC) that Studio uses for communication.
   *
   * Optional when the `CreateDomain.AppNetworkAccessType` parameter is set to `PublicInternetOnly` .
   *
   * Required when the `CreateDomain.AppNetworkAccessType` parameter is set to `VpcOnly` , unless specified as part of the `DefaultUserSettings` for the domain.
   *
   * Amazon SageMaker adds a security group to allow NFS traffic from SageMaker Studio. Therefore, the number of security groups that you can specify is one less than the maximum number shown.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-securitygroups
   */
  readonly securityGroups?: string[];
  /**
   * Specifies options for sharing SageMaker Studio notebooks.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sagemaker-domain-usersettings.html#cfn-sagemaker-domain-usersettings-sharingsettings
   */
  readonly sharingSettings?: CfnDomain.SharingSettingsProperty;

  readonly studioWebPortal?: 'ENABLED' | 'DISABLED';
}

export interface DomainProps {
  /**
   * Ids of roles which will be provided administrator access to Studio resources
   */
  readonly dataAdminRoles?: MdaaRoleRef[];
  /**
   * The AuthMode for the domain. Must be either 'SSO' or 'IAM'
   */
  readonly authMode: AuthMode;
  /**
   * The ID of the VPC to which all Studio user apps will be bound
   */
  readonly vpcId: string;
  /**
   * The IDs of the subnets to which all Studio user apps will be bound
   */
  readonly subnetIds: string[];
  /**
   * Default user settings for user apps.
   */
  readonly defaultUserSettings?: DomainUserSettings;
  /**
   * Id of an existing security group. If specified, will be used instead of creating
   * a security group
   */
  readonly securityGroupId?: string;
  /**
   * Security group ingress rules.
   */
  readonly securityGroupIngress?: MdaaSecurityGroupRuleProps;
  /**
   * Security group Egress rules.
   */
  readonly securityGroupEgress?: MdaaSecurityGroupRuleProps;

  /**
   * If defined, will be set as the default execution role for the domain.
   * If undefined, a default execution role will be created with minimal permissions required
   * to launch Studio Apps.
   */
  readonly defaultExecutionRole?: MdaaRoleRef;

  /**
   * If specified, this will be used as the domain bucket.
   * If not specified, a new bucket will be created.
   */
  readonly domainBucket?: DomainBucketProps;

  /**
   * If defined, will be set as the studio KMS Key (for EFS)
   */
  readonly kmsKeyArn?: string;
  /**
   * List of Studio user profiles which will be created. The key/name
   * of the user profile should be specified as follows:
   * If the Domain is in SSO mode, this should map to an SSO User ID.
   * If in IAM mode, this should map to Session Name portion of the aws:userid variable.
   */
  readonly userProfiles?: NamedUserProfileProps;
  /**
   * S3 Prefix where shared notebooks will be stored.
   * If not specified, defaults to "sharing/"
   */
  readonly notebookSharingPrefix?: string;
  /**
   * S3 Prefix where lifecycle assets will be stored.
   * If not specified, default to "lifecycle-assets/"
   */
  readonly assetPrefix?: string;
  /**
   * Lifecycle configs to be created and bound to domain applications
   */
  readonly lifecycleConfigs?: StudioLifecycleConfigProps;
  /**
   * Memory to be allocated to the Lifecycle asset deployment Lambda.
   * May need to be increased for very large asset deployments.
   */
  readonly assetDeploymentMemoryLimitMB?: number;
}

export interface StudioLifecycleConfigProps {
  /**
   * Lifecycle config scripts
   */
  readonly jupyter?: LifecycleScriptProps;
  /**
   * Lifecycle config scripts
   */
  readonly kernel?: LifecycleScriptProps;
}

export interface NamedUserProfileProps {
  /** @jsii ignore */
  [name: string]: UserProfileProps;
}

export interface UserProfileProps {
  /**
   * Required if the domain is in IAM AuthMode. This is the role
   * from which the user will launch the user profile in Studio.
   * The role's id will be combined with the userid
   * to grant the user access to launch the user profile.
   */
  readonly userRole?: MdaaRoleRef;
}

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

    const jupyterServerAppSettings = jupyterLifecycleConfig
      ? {
          defaultResourceSpec: {
            lifecycleConfigArn: jupyterLifecycleConfig.arn,
          },
          lifecycleConfigArns: [jupyterLifecycleConfig.arn],
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
      kernelGatewayAppSettings: kernelGatewayAppSettings,
    };
    // nosemgrep
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

    NagSuppressions.addResourceSuppressions(basicExecutionPolicy, [
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

    NagSuppressions.addResourceSuppressions(
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
