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
import { Annotations, DefaultStackSynthesizer, Duration, Stack } from 'aws-cdk-lib';
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

  /** S3 Tables integration with AWS analytics services configuration. */
  readonly s3TablesIntegration?: S3TablesIntegrationConfig;
}

/**
 * Automates the "Enable integration" action for Amazon S3 Tables so table
 * buckets in this account/Region are queryable from Athena, Redshift, EMR, and
 * QuickSight without a manual console step. When enabled, MDAA creates the
 * `s3tablescatalog` federated catalog in AWS Glue; Glue in turn registers the
 * table bucket location with Lake Formation using IAM (IAM_ALLOWED_PRINCIPALS)
 * access controls. The integration is a single, shared resource per
 * account/Region, which is why it lives in this account-level module.
 */
export interface S3TablesIntegrationConfig {
  /**
   * When true, creates the `s3tablescatalog` Glue federated catalog so S3 Tables
   * are queryable from AWS analytics services without a manual console step.
   *
   * Region/partition note: AWS offers the IAM-based-access-control form of this
   * integration only in a subset of Regions (elsewhere it additionally requires Lake
   * Formation), and it is not available in every partition; in an unsupported
   * Region/partition the custom resource may report success while the integration is
   * functionally incomplete. See the AWS S3 Tables documentation for the current list.
   *
   * Use cases: Automated S3 Tables analytics enablement; Athena/Redshift/EMR access to Iceberg tables
   *
   * AWS: Glue CreateCatalog (federated `aws:s3tables` catalog), Lake Formation location registration
   *
   * Validation: Required; boolean
   */
  readonly enabled: boolean;
  /**
   * When true, the `s3tablescatalog` catalog is deleted when the stack is deleted.
   * Defaults to false so that deleting this stack does NOT break queries for other
   * S3 Tables deployments sharing this account/Region integration. Only enable if
   * this stack owns the integration and you want it torn down on delete.
   *
   * Use cases: Full lifecycle ownership of the shared integration; ephemeral/test environments
   *
   * AWS: Glue DeleteCatalog on stack delete
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly removeOnDelete?: boolean;
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
    this.createS3TablesIntegration(boto3Layer);
  }

  private createS3TablesIntegration(boto3Layer: MdaaBoto3LayerVersion) {
    if (!this.props.s3TablesIntegration?.enabled) {
      return;
    }

    // The s3tablescatalog catalog is always created with IAM_ALLOWED_PRINCIPALS/ALL defaults and full
    // external table access (the only posture AWS's IAM-mode integration supports). When the operator
    // has chosen strict Lake-Formation-only governance (iamAllowedPrincipalsDefault: false) that is a
    // deliberate contradiction, so surface it at synth rather than letting it deploy silently.
    if (this.props.iamAllowedPrincipalsDefault === false) {
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/lakeformation-settings-l3-construct:s3TablesIntegrationIamAccess',
        's3TablesIntegration is enabled while iamAllowedPrincipalsDefault is false. The s3tablescatalog ' +
          'catalog is still created with IAM_ALLOWED_PRINCIPALS/ALL default permissions and full external ' +
          'table access, so S3 table data is governed by IAM rather than by fine-grained Lake Formation ' +
          'grants, regardless of the strict Lake-Formation-only posture implied by ' +
          'iamAllowedPrincipalsDefault: false. This is the only posture AWS S3 Tables IAM-mode ' +
          'integration supports.',
      );
    }

    // glue:CreateCatalog creates the s3tablescatalog federated catalog. It needs the account catalog
    // (required to create a top-level catalog), the exact s3tablescatalog catalog, and its child-path
    // wildcard (catalog/s3tablescatalog/*) for the per-table-bucket child catalogs Glue materializes at
    // runtime. Idempotent create is handled entirely in the Python handler by catching
    // AlreadyExistsException/FederatedResourceAlreadyExistsException, so glue:GetCatalog is not required.
    const createCatalogPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:glue:${this.region}:${this.account}:catalog`,
        `arn:${this.partition}:glue:${this.region}:${this.account}:catalog/s3tablescatalog`,
        `arn:${this.partition}:glue:${this.region}:${this.account}:catalog/s3tablescatalog/*`,
      ],
      actions: ['glue:CreateCatalog'],
    });

    // glue:DeleteCatalog is a destructive action granted only when removeOnDelete is set, so the default
    // deployment carries no standing capability to destroy the shared account-wide catalog. It is kept in
    // its own statement scoped to ONLY the s3tablescatalog catalog and its child-path wildcard —
    // deliberately NOT the account-root catalog ARN, which DeleteCatalog does not need — to keep the
    // destructive blast radius minimal. Both statements avoid a bare catalog* or catalog/s3tablescatalog*
    // prefix glob, which would also match unrelated or same-prefix catalogs.
    const deleteCatalogPolicyStatements =
      this.props.s3TablesIntegration.removeOnDelete === true
        ? [
            new PolicyStatement({
              effect: Effect.ALLOW,
              resources: [
                `arn:${this.partition}:glue:${this.region}:${this.account}:catalog/s3tablescatalog`,
                `arn:${this.partition}:glue:${this.region}:${this.account}:catalog/s3tablescatalog/*`,
              ],
              actions: ['glue:DeleteCatalog'],
            }),
          ]
        : [];

    // glue:PassConnection delegates aws:s3tables connection creation to the S3 service during
    // CreateCatalog. It acts on the connection resource, not the catalog resource, so it must be
    // scoped to the service-managed aws:s3tables connection ARN.
    const passConnectionPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:glue:${this.region}:${this.account}:connection/aws:s3tables`],
      actions: ['glue:PassConnection'],
    });

    const s3TablesIntegrationCrProps: MdaaCustomResourceProps = {
      resourceType: 'lakeformation-s3tables-integration',
      code: Code.fromAsset(`${__dirname}/../src/python/s3tables_integration`),
      handler: 's3tables_integration.lambda_handler',
      runtime: Runtime.PYTHON_3_14,
      handlerTimeout: Duration.seconds(120),
      handlerRolePolicyStatements: [
        createCatalogPolicyStatement,
        ...deleteCatalogPolicyStatements,
        passConnectionPolicyStatement,
      ],
      handlerPolicySuppressions: [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason:
            'Minimal, purpose-specific inline policy attached to a single-use custom-resource handler role ' +
            'that is not reused elsewhere. The policy contents are themselves resource-scoped to the Glue ' +
            'catalog hierarchy and the aws:s3tables connection (see the AwsSolutions-IAM5 rationale below).',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'glue:CreateCatalog is scoped to the account Glue catalog (arn:...:catalog, required to create a ' +
            'top-level catalog), the exact s3tablescatalog catalog (arn:...:catalog/s3tablescatalog), and its ' +
            'child-path wildcard (arn:...:catalog/s3tablescatalog/*). glue:DeleteCatalog is granted only when ' +
            'removeOnDelete is set and is kept in a separate statement scoped to only the s3tablescatalog ' +
            'catalog and its child path (arn:...:catalog/s3tablescatalog and arn:...:catalog/s3tablescatalog/*), ' +
            'not the account-root catalog. The child-path wildcard covers only the per-table-bucket child ' +
            'catalogs AWS materializes beneath s3tablescatalog at runtime; sibling catalogs that merely share ' +
            'the name prefix are not matched. glue:PassConnection is scoped to the specific aws:s3tables ' +
            'connection ARN. ' +
            'See https://docs.aws.amazon.com/service-authorization/latest/reference/list_glue.html',
        },
      ],
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      handlerLayers: [boto3Layer],
      handlerProps: {
        catalogName: 's3tablescatalog',
        federatedCatalogIdentifier: `arn:${this.partition}:s3tables:${this.region}:${this.account}:bucket/*`,
        connectionName: 'aws:s3tables',
        removeOnDelete: this.props.s3TablesIntegration.removeOnDelete === true,
      },
    };
    new MdaaCustomResource(this.scope, `lf-s3tables-integration`, s3TablesIntegrationCrProps);
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
        `arn:${this.partition}:sso::*:application/${this.props.iamIdentityCenter.instanceId}/*`,
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
      runtime: Runtime.PYTHON_3_14,
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
            'SSO application name is generated by IAM Identity Center at runtime and not known at deployment time, ' +
            'requiring a wildcard in the application path. The account segment of the SSO application ARN is also ' +
            'wildcarded because IAM Identity Center is an organisation-level service: when Lake Formation calls ' +
            'sso:PutApplicationAssignmentConfiguration during CreateLakeFormationIdentityCenterConfiguration, the ' +
            'application ARN carries the IdC management/delegated-admin account, which may differ from the data ' +
            'platform account in Control Tower / AWS Organizations deployments. Action scope remains constrained ' +
            'to the configured IdC instanceId. ' +
            'https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions ' +
            'https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsssoportal.html',
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
      runtime: Runtime.PYTHON_3_14,
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
