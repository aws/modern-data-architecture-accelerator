/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { Code, LayerVersion, LayerVersionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export type Boto3Version = '1.36.11'

/**
 * Properties for creating a Boto3 Lambda Layer
 */
export interface MdaaBoto3LayerVersionProps extends MdaaConstructProps {
    readonly boto3Version?: Boto3Version
}

/**
 * Construct for creating a Boto3 Lambda Layer
 */
export class MdaaBoto3LayerVersion extends LayerVersion {
    public static readonly BOTO3_LATEST_VERSION: Boto3Version = '1.36.11'
    private static setProps ( props: MdaaBoto3LayerVersionProps ): LayerVersionProps {
        const boto3Version: Boto3Version = props.boto3Version || MdaaBoto3LayerVersion.BOTO3_LATEST_VERSION
        const overrideProps = {
            layerVersionName: props.naming.resourceName( `boto3-${ boto3Version.replace( /\W/g, '_' ) }` ),
            code: Code.fromAsset( `${ __dirname }/../src/${ boto3Version }.zip` )
        }
        return { ...props, ...overrideProps }
    }
    constructor( scope: Construct, id: string, props: MdaaBoto3LayerVersionProps ) {
        super( scope, id, MdaaBoto3LayerVersion.setProps( props ) )

        new MdaaParamAndOutput( this, {
            ...{
                resourceType: "layer-version",
                resourceId: props.boto3Version,
                name: "arn",
                value: this.layerVersionArn
            }, ...props
        },scope )
    }
}
