/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Duration, Size } from 'aws-cdk-lib';
import { IProfilingGroup } from 'aws-cdk-lib/aws-codeguruprofiler';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import {
  AdotInstrumentationConfig,
  Architecture,
  Code,
  DockerImageCode,
  FileSystem,
  Function,
  FunctionProps,
  Handler,
  ICodeSigningConfig,
  IEventSource,
  ILayerVersion,
  LambdaInsightsVersion,
  LoggingFormat,
  LogRetentionRetryOptions,
  ParamsAndSecretsLayerVersion,
  Runtime,
  RuntimeManagementMode,
  SnapStartConf,
  Tracing,
  VersionOptions,
} from 'aws-cdk-lib/aws-lambda';
import { ILogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { IMdaaLambdaRole } from './role';
import * as pjson from '../package.json';

export interface MdaaDockerImageFunctionProps extends MdaaLambdaFunctionOptions {
  /**
   * The source code of your Lambda function. You can point to a file in an
   * Amazon Simple Storage Service (Amazon S3) bucket or specify your source
   * code as inline text.
   */
  readonly code: DockerImageCode;
}

/**
 * Properties for creating a compliant Lambda function
 */
export interface MdaaLambdaFunctionProps extends MdaaLambdaFunctionOptions {
  /**
   * The runtime environment for the Lambda function that you are uploading.
   * For valid values, see the Runtime property in the AWS Lambda Developer
   * Guide.
   * Use `Runtime.FROM_IMAGE` when when defining a function from a Docker image.
   */
  readonly runtime: Runtime;
  /**
   * The source code of your Lambda function. You can point to a file in an
   * Amazon Simple Storage Service (Amazon S3) bucket or specify your source
   * code as inline text.
   */
  readonly code: Code;
  /**
   * The name of the method within your code that Lambda calls to execute
   * your function. The format includes the file name. It can also include
   * namespaces and other qualifiers, depending on the runtime.
   * For more information, see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-features.html#gettingstarted-features-programmingmodel.
   * Use `Handler.FROM_IMAGE` when defining a function from a Docker image.
   * NOTE: If you specify your source code as inline text by specifying the
   * ZipFile property within the Code property, specify index.function_name as
   * the handler.
   */
  readonly handler: string;
}

export interface MdaaLambdaFunctionOptions extends MdaaConstructProps {
  /** Human-readable description of the Lambda function explaining its purpose and functionality */
  readonly description?: string;
  /** Lambda function timeout duration controlling maximum execution time for data processing operations */
  readonly timeout?: Duration;
  /** Environment variables for Lambda function configuration and runtime behavior */
  readonly environment?: {
    [key: string]: string;
  };
  /** Name for the Lambda function that will be processed through MDAA naming conventions */
  readonly functionName: string;
  readonly memorySize?: number;
  /**
   * The size of the function’s /tmp directory in MB.
   * @default 512 MiB
   */
  readonly ephemeralStorageSize?: Size;
  readonly initialPolicy?: PolicyStatement[];
  /** Lambda execution role providing the function with permissions to access AWS services and resources */
  readonly role: IMdaaLambdaRole;
  /** VPC for placing Lambda network interfaces enabling access to VPC resources */
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  /** Array of security groups for Lambda network interface access control */
  readonly securityGroups?: ISecurityGroup[];
  readonly allowAllOutbound?: boolean;
  readonly deadLetterQueueEnabled?: boolean;
  readonly deadLetterQueue?: IQueue;
  readonly deadLetterTopic?: ITopic;
  readonly tracing?: Tracing;
  readonly snapStart?: SnapStartConf;
  readonly profiling?: boolean;
  readonly profilingGroup?: IProfilingGroup;
  readonly insightsVersion?: LambdaInsightsVersion;
  readonly adotInstrumentation?: AdotInstrumentationConfig;

  readonly paramsAndSecrets?: ParamsAndSecretsLayerVersion;
  /** Array of Lambda layers to add to the function's execution environment for shared code and dependencies */
  readonly layers?: ILayerVersion[];
  readonly reservedConcurrentExecutions?: number;
  readonly events?: IEventSource[];
  readonly logRetention?: RetentionDays;

  readonly logRetentionRole?: IRole;
  /**
   * When log retention is specified, a custom resource attempts to create the CloudWatch log group.
   * These options control the retry policy when interacting with CloudWatch APIs.
   * @default - Default AWS SDK retry options.
   */
  readonly logRetentionRetryOptions?: LogRetentionRetryOptions;
  /**
   * Options for the `lambda.Version` resource automatically created by the
   * `fn.currentVersion` method.
   * @default - default options as described in `VersionOptions`
   */
  readonly currentVersionOptions?: VersionOptions;
  readonly filesystem?: FileSystem;
  readonly allowPublicSubnet?: boolean;
  readonly environmentEncryption?: IKey;
  readonly codeSigningConfig?: ICodeSigningConfig;
  /** System architecture specification for Lambda function execution environment controlling */
  readonly architecture?: Architecture;
  readonly runtimeManagementMode?: RuntimeManagementMode;
  readonly maxEventAge?: Duration;
  /** Maximum number of retry attempts when the function returns an error controlling error */
  readonly retryAttempts?: number;
  readonly logGroup?: ILogGroup;
  readonly logFormat?: string;
  readonly loggingFormat?: LoggingFormat;
  readonly applicationLogLevel?: string;
  readonly systemLogLevel?: string;
}

/**
 * Construct for creating a compliant Lambda Function
 */
export class MdaaLambdaFunction extends Function {
  private static setProps(props: MdaaLambdaFunctionProps): FunctionProps {
    const overrideProps = {
      functionName: props.naming.resourceName(props.functionName, 64),
      environment: {
        ...props.environment,
        USER_AGENT_STRING: `AWSSOLUTION/${pjson.solution_id}/v${pjson.version}`,
      },
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaLambdaFunctionProps) {
    super(scope, id, MdaaLambdaFunction.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'lambda',
        resourceId: props.functionName,
        name: 'name',
        value: this.functionName,
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'lambda',
        resourceId: props.functionName,
        name: 'arn',
        value: this.functionArn,
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'lambda',
        resourceId: props.functionName,
        name: 'log-group',
        value: `/aws/lambda/${this.functionName}`,
        ...props,
      },
      scope,
    );

    // Apply CDK-NAG suppressions for LogRetention custom resource if it gets
    // created by external code accessing this.logGroup
    this.applyLogRetentionSuppressions();
  }

  private applyLogRetentionSuppressions(): void {
    const stack = this.node.root;
    const allConstructs = stack.node.findAll();
    const logRetentionConstructs = allConstructs.filter(child => child.node.id.startsWith('LogRetention'));

    const suppressions = [
      {
        id: 'AwsSolutions-IAM4',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        reason:
          'LogRetention custom resource requires AWSLambdaBasicExecutionRole for CloudWatch Logs management. This is a CDK-managed resource with minimal permissions.',
      },
      {
        id: 'AwsSolutions-IAM5',
        appliesTo: ['Resource::*'],
        reason:
          'LogRetention custom resource requires wildcard permissions for CloudWatch Logs API calls. Log stream names are dynamically generated and cannot be predetermined.',
      },
      {
        id: 'NIST.800.53.R5-IAMNoInlinePolicy',
        reason:
          'LogRetention custom resource uses inline policy as part of CDK implementation. This is a managed construct with minimal, scoped permissions for log retention management.',
      },
      {
        id: 'HIPAA.Security-IAMNoInlinePolicy',
        reason:
          'LogRetention custom resource uses inline policy as part of CDK implementation. This is a managed construct with minimal, scoped permissions for log retention management.',
      },
      {
        id: 'PCI.DSS.321-IAMNoInlinePolicy',
        reason:
          'LogRetention custom resource uses inline policy as part of CDK implementation. This is a managed construct with minimal, scoped permissions for log retention management.',
      },
    ];

    for (const logRetentionConstruct of logRetentionConstructs) {
      MdaaNagSuppressions.addCodeResourceSuppressions(logRetentionConstruct, suppressions, true);
    }
  }
}

/**
 * Create a lambda function where the handler is a docker image
 */
export class MdaaDockerImageFunction extends MdaaLambdaFunction {
  constructor(scope: Construct, id: string, props: MdaaDockerImageFunctionProps) {
    super(scope, id, {
      ...props,
      handler: Handler.FROM_IMAGE,
      runtime: Runtime.FROM_IMAGE,
      code: props.code._bind(props.architecture),
    });
  }
}
