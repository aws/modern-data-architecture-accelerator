/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';


export interface LakeFormationSettingsL3ConstructProps extends MdaaL3ConstructProps {
    /**
     * If true (default false), IAMAllowedPrincipal grants will automatically be added to all new databases and tables
     */
    readonly iamAllowedPrincipalsDefault?: boolean;
    /**
     * List of arns for roles which will administer LakeFormation
     */
    readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];
}

export class LakeFormationSettingsL3Construct extends MdaaL3Construct {
    protected readonly props: LakeFormationSettingsL3ConstructProps


    constructor( scope: Construct, id: string, props: LakeFormationSettingsL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        const defaultPermissions = this.props.iamAllowedPrincipalsDefault != undefined && this.props.iamAllowedPrincipalsDefault.valueOf() ?
            {
                Principal: {
                    DataLakePrincipalIdentifier: 'IAM_ALLOWED_PRINCIPALS'
                },
                Permissions: [ 'ALL' ]
            } : undefined


        const dataLakeAdmins = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.lakeFormationAdminRoleRefs, "Admin" ).map( x => {
            return { DataLakePrincipalIdentifier: x.arn() }
        } )

        const manageSettingsPolicyStatement = new PolicyStatement( {
            effect: Effect.ALLOW,
            resources: [ `*` ],
            actions: [
                "lakeformation:PutDataLakeSettings",
                "lakeformation:GetDataLakeSettings"
            ],
        } )

        const settingsCrProps: MdaaCustomResourceProps = {
            resourceType: 'lakeformation-settings',
            code: Code.fromAsset( `${ __dirname }/../src/python/lakeformation_settings` ),
            handler: "lakeformation_settings.lambda_handler",
            runtime: Runtime.PYTHON_3_12,
            handlerTimeout: Duration.seconds( 120 ),
            handlerRolePolicyStatements: [ manageSettingsPolicyStatement ],
            handlerPolicySuppressions: [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource. Inline policy specific to custom resource.' },
                { id: 'AwsSolutions-IAM5', reason: 'LakeFormation permissions do not accept resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions' }
            ],
            naming: this.props.naming,
            createParams: false,
            createOutputs: false,
            handlerLayers: [ new MdaaBoto3LayerVersion( this, 'boto3-layer', { naming: this.props.naming } ) ],
            handlerProps: {
                account: this.account,
                dataLakeSettings: {
                    DataLakeAdmins: dataLakeAdmins,
                    CreateDatabaseDefaultPermissions: [ defaultPermissions ],
                    CreateTableDefaultPermissions: [ defaultPermissions ],
                    Parameters: {
                        CROSS_ACCOUNT_VERSION: "3"
                    }
                }
            }
        }
        new MdaaCustomResource( this.scope, `lf-settings`, settingsCrProps )
    }
}

