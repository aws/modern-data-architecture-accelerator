/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { Code, LayerVersion, LayerVersionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export type Boto3Version = '1.33.13'

/**
 * Properties for creating a Boto3 Lambda Layer
 */
export interface CaefBoto3LayerVersionProps extends CaefConstructProps {
    readonly boto3Version?: Boto3Version
}

/**
 * Construct for creating a Boto3 Lambda Layer
 */
export class CaefBoto3LayerVersion extends LayerVersion {
    public static readonly BOTO3_LATEST_VERSION: Boto3Version = '1.33.13'
    private static setProps ( props: CaefBoto3LayerVersionProps ): LayerVersionProps {
        const boto3Version: Boto3Version = props.boto3Version || CaefBoto3LayerVersion.BOTO3_LATEST_VERSION
        const overrideProps = {
            layerVersionName: props.naming.resourceName( `boto3-${ boto3Version.replace( /\W/g, '_' ) }` ),
            code: Code.fromAsset( `${ __dirname }/../src/python/boto3_layer/${ boto3Version }.zip` )
        }
        return { ...props, ...overrideProps }
    }
    constructor( scope: Construct, id: string, props: CaefBoto3LayerVersionProps ) {
        super( scope, id, CaefBoto3LayerVersion.setProps( props ) )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "layer-version",
                resourceId: props.boto3Version,
                name: "arn",
                value: this.layerVersionArn
            }, ...props
        } )
    }
}
