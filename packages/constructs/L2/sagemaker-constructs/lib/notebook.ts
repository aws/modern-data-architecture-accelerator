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

/**
 * Properties for creating a Compliance SageMaker NoteBook Instance
 */
export interface MdaaNoteBookProps extends MdaaConstructProps {
  /**
   * The id of the new notebook instance.
   */
  readonly notebookInstanceId: string;
  /**
   * The name of the new notebook instance.
   */
  readonly notebookInstanceName?: string;
  /**
   * The default execution role for launch Studio Apps within the domain
   */
  readonly instanceType: string;
  /**
   * SageMaker assumes this role to perform tasks on your behalf
   */
  readonly roleArn: string;
  /**
   * SageMaker uses this key (KMS Key ARN) to encrypt data on the storage volume attached to your notebook instance.
   */
  readonly kmsKeyId: string;
  /**
   * A list of Amazon Elastic Inference (EI) instance types to associate with the notebook instance.
   */
  readonly acceleratorTypes?: string[];
  /**
   * An array of up to three Git repositories associated with the notebook instance.
   */
  readonly additionalCodeRepositories?: string[];
  /**
   * The Git repository associated with the notebook instance as its default code repository
   */
  readonly defaultCodeRepository?: string;
  /**
   * AWS::SageMaker::NotebookInstance.InstanceMetadataServiceConfiguration.
   */
  readonly instanceMetadataServiceConfiguration?: InstanceMetadataServiceConfigurationProperty | IResolvable;
  /**
   * The name of a lifecycle configuration to associate with the notebook instance.
   */
  readonly lifecycleConfigName?: string;
  /**
   * The platform identifier of the notebook instance runtime environment.
   */
  readonly platformIdentifier?: string;
  /**
   * The VPC security group IDs, in the form sg-xxxxxxxx.
   */
  readonly securityGroupIds: string[];
  /**
   * The ID of the subnet in a VPC to which you would like to have a connectivity from your ML compute instance.
   */
  readonly subnetId: string;
  /**
   * The size, in GB, of the ML storage volume to attach to the notebook instance.
   */
  readonly volumeSizeInGb?: number;
  /**
   *  Whether root access is enabled or disabled for users of the notebook instance.
   */
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
