import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Shared } from '../shared';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface SageMakerModelProps extends cdk.NestedStackProps, MdaaL3ConstructProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly region: string;
  readonly model: ModelConfig;
  readonly shared: Shared;
  readonly encryptionKey?: MdaaKmsKey;
}

export enum DeploymentType {
  Container = 'container',
  ModelPackage = 'model-package',
  CustomInferenceScript = 'custom-inference-script',
}

export type ModelConfig = ModelContainerConfig | ModelPackageConfig | ModelCustomScriptConfig;

export interface ModelConfigBase {
  readonly modelId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required EC2 instance type for SageMaker model hosting determining compute capacity and performance characteristics. Specifies the underlying compute instance type for model inference affecting performance, cost, and availability for GAIA model serving operations.
   *
   * Use cases: Performance optimization; Cost management; Compute capacity; Model serving; Resource allocation
   *
   * AWS: Amazon SageMaker endpoint instance type for model hosting and inference compute capacity
   *
   * Validation: Must be valid SageMaker-supported EC2 instance type; required for endpoint deployment and compute allocation
   **/
  readonly instanceType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required initial number of instances for SageMaker model endpoint deployment determining starting capacity and availability. Specifies the number of instances to deploy initially for model serving, affecting performance, availability, and cost for GAIA model inference operations.
   *
   * Use cases: Initial capacity; Performance baseline; Availability setup; Cost optimization; Load handling
   *
   * AWS: Amazon SageMaker endpoint initial instance count for model hosting capacity and availability
   *
   * Validation: Must be positive integer; should be between minInstanceCount and maxInstanceCount; required for endpoint deployment
   **/
  readonly initialInstanceCount: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required minimum number of instances for SageMaker model endpoint auto-scaling ensuring baseline availability and performance. Specifies the minimum instance count for auto-scaling operations, providing guaranteed capacity and availability for GAIA model inference under varying load conditions.
   *
   * Use cases: Minimum availability; Auto-scaling bounds; Performance guarantee; Cost control; Baseline capacity
   *
   * AWS: Amazon SageMaker endpoint auto-scaling minimum instance count for guaranteed model availability
   *
   * Validation: Must be positive integer; must be less than or equal to initialInstanceCount and maxInstanceCount
   **/
  readonly minInstanceCount: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required maximum number of instances for SageMaker model endpoint auto-scaling controlling peak capacity and cost limits. Specifies the maximum instance count for auto-scaling operations, providing capacity limits and cost control for GAIA model inference during high demand periods.
   *
   * Use cases: Peak capacity; Cost control; Auto-scaling limits; Performance scaling; Resource management
   *
   * AWS: Amazon SageMaker endpoint auto-scaling maximum instance count for capacity limits and cost control
   *
   * Validation: Must be positive integer; must be greater than or equal to initialInstanceCount and minInstanceCount
   **/
  readonly maxInstanceCount: number;
}

export interface ModelContainerConfig extends ModelConfigBase {
  /**
   * Q-ENHANCED-PROPERTY
   * Required deployment type specification for container-based SageMaker model deployment enabling container image hosting. Identifies this configuration as a container deployment type for GAIA model serving using custom Docker images with full control over the inference environment.
   *
   * Use cases: Deployment type identification; Container deployment; Model serving type; Configuration validation; Deployment routing
   *
   * AWS: Amazon SageMaker model deployment type specification for container-based model hosting
   *
   * Validation: Must be DeploymentType.Container enum value; required for container deployment identification and routing
   *   **/
  readonly type: DeploymentType.Container;
  readonly container?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for SageMaker model container configuration enabling runtime customization and configuration. Provides key-value pairs for container environment variables affecting model behavior, configuration, and integration with GAIA platform services.
   *
   * Use cases: Runtime configuration; Model parameters; Service integration; Environment customization; Configuration management
   *
   * AWS: Amazon SageMaker model container environment variables for runtime configuration and model behavior
   *
   * Validation: Must be valid key-value string pairs if provided; keys and values must be valid environment variable format
   *   **/
  readonly env?: { [key: string]: string };
  readonly containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelPackageConfig extends ModelConfigBase {
  /**
   * Q-ENHANCED-PROPERTY
   * Required deployment type specification for model package-based SageMaker deployment enabling pre-built model hosting. Identifies this configuration as a model package deployment type for GAIA model serving using AWS Marketplace or custom model packages with managed inference environments.
   *
   * Use cases: Deployment type identification; Model package deployment; Managed model serving; Configuration validation; Deployment routing
   *
   * AWS: Amazon SageMaker model deployment type specification for model package-based hosting
   *
   * Validation: Must be DeploymentType.ModelPackage enum value; required for model package deployment identification and routing
   *   **/
  readonly type: DeploymentType.ModelPackage;
  /**
   * Q-ENHANCED-PROPERTY
   * Required function that returns CloudFormation mapping for model package resolution enabling dynamic package selection. Provides a function that creates CloudFormation mappings for model package ARNs based on region and other parameters, enabling flexible model package deployment across different environments and regions.
   *
   * Use cases: Package resolution; Multi-region deployment; Dynamic package selection; CloudFormation mapping; Environment-specific packages
   *
   * AWS: AWS CloudFormation mapping for SageMaker model package ARN resolution and deployment configuration
   *
   * Validation: Must be function that accepts Construct scope and returns valid CfnMapping; required for package resolution and deployment
   */
  packages: (scope: Construct) => cdk.CfnMapping;
  readonly containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelCustomScriptConfig extends Omit<ModelConfigBase, 'modelId'> {
  /**
   * Q-ENHANCED-PROPERTY
   * Required deployment type specification for custom inference script-based SageMaker deployment enabling serverless model hosting. Identifies this configuration as a custom inference script deployment type for GAIA model serving using Lambda functions with custom inference logic and flexible runtime environments.
   *
   * Use cases: Deployment type identification; Custom script deployment; Serverless model serving; Configuration validation; Deployment routing
   *
   * AWS: Amazon SageMaker model deployment type specification for custom inference script-based hosting
   *
   * Validation: Must be DeploymentType.CustomInferenceScript enum value; required for custom script deployment identification and routing
   *   **/
  readonly type: DeploymentType.CustomInferenceScript;
  readonly modelId: string | string[];
  readonly codeFolder: string;
  readonly container?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for SageMaker custom inference script configuration enabling runtime customization. Provides key-value pairs for environment variables affecting custom inference script behavior, configuration, and integration with GAIA platform services and external resources.
   *
   * Use cases: Runtime configuration; Script parameters; Service integration; Environment customization; Configuration management
   *
   * AWS: Amazon SageMaker custom inference script environment variables for runtime configuration and behavior
   *
   * Validation: Must be valid key-value string pairs if provided; keys and values must be valid environment variable format
   *   **/
  readonly env?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function architecture for SageMaker custom inference script deployment enabling architecture-specific optimization. Specifies the processor architecture for Lambda function execution affecting performance, compatibility, and cost for GAIA custom inference operations.
   *
   * Use cases: Architecture optimization; Performance tuning; Compatibility requirements; Cost optimization; Processor selection
   *
   * AWS: AWS Lambda function architecture for SageMaker custom inference script execution environment
   *
   * Validation: Must be valid Lambda Architecture enum value if provided; optional with default architecture selection based on requirements
   *   **/
  readonly architecture?: lambda.Architecture;
  /**
   * Q-ENHANCED-PROPERTY
   * Lambda runtime environment for SageMaker model deployment and inference operations in the GAIA generative AI platform. Specifies the execution runtime for Lambda functions handling model invocation, response processing, and AI service integration enabling serverless AI model deployment and management.
   *
   * Use cases: Model inference; AI service integration; Serverless deployment; Runtime compatibility; Function execution
   *
   * AWS: AWS Lambda runtime environment for SageMaker model invocation and AI service operations
   *
   * Validation: Must be valid Lambda Runtime; optional with default runtime selection based on code requirements
   *   **/
  readonly runtime?: lambda.Runtime;
}
