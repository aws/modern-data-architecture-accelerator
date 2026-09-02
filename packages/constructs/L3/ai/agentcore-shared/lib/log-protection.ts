/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaConstructProps } from '@aws-mdaa/construct';
import { Duration, Stack } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LogProtectionProps {
  readonly runtimeId: string;
  readonly kmsKey?: IKey;
  readonly retentionDays?: number;
  readonly dataProtectionPolicy?: Record<string, unknown>;
  readonly naming: MdaaConstructProps['naming'];
}

/**
 * Creates a Custom Resource that discovers the service-created log groups
 * for an AgentCore Runtime and applies CMK encryption, retention, and/or
 * data protection policies to them.
 *
 * The AgentCore service auto-creates log groups using the pattern
 * /aws/bedrock-agentcore/runtimes/{AgentRuntimeId}-{Qualifier}.
 * This Custom Resource runs after the runtime is created and applies
 * protections to all matching log groups.
 */
export function createAgentCoreLogProtection(
  scope: Construct,
  id: string,
  props: LogProtectionProps,
): MdaaCustomResource {
  const stack = Stack.of(scope);
  const logGroupArnPattern = `arn:${stack.partition}:logs:${stack.region}:${stack.account}:log-group:/aws/bedrock-agentcore/runtimes/${props.runtimeId}-*`;

  const handlerStatements: PolicyStatement[] = [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:DescribeLogGroups'],
      resources: ['*'],
    }),
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:AssociateKmsKey',
        'logs:DisassociateKmsKey',
        'logs:PutRetentionPolicy',
        'logs:PutDataProtectionPolicy',
      ],
      resources: [logGroupArnPattern],
    }),
  ];

  // logs:AssociateKmsKey validates the key by calling kms:DescribeKey as the handler's
  // identity, so the handler role needs DescribeKey on the specific key being associated.
  if (props.kmsKey) {
    handlerStatements.push(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:DescribeKey'],
        resources: [props.kmsKey.keyArn],
      }),
    );
  }

  const handlerProps: Record<string, string> = {
    runtimeId: props.runtimeId,
  };

  if (props.kmsKey) {
    handlerProps.kmsKeyArn = props.kmsKey.keyArn;
  }

  // RetentionDays.INFINITE (9999) and omission both mean never-expire: apply no retention policy
  // rather than sending the sentinel to the handler's raw PutRetentionPolicy call, which rejects
  // 9999. Only a finite retention value is forwarded; omitting it leaves the log groups at
  // CloudWatch's never-expire default.
  if (props.retentionDays && props.retentionDays !== RetentionDays.INFINITE) {
    handlerProps.retentionDays = String(props.retentionDays);
  }

  if (props.dataProtectionPolicy) {
    handlerProps.dataProtectionPolicy = JSON.stringify(props.dataProtectionPolicy);
  }

  const crProps: MdaaCustomResourceProps = {
    resourceType: 'AgentCoreLogProtection',
    code: Code.fromAsset(`${__dirname}/../src/lambda/log_protection`),
    runtime: Runtime.PYTHON_3_14,
    handler: 'log_protection.lambda_handler',
    handlerRolePolicyStatements: handlerStatements,
    handlerPolicySuppressions: [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'logs:DescribeLogGroups does not support resource-level permissions ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html). ' +
          'Log group mutation actions are scoped to the deployment account/region and runtime-specific prefix pattern ' +
          '(/aws/bedrock-agentcore/runtimes/{runtimeId}-*).',
      },
    ],
    handlerProps: handlerProps,
    naming: props.naming,
    pascalCaseProperties: false,
    handlerTimeout: Duration.minutes(5),
  };

  return new MdaaCustomResource(scope, id, crProps);
}
