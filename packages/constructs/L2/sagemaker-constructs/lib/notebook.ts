/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefParamAndOutput, CaefConstructProps } from "@aws-caef/construct"
import { CfnNotebookInstance, CfnNotebookInstanceProps } from "aws-cdk-lib/aws-sagemaker"
import { Construct } from "constructs"

/**
 * Properties for creating a Compliance SageMaker NoteBook Instance
 */
export interface CaefNoteBookProps extends CaefConstructProps {
    /**
     * The id of the new notebook instance.
     */
    readonly notebookInstanceId: string
    /**
     * The name of the new notebook instance.
     */
    readonly notebookInstanceName?: string
    /**
     * The default execution role for launch Studio Apps within the domain 
     */
    readonly instanceType: string
    /**
     * SageMaker assumes this role to perform tasks on your behalf 
     */
    readonly roleArn: string
    /**
     * SageMaker uses this key (KMS Key ARN) to encrypt data on the storage volume attached to your notebook instance. 
     */
    readonly kmsKeyId: string
    /**
     * A list of Amazon Elastic Inference (EI) instance types to associate with the notebook instance.
     */
    readonly acceleratorTypes?: string[]
    /**
     * An array of up to three Git repositories associated with the notebook instance. 
     */
    readonly additionalCodeRepositories?: string[]
    /**
     * The Git repository associated with the notebook instance as its default code repository
     */
    readonly defaultCodeRepository?: string
    /**
     * AWS::SageMaker::NotebookInstance.InstanceMetadataServiceConfiguration. 
     */
    readonly instanceMetadataServiceConfiguration?: any
    /**
     * The name of a lifecycle configuration to associate with the notebook instance. 
     */
    readonly lifecycleConfigName?: string
    /**
     * The platform identifier of the notebook instance runtime environment.
     */
    readonly platformIdentifier?: string
    /**
     * The VPC security group IDs, in the form sg-xxxxxxxx.
     */
    readonly securityGroupIds: string[]
    /**
     * The ID of the subnet in a VPC to which you would like to have a connectivity from your ML compute instance.
     */
    readonly subnetId: string
    /**
     * The size, in GB, of the ML storage volume to attach to the notebook instance.
     */
    readonly volumeSizeInGb?: number
    /**
     * 	Whether root access is enabled or disabled for users of the notebook instance.  
     */
    readonly rootAccess?: string
}

/**
 * A construct for creating a compliance sagemaker Notebook instance.
 */
export class CaefNoteBook extends CfnNotebookInstance {

    private static setProps ( props: CaefNoteBookProps ): CfnNotebookInstanceProps {
        const overrideProps = {
            notebookInstanceName: props.naming.resourceName( props.notebookInstanceName ),
            rootAccess: ( props.rootAccess == "Enabled" ? "Enabled" : "Disabled" ),
            directInternetAccess: "Disabled"
        }
        const allProps = { ...props, ...overrideProps }
        return allProps
    }

    constructor( scope: Construct, id: string, props: CaefNoteBookProps ) {
        super( scope, id, CaefNoteBook.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "notebook",
                overrideResourceId: "id-" + props.notebookInstanceId,
                name: "id-" + props.notebookInstanceName,
                value: this.ref
            }, ...props
        },scope )
        new CaefParamAndOutput( this, {
            ...{
                resourceType: "notebook",
                overrideResourceId: "subnet-" + props.notebookInstanceId,
                name: "subnetId-" + props.notebookInstanceName,
                value: props.subnetId
            }, ...props
        },scope )
    }
}


