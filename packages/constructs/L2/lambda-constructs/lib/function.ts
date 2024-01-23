/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { Duration, Size } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { IProfilingGroup } from 'aws-cdk-lib/aws-codeguruprofiler';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, FileSystem, Function, FunctionProps, ICodeSigningConfig, ILayerVersion, LambdaInsightsVersion, LogRetentionRetryOptions, Runtime, Tracing, VersionOptions } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ICaefLambdaRole } from './role';

/**
 * Properties for creating a compliant Lambda function
 */
export interface CaefLambdaFunctionProps extends CaefConstructProps {
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
        [ key: string ]: string;
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
    readonly role: ICaefLambdaRole
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
}

/**
 * Construct for creating a compliant Lambda Function
 */
export class CaefLambdaFunction extends Function {

    private static setProps ( props: CaefLambdaFunctionProps ): FunctionProps {
        const overrideProps = {
            functionName: props.naming.resourceName( props.functionName, 64 )
        }
        return { ...props, ...overrideProps }
    }
    constructor( scope: Construct, id: string, props: CaefLambdaFunctionProps ) {
        super( scope, id, CaefLambdaFunction.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "lambda",
                resourceId: props.functionName,
                name: "name",
                value: this.functionName
            }, ...props
        },scope )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "lambda",
                resourceId: props.functionName,
                name: "arn",
                value: this.functionArn
            }, ...props
        },scope )
    }
}
