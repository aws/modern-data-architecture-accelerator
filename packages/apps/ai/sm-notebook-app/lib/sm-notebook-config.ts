/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "@aws-caef/app";
import { NamedLifecycleConfigProps, NotebookAssetDeploymentConfig, NotebookWithIdProps } from "@aws-caef/sm-notebook-l3-construct";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";
import * as configSchema from './config-schema.json';


export interface SageMakerNotebookConfigContents extends CaefBaseConfigContents {
    readonly assetDeploymentConfig?: NotebookAssetDeploymentConfig
    readonly lifecycleConfigs?: NamedLifecycleConfigProps
    readonly kmsKeyArn?: string
    /**
     * List of sagemaker notebook instances to be launched.
     */
    readonly notebooks?: NotebookWithIdProps
}

export class SageMakerNotebookConfigParser extends CaefAppConfigParser<SageMakerNotebookConfigContents> {
    public readonly kmsKeyArn?: string
    public readonly notebooks?: NotebookWithIdProps
    public readonly lifecycleConfigs?: NamedLifecycleConfigProps
    public readonly assetDeployment: NotebookAssetDeploymentConfig | undefined;

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.assetDeployment = this.configContents.assetDeploymentConfig
        this.kmsKeyArn = this.configContents.kmsKeyArn
        this.notebooks = this.configContents.notebooks
        this.lifecycleConfigs = this.configContents.lifecycleConfigs
    }
}

