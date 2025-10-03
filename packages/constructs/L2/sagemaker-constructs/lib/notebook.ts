/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnNotebookInstance, CfnNotebookInstanceProps } from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';
import { IResolvable } from 'aws-cdk-lib';
import { sanitizeNotebookName, MAX_NOTEBOOK_NAME_LENGTH } from './utils';
import InstanceMetadataServiceConfigurationProperty = CfnNotebookInstance.InstanceMetadataServiceConfigurationProperty;

export interface MdaaNoteBookProps extends MdaaConstructProps {
  readonly notebookInstanceId: string;
  readonly notebookInstanceName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required EC2 instance type for the SageMaker notebook instance determining compute capacity and performance characteristics. Specifies the underlying EC2 instance type affecting processing power, memory, and cost for ML development and experimentation workloads.
   *
   * Use cases: Compute capacity; Performance optimization; Cost management; ML workload sizing
   *
   * AWS: Amazon SageMaker notebook instance type for compute capacity and performance
   *
   * Validation: Must be valid SageMaker instance type string; required for instance provisioning and performance
   **/
  readonly instanceType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for SageMaker service permissions enabling secure access to AWS services and resources. Provides the execution role that SageMaker assumes to perform operations on behalf of the notebook instance for data access and service integration.
   *
   * Use cases: Service permissions; AWS resource access; Security roles; Service integration
   *
   * AWS: AWS IAM role ARN for SageMaker notebook instance service permissions
   *
   * Validation: Must be valid IAM role ARN string; required for SageMaker service operations and resource access
   **/
  readonly roleArn: string;
  readonly kmsKeyId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Elastic Inference instance types for ML inference acceleration enabling cost-effective model testing and development. Provides EI accelerators for notebook instances to optimize inference performance and reduce costs during model development.
   *
   * Use cases: ML inference acceleration; Cost-effective model testing; Development environment optimization; Performance enhancement
   *
   * AWS: Amazon Elastic Inference accelerator types for SageMaker notebook instance acceleration
   *
   * Validation: Must be valid EI instance type strings if provided; enables inference acceleration when specified
   **/
  readonly acceleratorTypes?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional Git repositories for multi-repository development enabling collaborative ML projects and shared code access. Provides access to multiple Git repositories beyond the default repository for development workflows.
   *
   * Use cases: Multi-repository development; Collaborative ML projects; Shared code library access; Version control integration
   *
   * AWS: Amazon SageMaker notebook instance additional code repositories for multi-repo access
   *
   * Validation: Must be array of valid Git repository URLs if provided; maximum of 3 repositories
   **/
  readonly additionalCodeRepositories?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional default Git repository for primary development workflow enabling version-controlled ML development. Defines the primary Git repository that will be automatically cloned and available in the notebook instance for ML development and experimentation.
   *
   * Use cases: Primary development repository; Default code access; ML project initialization; Version-controlled development
   *
   * AWS: Amazon SageMaker notebook instance default code repository for primary development
   *
   * Validation: Must be valid Git repository URL if provided; enables default repository access when specified
   **/
  readonly defaultCodeRepository?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional instance metadata service configuration for enhanced security compliance and metadata access control. Defines metadata service configuration including minimum version requirements and access controls for security hardening in ML environments.
   *
   * Use cases: Security compliance; Metadata access control; Instance security hardening; IMDS version enforcement
   *
   * AWS: Amazon SageMaker notebook instance metadata service configuration for security compliance
   *
   * Validation: Must be valid InstanceMetadataServiceConfigurationProperty if provided; enhances security when configured
   **/
  readonly instanceMetadataServiceConfiguration?: InstanceMetadataServiceConfigurationProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle configuration name for automated setup and teardown operations enabling environment customization and resource management. Defines lifecycle configuration that executes scripts during notebook instance start and stop events.
   *
   * Use cases: Environment customization; Automated setup scripts; Package installation; Resource initialization; Custom configuration
   *
   * AWS: Amazon SageMaker notebook instance lifecycle configuration for automated environment setup
   *
   * Validation: Must be valid lifecycle configuration name if provided; enables automated environment management when specified
   **/
  readonly lifecycleConfigName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional platform identifier for runtime environment specification enabling platform-specific optimizations and compatibility. Defines the platform type for the notebook instance runtime environment for ML framework compatibility and optimization.
   *
   * Use cases: Platform-specific optimization; Runtime environment selection; Compute platform targeting; ML framework compatibility
   *
   * AWS: Amazon SageMaker notebook instance platform identifier for runtime environment specification
   *
   * Validation: Must be valid platform identifier string if provided; enables platform-specific optimization when specified
   **/
  readonly platformIdentifier?: string;
  readonly securityGroupIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC subnet ID for notebook instance placement enabling VPC integration and network connectivity. Specifies the subnet where the notebook instance will be deployed for secure networking and integration with other VPC resources.
   *
   * Use cases: VPC integration; Network connectivity; Subnet placement; Secure networking
   *
   * AWS: Amazon VPC subnet ID for SageMaker notebook instance placement and networking
   *
   * Validation: Must be valid VPC subnet ID string; required for notebook instance VPC deployment and connectivity
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional storage volume size in GB for ML data and model storage enabling adequate workspace capacity. Defines the storage capacity for the notebook instance to accommodate datasets, models, and development artifacts in ML workflows.
   *
   * Use cases: ML data storage; Model artifact storage; Development workspace sizing; Dataset management; Storage capacity planning
   *
   * AWS: Amazon SageMaker notebook instance storage volume size for ML data and model storage
   *
   * Validation: Must be positive integer in GB if provided; minimum 5GB; affects storage capacity and cost
   **/
  readonly volumeSizeInGb?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional root access control for notebook instance users enabling or restricting administrative privileges for security compliance. Defines root access permissions for notebook instance users affecting administrative operations and security posture.
   *
   * Use cases: Security compliance; Administrative access control; User privilege management; Security hardening
   *
   * AWS: Amazon SageMaker notebook instance root access control for user privilege management
   *
   * Validation: Must be 'Enabled' or 'Disabled' if provided; defaults to 'Disabled' for enhanced security
   **/
  readonly rootAccess?: string;
}

/**
 * A construct for creating a compliance sagemaker Notebook instance.
 */
export class MdaaNoteBook extends CfnNotebookInstance {
  private static setProps(props: MdaaNoteBookProps): CfnNotebookInstanceProps {
    const overrideProps = {
      notebookInstanceName: sanitizeNotebookName(
        props.naming.resourceName(props.notebookInstanceName, MAX_NOTEBOOK_NAME_LENGTH),
      ),
      rootAccess: props.rootAccess == 'Enabled' ? 'Enabled' : 'Disabled',
      directInternetAccess: 'Disabled',
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaNoteBookProps) {
    super(scope, id, MdaaNoteBook.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'notebook',
          overrideResourceId: 'id-' + props.notebookInstanceId,
          name: 'id-' + props.notebookInstanceName,
          value: this.ref,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'notebook',
          overrideResourceId: 'subnet-' + props.notebookInstanceId,
          name: 'subnetId-' + props.notebookInstanceName,
          value: props.subnetId,
        },
        ...props,
      },
      scope,
    );
  }
}
