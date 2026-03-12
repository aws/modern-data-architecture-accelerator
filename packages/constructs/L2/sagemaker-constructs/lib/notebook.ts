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
  /** EC2 instance type for the SageMaker notebook instance determining compute capacity and */
  readonly instanceType: string;
  /** IAM role ARN for SageMaker service permissions enabling secure access to AWS services and resources */
  readonly roleArn: string;
  readonly kmsKeyId: string;
  /** Array of Elastic Inference instance types for ML inference acceleration enabling */
  readonly acceleratorTypes?: string[];
  /** Array of additional Git repositories for multi-repository development enabling */
  readonly additionalCodeRepositories?: string[];
  /** Default Git repository for primary development workflow enabling version-controlled ML development */
  readonly defaultCodeRepository?: string;
  /** Instance metadata service configuration for enhanced security compliance and metadata access control */
  readonly instanceMetadataServiceConfiguration?: InstanceMetadataServiceConfigurationProperty | IResolvable;
  /** Lifecycle configuration name for automated setup and teardown operations enabling */
  readonly lifecycleConfigName?: string;
  /** Platform identifier for runtime environment specification enabling platform-specific */
  readonly platformIdentifier?: string;
  readonly securityGroupIds: string[];
  /** VPC subnet ID for notebook instance placement enabling VPC integration and network connectivity */
  readonly subnetId: string;
  /** Storage volume size in GB for ML data and model storage enabling adequate workspace capacity */
  readonly volumeSizeInGb?: number;
  /** Root access control for notebook instance users enabling or restricting administrative */
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
