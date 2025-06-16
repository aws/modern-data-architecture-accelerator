/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResourceProps, MdaaCustomResource } from '@aws-mdaa/custom-constructs';
import { Stack, Duration } from 'aws-cdk-lib';
import { PolicyStatement, Effect, IManagedPolicy, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface DomainConfig {
  readonly domainVersion: string;
  readonly domainId: string;
  readonly domainArn: string;
  readonly domainCustomEnvBlueprintId: string;
  readonly adminUserProfileId?: string;
  readonly domainKmsKeyArn: string;
  readonly glueCatalogKmsKeyArns: string[];
  readonly domainKmsUsagePolicy: IManagedPolicy;
}

export interface MdaaDataZoneDomainSSMConfigParserProps extends MdaaConstructProps {
  readonly domainConfigSSMParam: string;
}

export class MdaaDataZoneDomainSSMConfigParser extends Construct {
  public readonly parsedConfig: DomainConfig;

  constructor(scope: Construct, id: string, props: MdaaDataZoneDomainSSMConfigParserProps) {
    super(scope, id);

    const ssmParamArn = props.domainConfigSSMParam.startsWith('arn:')
      ? props.domainConfigSSMParam
      : `arn:${Stack.of(scope).partition}:ssm:${Stack.of(scope).region}:${Stack.of(scope).account}:parameter${
          props.domainConfigSSMParam
        }`;

    const handlerRolePolicyStatementstatements = [
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn],
        effect: Effect.ALLOW,
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainConfigParser',
      code: Code.fromAsset(`${__dirname}/../src/lambda/domain_configuration`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'domain_configuration.lambda_handler',
      handlerRolePolicyStatements: handlerRolePolicyStatementstatements,
      handlerProps: {
        domainConfigSSMParam: props.domainConfigSSMParam,
      },
      naming: props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    const domainConfigParser = new MdaaCustomResource(scope, 'domain-config-cr', crProps);

    this.parsedConfig = {
      domainArn: domainConfigParser.getAttString('domainArn'),
      domainVersion: domainConfigParser.getAttString('domainVersion'),
      domainId: domainConfigParser.getAttString('domainId'),
      domainCustomEnvBlueprintId: domainConfigParser.getAttString('datalakeEnvBlueprintId'),
      domainKmsKeyArn: domainConfigParser.getAttString('domainKmsKeyArn'),
      adminUserProfileId: domainConfigParser.getAttString('adminUserProfileId'),
      domainKmsUsagePolicy: ManagedPolicy.fromManagedPolicyName(
        this,
        'kms-managed-policy',
        domainConfigParser.getAttString('domainKmsUsagePolicyName'),
      ),
      glueCatalogKmsKeyArns: domainConfigParser.getAtt('glueCatalogKmsKeyArns').toStringList(),
    };
  }
}
