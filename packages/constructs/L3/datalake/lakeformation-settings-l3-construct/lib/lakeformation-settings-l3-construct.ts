/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefCustomResource, CaefCustomResourceProps } from '@aws-caef/custom-constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefBoto3LayerVersion } from '@aws-caef/lambda-constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';


export interface LakeFormationSettingsL3ConstructProps extends CaefL3ConstructProps {
    /**
     * If true (default false), IAMAllowedPrincipal grants will automatically be added to all new databases and tables
     */
    readonly iamAllowedPrincipalsDefault?: boolean;
    /**
     * List of arns for roles which will administer LakeFormation
     */
    readonly lakeFormationAdminRoleRefs: CaefRoleRef[];
}

export class LakeFormationSettingsL3Construct extends CaefL3Construct {
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

        const settingsCrProps: CaefCustomResourceProps = {
            resourceType: 'lakeformation-settings',
            code: Code.fromAsset( `${ __dirname }/../src/python/lakeformation_settings` ),
            handler: "lakeformation_settings.lambda_handler",
            runtime: Runtime.PYTHON_3_10,
            handlerTimeout: Duration.seconds( 120 ),
            handlerRolePolicyStatements: [ manageSettingsPolicyStatement ],
            handlerPolicySuppressions: [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource. Inline policy specific to custom resource.' },
                { id: 'AwsSolutions-IAM5', reason: 'LakeFormation permissions do not accept resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions' }
            ],
            naming: this.props.naming,
            createParams: false,
            createOutputs: false,
            handlerLayers: [ new CaefBoto3LayerVersion( this, 'boto3-layer', { naming: this.props.naming } ) ],
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
        new CaefCustomResource( this.scope, `lf-settings`, settingsCrProps )
    }
}

