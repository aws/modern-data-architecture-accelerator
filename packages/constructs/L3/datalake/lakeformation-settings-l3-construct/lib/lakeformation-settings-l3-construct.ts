/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefBoto3LayerVersion, CaefLambdaFunction, CaefLambdaRole } from '@aws-caef/lambda-constructs';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';


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


    private settingsProvider: Provider;

    constructor( scope: Construct, id: string, props: LakeFormationSettingsL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        this.settingsProvider = this.getLakeFormationSettingsCrProvider()

        let defaultPermissions = undefined
        if ( this.props.iamAllowedPrincipalsDefault != undefined && this.props.iamAllowedPrincipalsDefault.valueOf() ) {
            defaultPermissions = {
                Principal: {
                    DataLakePrincipalIdentifier: 'IAM_ALLOWED_PRINCIPALS'
                },
                Permissions: [ 'ALL' ]
            }
        }
        const dataLakeAdmins = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.lakeFormationAdminRoleRefs, "Admin" ).map( x => {
            return { DataLakePrincipalIdentifier: x.arn() }
        } )
        new CustomResource( this.scope, `settings`, {
            serviceToken: this.settingsProvider.serviceToken,
            properties: {
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
        } );
    }

    private getLakeFormationSettingsCrProvider (): Provider {
        if ( this.settingsProvider ) {
            return this.settingsProvider
        }

        const settingsCrFunctionRole = new CaefLambdaRole( this.scope, 'settings-function-role', {
            description: 'CR Role',
            roleName: "settings-cr",
            naming: this.props.naming,
            logGroupNames: [ this.props.naming.resourceName( "settings-cr" ) ],
            createParams: false,
            createOutputs: false
        } )

        //Permissions for managing Glue Resource Policies
        const manageSettingsPolicy = new PolicyStatement( {
            effect: Effect.ALLOW,
            resources: [ `*` ],
            actions: [
                "lakeformation:PutDataLakeSettings",
                "lakeformation:GetDataLakeSettings"
            ],
        } )
        settingsCrFunctionRole.addToPolicy( manageSettingsPolicy )

        NagSuppressions.addResourceSuppressions(
            settingsCrFunctionRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource. Inline policy specific to custom resource.' },
                { id: 'AwsSolutions-IAM5', reason: 'LakeFormation permissions do not accept resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslakeformation.html#awslakeformation-actions-as-permissions' }
            ],
            true
        );

        const sourceDir = `${ __dirname }/../src/python/lakeformation_settings`
        // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
        const settingsLambda = new CaefLambdaFunction( this.scope, "settings-cr-function", {
            functionName: "settings-cr",
            code: Code.fromAsset( sourceDir ),
            handler: "lakeformation_settings.lambda_handler",
            runtime: Runtime.PYTHON_3_10,
            timeout: Duration.seconds( 120 ),
            role: settingsCrFunctionRole,
            naming: this.props.naming,
            createParams: false,
            createOutputs: false,
            layers: [ new CaefBoto3LayerVersion( this, 'boto3-layer', { naming: this.props.naming } ) ]
        } );
        NagSuppressions.addResourceSuppressions(
            settingsLambda,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }

            ],
            true
        );

        const settingsCrProviderFunctionName = this.props.naming.resourceName( "settings-cr-prov", 64 )
        const settingsCrProviderRole = new CaefLambdaRole( this.scope, 'settings-provider-role', {
            description: 'CR Role',
            roleName: 'settings-provider-role',
            naming: this.props.naming,
            logGroupNames: [ settingsCrProviderFunctionName ],
            createParams: false,
            createOutputs: false
        } )

        const settingsProvider = new Provider( this.scope, "lakeformation-settings-cr-provider", {
            providerFunctionName: settingsCrProviderFunctionName,
            onEventHandler: settingsLambda,
            role: settingsCrProviderRole
        } );

        NagSuppressions.addResourceSuppressions(
            settingsCrProviderRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            settingsProvider,
            [
                { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );
        this.settingsProvider = settingsProvider
        return settingsProvider
    }
}

