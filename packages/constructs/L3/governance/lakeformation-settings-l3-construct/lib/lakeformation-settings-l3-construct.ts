/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { DefaultStackSynthesizer, Duration, Stack } from 'aws-cdk-lib';
import { Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface LakeFormationSettingsL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional cross-account sharing version specification for LakeFormation cross-account data sharing enabling multi-account data governance and collaboration. When not specified, defaults to latest version for cross-account sharing capabilities and data collaboration features.
   *
   * Use cases: Cross-account sharing; Multi-account governance; Data collaboration; Version control
   *
   * AWS: LakeFormation cross-account sharing version for multi-account data governance and collaboration
   *
   * Validation: Must be valid version string if provided; defaults to latest for cross-account sharing capabilities
   **/
  readonly crossAccountVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling automatic IAMAllowedPrincipal grants for new databases and tables enabling simplified access management and backward compatibility. When enabled, automatically adds IAMAllowedPrincipal grants to new databases and tables for simplified IAM-based access control.
   *
   * Use cases: Simplified access management; Backward compatibility; Automatic grants; IAM integration
   *
   * AWS: LakeFormation IAMAllowedPrincipal automatic grants for simplified access management and IAM integration
   *
   * Validation: Boolean value if provided; defaults to false; enables automatic IAM principal grants for new resources
   **/
  readonly iamAllowedPrincipalsDefault?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling CDK execution role LakeFormation admin privileges enabling automated deployment and administrative access. When enabled, automatically adds the CDK execution role as a LakeFormation administrator for deployment automation and administrative operations.
   *
   * Use cases: Deployment automation; Administrative access; CDK integration; Automated administration
   *
   * AWS: CDK execution role LakeFormation admin privileges for deployment automation and administrative access
   *
   * Validation: Boolean value if provided; defaults to false; enables CDK role as LakeFormation administrator
   **/
  readonly createCdkLFAdmin?: boolean;
  readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM Identity Center configuration for LakeFormation integration enabling centralized identity management and SSO capabilities. When provided, configures LakeFormation integration with IAM Identity Center for centralized user management and federated access control.
   *
   * Use cases: Centralized identity management; SSO integration; Federated access; Identity Center integration
   *
   * AWS: IAM Identity Center integration for LakeFormation centralized identity management and SSO
   *
   * Validation: Must be valid IdentityCenterConfig if provided; enables Identity Center integration and centralized identity management
   **/
  readonly iamIdentityCenter?: IdentityCenterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling DataZone admin role creation for LakeFormation integration enabling DataZone-managed permissions and automated governance. When enabled, creates dedicated role for DataZone to manage LakeFormation permissions within the account for integrated data governance.
   *
   * Use cases: DataZone integration; Automated governance; Permission management; Integrated data governance
   *
   * AWS: DataZone admin role for LakeFormation permission management and integrated data governance
   *
   * Validation: Boolean value if provided; enables DataZone admin role creation for integrated governance capabilities
   **/
  readonly createDataZoneAdminRole?: boolean;

  readonly dataZoneAdminTrustAccounts?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * IdentityCenterConfig configuration interface for resource configuration and infrastructure management.
 * Use cases: Data lake security; Access control; Fine-grained permissions; Data governance
 * AWS: AWS service configuration and deployment
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface IdentityCenterConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS IAM Identity Center instance identifier for LakeFormation integration enabling centralized identity management and federated access control. Defines the Identity Center instance that will be used for user and group management in LakeFormation data lake access control scenarios.
   *
   * Use cases: Centralized identity management; Federated access control; Identity Center integration; User management; Group-based permissions
   *
   * AWS: AWS IAM Identity Center instance ID for LakeFormation federated access control and centralized identity management
   *
   * Validation: Must be valid Identity Center instance identifier; required for Identity Center integration
   **/
  readonly instanceId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of resource share identifiers for cross-account LakeFormation data sharing enabling multi-account data lake access. Defines AWS Resource Access Manager (RAM) shares that will be associated with the Identity Center configuration for cross-account data lake resource sharing.
   *
   * Use cases: Cross-account data sharing; Multi-account data lakes; Resource sharing; Federated data access; Account-level data governance
   *
   * AWS: AWS Resource Access Manager share identifiers for cross-account LakeFormation data sharing with Identity Center integration
   *
   * Validation: Must be array of valid RAM share identifiers if provided; optional for cross-account sharing
   **/
  readonly shares?: string[];
}

export class LakeFormationSettingsL3Construct extends MdaaL3Construct {
  public static readonly DZ_MANAGE_ACCESS_ROLE_SSM_PATH = '/lakeformation-settings/datazone-manage-access-role-arn';
  protected readonly props: LakeFormationSettingsL3ConstructProps;
  static readonly LATEST_CROSS_ACCOUNT_VERSION = '4';

  constructor(scope: Construct, id: string, props: LakeFormationSettingsL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    const boto3Layer = new MdaaBoto3LayerVersion(this, 'boto3-layer', { naming: this.props.naming });
    this.createLFSettings(boto3Layer);
    this.createIdcConfig(boto3Layer);
  }

  private createIdcConfig(boto3Layer: MdaaBoto3LayerVersion) {
    if (!this.props.iamIdentityCenter) {
      return;
    }
    const manageIdcConfigsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`*`],
      actions: [
        'lakeformation:CreateLakeFormationIdentityCenterConfiguration',
        'lakeformation:UpdateLakeFormationIdentityCenterConfiguration',
        'lakeformation:DeleteLakeFormationIdentityCenterConfiguration',
      ],
    });

    const idcInstanceArn = `arn:${this.partition}:sso:::instance/${this.props.iamIdentityCenter.instanceId}`;

    const manageSsoAppPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        idcInstanceArn,
        `arn:${this.partition}:sso::${this.account}:application/${this.props.iamIdentityCenter.instanceId}/*`,
        'arn:aws:sso::aws:applicationProvider/*',
      ],
      actions: [
        'sso:PutApplicationAssignmentConfiguration',
        'sso:CreateApplication',
        'sso:DeleteApplication',
        'sso:PutApplicationAuthenticationMethod',
        'sso:PutApplicationGrant',
        'sso:DeleteApplicationAuthenticationMethod',
        'sso:DeleteApplicationGrant',
        'sso:DescribeApplication',
      ],
    });

    const manageRAMPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ram:${this.region}:${this.account}:resource-share/*`],
      actions: [
        'ram:CreateResourceShare',
        'ram:DeleteResourceShare',
        'ram:AssociateResourceShare',
        'ram:DisassociateResourceShare',
      ],
    });

    const shareRecipients = this.props.iamIdentityCenter.shares?.map(x => {
      return {
        DataLakePrincipalIdentifier: x,
      };
    });

    const idConfigCrProps: MdaaCustomResourceProps = {
      resourceType: 'lakeformation-idc-configs',
      code: Code.fromAsset(`${__dirname}/../src/python/lakeformation_idc_configs`),
      handler: 'lakeformation_idc_configs.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      handlerTimeout: Duration.seconds(120),
      handlerRolePolicyStatements: [
        manageIdcConfigsPolicyStatement,
        manageSsoAppPolicyStatement,
        manageRAMPolicyStatement,
      ],
      handlerPolicySuppressions: [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource. Inline policy specific to custom resource.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'SSO App name not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions',
        },
      ],
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      handlerLayers: [boto3Layer],
      handlerProps: {
        instanceArn: idcInstanceArn,
        shareRecipients: shareRecipients,
      },
    };
    new MdaaCustomResource(this.scope, `lf-idc-config`, idConfigCrProps);
  }

  private createLFSettings(boto3Layer: MdaaBoto3LayerVersion) {
    const defaultPermissions =
      this.props.iamAllowedPrincipalsDefault != undefined && this.props.iamAllowedPrincipalsDefault.valueOf()
        ? {
            Principal: {
              DataLakePrincipalIdentifier: 'IAM_ALLOWED_PRINCIPALS',
            },
            Permissions: ['ALL'],
          }
        : undefined;

    const dataLakeAdmins = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.lakeFormationAdminRoleRefs, 'Admin')
      .map(x => {
        return { DataLakePrincipalIdentifier: x.arn() };
      });

    const synthesizer = Stack.of(this).synthesizer as DefaultStackSynthesizer;

    const cdkLfAdmin = this.props.createCdkLFAdmin
      ? {
          // The CDK cloudformation execution role.
          DataLakePrincipalIdentifier: synthesizer.cloudFormationExecutionRoleArn.replace(
            '${AWS::Partition}',
            this.partition,
          ),
        }
      : undefined;

    const dzLfAdmin = this.props.createDataZoneAdminRole
      ? {
          // The CDK cloudformation execution role.
          DataLakePrincipalIdentifier: this.createDatazoneManageAccessRole().roleArn,
        }
      : undefined;

    const admins = [...dataLakeAdmins, cdkLfAdmin!, dzLfAdmin!];

    const manageSettingsPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`*`],
      actions: ['lakeformation:PutDataLakeSettings', 'lakeformation:GetDataLakeSettings'],
    });

    const settingsCrProps: MdaaCustomResourceProps = {
      resourceType: 'lakeformation-settings',
      code: Code.fromAsset(`${__dirname}/../src/python/lakeformation_settings`),
      handler: 'lakeformation_settings.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      handlerTimeout: Duration.seconds(120),
      handlerRolePolicyStatements: [manageSettingsPolicyStatement],
      handlerPolicySuppressions: [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource. Inline policy specific to custom resource.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'LakeFormation permissions do not accept resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions',
        },
      ],
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      handlerLayers: [boto3Layer],
      handlerProps: {
        account: this.account,
        dataLakeSettings: {
          DataLakeAdmins: admins,
          CreateDatabaseDefaultPermissions: [defaultPermissions],
          CreateTableDefaultPermissions: [defaultPermissions],
          Parameters: {
            CROSS_ACCOUNT_VERSION:
              this.props.crossAccountVersion || LakeFormationSettingsL3Construct.LATEST_CROSS_ACCOUNT_VERSION,
          },
        },
      },
    };
    new MdaaCustomResource(this.scope, `lf-settings`, settingsCrProps);
  }

  private createDatazoneManageAccessRole(): IRole {
    const manageAccessRole = new MdaaRole(this, 'datazone-manage-access-role', {
      naming: this.props.naming,
      roleName: 'datazone-manage-access',
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions({
        StringEquals: {
          'aws:SourceAccount': this.account,
        },
      }),
      managedPolicies: [
        MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneGlueManageAccessRolePolicy'),
      ],
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(manageAccessRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Permissions are restricted to this AWS Account.',
      },
    ]);

    this.props.dataZoneAdminTrustAccounts
      ?.filter(account => account != this.account)
      .forEach(account => {
        manageAccessRole.assumeRolePolicy?.addStatements(
          new PolicyStatement({
            actions: ['sts:AssumeRole'],
            principals: [new ServicePrincipal('datazone.amazonaws.com')],
            conditions: {
              StringEquals: {
                'aws:SourceAccount': account,
              },
            },
          }),
        );
      });

    new MdaaStringParameter(manageAccessRole, 'ssm', {
      parameterName: LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
      stringValue: manageAccessRole.roleArn,
    });

    return manageAccessRole;
  }
}
