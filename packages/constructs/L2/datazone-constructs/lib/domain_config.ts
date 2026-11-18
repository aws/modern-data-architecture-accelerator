/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { DECRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { Annotations, CfnParameter, Duration, Lazy, Token } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { IStringParameter, ParameterTier, StringListParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface DomainConfigProps extends MdaaConstructProps {
  /** DataZone domain name for domain identification and management enabling unique domain naming */
  readonly domainName?: string;
  /** Domain version for domain lifecycle management and versioning control enabling domain evolution tracking */
  readonly domainVersion?: string;
  /** DataZone domain ID for unique domain identification within AWS enabling cross-service */
  readonly domainId?: string;
  /** DataZone domain ARN for AWS resource identification and IAM policy integration enabling */
  readonly domainArn?: string;

  /** KMS key ARN for domain encryption ensuring data protection compliance and secure domain operations */
  readonly domainKmsKeyArn?: string;
  /** Array of Glue catalog KMS key ARNs for catalog encryption enabling secure catalog integration with DataZone */
  readonly glueCatalogKmsKeyArns?: string[];
  /** Domain KMS usage policy name for key access management enabling controlled encryption key */
  readonly domainKmsUsagePolicyName?: string;
  /** Domain Bucket usage policy name */
  readonly domainBucketUsagePolicyName?: string;
  /** Array of Glue catalog ARNs for catalog integration enabling data catalog connectivity with DataZone */
  readonly glueCatalogArns?: string[];
  /** SSM parameter base path for domain configuration storage enabling centralized configuration management */
  readonly ssmParamBase: string;
  /** Map of domain unit names to identifiers for hierarchical domain organization enabling */
  readonly domainUnitIds?: { [key: string]: string };
  readonly blueprintIds?: { [key: string]: string };

  readonly projectIds?: { [key: string]: string };
  readonly customResourceRoleName?: string;
  readonly domainBucketArn?: string;
  readonly createConfigParams?: boolean;
  readonly refresh?: boolean;
}

// Tracked outside the class, keyed by instance, rather than as instance fields: DomainConfig
// is referenced as a property type across every module's config interface, and
// typescript-json-schema (used for config-schema.json generation) does not respect TS
// `private` on members of a class used that way - it would otherwise leak these bookkeeping
// sets into every generated SCHEMA.md as if they were user-configurable properties.
const requestedDomainUnitPathsByInstance = new WeakMap<DomainConfig, Set<string>>();
const requestedBlueprintKeysByInstance = new WeakMap<DomainConfig, Set<string>>();

export class DomainConfig extends Construct {
  readonly domainName: string;
  readonly domainVersion: string;
  readonly domainId: string;
  readonly domainArn: string;
  readonly domainKmsKeyArn: string;
  readonly domainBucketArn: string;
  readonly glueCatalogKmsKeyArns: string[];
  readonly domainKmsUsagePolicyName: string;
  readonly domainBucketUsagePolicyName: string;
  readonly glueCatalogArns: string[];
  readonly ssmParamBase: string;
  readonly domainUnitIds: { [key: string]: string };
  readonly blueprintIds: { [key: string]: string };

  readonly projectIds: { [key: string]: string };
  readonly customResourceRoleName: string;

  public static readonly SSM_DOMAIN_ID = 'id';
  public static readonly SSM_DOMAIN_ARN = 'arn';
  public static readonly SSM_PARAM_DOMAIN_KMS_POLICY = 'kms_usage_policy_name';
  public static readonly SSM_PARAM_DOMAIN_KMS_ARN = 'kms_arn';
  public static readonly SSM_PARAM_DOMAIN_BUCKET_POLICY = 'bucket_usage_policy_name';
  public static readonly SSM_GLUE_CATALOG_KMS_ARNS = 'glue_catalog_kms_key_arns';
  public static readonly SSM_GLUE_ARNS = 'glue_catalog_resource_arns';
  public static readonly SSM_PARAM_DOMAIN_BUCKET_ARN = 'bucket_arn';

  public static readonly SSM_PARAM_CUSTOM_RESOURCE_ROLE_NAME = 'custom_resource_role';

  // CloudFormation's custom resource response limit, and rough byte-cost estimates used to warn
  // before synth-time rather than let a deploy fail with "Response object is too long." The
  // provider framework's own envelope accounts for part of the 4096-byte budget, and each
  // returned domain unit/blueprint ID is a fixed ~14-character DataZone identifier. This is an
  // approximation (actual JSON encoding overhead varies slightly), not an exact byte count.
  private static readonly RESPONSE_SIZE_LIMIT_BYTES = 4096;
  private static readonly RESPONSE_ENVELOPE_BYTES = 400;
  private static readonly RESOURCE_ID_BYTES = 14;
  // Warn before actually hitting the limit, so there's room to react before a deploy fails.
  private static readonly RESPONSE_SIZE_WARNING_THRESHOLD = DomainConfig.RESPONSE_SIZE_LIMIT_BYTES * 0.85;

  public readonly props: DomainConfigProps;
  private readonly domainConfigCr: MdaaCustomResource;

  public configParamArns: string[] = [];

  public constructor(scope: Construct, id: string, props: DomainConfigProps) {
    super(scope, id);
    this.props = props;

    // Accumulates the specific domain unit paths/blueprint names actually requested via
    // getDomainUnitId()/getBlueprintId(), so the custom resource response only contains what's
    // used instead of every unit/blueprint in the domain (avoids the CFN 4096-byte response limit).
    requestedDomainUnitPathsByInstance.set(this, new Set<string>());
    requestedBlueprintKeysByInstance.set(this, new Set<string>());

    this.ssmParamBase = props.ssmParamBase;

    this.domainId =
      props.domainId ??
      this.ssmParamArnOrName(id + '-ssm-domain-id', `${this.ssmParamBase}/${DomainConfig.SSM_DOMAIN_ID}`).stringValue;

    this.domainArn =
      props.domainArn ??
      this.ssmParamArnOrName(id + '-ssm-domain-arn', `${this.ssmParamBase}/${DomainConfig.SSM_DOMAIN_ARN}`).stringValue;

    this.customResourceRoleName =
      props.customResourceRoleName ??
      this.ssmParamArnOrName(
        id + '-ssm-custom-resource-role',
        `${this.ssmParamBase}/${DomainConfig.SSM_PARAM_CUSTOM_RESOURCE_ROLE_NAME}`,
      ).stringValue;

    this.domainKmsKeyArn =
      props.domainKmsKeyArn ??
      this.ssmParamArnOrName(
        id + '-ssm-domain-kms-arn',
        `${this.ssmParamBase}/${DomainConfig.SSM_PARAM_DOMAIN_KMS_ARN}`,
      ).stringValue;

    this.glueCatalogKmsKeyArns =
      props.glueCatalogKmsKeyArns ??
      new CfnParameter(this, id + '-ssm-glue-catalog-kms-arns', {
        type: 'AWS::SSM::Parameter::Value<List<String>>',
        default: `${this.ssmParamBase}/${DomainConfig.SSM_GLUE_CATALOG_KMS_ARNS}`,
      }).valueAsList;

    this.domainKmsUsagePolicyName =
      props.domainKmsUsagePolicyName ??
      this.ssmParamArnOrName(
        id + '-ssm-domain-kms-usage-policy-name',
        `${this.ssmParamBase}/${DomainConfig.SSM_PARAM_DOMAIN_KMS_POLICY}`,
      ).stringValue;

    this.domainBucketUsagePolicyName =
      props.domainBucketUsagePolicyName ??
      this.ssmParamArnOrName(
        id + '-ssm-domain-bucket-usage-policy-name',
        `${this.ssmParamBase}/${DomainConfig.SSM_PARAM_DOMAIN_BUCKET_POLICY}`,
      ).stringValue;

    this.glueCatalogArns =
      props.glueCatalogArns ??
      new CfnParameter(scope, id + '-ssm-glue-catalog-resource-arns', {
        type: 'AWS::SSM::Parameter::Value<List<String>>',
        default: `${this.ssmParamBase}/${DomainConfig.SSM_GLUE_ARNS}`,
      }).valueAsList;

    this.domainBucketArn =
      props.domainBucketArn ??
      this.ssmParamArnOrName(
        id + '-ssm-domain-bucket-arn',
        `${this.ssmParamBase}/${DomainConfig.SSM_PARAM_DOMAIN_BUCKET_ARN}`,
      ).stringValue;

    this.domainConfigCr = this.createDomainConfigCr(this.domainId, this.domainArn, props.refresh);

    this.domainName = props.domainName ?? this.domainConfigCr.getAttString('name');
    this.domainVersion = props.domainVersion ?? this.domainConfigCr.getAttString('domainVersion');

    this.domainUnitIds = props.domainUnitIds || {};
    this.blueprintIds = props.blueprintIds || {};
    this.projectIds = props.projectIds || {};

    if (props.createConfigParams) {
      this.configParamArns = this.createDomainConfigParams();
    }
  }

  public getDomainUnitId(searchPath: string): string {
    const path = searchPath.startsWith('/root') ? searchPath : `/root/${searchPath.replace(/^\//, '')}`;
    if (this.domainUnitIds?.[path]) {
      return this.domainUnitIds[path];
    } else {
      requestedDomainUnitPathsByInstance.get(this)?.add(`domain_unit_id${path}`);
      return this.domainConfigCr.getAttString(`domain_unit_id${path}`);
    }
  }

  public getBlueprintId(blueprintName: string): string {
    if (this.blueprintIds[blueprintName]) {
      return this.blueprintIds[blueprintName];
    } else {
      requestedBlueprintKeysByInstance.get(this)?.add(`blueprint_id/${blueprintName}`);
      return this.domainConfigCr.getAttString(`blueprint_id/${blueprintName}`);
    }
  }

  // Called once all getDomainUnitId()/getBlueprintId() calls have been recorded (i.e. when the
  // Lazy-resolved handlerProps are rendered at synth time), to warn if this stack's requests are
  // likely to make the custom resource response exceed CloudFormation's 4096-byte limit.
  private warnIfResponseSizeApproachesLimit(): void {
    const requestedDomainUnitPaths = requestedDomainUnitPathsByInstance.get(this) ?? new Set<string>();
    const requestedBlueprintKeys = requestedBlueprintKeysByInstance.get(this) ?? new Set<string>();
    const entryBytes = (key: string) => key.length + DomainConfig.RESOURCE_ID_BYTES + 6; // quotes, colon, comma
    const domainUnitBytes = Array.from(requestedDomainUnitPaths).reduce((sum, path) => sum + entryBytes(path), 0);
    const blueprintBytes = Array.from(requestedBlueprintKeys).reduce((sum, key) => sum + entryBytes(key), 0);
    const estimatedBytes = DomainConfig.RESPONSE_ENVELOPE_BYTES + domainUnitBytes + blueprintBytes;

    if (estimatedBytes > DomainConfig.RESPONSE_SIZE_WARNING_THRESHOLD) {
      Annotations.of(this).addWarning(
        `DomainConfig requests ${requestedDomainUnitPaths.size} domain unit path(s) and ` +
          `${requestedBlueprintKeys.size} blueprint name(s), an estimated ${estimatedBytes} bytes. The ` +
          `CloudFormation custom resource response limit is ${DomainConfig.RESPONSE_SIZE_LIMIT_BYTES} bytes; ` +
          `exceeding it fails the deployment with "Response object is too long." Reduce the number of domain ` +
          `units/blueprints this stack looks up through this construct.`,
      );
    }
  }

  private createDomainConfigParams(): string[] {
    return [
      this.createDomainConfigParam(DomainConfig.SSM_DOMAIN_ID, this.domainId).parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_DOMAIN_ARN, this.domainArn).parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_PARAM_DOMAIN_KMS_ARN, this.domainKmsKeyArn).parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_PARAM_DOMAIN_BUCKET_ARN, this.domainBucketArn).parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_PARAM_DOMAIN_KMS_POLICY, this.domainKmsUsagePolicyName)
        .parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_PARAM_DOMAIN_BUCKET_POLICY, this.domainBucketUsagePolicyName)
        .parameterArn,
      this.createDomainConfigParam(DomainConfig.SSM_PARAM_CUSTOM_RESOURCE_ROLE_NAME, this.customResourceRoleName)
        .parameterArn,
      this.createDomainConfigListParam(DomainConfig.SSM_GLUE_CATALOG_KMS_ARNS, this.glueCatalogKmsKeyArns).parameterArn,
      this.createDomainConfigListParam(DomainConfig.SSM_GLUE_ARNS, this.glueCatalogArns).parameterArn,
    ];
  }

  private createDomainConfigListParam(name: string, value: string[]): StringListParameter {
    const paramName = `${this.ssmParamBase}/${name}`;
    return new StringListParameter(this, `ssm-${name}`, {
      parameterName: paramName,
      stringListValue: value,
      simpleName: Token.isUnresolved(paramName),
      tier: ParameterTier.ADVANCED,
    });
  }

  private createDomainConfigParam(name: string, value: string): MdaaStringParameter {
    const paramName = `${this.ssmParamBase}/${name}`;
    return new MdaaStringParameter(this, `ssm-${name}`, {
      parameterName: paramName,
      stringValue: value,
      simpleName: Token.isUnresolved(paramName),
      tier: ParameterTier.ADVANCED,
    });
  }

  private ssmParamArnOrName(id: string, arnOrName: string): IStringParameter {
    const existing = this.node.tryFindChild(id);
    if (existing) {
      return existing as IStringParameter;
    }
    if (arnOrName.startsWith('arn:')) {
      return MdaaStringParameter.fromStringParameterArn(this, id, arnOrName);
    } else {
      const name = arnOrName.startsWith('/') ? arnOrName : '/' + arnOrName;
      return MdaaStringParameter.fromStringParameterName(this, id, name);
    }
  }

  /**
   * Creates a custom resource to check, delete, and recreate DataZone user profile
   * @param domainId Domain identifier  to process
   * @param refresh
   * @returns Custom resource for domain config
   */
  private createDomainConfigCr(domainId: string, domainArn: string, refresh?: boolean) {
    const statements = [
      new PolicyStatement({
        resources: [domainArn],
        actions: ['datazone:GetDomain'],
      }),
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:ListDomainUnitsForParent', 'datazone:ListEnvironmentBlueprints'],
      }),
      // GenerateDataKey is required for cross-account ListDomainUnitsForParent calls
      // against domains encrypted with a customer-managed KMS key.
      new PolicyStatement({
        resources: [this.domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, 'kms:GenerateDataKey'],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainConfig',
      code: Code.fromAsset(`${__dirname}/../src/lambda/domain_config`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'domain_config.lambda_handler',
      handlerRolePolicyStatements: statements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'DataZone List operations (ListDomainUnitsForParent, ListEnvironmentBlueprints) do not support ' +
            'resource-level permissions ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html).',
        },
      ],
      handlerProps: {
        domain_id: domainId,
        // Resolved at synth time, after getDomainUnitId()/getBlueprintId() calls from other
        // constructs (made after this constructor returns) have populated these sets.
        domain_unit_paths: Lazy.list({
          produce: () => {
            this.warnIfResponseSizeApproachesLimit();
            return Array.from(requestedDomainUnitPathsByInstance.get(this) ?? []);
          },
        }),
        blueprint_names: Lazy.list({
          produce: () => Array.from(requestedBlueprintKeysByInstance.get(this) ?? []),
        }),
        refresh: refresh ? Date.now() : undefined,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(300),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    return new MdaaCustomResource(this, `domainConfigcr`, crProps);
  }
}
