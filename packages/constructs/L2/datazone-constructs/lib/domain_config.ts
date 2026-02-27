/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { DECRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { CfnParameter, Duration, Token } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { IStringParameter, ParameterTier, StringListParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for MDAA-compliant DataZone domain configuration providing domain management and integration capabilities. Extends standard CDK properties with MDAA naming conventions and enhanced security features for secure domain governance and catalog integration.
 *
 * Use cases: DataZone domain configuration; Domain governance setup; Catalog integration; Multi-domain management
 *
 * AWS: Creates Amazon DataZone domain configuration with KMS integration and Glue catalog connectivity
 *
 * Validation: All properties except ssmParamBase and domainUnits are required for complete domain configuration
 */
export interface DomainConfigProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataZone domain name for domain identification and management enabling unique domain naming within the DataZone service. Provides the primary identifier for the DataZone domain for governance and operational management.
   *
   * Use cases: Domain identification; Unique naming; Domain management; Service organization
   *
   * AWS: Amazon DataZone domain name for identification and management within the DataZone service
   *
   * Validation: Must be unique domain name string; required; used for domain identification and service management
   **/
  readonly domainName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain version for domain lifecycle management and versioning control enabling domain evolution tracking. Provides version control for domain configuration changes and lifecycle management for governance and compliance.
   *
   * Use cases: Version control; Domain lifecycle management; Configuration tracking; Governance compliance
   *
   * AWS: DataZone domain version for lifecycle management and configuration version control
   *
   * Validation: Must be valid version string; required; enables domain version control and lifecycle management
   **/
  readonly domainVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataZone domain ID for unique domain identification within AWS enabling cross-service integration and reference. Provides the unique identifier assigned by DataZone service for domain operations and cross-service integration.
   *
   * Use cases: Unique domain identification; Cross-service integration; Domain operations; Service references
   *
   * AWS: Amazon DataZone domain ID for unique identification and cross-service integration
   *
   * Validation: Must be valid DataZone domain ID; required; assigned by DataZone service for unique identification
   **/
  readonly domainId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataZone domain ARN for AWS resource identification and IAM policy integration enabling secure domain access control. Provides the complete AWS resource identifier for the domain for IAM policies and cross-service access control.
   *
   * Use cases: AWS resource identification; IAM policy integration; Cross-service access; Resource-based policies
   *
   * AWS: Amazon DataZone domain ARN for AWS resource identification and IAM integration
   *
   * Validation: Must be valid DataZone domain ARN; required; follows AWS ARN pattern for DataZone domains
   **/
  readonly domainArn?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for domain encryption ensuring data protection compliance and secure domain operations. Provides encryption at rest for domain data and metadata with customer-controlled key management for enhanced security and compliance.
   *
   * Use cases: Domain encryption; Data protection compliance; Customer-controlled encryption; Secure domain operations
   *
   * AWS: AWS KMS key ARN for DataZone domain encryption and secure data protection
   *
   * Validation: Must be valid KMS key ARN; required; enables customer-managed encryption for domain data
   **/
  readonly domainKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Glue catalog KMS key ARNs for catalog encryption enabling secure catalog integration with DataZone. Provides encryption keys for Glue catalog data accessed through DataZone for data protection and governance.
   *
   * Use cases: Catalog encryption; Secure catalog integration; Data protection; governance
   *
   * AWS: AWS KMS key ARNs for Glue catalog encryption in DataZone integration
   *
   * Validation: Must be array of valid KMS key ARNs; required; enables secure catalog integration with DataZone
   **/
  readonly glueCatalogKmsKeyArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain KMS usage policy name for key access management enabling controlled encryption key usage within the domain. Provides IAM policy name for managing KMS key access and usage permissions for domain operations and data protection.
   *
   * Use cases: KMS key access management; Encryption policy control; Key usage permissions; Domain security governance
   *
   * AWS: IAM policy name for DataZone domain KMS key usage and access management
   *
   * Validation: Must be valid IAM policy name; required; defines KMS key access and usage permissions for domain
   **/
  readonly domainKmsUsagePolicyName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain Bucket usage policy name. Provides IAM policy name for managing Bucket access and usage permissions for domain operations and data protection.
   *
   * Use cases: Bucket access management;
   *
   * AWS: IAM policy name for DataZone domain Bucket usage and access management
   *
   * Validation: Must be valid IAM policy name; required; defines Bucket access and usage permissions for domain
   **/
  readonly domainBucketUsagePolicyName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Glue catalog ARNs for catalog integration enabling data catalog connectivity with DataZone. Provides the Glue catalog resources that will be integrated with the DataZone domain for data discovery and governance.
   *
   * Use cases: Catalog integration; Data discovery; governance; Cross-service connectivity
   *
   * AWS: AWS Glue catalog ARNs for DataZone integration and data catalog connectivity
   *
   * Validation: Must be array of valid Glue catalog ARNs; required; enables catalog integration with DataZone domain
   **/
  readonly glueCatalogArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * SSM parameter base path for domain configuration storage enabling centralized configuration management. Provides the base path for storing domain configuration parameters in SSM Parameter Store for centralized management and retrieval.
   *
   * Use cases: Centralized configuration; SSM integration; Configuration management; Parameter organization
   *
   * AWS: AWS Systems Manager parameter base path for domain configuration storage and management
   *
   * Validation: Must be valid SSM parameter path if provided; enables centralized domain configuration management
   **/
  readonly ssmParamBase: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of domain unit names to identifiers for hierarchical domain organization enabling structured domain management. Provides organizational structure within the domain for improved governance, access control, and operational management.
   *
   * Use cases: Hierarchical organization; Domain structure; Organizational governance; Structured management
   *
   * AWS: DataZone domain units for hierarchical organization and structured domain management
   *
   * Validation: Must be object with string keys and values if provided; enables hierarchical domain organization
   *   **/
  readonly domainUnitIds?: { [key: string]: string };
  readonly blueprintIds?: { [key: string]: string };

  readonly projectIds?: { [key: string]: string };
  readonly customResourceRoleName?: string;
  readonly domainBucketArn?: string;
  readonly createConfigParams?: boolean;
  readonly refresh?: boolean;
}

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
  public static readonly SSM_PARAM_DOMAIN_KMS_POLICY = 'kms_usage_policy_name';
  public static readonly SSM_PARAM_DOMAIN_KMS_ARN = 'kms_arn';
  public static readonly SSM_PARAM_DOMAIN_BUCKET_POLICY = 'bucket_usage_policy_name';
  public static readonly SSM_GLUE_CATALOG_KMS_ARNS = 'glue_catalog_kms_key_arns';
  public static readonly SSM_GLUE_ARNS = 'glue_catalog_resource_arns';
  public static readonly SSM_PARAM_DOMAIN_BUCKET_ARN = 'bucket_arn';

  public static readonly SSM_PARAM_CUSTOM_RESOURCE_ROLE_NAME = 'custom_resource_role';

  public readonly props: DomainConfigProps;
  private readonly domainConfigCr: MdaaCustomResource;

  public configParamArns: string[] = [];

  public constructor(scope: Construct, id: string, props: DomainConfigProps) {
    super(scope, id);
    this.props = props;

    this.ssmParamBase = props.ssmParamBase;

    this.domainId =
      props.domainId ??
      this.ssmParamArnOrName(id + '-ssm-domain-id', `${this.ssmParamBase}/${DomainConfig.SSM_DOMAIN_ID}`).stringValue;

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

    this.domainConfigCr = this.createDomainConfigCr(this.domainId, props.refresh);

    this.domainName = props.domainName ?? this.domainConfigCr.getAttString('name');
    this.domainVersion = props.domainVersion ?? this.domainConfigCr.getAttString('domainVersion');
    this.domainArn = props.domainArn ?? this.domainConfigCr.getAttString('arn');

    this.domainUnitIds = props.domainUnitIds ?? {};
    this.blueprintIds = props.blueprintIds ?? {};
    this.projectIds = props.projectIds ?? {};

    if (props.createConfigParams) {
      this.configParamArns = this.createDomainConfigParams();
    }
  }

  public getDomainUnitId(searchPath: string): string {
    const path = searchPath.startsWith('/root') ? searchPath : `/root/${searchPath.replace(/^\//, '')}`;
    if (this.domainUnitIds[path]) return this.domainUnitIds[path];
    return this.domainConfigCr.getAttString(`domain_unit_id${path}`);
  }

  public getBlueprintId(blueprintName: string): string {
    if (this.blueprintIds[blueprintName]) return this.blueprintIds[blueprintName];
    return this.domainConfigCr.getAttString(`blueprint_id/${blueprintName}`);
  }

  private createDomainConfigParams(): string[] {
    return [
      this.createDomainConfigParam(DomainConfig.SSM_DOMAIN_ID, this.domainId).parameterArn,
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
  private createDomainConfigCr(domainId: string, refresh?: boolean) {
    const statements = [
      new PolicyStatement({
        resources: ['*'],
        actions: [
          'datazone:GetDomain',
          'datazone:ListDomainUnitsForParent',
          'datazone:ListProjectProfiles',
          'datazone:ListProjects',
          'datazone:ListEnvironmentBlueprints',
        ],
      }),
      new PolicyStatement({
        resources: [this.domainKmsKeyArn],
        actions: DECRYPT_ACTIONS,
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainConfig',
      code: Code.fromAsset(`${__dirname}/../src/lambda/domain_config`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'domain_config.lambda_handler',
      handlerRolePolicyStatements: statements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'DataZone operations do not accept a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/reference.html',
        },
      ],
      handlerProps: {
        domain_id: domainId,
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
