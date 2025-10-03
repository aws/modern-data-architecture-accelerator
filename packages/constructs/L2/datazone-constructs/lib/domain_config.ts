/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { CfnParameter, Token } from 'aws-cdk-lib';
import { ParameterTier, StringListParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
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
  readonly domainName: string;
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
  readonly domainVersion: string;
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
  readonly domainId: string;
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
  readonly domainArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required custom environment blueprint ID for domain environment configuration enabling standardized environment provisioning. Provides the blueprint identifier for creating consistent environments within the DataZone domain for governance and standardization.
   *
   * Use cases: Environment standardization; Blueprint configuration; Consistent provisioning; Environment governance
   *
   * AWS: DataZone environment blueprint ID for standardized environment provisioning and configuration
   *
   * Validation: Must be valid blueprint ID; required; defines environment provisioning standards for the domain
   **/
  readonly domainCustomEnvBlueprintId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required admin user profile ID for domain administration and management enabling administrative access control. Provides the user profile identifier for domain administrative operations and governance management within DataZone.
   *
   * Use cases: Domain administration; Administrative access; User management; Governance operations
   *
   * AWS: DataZone admin user profile ID for domain administration and management operations
   *
   * Validation: Must be valid user profile ID; required; enables administrative access and domain management
   **/
  readonly adminUserProfileId: string;
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
  readonly domainKmsKeyArn: string;
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
  readonly glueCatalogKmsKeyArns: string[];
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
  readonly domainKmsUsagePolicyName: string;
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
  readonly glueCatalogArns: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SSM parameter base path for domain configuration storage enabling centralized configuration management. Provides the base path for storing domain configuration parameters in SSM Parameter Store for centralized management and retrieval.
   *
   * Use cases: Centralized configuration; SSM integration; Configuration management; Parameter organization
   *
   * AWS: AWS Systems Manager parameter base path for domain configuration storage and management
   *
   * Validation: Must be valid SSM parameter path if provided; enables centralized domain configuration management
   **/
  readonly ssmParamBase?: string;
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
  readonly domainUnits?: { [key: string]: string };
}

export class DomainConfig extends Construct {
  readonly domainName: string;
  readonly domainVersion: string;
  readonly domainId: string;
  readonly domainArn: string;
  readonly domainCustomEnvBlueprintId: string;
  readonly adminUserProfileId?: string;
  readonly domainKmsKeyArn: string;
  readonly glueCatalogKmsKeyArns: string[];
  readonly domainKmsUsagePolicyName: string;
  readonly glueCatalogArns: string[];
  readonly ssmParamBase?: string;
  readonly domainUnits?: { [key: string]: string };
  private static SSM_PARAM_NAME = 'domain_name';
  private static SSM_PARAM_ARN = 'domain_arn';
  private static SSM_PARAM_ID = 'domain_id';
  private static SSM_PARAM_ADMIN = 'domain_admin_user_profile_id';
  private static SSM_PARAM_VERSION = 'domain_version';
  private static SSM_PARAM_DOMAIN_KMS_ARN = 'domain_kms_key_arn';
  private static SSM_PARAM_DOMAIN_KMS_POLICY = 'domain_kms_usage_policy_name';
  private static SSM_GLUE_CATALOG_KMS_ARNS = 'domain_glue_catalog_kms_key_arns';
  private static SSM_GLUE_ARNS = 'domain_glue_catalog_resource_arns';
  private static SSM_BLUEPRINT_ID = 'domain_datalake_blueprint_config_id';
  private props: DomainConfigProps;

  public constructor(scope: Construct, id: string, props: DomainConfigProps) {
    super(scope, id);
    this.props = props;
    this.domainName = props.domainName;
    this.domainVersion = props.domainVersion;
    this.domainId = props.domainId;
    this.domainArn = props.domainArn;
    this.domainCustomEnvBlueprintId = props.domainCustomEnvBlueprintId;
    this.adminUserProfileId = props.adminUserProfileId;
    this.domainKmsKeyArn = props.domainKmsKeyArn;
    this.glueCatalogKmsKeyArns = props.glueCatalogKmsKeyArns;
    this.domainKmsUsagePolicyName = props.domainKmsUsagePolicyName;
    this.glueCatalogArns = props.glueCatalogArns;
    this.ssmParamBase = props.ssmParamBase;
    this.domainUnits = props.domainUnits;
  }

  public getDomainUnitId(path: string): string {
    if (this.ssmParamBase) {
      return DomainConfig.ssmParamArnOrName(
        this,
        `ssm-domain-unit-id-${path}`,
        `${this.ssmParamBase}/domain_unit${path.startsWith('/') ? path.toLowerCase() : '/' + path.toLowerCase()}`,
      ).stringValue;
    } else if (this.domainUnits && this.domainUnits[path]) {
      return this.domainUnits[path];
    } else {
      throw new Error('DomainUnits must be either retrievable from SSM or be directly specified in props');
    }
  }

  public createDomainConfigParams(resourceId: string): string[] {
    return [
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_NAME, this.domainName).param!.parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_ID, this.domainId).param!.parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_ARN, this.domainArn).param!.parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_ADMIN, this.adminUserProfileId ?? '').param!
        .parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_VERSION, this.domainVersion).param!.parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_DOMAIN_KMS_ARN, this.domainKmsKeyArn).param!
        .parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_PARAM_DOMAIN_KMS_POLICY, this.domainKmsUsagePolicyName)
        .param!.parameterArn,
      this.createDomainConfigListParam(resourceId, DomainConfig.SSM_GLUE_CATALOG_KMS_ARNS, this.glueCatalogKmsKeyArns)
        .parameterArn,
      this.createDomainConfigListParam(resourceId, DomainConfig.SSM_GLUE_ARNS, this.glueCatalogArns).parameterArn,
      this.createDomainConfigParam(resourceId, DomainConfig.SSM_BLUEPRINT_ID, this.domainCustomEnvBlueprintId || '')
        .param!.parameterArn,
      ...Object.entries(this.domainUnits || {}).map(
        ([name, id]) => this.createDomainConfigParam(resourceId, `domain_unit${name}`, id).param!.parameterArn,
      ),
    ];
  }
  private createDomainConfigListParam(resourceId: string, name: string, value: string[]): StringListParameter {
    const paramName = this.props.naming.ssmPath(`domain/${resourceId}/config/${name}`);
    return new StringListParameter(this, `ssm-${resourceId}-${name}`, {
      parameterName: paramName,
      stringListValue: value,
      simpleName: Token.isUnresolved(paramName),
      tier: ParameterTier.ADVANCED,
    });
  }
  private createDomainConfigParam(resourceId: string, name: string, value: string): MdaaParamAndOutput {
    return new MdaaParamAndOutput(this, {
      createOutputs: false,
      resourceType: 'domain',
      resourceId: resourceId,
      name: `config/${name}`,
      tier: ParameterTier.ADVANCED,
      value: value,
      naming: this.props.naming,
    });
  }

  public static ssmParamArnOrName(scope: Construct, id: string, arnOrName: string) {
    if (arnOrName.startsWith('arn:')) {
      return StringParameter.fromStringParameterArn(scope, id, arnOrName);
    } else {
      const name = arnOrName.startsWith('/') ? arnOrName : '/' + arnOrName;
      return StringParameter.fromStringParameterName(scope, id, name);
    }
  }

  public static fromSsm(scope: Construct, id: string, ssmParam: string, naming: IMdaaResourceNaming): DomainConfig {
    const domainConfigProps: DomainConfigProps = {
      naming: naming,
      ssmParamBase: ssmParam,
      domainName: this.ssmParamArnOrName(scope, id + '-ssm-domain-name', `${ssmParam}/${this.SSM_PARAM_NAME}`)
        .stringValue,
      domainArn: this.ssmParamArnOrName(scope, id + '-ssm-domain-arn', `${ssmParam}/${this.SSM_PARAM_ARN}`).stringValue,
      domainVersion: this.ssmParamArnOrName(scope, id + 'ssm-domain-version', `${ssmParam}/${this.SSM_PARAM_VERSION}`)
        .stringValue,
      domainId: this.ssmParamArnOrName(scope, id + '-ssm-domain-id', `${ssmParam}/${this.SSM_PARAM_ID}`).stringValue,
      domainCustomEnvBlueprintId: this.ssmParamArnOrName(
        scope,
        id + '-ssm-domain-blueprint-id',
        `${ssmParam}/${this.SSM_BLUEPRINT_ID}`,
      ).stringValue,
      domainKmsKeyArn: this.ssmParamArnOrName(
        scope,
        id + '-ssm-domain-kms-arn',
        `${ssmParam}/${this.SSM_PARAM_DOMAIN_KMS_ARN}`,
      ).stringValue,
      adminUserProfileId: this.ssmParamArnOrName(
        scope,
        id + '-ssm-admin-user-profile-id',
        `${ssmParam}/${this.SSM_PARAM_ADMIN}`,
      ).stringValue,
      domainKmsUsagePolicyName: this.ssmParamArnOrName(
        scope,
        id + '-ssm-domain-kms-usage-policy-name',
        `${ssmParam}/${this.SSM_PARAM_DOMAIN_KMS_POLICY}`,
      ).stringValue,
      glueCatalogKmsKeyArns: new CfnParameter(scope, id + '-ssm-glue-catalog-kms-arns', {
        type: 'AWS::SSM::Parameter::Value<List<String>>',
        default: `${ssmParam}/${this.SSM_GLUE_CATALOG_KMS_ARNS}`,
      }).valueAsList,
      glueCatalogArns: new CfnParameter(scope, id + '-ssm-glue-catalog-resource-arns', {
        type: 'AWS::SSM::Parameter::Value<List<String>>',
        default: `${ssmParam}/${this.SSM_GLUE_ARNS}`,
      }).valueAsList,
    };
    return new DomainConfig(scope, id, domainConfigProps);
  }
}
