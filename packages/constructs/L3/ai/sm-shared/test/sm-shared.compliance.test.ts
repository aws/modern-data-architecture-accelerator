/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetDeploymentProps, LifeCycleConfigHelper, LifecycleScriptProps } from "../lib"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { CaefTestApp } from "@aws-caef/testing";
import { Role } from "aws-cdk-lib/aws-iam";

describe( 'CAEF Shared Tests', () => {
    test( 'Content', () => {
        const testApp = new CaefTestApp()
        const stack = testApp.testStack
        const assetDeployment: AssetDeploymentProps = {
            scope: stack,
            assetPrefix: "test-prefix",
            assetBucket: Bucket.fromBucketName( stack, "test-existing-bucket", "test-existing-bucket" ),
            assetDeploymentRole: Role.fromRoleName( stack, "test-existing-role", "test-role-name" )
        }

        const scriptProps: LifecycleScriptProps = {
            cmds: [ "testing" ],
            assets: {
                "test_asset": {
                    sourcePath: "test/assets"
                }
            }
        }
        const content = LifeCycleConfigHelper.createLifecycleConfigContents( scriptProps, "test", assetDeployment )
        expect( content ).toMatch( /\${Token\[TOKEN.\d+\]}/ )
    } )
} )
