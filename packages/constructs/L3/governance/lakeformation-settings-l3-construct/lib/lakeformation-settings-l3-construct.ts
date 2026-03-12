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

/** Internal props for the LakeFormation Settings L3 construct. */
export interface LakeFormationSettingsL3ConstructProps extends MdaaL3ConstructProps {
  /** Lake Formation cross-account sharing version. */
  readonly crossAccountVersion?: string;
  /** Whether to add IAM_ALLOWED_PRINCIPALS by default to new databases/tables. */
  readonly iamAllowedPrincipalsDefault?: boolean;
  /** Whether to add the CDK execution role as a Lake Formation admin. */
  readonly createCdkLFAdmin?: boolean;
  readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];
  /** IAM Identity Center integration configuration. */
  readonly iamIdentityCenter?: IdentityCenterConfig;
  /** Whether to create a dedicated DataZone admin role for Lake Formation. */
  readonly createDataZoneAdminRole?: boolean;

  /** Additional account IDs for the DataZone admin role trust policy. */
  readonly dataZoneAdminTrustAccounts?: string[];
}

/**
 * IAM Identity Center integration settings for Lake Formation.
 * Connects Lake Formation to an Identity Center instance for SSO-based
 * data lake access, with optional RAM shares for cross-account/org sharing.
 */
export interface IdentityCenterConfig {
  /**
   * IAM Identity Center instance ID to integrate with Lake Formation.
   * This is the SSO instance that manages users and groups for data lake access.
   *
   * Use cases: SSO-based Lake Formation access; Centralized user/group management
   *
   * AWS: IAM Identity Center instance
   *
   * Validation: Required; valid Identity Center instance ID (e.g. "ssoins-...")
   */
  readonly instanceId: string;
  /**
   * Accounts, organizations, or OUs to share Lake Formation services with
   * via IAM Identity Center. Accepts account IDs, organization ARNs, and OU ARNs.
   *
   * Use cases: Cross-account Lake Formation sharing; Org-wide data governance via SSO
   *
   * AWS: RAM resource shares, IAM Identity Center
   *
   * Validation: Optional; array of account IDs or organization/OU ARNs
   */
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
