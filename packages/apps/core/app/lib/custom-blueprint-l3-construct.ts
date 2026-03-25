/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DomainConfig,
  MdaaSageMakerCustomBlueprintConfigConstruct,
  MdaaSageMakerCustomBlueprintConfigConstructProps,
  MdaaSageMakerCustomBlueprintConstruct,
  MdaaSageMakerCustomBlueprintConstructProps,
} from '@aws-mdaa/datazone-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AdditionalBlueprintAccount, MdaaSageMakerCustomBluePrintConfig } from './app_config';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { resolveCrossAccountProvisioningRole } from '@aws-mdaa/datazone-constructs/lib/utils';

export interface CustomBlueprintL3ConstructProps extends MdaaL3ConstructProps {
  readonly templateUrl: string;
  readonly domainConfig: DomainConfig;
  readonly sagemakerBlueprintConfig: MdaaSageMakerCustomBluePrintConfig;
  readonly domainBucket: IBucket;
  readonly blueprintName: string;
}

export class CustomBlueprintL3Construct extends MdaaL3Construct {
  private readonly props;
  constructor(scope: Construct, id: string, props: CustomBlueprintL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    // Create the blueprint
    const blueprintProps: MdaaSageMakerCustomBlueprintConstructProps = {
      domainId: props.domainConfig.domainId,
      domainKmsUsagePolicyName: props.domainConfig.domainKmsUsagePolicyName,
      domainBucketUsagePolicyName: props.domainConfig.domainBucketUsagePolicyName,
      blueprintName: props.blueprintName,
      templateUrl: props.templateUrl,
      domainBucket: props.domainBucket,
      naming: props.naming,
      parameters: props.sagemakerBlueprintConfig.parameters,
      region: this.region,
      account: this.account,
      domainKmsKeyArn: props.domainConfig.domainKmsKeyArn,
    };
    const blueprint = new MdaaSageMakerCustomBlueprintConstruct(
      this,
      `${props.blueprintName}-custom-blueprint`,
      blueprintProps,
    );

    const provisioningRole = props.roleHelper.resolveRoleRefWithRefId(
      props.sagemakerBlueprintConfig.provisioningRole,
      'provisioningRole',
    );

    this.enableSageMakerCustomBlueprint(
      this,
      props.blueprintName,
      blueprint.blueprintId,
      props.domainConfig,
      provisioningRole.arn(),
      props.sagemakerBlueprintConfig.authorizedDomainUnits,
      props.sagemakerBlueprintConfig.enabledRegions,
    );

    Object.entries(props.sagemakerBlueprintConfig.additionalAccounts || {}).forEach(
      ([accountName, accountBlueprintProps]) => {
        this.enableAccount(props.blueprintName, props.domainConfig, accountName, accountBlueprintProps);
      },
    );
  }

  private enableAccount(
    blueprintName: string,
    domainConfig: DomainConfig,
    accountName: string,
    accountBlueprintProps: AdditionalBlueprintAccount,
  ) {
    const crossAccountStack = this.getCrossAccountStack(accountBlueprintProps.account);
    if (!crossAccountStack) {
      console.warn(
        `Cross account stack not defined for associated account ${accountName}/${accountBlueprintProps.account}. Cross account association will not work.`,
      );
      return;
    }
    const crossAccountDomainConfig = this.parseCrossAccountDomainConfig(
      crossAccountStack,
      this.region,
      domainConfig.ssmParamBase,
    );

    const crossAccountProvisioningRoleArn = resolveCrossAccountProvisioningRole(
      accountBlueprintProps.provisioningRole,
      accountBlueprintProps.account,
      this.partition,
    );

    this.enableSageMakerCustomBlueprint(
      crossAccountStack,
      this.props.blueprintName,
      crossAccountDomainConfig.getBlueprintId(blueprintName),
      crossAccountDomainConfig,
      crossAccountProvisioningRoleArn,
      accountBlueprintProps.authorizedDomainUnits,
      accountBlueprintProps.enabledRegions,
    );
  }

  private parseCrossAccountDomainConfig(
    crossAccountStack: Construct,
    region: string,
    domainConfigSsmParamBase: string,
  ) {
    const domainConfigSsmParamArn = `arn:${this.partition}:ssm:${region}:${this.account}:parameter${domainConfigSsmParamBase}`;
    return new DomainConfig(crossAccountStack, `domain-config-parser`, {
      ssmParamBase: domainConfigSsmParamArn,
      naming: this.props.naming,
    });
  }

  private enableSageMakerCustomBlueprint(
    scope: Construct,
    blueprintName: string,
    blueprintId: string,
    domainConfig: DomainConfig,
    provisioningRoleArn: string,
    authorizedDomainUnits?: string[],
    enabledRegions?: string[],
  ) {
    // Add authorization
    const authorizedDomainUnitIds = Object.fromEntries(
      (authorizedDomainUnits ?? ['/root'])
        .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
        .map(unit => [unit, domainConfig.getDomainUnitId(unit)]),
    );

    // Create the blueprint configuration
    const blueprintConfigProps: MdaaSageMakerCustomBlueprintConfigConstructProps = {
      domainConfig: domainConfig,
      blueprintIdentifier: blueprintId,
      provisioningRoleArn: provisioningRoleArn,
      enabledRegions: enabledRegions,
      region: Stack.of(scope).region,
      naming: this.baseprops.naming,
      authorizedDomainUnits: authorizedDomainUnitIds,
      account: Stack.of(scope).account,
    };
    new MdaaSageMakerCustomBlueprintConfigConstruct(
      scope,
      `${blueprintName}-custom-blueprint-config`,
      blueprintConfigProps,
    );
  }
}
