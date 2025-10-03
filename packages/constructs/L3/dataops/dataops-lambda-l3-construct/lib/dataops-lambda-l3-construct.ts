/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-mdaa/ec2-l3-construct';
import { EventBridgeHelper, EventBridgeProps } from '@aws-mdaa/eventbridge-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  MdaaDockerImageFunction,
  MdaaDockerImageFunctionProps,
  MdaaLambdaFunction,
  MdaaLambdaFunctionOptions,
  MdaaLambdaFunctionProps,
  MdaaLambdaRole,
} from '@aws-mdaa/lambda-constructs';
import { aws_events_targets, Duration, Size } from 'aws-cdk-lib';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { IKey } from 'aws-cdk-lib/aws-kms';
import {
  Code,
  DockerImageCode,
  Function as LambdaFunction,
  IFunction,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';

/**
 * Q-ENHANCED-INTERFACE
 * VPC configuration properties for Lambda function deployment providing networking and security controls. Defines VPC networking configuration for Lambda functions including subnet placement, security groups, and network access controls for secure function deployment.
 *
 * Use cases: VPC Lambda deployment; Network isolation; Security group configuration; Subnet placement
 *
 * AWS: VPC configuration for Lambda function networking and security controls
 *
 * Validation: vpcId and subnetIds are required; securityGroupId and securityGroupEgressRules are optional
 */
export interface VpcConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for Lambda function deployment enabling network isolation and VPC connectivity for secure function execution. Defines the specific VPC where the Lambda function will be deployed for network isolation and secure connectivity to VPC resources.
   *
   * Use cases: VPC deployment; Network isolation; Secure connectivity; VPC resource access
   *
   * AWS: AWS VPC ID for Lambda function VPC deployment and network isolation
   *
   * Validation: Must be valid VPC ID; required for VPC Lambda deployment; enables secure network connectivity
   **/
  readonly vpcId: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet IDs for Lambda function placement controlling availability zone distribution and network segmentation. Defines the specific subnets within the VPC where Lambda function ENIs will be created for network connectivity and availability.
   *
   * Use cases: Subnet placement; Availability zone distribution; Network segmentation; ENI placement
   *
   * AWS: Subnet IDs for Lambda function ENI placement and network connectivity
   *
   * Validation: Must be array of valid subnet ID strings; required for Lambda subnet placement and connectivity
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group ID for Lambda function network access control enabling custom security group configuration and traffic filtering. When specified, uses existing security group for Lambda function network access control; otherwise creates new security group.
   *
   * Use cases: Custom security group; Network access control; Traffic filtering; Security configuration
   *
   * AWS: Security group ID for Lambda function network access control and traffic filtering
   *
   * Validation: Must be valid security group ID if provided; enables custom security group configuration
   **/
  readonly securityGroupId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group egress rules for Lambda function outbound traffic control enabling fine-grained network access management and security controls. Provides custom egress rules for Lambda function security group controlling outbound network access.
   *
   * Use cases: Egress control; Outbound traffic filtering; Network security; Access management
   *
   * AWS: Security group egress rules for Lambda function outbound traffic control and network security
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; enables custom egress rule configuration
   *   **/
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataOps Lambda function deployment with S3 event processing and EventBridge integration capabilities. Defines Lambda function properties for data processing workflows triggered by S3 object events and EventBridge rules in data lake operations.
 *
 * Use cases: S3 event-driven data processing; CSV to Parquet transformation; Data validation workflows; EventBridge-triggered data operations
 *
 * AWS: AWS Lambda function configuration for data processing with S3 EventBridge notifications and custom event rules
 *
 * Validation: srcDir must exist and contain deployable code; runtime must be valid Lambda runtime; handler must match code structure
 */
export interface FunctionProps extends FunctionOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Required source code directory path containing Lambda function code for data processing operations. Specifies the local directory with function source code that will be packaged and deployed for S3 event processing and data transformation workflows.
   *
   * Use cases: CSV to Parquet transformation code; Data validation scripts; S3 event processing logic; Custom data pipeline functions
   *
   * AWS: Lambda function source code location for deployment packaging and data processing function creation
   *
   * Validation: Must be valid directory path containing deployable Lambda code; directory must exist and be readable
   **/
  readonly srcDir: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function handler specification for data processing entry point. Defines the specific function handler within the source code that Lambda will invoke for S3 events and EventBridge triggers in data operations.
   *
   * Use cases: Python data processing handlers; Node.js transformation functions; Custom event processing entry points; Data pipeline orchestration
   *
   * AWS: Lambda function handler for S3 event processing and data transformation execution
   *
   * Validation: Must match handler format for specified runtime (e.g., 'index.handler' for Node.js, 'main.lambda_handler' for Python)
   **/
  readonly handler?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda runtime specification for data processing execution environment. Defines the runtime environment for executing data transformation and S3 event processing functions with support for Python and Node.js data operations.
   *
   * Use cases: Python 3.9 for pandas data processing; Node.js 18.x for JSON transformations; Custom runtime environments; Data science libraries
   *
   * AWS: Lambda runtime environment for data processing function execution and library support
   *
   * Validation: Must be valid Lambda runtime (python3.9, nodejs18.x, etc.); must be compatible with source code and data processing libraries
   **/
  readonly runtime?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Docker container build flag for custom data processing environments. When enabled, expects srcDir to contain Dockerfile for custom runtime environments with specialized data processing libraries and dependencies.
   *
   * Use cases: Custom Python environments with ML libraries; Specialized data processing containers; Complex dependency management; Custom data science stacks
   *
   * AWS: Lambda container image deployment for custom data processing runtime environments and specialized libraries
   *
   * Validation: When true, srcDir must contain valid Dockerfile; container must be compatible with Lambda execution environment
   **/
  readonly dockerBuild?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional principal ARN for Lambda invoke permissions enabling controlled access to data processing functions. Specifies AWS principals that can invoke the Lambda function for S3 event processing and data transformation operations.
   *
   * Use cases: S3 service principal for event triggers; EventBridge service access; Cross-account data processing; Step Functions integration
   *
   * AWS: Lambda function invoke permission for S3 EventBridge notifications and data processing service integration
   *
   * Validation: Must be valid AWS principal ARN; principal must exist and have appropriate permissions for data operations
   **/
  readonly grantInvoke?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional resource permissions for Lambda function access control in data processing workflows. Provides fine-grained permissions beyond basic invoke for complex S3 data operations and cross-service integration scenarios.
   *
   * Use cases: S3 bucket access for data processing; Glue catalog permissions; DynamoDB table access; SNS notification permissions
   *
   * AWS: Lambda resource policy permissions for data processing access control and service integration
   *
   * Validation: Must be valid SID to AdditionalResourcePermission mapping; enables complex data processing permission scenarios
   *   **/
  readonly additionalResourcePermissions?: { [sid: string]: AdditionalResourcePermission };
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lambda resource permission management enabling fine-grained access control for data processing operations. Defines specific permissions for AWS principals to access Lambda functions with optional source restrictions for enhanced security in data workflows.
 *
 * Use cases: S3 service permissions for event processing; EventBridge rule access; Cross-account data processing; Service-to-service integration
 *
 * AWS: Lambda resource policy permissions for controlled data processing function access and service integration
 *
 * Validation: principal and action are required; sourceAccount and sourceArn provide additional security for service principals
 */
export interface AdditionalResourcePermission {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS principal ARN for Lambda function access in data processing workflows. Specifies the AWS principal (IAM role, user, service, or account) that will be granted permission to access the Lambda function for S3 event processing and data operations.
   *
   * Use cases: S3 service principal for event notifications; EventBridge service for rule triggers; Cross-account data processing roles; Step Functions execution roles
   *
   * AWS: Lambda resource policy principal for data processing function access and service integration
   *
   * Validation: Must be valid AWS principal ARN format; principal must exist and be accessible for data operations
   **/
  readonly principal: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lambda action specification for data processing function permissions. Defines the specific Lambda action that will be granted to the principal for controlled access to data processing functions and workflow orchestration.
   *
   * Use cases: lambda:InvokeFunction for S3 event processing; lambda:InvokeAsync for asynchronous data operations; Custom actions for specific data workflows
   *
   * AWS: Lambda action permission for data processing function access and operation authorization
   *
   * Validation: Must be valid Lambda action (lambda:InvokeFunction, lambda:InvokeAsync, etc.); action must be appropriate for data processing use case
   **/
  readonly action: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional source AWS account restriction for enhanced security in cross-account data processing scenarios. When specified with service principals, restricts Lambda function access to originate from the specified account for additional security in data operations.
   *
   * Use cases: Cross-account S3 event processing; Multi-account data lake architectures; Secure service-to-service data operations; Account-based access control
   *
   * AWS: Lambda resource policy source account condition for enhanced cross-account data processing security
   *
   * Validation: Must be valid 12-digit AWS account ID if specified; used with service principals for additional data processing security
   **/
  readonly sourceAccount?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional source resource ARN restriction for fine-grained access control in data processing workflows. When specified with service principals, restricts Lambda function access to originate from specific AWS resources for enhanced security in data operations.
   *
   * Use cases: Specific S3 bucket event processing; EventBridge rule source restrictions; Resource-specific data processing access; Fine-grained security controls
   *
   * AWS: Lambda resource policy source ARN condition for resource-specific data processing access control
   *
   * Validation: Must be valid AWS resource ARN if specified; used with service principals for resource-specific data processing access
   **/
  readonly sourceArn?: string;
}

export interface FunctionOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Required basic function name for Lambda function identification and management. Provides the function identifier for Lambda operations and serves as the primary reference for function management and invocation.
   *
   * Use cases: Function identification; Lambda management; Function invocation; Resource tracking
   *
   * AWS: AWS Lambda function name for identification and management operations
   *
   * Validation: Must be unique function name string; required for function creation and identification
   **/
  readonly functionName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the Lambda function explaining its purpose and data processing operations for documentation and management clarity. Provides human-readable description of the function's purpose and the data operations it performs.
   *
   * Use cases: Function documentation; Operational clarity; Data processing explanation; Management understanding
   *
   * AWS: AWS Lambda function description for documentation and operational clarity
   *
   * Validation: Must be descriptive text if provided; recommended for function documentation and operational understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for Lambda function execution permissions enabling secure access to AWS services and resources. Provides the execution role that Lambda assumes to execute the function and access data sources, outputs, and other AWS services.
   *
   * Use cases: Function permissions; Service access; Security roles; Resource authorization
   *
   * AWS: AWS IAM role ARN for Lambda function execution permissions and service access
   *
   * Validation: Must be valid IAM role ARN string; required for function execution permissions and resource access
   **/
  readonly roleArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EventBridge configuration for event-driven function execution enabling automated data processing workflows. Defines EventBridge integration for triggering Lambda functions based on events for automated data processing and workflow orchestration.
   *
   * Use cases: Event-driven processing; Workflow automation; Data pipeline triggers; Event orchestration
   *
   * AWS: Amazon EventBridge integration for Lambda function event-driven execution
   *
   * Validation: Must be valid EventBridgeProps object if provided; enables event-driven function execution when configured
   **/
  readonly eventBridge?: EventBridgeProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC configuration for function network deployment enabling secure networking and resource access within VPC environments. Defines VPC networking configuration for Lambda functions including subnet placement and security groups.
   *
   * Use cases: VPC deployment; Secure networking; Private resource access; Network isolation
   *
   * AWS: AWS VPC configuration for Lambda function networking and security
   *
   * Validation: Must be valid VpcConfigProps object if provided; enables VPC deployment when configured
   **/
  readonly vpcConfig?: VpcConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum event age in seconds controlling event processing time limits for data processing workflows. Defines the maximum age of events that Lambda will process before discarding them for event freshness and processing relevance.
   *
   * Use cases: Event freshness; Processing time limits; Data relevance; Event lifecycle management
   *
   * AWS: AWS Lambda maximum event age for event processing time control
   *
   * Validation: Must be between 60 and 21600 seconds if provided; defaults to 21600 seconds (6 hours)
   **/
  readonly maxEventAgeSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry attempts for failed function executions enabling fault tolerance and reliability. Defines the maximum number of times Lambda will retry function execution after errors for improved reliability and fault tolerance in data processing workflows.
   *
   * Use cases: Fault tolerance; Function reliability; Error recovery; Retry logic
   *
   * AWS: AWS Lambda retry attempts for failed function execution recovery and fault tolerance
   *
   * Validation: Must be between 0 and 2 if provided; defaults to 2; enables automatic retry for failed executions
   **/
  readonly retryAttempts?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of generated layer names to be added to the function enabling code reuse and dependency management. Specifies layers generated by the configuration that will be attached to the function for shared code and dependencies.
   *
   * Use cases: Code reuse; Dependency management; Shared libraries; Layer management
   *
   * AWS: AWS Lambda layers for code reuse and dependency management
   *
   * Validation: Must be array of valid layer names if provided; enables layer attachment when specified
   **/
  readonly generatedLayerNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of existing layer version ARNs to be directly added to the function enabling external dependency integration. Provides direct layer ARN references for attaching existing layers to the function for external dependencies and shared code.
   *
   * Use cases: External dependencies; Existing layer integration; Shared code; Layer reuse
   *
   * AWS: AWS Lambda layer ARNs for external layer integration and dependency management
   *
   * Validation: Must be valid layer name to ARN mapping if provided; enables external layer integration when specified
   *   **/
  readonly layerArns?: { [name: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional function execution timeout in seconds controlling maximum execution time for data processing operations. Defines the maximum time the function can run before Lambda terminates it, critical for processing workflows and cost management.
   *
   * Use cases: Execution timeout; Cost control; Processing time limits; Resource management
   *
   * AWS: AWS Lambda function timeout for execution time control and resource management
   *
   * Validation: Must be positive integer in seconds if provided; defaults to 3 seconds; affects function execution and cost
   **/
  readonly timeoutSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for function configuration enabling runtime configuration and parameter passing. Defines key-value pairs that Lambda caches and makes available for function execution enabling configuration changes without code modifications.
   *
   * Use cases: Runtime configuration; Parameter passing; Environment-specific settings; Configuration management
   *
   * AWS: AWS Lambda environment variables for function configuration and runtime parameters
   *
   * Validation: Must be valid key-value string pairs if provided; enables runtime configuration when specified
   *   **/
  readonly environment?: {
    [key: string]: string;
  };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional reserved concurrent executions for function capacity management enabling performance control and cost optimization. Defines the maximum number of concurrent executions reserved for the function affecting performance isolation and resource allocation.
   *
   * Use cases: Performance control; Capacity management; Cost optimization; Resource isolation
   *
   * AWS: AWS Lambda reserved concurrent executions for function capacity and performance management
   *
   * Validation: Must be positive integer if provided; affects function concurrency and account limits
   **/
  readonly reservedConcurrentExecutions?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional memory allocation in MB for function execution enabling performance optimization and resource management. Defines the amount of memory allocated to the function affecting CPU power allocation and execution performance for data processing operations.
   *
   * Use cases: Performance optimization; Memory allocation; CPU power; Resource management
   *
   * AWS: AWS Lambda memory size for function performance and resource allocation
   *
   * Validation: Must be between 128 and 10240 MB if provided; defaults to 128 MB; affects performance and cost
   **/
  readonly memorySizeMB?: number;
  /**
   * The size of the function’s /tmp directory in MB.
   * @default 512 MiB
   */
  readonly ephemeralStorageSizeMB?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * LayerProps configuration interface for serverless data processing and event-driven workflows.
 *
 * Use cases: Serverless data processing; Event-driven workflows; S3 event handling; Data transformation
 *
 * AWS: AWS Lambda configuration for serverless data processing and event-driven workflows
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS Lambda and MDAA requirements
 */
export interface LayerProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required source directory or ZIP file path for Lambda layer code deployment enabling shared library and dependency management. Defines the location of the layer code that will be packaged and deployed as a Lambda layer for reuse across multiple Lambda functions.
   *
   * Use cases: Shared library deployment; Dependency management; Code reuse; Lambda layer creation; Common utilities
   *
   * AWS: AWS Lambda layer source code path for shared library deployment and dependency management
   *
   * Validation: Must be valid directory path or ZIP file path; required for layer code deployment
   **/
  readonly src: string;
  /**
   * Description of the layer
   */
  readonly description?: string;
  /**
   * Layer name
   */
  readonly layerName: string;
  /**
   * If true, src is expected to contain a Dockerfile for building the layer
   */
  readonly dockerBuild?: boolean;
}
export interface LambdaFunctionL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for Lambda function encryption enabling secure environment variable and dead letter queue encryption. Provides customer-managed KMS key for encrypting Lambda function environment variables and dead letter queues ensuring data protection and security compliance.
   *
   * Use cases: Function encryption; Environment variable security; Dead letter queue encryption; Data protection
   *
   * AWS: KMS key ARN for Lambda function encryption and secure data protection
   *
   * Validation: Must be valid KMS key ARN; required for Lambda function encryption and security compliance
   **/
  readonly kmsArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda layer definitions for code sharing and dependency management enabling reusable components and optimized deployment. Provides layer configurations for shared code, libraries, and dependencies across multiple Lambda functions for efficient deployment and management.
   *
   * Use cases: Code sharing; Dependency management; Reusable components; Deployment optimization
   *
   * AWS: Lambda layers for code sharing and dependency management across functions
   *
   * Validation: Must be array of valid LayerProps if provided; enables layer-based code sharing and dependency management
   *   **/
  readonly layers?: LayerProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda function definitions for serverless application deployment enabling function configuration and management. Provides function configurations for serverless application components providing deployment and operational settings.
   *
   * Use cases: Function deployment; Serverless applications; Function configuration; Application components
   *
   * AWS: Lambda functions for serverless application deployment and function management
   *
   * Validation: Must be array of valid FunctionProps if provided; enables function deployment and configuration
   *   **/
  readonly functions?: FunctionProps[];
  readonly overrideScope?: boolean;
}

export class LambdaFunctionL3Construct extends MdaaL3Construct {
  protected readonly props: LambdaFunctionL3ConstructProps;
  private readonly projectKmsKey: IKey;
  public readonly functionsMap: { [name: string]: LambdaFunction } = {};

  constructor(scope: Construct, id: string, props: LambdaFunctionL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.kmsArn) {
      throw new Error('Project kms key must be defined');
    }
    this.projectKmsKey = MdaaKmsKey.fromKeyArn(
      props.overrideScope ? this : this.scope,
      'project-kms',
      this.props.kmsArn,
    );

    const generatedLayers = Object.fromEntries(
      this.props.layers?.map(layerProps => {
        return [layerProps.layerName, this.createLambdaLayer(layerProps)];
      }) || [],
    );

    // Build our functions!
    this.props.functions?.forEach(functionProps => {
      this.functionsMap[functionProps.functionName] = this.createFunctionFromProps(functionProps, generatedLayers);
    });

    //Remove unneeded inline policies which CDK automatically adds to execution role
    //We add a resource policy to the DLQ which allows the execution role to write to it.
    //This avoids hitting NIST.800.53.R5-IAMNoInlinePolicy and HIPAA.Security-IAMNoInlinePolicy
    (this.props.overrideScope ? this : this.scope).node.children.forEach(child => {
      if (child.node.id.startsWith('LambdaRole')) {
        this.node.tryRemoveChild(child.node.id);
      }
    });
  }

  private createLambdaLayer(layerProps: LayerProps): LayerVersion {
    const code = layerProps.dockerBuild ? Code.fromDockerBuild(layerProps.src) : Code.fromAsset(layerProps.src);

    return new LayerVersion(this.props.overrideScope ? this : this.scope, `layer-${layerProps.layerName}`, {
      code,
      layerVersionName: this.props.naming.resourceName(layerProps.layerName, 64),
      description: layerProps.description,
    });
  }

  /** @jsii ignore */
  private createFunctionFromProps(
    functionProps: FunctionProps,
    generatedLayersByName: { [name: string]: LayerVersion },
  ): LambdaFunction {
    const role = MdaaLambdaRole.fromRoleArn(
      this.props.overrideScope ? this : this.scope,
      `lambda-role-${functionProps.functionName}`,
      functionProps.roleArn,
    );

    let functionVpcProps = {};
    if (functionProps.vpcConfig) {
      const securityGroup = functionProps.vpcConfig.securityGroupId
        ? SecurityGroup.fromSecurityGroupId(
            this,
            `${functionProps.functionName}-sg`,
            functionProps.vpcConfig.securityGroupId,
          )
        : this.createFunctionSecurityGroup(
            `${functionProps.functionName}-sg`,
            functionProps.vpcConfig?.vpcId,
            functionProps.vpcConfig.securityGroupEgressRules,
          );

      const vpc = Vpc.fromVpcAttributes(this, `vpc-${functionProps.functionName}`, {
        availabilityZones: ['dummy'],
        vpcId: functionProps.vpcConfig.vpcId,
      });

      const subnets = functionProps.vpcConfig.subnetIds.map(id => {
        return Subnet.fromSubnetId(this, `${functionProps.functionName}-subnet-${id}`, id);
      });

      functionVpcProps = {
        securityGroups: [securityGroup],
        vpc: vpc,
        vpcSubnets: {
          subnets: subnets,
        },
      };
    }

    const dlq = EventBridgeHelper.createDlq(
      this.props.overrideScope ? this : this.scope,
      this.props.naming,
      functionProps.functionName,
      this.projectKmsKey,
      role,
    );

    const lambdaOptions: MdaaLambdaFunctionOptions = {
      ...functionVpcProps,
      functionName: functionProps.functionName,
      description: functionProps.description,

      role: role,
      environmentEncryption: this.projectKmsKey,
      naming: this.props.naming,
      deadLetterQueue: dlq,
      retryAttempts: functionProps.retryAttempts,
      maxEventAge: functionProps.maxEventAgeSeconds ? Duration.seconds(functionProps.maxEventAgeSeconds) : undefined,
      timeout: functionProps.timeoutSeconds ? Duration.seconds(functionProps.timeoutSeconds) : undefined,
      environment: functionProps.environment,
      reservedConcurrentExecutions: functionProps.reservedConcurrentExecutions,
      memorySize: functionProps.memorySizeMB,
      ephemeralStorageSize: functionProps.ephemeralStorageSizeMB
        ? Size.mebibytes(functionProps.ephemeralStorageSizeMB)
        : undefined,
    };

    const lambdaFunction = this.createDockerOrLambdaFunction(lambdaOptions, functionProps, generatedLayersByName);

    // Add resource based permission
    if (functionProps.grantInvoke) {
      lambdaFunction.grantInvoke(new ArnPrincipal(functionProps.grantInvoke));
    }

    // Add additional resource based permissions
    if (functionProps.additionalResourcePermissions) {
      Object.entries(functionProps.additionalResourcePermissions).forEach(([sid, permission]) => {
        const permissionProps = {
          principal: new ArnPrincipal(permission.principal),
          action: permission.action,
          ...(permission.sourceArn && { sourceArn: permission.sourceArn }),
          ...(permission.sourceAccount && { sourceAccount: permission.sourceAccount }),
        };
        lambdaFunction.addPermission(sid, permissionProps);
      });
    }

    //An inline policy to allow the Lambda role to write to DLQ is automatically added,
    //but this triggers Nags. Instead, we use the Queue Resource policy,
    //and remove the inline policy here.
    role.node.tryRemoveChild('Policy');

    MdaaNagSuppressions.addCodeResourceSuppressions(
      lambdaFunction,
      [
        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'VPC Not Required' },
        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'VPC Not Required' },
        { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'VPC Not Required' },
      ],
      true,
    );

    if (functionProps.eventBridge) {
      this.createFunctionEventBridgeRules(functionProps.eventBridge, functionProps.functionName, lambdaFunction);
    }

    return lambdaFunction;
  }
  private createDockerOrLambdaFunction(
    lambdaOptions: MdaaLambdaFunctionOptions,
    functionProps: FunctionProps,
    generatedLayersByName: { [name: string]: LayerVersion },
  ): LambdaFunction {
    if (functionProps.dockerBuild) {
      const lambdaProps: MdaaDockerImageFunctionProps = {
        ...lambdaOptions,
        code: DockerImageCode.fromImageAsset(functionProps.srcDir),
      };
      return new MdaaDockerImageFunction(
        this.props.overrideScope ? this : this.scope,
        functionProps.functionName,
        lambdaProps,
      );
    } else {
      if (!functionProps.runtime) {
        throw new Error('Function runtime must be defined for non-docker functions');
      }
      if (!functionProps.handler) {
        throw new Error('Function handler must be defined for non-docker functions');
      }
      const existingLayers = Object.entries(functionProps.layerArns || {}).map(entry =>
        LayerVersion.fromLayerVersionArn(
          this.props.overrideScope ? this : this.scope,
          `${functionProps.functionName}-${entry[0]}`,
          entry[1],
        ),
      );

      const generatedLayers = functionProps.generatedLayerNames?.map(generatedLayerName => {
        const generatedLayer = generatedLayersByName[generatedLayerName];
        if (!generatedLayer) {
          throw new Error(`Function references non-existant generated layer ${generatedLayerName}`);
        }
        return generatedLayer;
      });
      const lambdaProps: MdaaLambdaFunctionProps = {
        ...lambdaOptions,
        runtime: new Runtime(functionProps.runtime),
        code: Code.fromAsset(functionProps.srcDir),
        handler: functionProps.handler,
        layers: [...(generatedLayers || []), ...existingLayers],
      };

      return new MdaaLambdaFunction(
        this.props.overrideScope ? this : this.scope,
        functionProps.functionName,
        lambdaProps,
      );
    }
  }

  private createFunctionSecurityGroup(
    sgName: string,
    vpcId: string,
    securityGroupEgressRules?: MdaaSecurityGroupRuleProps,
  ): SecurityGroup {
    const ec2L3Props: Ec2L3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      adminRoles: [],
      securityGroups: {
        [sgName]: {
          vpcId: vpcId,
          egressRules: securityGroupEgressRules,
        },
      },
    };
    const ec2Construct = new Ec2L3Construct(this, `ec2`, ec2L3Props);
    return ec2Construct.securityGroups[sgName];
  }

  private createFunctionEventBridgeRules(
    eventBridgeProps: EventBridgeProps,
    functionName: string,
    lambdaFunction: IFunction,
  ) {
    const dlq = EventBridgeHelper.createDlq(
      this.props.overrideScope ? this : this.scope,
      this.props.naming,
      `${functionName}-events`,
      this.projectKmsKey,
    );

    const eventBridgeRuleProps = EventBridgeHelper.createNamedEventBridgeRuleProps(eventBridgeProps, functionName);

    Object.entries(eventBridgeRuleProps).forEach(propsEntry => {
      const ruleName = propsEntry[0];
      const ruleProps = propsEntry[1];
      const target = new aws_events_targets.LambdaFunction(lambdaFunction, {
        deadLetterQueue: dlq,
        maxEventAge: eventBridgeProps.maxEventAgeSeconds
          ? Duration.seconds(eventBridgeProps.maxEventAgeSeconds)
          : undefined,
        retryAttempts: eventBridgeProps.retryAttempts,
        event: RuleTargetInput.fromObject(ruleProps.input),
      });
      EventBridgeHelper.createEventBridgeRuleForTarget(
        this.props.overrideScope ? this : this.scope,
        this.props.naming,
        target,
        ruleName,
        ruleProps,
      );
    });
  }
}
