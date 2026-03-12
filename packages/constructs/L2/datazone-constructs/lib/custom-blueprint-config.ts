/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DomainConfig } from './domain_config';
import { DataZoneAuthorizationConstruct, EntityType, NamedAuthorizationPolicies } from './authorization';

export interface MdaaSageMakerCustomBlueprintConfigConstructProps extends MdaaConstructProps {
  readonly domainConfig: DomainConfig;
  readonly blueprintIdentifier: string;
  readonly provisioningRoleArn: string;
  readonly enabledRegions?: string[];
  readonly region: string;
  readonly account: string;
  readonly authorizedDomainUnits?: { [name: string]: string };
}

export class MdaaSageMakerCustomBlueprintConfigConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MdaaSageMakerCustomBlueprintConfigConstructProps) {
    super(scope, id);

    const configStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['datazone:PutEnvironmentBlueprintConfiguration'],
      resources: ['*'],
    });

    const policyStatements = [configStatement];

    policyStatements.push(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.provisioningRoleArn],
      }),
    );
    const domainKmsUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-kms-managed-policy',
      props.domainConfig.domainKmsUsagePolicyName,
    );
    const configProps: MdaaCustomResourceProps = {
      resourceType: 'EnvironmentBluePrintConfiguration',
      code: Code.fromAsset(`${__dirname}/../src/lambda/environment_blueprint_config`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'lambda.lambda_handler',
      handlerRoleManagedPolicies: [domainKmsUsagePolicy],
      handlerRolePolicyStatements: policyStatements,
      handlerLayers: [
        new MdaaBoto3LayerVersion(this, 'boto3-layer', {
          naming: props.naming,
          createParams: false,
          createOutputs: false,
        }),
      ],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'datazone:PutEnvironmentBlueprintConfiguration does not take a resource',
        },
      ],
      handlerProps: {
        provisioning_role_arn: props.provisioningRoleArn,
        domain_id: props.domainConfig.domainId,
        blueprint_identifier: props.blueprintIdentifier,
        enabled_regions: [props.region, ...(props.enabledRegions || [])],
      },
      naming: props.naming,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    const config = new MdaaCustomResource(this, 'blueprint-config', configProps);
    const blueprintId = config.getAttString('BlueprintId');

    this.createAuthorization(blueprintId, props);
  }

  private createAuthorization(blueprintId: string, props: MdaaSageMakerCustomBlueprintConfigConstructProps): void {
    const authorizationPolicies: NamedAuthorizationPolicies = Object.fromEntries(
      Object.entries(props.authorizedDomainUnits || {}).map(([domainUnit, domainUnitId]) => {
        return [
          `blueprint-${domainUnit}`,
          {
            policyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
            principals: [{ allUsersGrantFilter: true }],
            includeChildDomainUnits: true,
            domainUnitId: domainUnitId,
          },
        ];
      }) || [],
    );

    new DataZoneAuthorizationConstruct(this, 'authorization', {
      naming: props.naming,
      domainId: props.domainConfig.domainId,
      entityId: `${props.account}:${blueprintId}`,
      entityType: EntityType.ENVIRONMENT_BLUEPRINT_CONFIGURATION,
      policies: authorizationPolicies,
    });
  }
}
