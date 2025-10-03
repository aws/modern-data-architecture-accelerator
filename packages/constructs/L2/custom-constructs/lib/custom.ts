/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { CustomResource, CustomResourceProps, Duration, Stack } from 'aws-cdk-lib';
import { Policy, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Code, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';

import { Construct } from 'constructs';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { ConfigurationElement } from '@aws-mdaa/config';
import { NagPackSuppression } from 'cdk-nag';

// nosemgrep
const _ = require('lodash');

export interface MdaaCustomResourceProps extends MdaaConstructProps {
  readonly resourceType: string;
  readonly code: Code;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lambda runtime environment for custom resource handler execution providing the execution environment for the handler code. Specifies the runtime version and language environment for consistent and secure code execution.
   *
   * Use cases: Runtime environment specification; Code execution environment; Language runtime selection; Performance optimization
   *
   * AWS: AWS Lambda runtime for custom resource handler execution environment and code execution
   *
   * Validation: Must be valid Runtime enum; required; specifies Lambda execution environment
   **/
  readonly runtime: Runtime;
  /**
   * Q-ENHANCED-PROPERTY
   * Required handler function entry point specification defining the function to invoke for custom resource operations. Specifies the exact function name and module path for CloudFormation to invoke during resource lifecycle events.
   *
   * Use cases: Function entry point; Handler specification; Code execution control; Resource operation routing
   *
   * AWS: AWS Lambda function handler specification for custom resource operation entry point
   *
   * Validation: Must be valid handler string format; required; defines function entry point for resource operations
   **/
  readonly handler: string;
  readonly handlerRolePolicyStatements: PolicyStatement[];
  readonly handlerPolicySuppressions?: NagPackSuppression[];
  readonly handlerFunctionSuppressions?: NagPackSuppression[];
  readonly handlerProps: ConfigurationElement;
  readonly handlerLayers?: ILayerVersion[];
  readonly pascalCaseProperties?: boolean;
  readonly handlerTimeout?: Duration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC configuration for handler function network isolation and secure connectivity enabling VPC-based resource access. Provides network isolation and secure connectivity to VPC resources for enhanced security and integration.
   *
   * Use cases: Network isolation; VPC resource access; Secure connectivity; Private network integration; Enhanced security
   *
   * AWS: AWS Lambda VPC configuration for network isolation and secure VPC resource access
   *
   * Validation: Must be valid IVpc object if provided; enables VPC-based network isolation and resource access
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc?: IVpc;
  readonly subnet?: SubnetSelection;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group for handler function network access control defining inbound and outbound traffic rules. Provides network-level security controls for handler function access and VPC resource connectivity.
   *
   * Use cases: Network access control; Security group management; Traffic rule enforcement; VPC security configuration
   *
   * AWS: AWS Lambda security group for network access control and VPC security configuration
   *
   * Validation: Must be valid ISecurityGroup object if provided; controls handler function network access
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
  readonly securityGroup?: ISecurityGroup;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for handler function runtime configuration enabling dynamic configuration and parameter passing. Provides runtime configuration values and parameters for handler function execution and behavior customization.
   *
   * Use cases: Runtime configuration; Environment variables; Dynamic parameters; Handler customization; Configuration management
   *
   * AWS: AWS Lambda environment variables for runtime configuration and parameter management
   *
   * Validation: Must be object with string keys and values if provided; provides handler runtime configuration
   *   **/
  readonly environment?: { [key: string]: string };
}

export class MdaaCustomResource extends CustomResource {
  public handlerFunction: MdaaLambdaFunction;
  protected static handlerFunctionPlaceHolder: MdaaLambdaFunction;

  private static setProps(scope: Construct, props: MdaaCustomResourceProps) {
    const stack = Stack.of(scope);

    const handlerFunctionName = props.naming.resourceName(`${props.resourceType}-handler`, 64);

    const handlerRoleResourceId = `custom-${props.resourceType}-handler-role`;
    const existingHandlerRole = stack.node.tryFindChild(handlerRoleResourceId) as Role;
    const handlerRole = existingHandlerRole
      ? existingHandlerRole
      : new MdaaLambdaRole(stack, handlerRoleResourceId, {
          roleName: `${props.resourceType}-handler`,
          naming: props.naming,
          logGroupNames: [handlerFunctionName],
          createParams: false,
          createOutputs: false,
        });

    const handlerPolicyResourceId = `custom-${props.resourceType}-handler-policy`;
    const existingPolicy = stack.node.tryFindChild(handlerPolicyResourceId) as Policy;
    const handlerPolicy = existingPolicy
      ? existingPolicy
      : new Policy(stack, handlerPolicyResourceId, {
          policyName: `${props.resourceType}-handler`,
          document: new PolicyDocument({ statements: props.handlerRolePolicyStatements }),
        });

    if (existingPolicy) {
      handlerPolicy.addStatements(...props.handlerRolePolicyStatements);
    } else {
      handlerRole.attachInlinePolicy(handlerPolicy);
      MdaaNagSuppressions.addCodeResourceSuppressions(
        handlerPolicy,
        [
          {
            id: 'NIST.800.53.R5-IAMNoInlinePolicy',
            reason: 'Function is for custom resource; inline policy use appropriate',
          },
          {
            id: 'HIPAA.Security-IAMNoInlinePolicy',
            reason: 'Function is for custom resource; inline policy use appropriate',
          },
          {
            id: 'PCI.DSS.321-IAMNoInlinePolicy',
            reason: 'Function is for custom resource; inline policy use appropriate',
          },
          ...(props.handlerPolicySuppressions || []),
        ],
        true,
      );
    }

    const handlerFunctionResourceId = `custom-${props.resourceType}-handler-function`;
    const existingHandlerFunction = stack.node.tryFindChild(handlerFunctionResourceId) as MdaaLambdaFunction;
    this.handlerFunctionPlaceHolder = existingHandlerFunction
      ? existingHandlerFunction
      : new MdaaLambdaFunction(stack, handlerFunctionResourceId, {
          naming: props.naming,
          runtime: props.runtime,
          code: props.code,
          handler: props.handler,
          role: handlerRole,
          functionName: `${props.resourceType}-handler`,
          layers: props.handlerLayers,
          timeout: props.handlerTimeout ? props.handlerTimeout : Duration.seconds(60),
          vpc: props.vpc,
          vpcSubnets: props.subnet,
          securityGroups: props.securityGroup ? [props.securityGroup] : undefined,
          environment: props.environment,
        });

    this.handlerFunctionPlaceHolder.node.addDependency(handlerPolicy);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.handlerFunctionPlaceHolder,
      [
        ...(props.handlerFunctionSuppressions || []),
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource.' },
        { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'Function is for custom resource.' },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );

    const providerFunctionName = props.naming.resourceName(`${props.resourceType}-provider`, 64);
    const providerRoleResourceId = `custom-${props.resourceType}-provider-role`;
    const existingProviderRole = stack.node.tryFindChild(providerRoleResourceId) as Role;
    const providerRole = existingProviderRole
      ? existingProviderRole
      : new MdaaLambdaRole(stack, providerRoleResourceId, {
          description: 'CR Role',
          roleName: `${props.resourceType}-provider`,
          naming: props.naming,
          logGroupNames: [providerFunctionName],
          createParams: false,
          createOutputs: false,
        });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      providerRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );
    const providerResourceId = `custom-${props.resourceType}-provider`;
    const existingProvider = stack.node.tryFindChild(providerResourceId) as Provider;
    const provider = existingProvider
      ? existingProvider
      : new Provider(stack, providerResourceId, {
          onEventHandler: this.handlerFunctionPlaceHolder,
          frameworkOnEventRole: providerRole,
          providerFunctionName: providerFunctionName,
        });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      provider,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda function Runtime set by CDK Provider Framework',
        },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );

    const crProps: CustomResourceProps = {
      resourceType: `Custom::${props.resourceType}`,
      serviceToken: provider.serviceToken,
      properties: props.pascalCaseProperties
        ? (MdaaCustomResource.pascalCase(props.handlerProps) as ConfigurationElement)
        : props.handlerProps,
    };
    return crProps;
  }

  constructor(scope: Construct, id: string, props: MdaaCustomResourceProps) {
    super(scope, id, MdaaCustomResource.setProps(scope, props));

    this.handlerFunction = MdaaCustomResource.handlerFunctionPlaceHolder;
  }

  public static pascalCase<T>(props: T): unknown {
    return _.transform(props, MdaaCustomResource.transformUpperCaseObj, {});
  }

  private static upcaseFirst(str: string): string {
    if (str === '') {
      return str;
    }
    return `${str[0].toLocaleUpperCase()}${str.slice(1)}`;
  }

  private static transformUpperCaseObj(result: ConfigurationElement, value: unknown, key: string) {
    const newKey = MdaaCustomResource.upcaseFirst(key);
    if (typeof value === 'string' || value instanceof String) result[newKey] = value;
    else if (value instanceof Array) result[newKey] = MdaaCustomResource.transformUpperCaseObjArray(value);
    else if (value instanceof Object) {
      result[newKey] = _.transform(value, MdaaCustomResource.transformUpperCaseObj, {});
    } else result[newKey] = value;
  }

  private static transformUpperCaseObjArray(values: unknown[]): unknown {
    return values.map(value => {
      if (typeof value === 'string' || value instanceof String) return value;
      else if (value instanceof Array) return this.transformUpperCaseObjArray(value);
      else if (value instanceof Object) return _.transform(value, MdaaCustomResource.transformUpperCaseObj, {});
      else return value;
    });
  }
}
