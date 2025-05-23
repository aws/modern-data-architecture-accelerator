/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';

export type LifecycleConfigAppType = 'JupyterServer' | 'KernelGateway';
/**
 * Properties for creating a Studio Lifecycle Config Contents
 */
export interface MdaaStudioLifecycleConfigProps extends MdaaConstructProps {
  readonly lifecycleConfigName?: string;
  readonly lifecycleConfigContent: string;
  readonly lifecycleConfigAppType: LifecycleConfigAppType;
}

/**
 * A construct for creating a Studio LifecycleConfig
 */
export class MdaaStudioLifecycleConfig extends Construct {
  public readonly arn: string;

  constructor(scope: Construct, id: string, props: MdaaStudioLifecycleConfigProps) {
    super(scope, id);

    const lifecycleConfigName = props.naming.resourceName(props.lifecycleConfigName, 50); //Leave room for content hash created by CR

    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['sagemaker:CreateStudioLifecycleConfig', 'sagemaker:DeleteStudioLifecycleConfig'],
      resources: [
        `arn:${Stack.of(scope).partition}:sagemaker:${Stack.of(scope).region}:${
          Stack.of(scope).account
        }:studio-lifecycle-config/*`,
      ],
    });

    const handlerProps = {
      lifecycleConfigName: lifecycleConfigName,
      lifecycleConfigContent: props.lifecycleConfigContent,
      lifecycleConfigAppType: props.lifecycleConfigAppType,
    };

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'StudioLifecycleConfig',
      code: Code.fromAsset(`${__dirname}/../src/lambda/lifecycle`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'lifecycle.lambda_handler',
      handlerRolePolicyStatements: [statement],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lifecycle names not known at deployment time.',
        },
      ],
      handlerProps: handlerProps,
      naming: props.naming,
      handlerTimeout: Duration.seconds(120),
      environment:{
        LOG_LEVEL: 'INFO',
      }
    };

    const cr = new MdaaCustomResource(this, 'custom-resource', crProps);

    this.arn = cr.getAttString('StudioLifecycleConfigArn');

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'studioLifecycleConfig',
        resourceId: props.lifecycleConfigName,
        name: 'arn',
        value: this.arn,
      },
      ...props,
    });
  }
}
