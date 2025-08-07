/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { CfnParameter, Token } from 'aws-cdk-lib';
import { ParameterTier, StringListParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface DomainConfigProps extends MdaaConstructProps {
  readonly domainName: string;
  readonly domainVersion: string;
  readonly domainId: string;
  readonly domainArn: string;
  readonly domainCustomEnvBlueprintId: string;
  readonly adminUserProfileId: string;
  readonly domainKmsKeyArn: string;
  readonly glueCatalogKmsKeyArns: string[];
  readonly domainKmsUsagePolicyName: string;
  readonly glueCatalogArns: string[];
  readonly ssmParamBase?: string;
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
