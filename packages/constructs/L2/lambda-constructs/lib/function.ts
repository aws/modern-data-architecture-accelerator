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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the Lambda function explaining its purpose and functionality. Provides documentation for function management and helps identify function roles in data processing workflows.
   *
   * Use cases: Function documentation; Management clarity; Operational understanding
   *
   * AWS: AWS Lambda function description for management and identification
   *
   * Validation: Must be descriptive text if provided; recommended for function documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function timeout duration controlling maximum execution time for data processing operations. Defines the maximum time the function can run before being terminated, critical for data processing workflows and cost control.
   *
   * Use cases: Data processing time limits; Cost control; Workflow timeout management; Long-running data operations
   *
   * AWS: AWS Lambda function timeout configuration for execution time control
   *
   * Validation: Must be Duration between 1 second and 15 minutes; defaults to 3 minutes for data processing functions
   **/
  readonly timeout?: Duration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for Lambda function configuration and runtime behavior. Enables dynamic configuration without code changes for different environments and processing parameters.
   *
   * Use cases: Environment-specific configuration; Runtime parameters; Processing settings
   *
   * AWS: AWS Lambda environment variables for runtime configuration
   *
   * Validation: Must be object with string keys and values if provided; cached by Lambda runtime
   *   **/
  readonly environment?: {
    [key: string]: string;
  };
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the Lambda function that will be processed through MDAA naming conventions. Provides predictable function naming for cross-service integration and operational management.
   *
   * Use cases: Predictable function naming; Cross-service integration; Operational management
   *
   * AWS: AWS Lambda function name for resource identification and invocation
   *
   * Validation: Must be valid function name; required; processed through MDAA naming with 64 character limit
   **/
  readonly functionName: string;
  readonly memorySize?: number;
  /**
   * The size of the function’s /tmp directory in MB.
   * @default 512 MiB
   */
  readonly ephemeralStorageSize?: Size;
  readonly initialPolicy?: PolicyStatement[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lambda execution role providing the function with permissions to access AWS services and resources. Must be assumable by lambda.amazonaws.com service principal and include appropriate managed policies for Lambda execution and VPC access if needed.
   *
   * Use cases: Service permissions; AWS resource access; VPC connectivity permissions
   *
   * AWS: AWS Lambda execution role for service permissions and resource access
   *
   * Validation: Must be valid IMdaaLambdaRole instance; required; must be assumable by lambda.amazonaws.com
   *   **/
  readonly role: IMdaaLambdaRole;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC for placing Lambda network interfaces enabling access to VPC resources. When specified, Lambda function can access VPC-only resources like RDS databases, ElastiCache clusters, and internal load balancers.
   *
   * Use cases: VPC resource access; Database connectivity; Internal service communication
   *
   * AWS: AWS Lambda VPC configuration for network interface placement and resource access
   *
   * Validation: Must be valid IVpc instance if provided; requires NAT gateway for internet access
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of security groups for Lambda network interface access control. Defines network-level permissions for VPC-enabled Lambda functions to control inbound and outbound traffic patterns.
   *
   * Use cases: Network access control; Traffic filtering; Security group management
   *
   * AWS: AWS Lambda VPC security group association for network access control
   *
   * Validation: Must be array of valid ISecurityGroup instances if provided; only used with VPC
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda layers to add to the function's execution environment for shared code and dependencies. Enables code reuse across multiple functions and provides pre-packaged libraries and runtime dependencies for efficient function deployment.
   *
   * Use cases: Code reuse across functions; Shared library dependencies; Runtime optimization
   *
   * AWS: AWS Lambda layers for shared code and dependency management
   *
   * Validation: Must be array of valid ILayerVersion instances if provided; layers loaded during function initialization
   * @default - No layers.
   */
  readonly layers?: ILayerVersion[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum number of concurrent executions reserved for this function enabling performance isolation and cost control. Reserves capacity from the account's concurrent execution limit to ensure predictable performance and prevent resource contention.
   *
   * Use cases: Performance isolation; Cost control; Resource reservation for critical functions
   *
   * AWS: AWS Lambda reserved concurrency for function-specific execution limits
   *
   * Validation: Must be positive integer if provided; reserves capacity from account limit; affects function scaling
   * @default - No specific limit - account limit.
   * See: https://docs.aws.amazon.com/lambda/latest/dg/concurrent-executions.html
   */
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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional system architecture specification for Lambda function execution environment controlling processor architecture and performance characteristics. Determines whether the function runs on x86_64 or ARM64 architecture affecting performance and cost characteristics.
   *
   * Use cases: Architecture selection; Performance optimization; Cost management; ARM64 compatibility
   *
   * AWS: AWS Lambda function architecture for processor type and performance characteristics
   *
   * Validation: Must be valid Architecture enum if provided; defaults to X86_64; affects performance and pricing
   **/
  readonly architecture?: Architecture;
  readonly runtimeManagementMode?: RuntimeManagementMode;
  readonly maxEventAge?: Duration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum number of retry attempts when the function returns an error controlling error handling resilience and failure management. Defines how many times Lambda retries failed function executions before sending to dead letter queue or discarding.
   *
   * Use cases: Error handling resilience; Failure management; Retry control; Reliability configuration
   *
   * AWS: AWS Lambda retry configuration for error handling and failure management
   *
   * Validation: Must be integer between 0 and 2 if provided; defaults to 2 retry attempts
   **/
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
