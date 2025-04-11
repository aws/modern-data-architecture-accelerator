/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
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
  LogRetentionRetryOptions,
  LoggingFormat,
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

const pjson = require('../package.json');

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
   *
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
   *
   * Use `Handler.FROM_IMAGE` when defining a function from a Docker image.
   *
   * NOTE: If you specify your source code as inline text by specifying the
   * ZipFile property within the Code property, specify index.function_name as
   * the handler.
   */
  readonly handler: string;
}

export interface MdaaLambdaFunctionOptions extends MdaaConstructProps {
  /**
   * A description of the function.
   *
   * @default - No description.
   */
  readonly description?: string;
  /**
   * The function execution time (in seconds) after which Lambda terminates
   * the function. Because the execution time affects cost, set this value
   * based on the function's expected execution time.
   *
   * @default Duration.seconds(3)
   */
  readonly timeout?: Duration;
  /**
   * Key-value pairs that Lambda caches and makes available for your Lambda
   * functions. Use environment variables to apply configuration changes, such
   * as test and production environment configurations, without changing your
   * Lambda function source code.
   *
   * @default - No environment variables.
   */
  readonly environment?: {
    [key: string]: string;
  };
  /**
   * A name for the function.
   *
   * @default - AWS CloudFormation generates a unique physical ID and uses that
   * ID for the function's name. For more information, see Name Type.
   */
  readonly functionName: string;
  /**
   * The amount of memory, in MB, that is allocated to your Lambda function.
   * Lambda uses this value to proportionally allocate the amount of CPU
   * power. For more information, see Resource Model in the AWS Lambda
   * Developer Guide.
   *
   * @default 128
   */
  readonly memorySize?: number;
  /**
   * The size of the function’s /tmp directory in MB.
   *
   * @default 512 MiB
   */
  readonly ephemeralStorageSize?: Size;
  /**
   * Initial policy statements to add to the created Lambda Role.
   *
   * You can call `addToRolePolicy` to the created lambda to add statements post creation.
   *
   * @default - No policy statements are added to the created Lambda role.
   */
  readonly initialPolicy?: PolicyStatement[];
  /**
   * Lambda execution role.
   *
   * This is the role that will be assumed by the function upon execution.
   * It controls the permissions that the function will have. The Role must
   * be assumable by the 'lambda.amazonaws.com' service principal.
   *
   * The default Role automatically has permissions granted for Lambda execution. If you
   * provide a Role, you must add the relevant AWS managed policies yourself.
   *
   * The relevant managed policies are "service-role/AWSLambdaBasicExecutionRole" and
   * "service-role/AWSLambdaVPCAccessExecutionRole".
   *
   * Both supplied and generated roles can always be changed by calling `addToRolePolicy`.
   */
  readonly role: IMdaaLambdaRole;
  /**
   * VPC network to place Lambda network interfaces
   *
   * Specify this if the Lambda function needs to access resources in a VPC.
   *
   * @default - Function is not placed within a VPC.
   */
  readonly vpc?: IVpc;
  /**
   * Where to place the network interfaces within the VPC.
   *
   * Only used if 'vpc' is supplied. Note: internet access for Lambdas
   * requires a NAT gateway, so picking Public subnets is not allowed.
   *
   * @default - the Vpc default strategy if not specified
   */
  readonly vpcSubnets?: SubnetSelection;
  /**
   * The list of security groups to associate with the Lambda's network interfaces.
   *
   * Only used if 'vpc' is supplied.
   *
   * @default - If the function is placed within a VPC and a security group is
   * not specified, either by this or securityGroup prop, a dedicated security
   * group will be created for this function.
   */
  readonly securityGroups?: ISecurityGroup[];
  /**
   * Whether to allow the Lambda to send all network traffic
   *
   * If set to false, you must individually add traffic rules to allow the
   * Lambda to connect to network targets.
   *
   * @default true
   */
  readonly allowAllOutbound?: boolean;
  /**
   * Enabled DLQ. If `deadLetterQueue` is undefined,
   * an SQS queue with default options will be defined for your Function.
   *
   * @default - false unless `deadLetterQueue` is set, which implies DLQ is enabled.
   */
  readonly deadLetterQueueEnabled?: boolean;
  /**
   * The SQS queue to use if DLQ is enabled.
   * If SNS topic is desired, specify `deadLetterTopic` property instead.
   *
   * @default - SQS queue with 14 day retention period if `deadLetterQueueEnabled` is `true`
   */
  readonly deadLetterQueue?: IQueue;
  /**
   * The SNS topic to use as a DLQ.
   * Note that if `deadLetterQueueEnabled` is set to `true`, an SQS queue will be created
   * rather than an SNS topic. Using an SNS topic as a DLQ requires this property to be set explicitly.
   *
   * @default - no SNS topic
   */
  readonly deadLetterTopic?: ITopic;
  /**
   * Enable AWS X-Ray Tracing for Lambda Function.
   *
   * @default Tracing.Disabled
   */
  readonly tracing?: Tracing;
  /**
   * Enable SnapStart for Lambda Function.
   * SnapStart is currently supported only for Java 11, 17 runtime
   *
   * @default - No snapstart
   */
  readonly snapStart?: SnapStartConf;
  /**
   * Enable profiling.
   * @see https://docs.aws.amazon.com/codeguru/latest/profiler-ug/setting-up-lambda.html
   *
   * @default - No profiling.
   */
  readonly profiling?: boolean;
  /**
   * Profiling Group.
   * @see https://docs.aws.amazon.com/codeguru/latest/profiler-ug/setting-up-lambda.html
   *
   * @default - A new profiling group will be created if `profiling` is set.
   */
  readonly profilingGroup?: IProfilingGroup;
  /**
   * Specify the version of CloudWatch Lambda insights to use for monitoring
   * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights.html
   *
   * When used with `DockerImageFunction` or `DockerImageCode`, the Docker image should have
   * the Lambda insights agent installed.
   * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-Getting-Started-docker.html
   *
   * @default - No Lambda Insights
   */
  readonly insightsVersion?: LambdaInsightsVersion;
  /**
   * Specify the configuration of AWS Distro for OpenTelemetry (ADOT) instrumentation
   * @see https://aws-otel.github.io/docs/getting-started/lambda
   *
   * @default - No ADOT instrumentation
   */
  readonly adotInstrumentation?: AdotInstrumentationConfig;

  /**
   * Specify the configuration of Parameters and Secrets Extension
   * @see https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html
   * @see https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
   *
   * @default - No Parameters and Secrets Extension
   */
  readonly paramsAndSecrets?: ParamsAndSecretsLayerVersion;
  /**
   * A list of layers to add to the function's execution environment. You can configure your Lambda function to pull in
   * additional code during initialization in the form of layers. Layers are packages of libraries or other dependencies
   * that can be used by multiple functions.
   *
   * @default - No layers.
   */
  readonly layers?: ILayerVersion[];
  /**
   * The maximum of concurrent executions you want to reserve for the function.
   *
   * @default - No specific limit - account limit.
   * @see https://docs.aws.amazon.com/lambda/latest/dg/concurrent-executions.html
   */
  readonly reservedConcurrentExecutions?: number;
  /**
   * Event sources for this function.
   *
   * You can also add event sources using `addEventSource`.
   *
   * @default - No event sources.
   */
  readonly events?: IEventSource[];
  /**
   * The number of days log events are kept in CloudWatch Logs. When updating
   * this property, unsetting it doesn't remove the log retention policy. To
   * remove the retention policy, set the value to `INFINITE`.
   *
   * This is a legacy API and we strongly recommend you move away from it if you can.
   * Instead create a fully customizable log group with `logs.LogGroup` and use the `logGroup` property
   * to instruct the Lambda function to send logs to it.
   * Migrating from `logRetention` to `logGroup` will cause the name of the log group to change.
   * Users and code and referencing the name verbatim will have to adjust.
   *
   * In AWS CDK code, you can access the log group name directly from the LogGroup construct:
   * ```ts
   * import * as logs from 'aws-cdk-lib/aws-logs';
   *
   * declare const myLogGroup: logs.LogGroup;
   * myLogGroup.logGroupName;
   * ```
   *
   * @default logs.RetentionDays.INFINITE
   */
  readonly logRetention?: RetentionDays;

  /**
   * The IAM role for the Lambda function associated with the custom resource
   * that sets the retention policy.
   *
   * This is a legacy API and we strongly recommend you migrate to `logGroup` if you can.
   * `logGroup` allows you to create a fully customizable log group and instruct the Lambda function to send logs to it.
   *
   * @default - A new role is created.
   */
  readonly logRetentionRole?: IRole;
  /**
   * When log retention is specified, a custom resource attempts to create the CloudWatch log group.
   * These options control the retry policy when interacting with CloudWatch APIs.
   *
   * @default - Default AWS SDK retry options.
   */
  readonly logRetentionRetryOptions?: LogRetentionRetryOptions;
  /**
   * Options for the `lambda.Version` resource automatically created by the
   * `fn.currentVersion` method.
   * @default - default options as described in `VersionOptions`
   */
  readonly currentVersionOptions?: VersionOptions;
  /**
   * The filesystem configuration for the lambda function
   *
   * @default - will not mount any filesystem
   */
  readonly filesystem?: FileSystem;
  /**
   * Lambda Functions in a public subnet can NOT access the internet.
   * Use this property to acknowledge this limitation and still place the function in a public subnet.
   * @see https://stackoverflow.com/questions/52992085/why-cant-an-aws-lambda-function-inside-a-public-subnet-in-a-vpc-connect-to-the/52994841#52994841
   *
   * @default false
   */
  readonly allowPublicSubnet?: boolean;
  /**
   * The AWS KMS key that's used to encrypt your function's environment variables.
   *
   * @default - AWS Lambda creates and uses an AWS managed customer master key (CMK).
   */
  readonly environmentEncryption?: IKey;
  /**
   * Code signing config associated with this function
   *
   * @default - Not Sign the Code
   */
  readonly codeSigningConfig?: ICodeSigningConfig;
  /**
   * The system architectures compatible with this lambda function.
   * @default Architecture.X86_64
   */
  readonly architecture?: Architecture;
  /**
   * Sets the runtime management configuration for a function's version.
   * @default Auto
   */
  readonly runtimeManagementMode?: RuntimeManagementMode;
  /**
   * The maximum age of a request that Lambda sends to a function for
   * processing.
   *
   * Minimum: 60 seconds
   * Maximum: 6 hours
   *
   * @default Duration.hours(6)
   */
  readonly maxEventAge?: Duration;
  /**
   * The maximum number of times to retry when the function returns an error.
   *
   * Minimum: 0
   * Maximum: 2
   *
   * @default 2
   */
  readonly retryAttempts?: number;
  /**
   * The log group the function sends logs to.
   *
   * By default, Lambda functions send logs to an automatically created default log group named /aws/lambda/\<function name\>.
   * However you cannot change the properties of this auto-created log group using the AWS CDK, e.g. you cannot set a different log retention.
   *
   * Use the `logGroup` property to create a fully customizable LogGroup ahead of time, and instruct the Lambda function to send logs to it.
   *
   * Providing a user-controlled log group was rolled out to commercial regions on 2023-11-16.
   * If you are deploying to another type of region, please check regional availability first.
   *
   * @default `/aws/lambda/${this.functionName}` - default log group created by Lambda
   */
  readonly logGroup?: ILogGroup;

  /**
   * Sets the logFormat for the function.
   * @default "Text"
   */
  readonly logFormat?: string;

  /**
   * Sets the loggingFormat for the function.
   * @default LoggingFormat.TEXT
   */
  readonly loggingFormat?: LoggingFormat;

  /**
   * Sets the application log level for the function.
   * @default "INFO"
   */
  readonly applicationLogLevel?: string;

  /**
   * Sets the system log level for the function.
   * @default "INFO"
   */
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
        ...{
          resourceType: 'lambda',
          resourceId: props.functionName,
          name: 'name',
          value: this.functionName,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'lambda',
          resourceId: props.functionName,
          name: 'arn',
          value: this.functionArn,
        },
        ...props,
      },
      scope,
    );
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
