/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fn, Stack } from "aws-cdk-lib"
import { IRole } from "aws-cdk-lib/aws-iam"
import { IBucket } from "aws-cdk-lib/aws-s3"
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment"
import { NagSuppressions } from "cdk-nag"
import { Construct } from "constructs"

export interface LifecycleScriptProps {
    readonly assets?: NamedAssetProps
    readonly cmds: string[]
}

export interface NamedAssetProps {
    /** @jsii ignore */
    readonly [ name: string ]: AssetProps
}

export interface AssetProps {
    readonly sourcePath: string
    readonly exclude?: string[]
}
export interface AssetDeploymentProps {
    readonly scope: Construct,
    readonly assetBucket: IBucket,
    readonly assetPrefix: string,
    readonly assetDeploymentRole: IRole,
    readonly memoryLimitMB?: number
}
export class LifeCycleConfigHelper {

    public static createLifecycleConfigContents (
        scriptProps: LifecycleScriptProps,
        lifecycleType: string,
        assetDeployment?: AssetDeploymentProps,
    ): string {

        let cmds = scriptProps.cmds
        if ( scriptProps.assets ) {
            if ( !assetDeployment ) {
                throw new Error( "assetDeployment must be defined if assets defined" )
            }
            this.createAssets( scriptProps.assets, lifecycleType, assetDeployment )
            const assetS3CopyPath = `${ assetDeployment.assetPrefix }/${ lifecycleType }/`
            const setAssetEnvCmd = `export ASSETS_DIR=/tmp/lifecycle-assets/${ lifecycleType }`
            const assetCopyCmd = `aws s3 cp --recursive ${ assetDeployment.assetBucket.s3UrlForObject( assetS3CopyPath ) } $ASSETS_DIR`
            cmds = [ setAssetEnvCmd, assetCopyCmd, ...scriptProps.cmds ]
        }
        const cmdsString = cmds.join( "\n" )
        return Fn.base64( cmdsString )
    }

    private static createAssets ( namedAssetProps: NamedAssetProps,
        lifecycleType: string,
        assetDeployment: AssetDeploymentProps ) {

        //create assets
        Object.entries( namedAssetProps ).forEach( assetEntry => {
            const assetName = assetEntry[ 0 ]
            const assetProps = assetEntry[ 1 ]

            const assetSource = Source.asset( assetProps.sourcePath, { exclude: assetProps.exclude } )

            new BucketDeployment( assetDeployment.scope, `asset-deployment-${ assetName }-${ lifecycleType }`, {
                sources: [ assetSource ],
                destinationBucket: assetDeployment.assetBucket,
                destinationKeyPrefix: `${ assetDeployment.assetPrefix }/${ lifecycleType }/${ assetName }`,
                role: assetDeployment.assetDeploymentRole,
                extract: true,
                memoryLimit: assetDeployment.memoryLimitMB
            } );
        } )

        // BucketDeployment adds an inline policy to asset deployment role
        // permitting the copy of assets from cdk depoy bucket to destination bucket.
        NagSuppressions.addResourceSuppressions(
            assetDeployment.assetDeploymentRole,
            [
                { id: 'AwsSolutions-IAM5', reason: 'Inline policy used only for deployment.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy used only for deployment.'  },
                { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy used only for deployment.'  }
            ],
            true
        );

        // BucketDeployment uses a Custom Resource Lambda to copy assets
        // from CDK Deployment bucket to destination bucket.
        Stack.of( assetDeployment.scope ).node.children.forEach( child => {
            if ( child.node.id.includes( "Custom::CDKBucketDeployment" ) ) {
                NagSuppressions.addResourceSuppressions(
                    child,
                    [
                        { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
                        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.' },
                        { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.' },
                        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.' },
                        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.'  },
                        { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.'  },
                        { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.'  },
                        { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.'  },
                        { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.'  },
                        { id: 'PCI.DSS.321-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.'  }
                    ],
                    true
                );
            }
        } )
    }

}