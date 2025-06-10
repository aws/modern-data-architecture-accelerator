/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { DefaultStackSynthesizer, Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface LakeFormationSettingsL3ConstructProps extends MdaaL3ConstructProps {
  /** Cross account sharing version. If not specified, defaults to latest. */
  readonly crossAccountVersion?: string;
  /**
   * If true (default false), IAMAllowedPrincipal grants will automatically be added to all new databases and tables
   */
  readonly iamAllowedPrincipalsDefault?: boolean;
  /**
   * If true (default false), then CDK Exec Role will be automatically added as a LF Admin
   */
  readonly createCdkLFAdmin?: boolean;
  /**
   * List of arns for roles which will administer LakeFormation
   */
  readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];

  /**
   * If provided, will configure LakeFormation and IAMIdentityCenter integration
   */
  readonly iamIdentityCenter?: IdentityCenterConfig;
}

export interface IdentityCenterConfig {
  readonly instanceId: string;
  readonly shares?: string[];
}

export class LakeFormationSettingsL3Construct extends MdaaL3Construct {
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

    const cdkLfAdmin = {
      // The CDK cloudformation execution role.
      DataLakePrincipalIdentifier: synthesizer.cloudFormationExecutionRoleArn.replace(
        '${AWS::Partition}',
        this.partition,
      ),
    };

    const admins = this.props.createCdkLFAdmin ? [...dataLakeAdmins, cdkLfAdmin] : dataLakeAdmins;

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
}
