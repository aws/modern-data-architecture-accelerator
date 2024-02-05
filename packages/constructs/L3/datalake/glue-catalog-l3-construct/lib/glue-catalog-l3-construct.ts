/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefCatalogSettings } from '@aws-caef/glue-constructs';
import { CaefKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-caef/kms-constructs';
import { CaefLambdaFunction, CaefLambdaRole } from '@aws-caef/lambda-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { CfnDataCatalog } from 'aws-cdk-lib/aws-athena';
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';


const GLUE_READ_ACTIONS: string[] = [
    "glue:Get*",
    "glue:List*"
]
const GLUE_WRITE_ACTIONS: string[] = [
    ...GLUE_READ_ACTIONS,
]

export interface CatalogAccessPolicyProps {
    /**
     * Arns for principals which will be provided read access to the catalog resources via resource policy statement
     */
    readonly readPrincipalArns?: string[]
    /**
     * Arns for principals which will be provided read/write access to the catalog resources via resource policy statement
     */
    readonly writePrincipalArns?: string[]
    /**
     * List of resources to which access is being granted.
     */
    readonly resources: string[]
}

export interface GlueCatalogL3ConstructProps extends CaefL3ConstructProps {
    /**
     * Map of access policy names to access policy definitions
     */
    readonly accessPolicies?: { [ key: string ]: CatalogAccessPolicyProps };
    /**
     * List of accounts which will be provided read access to the catalog
     */
    readonly consumerAccounts?: { [ key: string ]: string };
    /**
     * List of accounts for which additional Athena catalogs will be created pointing to the producer account Glue catalog
     */
    readonly producerAccounts?: { [ key: string ]: string };

}

export class GlueCatalogL3Construct extends CaefL3Construct {
    protected readonly props: GlueCatalogL3ConstructProps


    private catalogResourcePolicyProvider?: Provider;
    private consumerAccounts?: { [ key: string ]: string; }
    private producerAccounts?: { [ key: string ]: string; }

    constructor( scope: Construct, id: string, props: GlueCatalogL3ConstructProps ) {
        super( scope, id, props )
        this.props = props
        this.consumerAccounts = Object.fromEntries( Object.entries( this.props.consumerAccounts || [] ).filter( x => x[ 1 ] != this.account ) )
        this.producerAccounts = Object.fromEntries( Object.entries( this.props.producerAccounts || [] ).filter( x => x[ 1 ] != this.account ) )
        const allReadPrincipalArns: string[] = []
        const allWritePrincipalArns: string[] = []

        const resourcePolicyDocument = new PolicyDocument()
        Object.keys( this.props.accessPolicies || {} ).forEach( accessPolicyName => {
            console.log( accessPolicyName )
            const accessPolicy = ( this.props.accessPolicies || {} )[ accessPolicyName ]
            console.log( accessPolicy )
            allReadPrincipalArns.push( ...accessPolicy.readPrincipalArns || [] )
            allWritePrincipalArns.push( ...accessPolicy.writePrincipalArns || [] )
            const statements = this.createResourcePolicyStatements( accessPolicyName,
                accessPolicy.resources,
                accessPolicy.readPrincipalArns,
                accessPolicy.writePrincipalArns )
            resourcePolicyDocument.addStatements( ...statements )
        } )

        if ( this.consumerAccounts && Object.keys( this.consumerAccounts ).length > 0 ) {
            const readPrincipalArns = Object.entries( this.consumerAccounts ).map( x => `arn:${ this.partition }:iam::${ x[ 1 ] }:root` )
            const statements = this.createResourcePolicyStatements( "accounts",
                [ "*" ],
                readPrincipalArns )
            resourcePolicyDocument.addStatements( ...statements )
        }

        if ( resourcePolicyDocument.statementCount > 0 ) {
            const catalogCrProvider = this.getGlueCatalogResourcePolicyCrProvider()
            const catalogResourcePolicy = new CustomResource( this.scope, `catalog-resource-policy`, {
                serviceToken: catalogCrProvider.serviceToken,
                properties: {
                    resourcePolicyJson: resourcePolicyDocument.toJSON(),
                    account: this.account,
                    policyHashParam: this.props.naming.ssmPath( "policyHash" )
                }
            } );
            new StringParameter( this.scope, "catalog-resource-policy-hash-ssm", {
                parameterName: this.props.naming.ssmPath( "policyHash" ),
                stringValue: catalogResourcePolicy.getAttString( "PolicyHash" )
            } )
        }

        if ( this.producerAccounts && Object.keys( this.producerAccounts ).length > 0 ) {
            Object.entries( this.producerAccounts ).forEach( producerAcct => {
                const acctName = producerAcct[ 0 ]
                const acctId = producerAcct[ 1 ]
                new CfnDataCatalog( this.scope, `athena-catalog-${ acctName }`, {
                    name: acctName,
                    type: "GLUE",
                    parameters: {
                        "catalog-id": acctId
                    }
                } )
            } )
        }

        //Use some private helper functions to create the catalog resources
        let catalogKmsKey = this.createCatalogKmsKey( allReadPrincipalArns, allWritePrincipalArns, Object.entries( this.consumerAccounts || {} ).map( x => x[ 1 ] ) )

        new CaefCatalogSettings( this.scope, "glue-catalog-settings", {
            naming: this.props.naming,
            catalogId: this.account,
            catalogKmsKey: catalogKmsKey
        } )

        return this
    }

    private createResourcePolicyStatements ( accessPolicyName: string, resources: string[], readPrincipalArns?: string[], writePrincipalArns?: string[] ): PolicyStatement[] {
        const policyStatements: PolicyStatement[] = []
        const glueResourceArns = resources.map( resource => {
            if ( resource.includes( "*" ) ) {
                console.warn( `Glue resource access '${ resource }' contains wildcard (*). Consider revising to specific resources.` )
            }
            return `arn:${ this.partition }:glue:${ this.region }:${ this.account }:${ resource }`
        } )
        glueResourceArns.push( `arn:${ this.partition }:glue:${ this.region }:${ this.account }:catalog` )
        glueResourceArns.push( `arn:${ this.partition }:glue:${ this.region }:${ this.account }:database/default` )
        if ( readPrincipalArns && readPrincipalArns.length > 0 ) {
            const readPolicyStatement = new PolicyStatement( {
                sid: `${ accessPolicyName }-read`,
                actions: GLUE_READ_ACTIONS,
                principals: readPrincipalArns.map( x => new ArnPrincipal( x ) ),
                resources: glueResourceArns
            } )
            policyStatements.push( readPolicyStatement )
        }
        if ( writePrincipalArns && writePrincipalArns.length > 0 ) {
            const writePolicyStatement = new PolicyStatement( {
                sid: `${ accessPolicyName }-write`,
                actions: GLUE_WRITE_ACTIONS,
                principals: writePrincipalArns.map( x => new ArnPrincipal( x ) ),
                resources: glueResourceArns
            } )
            policyStatements.push( writePolicyStatement )
        }
        return policyStatements
    }

    private createCatalogKmsKey ( readPrincipalArns: string[], writePrincipalArns: string[], readAccounts?: string[] ): Key {
        // This catalog KMS key will be used to encrypt all data written by the catalog to the catalog bucket
        let catalogKmsKey = new CaefKmsKey( this.scope, "kms-cmk", {
            description: `KMS Key for ${ this.props.naming.resourceName() }`,
            naming: this.props.naming
        } )

        const usageAccounts = [ this.account, ...readAccounts || [] ]
        usageAccounts.forEach( account => {
            //Add a statement that allows anyone in the account to use the key as long as it is via Glue
            const accountKeyUsagePolicyStatement = new PolicyStatement( {
                effect: Effect.ALLOW,
                // Use of * mirrors what is done in the CDK methods for adding policy helpers.
                resources: [ '*' ],
                actions: [
                    ...DECRYPT_ACTIONS,
                    ...ENCRYPT_ACTIONS,
                    "kms:DescribeKey",
                    "kms:CreateGrant"
                ]
            } )
            accountKeyUsagePolicyStatement.addAnyPrincipal()
            accountKeyUsagePolicyStatement.addCondition( "StringEquals", {
                "kms:CallerAccount": account,
                "kms:ViaService": `glue.${ this.region }.amazonaws.com`
            } )
            catalogKmsKey.addToResourcePolicy( accountKeyUsagePolicyStatement )
        } )
        if ( readPrincipalArns.length > 0 ) {
            const readPrincipalPolicyStatement = new PolicyStatement( {
                effect: Effect.ALLOW,
                // Use of * mirrors what is done in the CDK methods for adding policy helpers.
                resources: [ '*' ],
                actions: [
                    ...DECRYPT_ACTIONS,
                    "kms:DescribeKey"
                ],
                principals: readPrincipalArns.map( x => new ArnPrincipal( x ) )
            } )
            catalogKmsKey.addToResourcePolicy( readPrincipalPolicyStatement )
        }

        if ( writePrincipalArns.length > 0 ) {
            const writePrincipalPolicyStatement = new PolicyStatement( {
                effect: Effect.ALLOW,
                // Use of * mirrors what is done in the CDK methods for adding policy helpers.
                resources: [ '*' ],
                actions: [
                    ...DECRYPT_ACTIONS,
                    ...ENCRYPT_ACTIONS,
                    "kms:DescribeKey",
                    "kms:CreateGrant"
                ],
                principals: writePrincipalArns.map( x => new ArnPrincipal( x ) )
            } )
            catalogKmsKey.addToResourcePolicy( writePrincipalPolicyStatement )
        }
        return catalogKmsKey
    }

    private getGlueCatalogResourcePolicyCrProvider (): Provider {
        if ( this.catalogResourcePolicyProvider ) {
            return this.catalogResourcePolicyProvider
        }

        const catalogCrFunctionRole = new CaefLambdaRole( this.scope, 'catalog-function-role', {
            description: 'CR Role',
            roleName: "catalog-cr",
            naming: this.props.naming,
            logGroupNames: [ this.props.naming.resourceName( "catalog-cr" ) ],
            createParams: false,
            createOutputs: false
        } )

        //Permissions for managing Glue Resource Policies
        const manageCatalogPolicy = new PolicyStatement( {
            effect: Effect.ALLOW,
            resources: [ `arn:${ this.partition }:glue:${ this.region }:${ this.account }:catalog` ],
            actions: [
                "glue:PutResourcePolicy",
                "glue:DeleteResourcePolicy"
            ],
        } )
        catalogCrFunctionRole.addToPolicy( manageCatalogPolicy )

        NagSuppressions.addResourceSuppressions(
            catalogCrFunctionRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource. Inline policy specific to custom resource.' }
            ],
            true
        );

        const sourceDir = `${ __dirname }/../src/python/glue_catalog_resource_policy`
        // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
        const catalogResourcePolicyLambda = new CaefLambdaFunction( this.scope, "catalog-cr-function", {
            functionName: "catalog-cr",
            code: Code.fromAsset( sourceDir ),
            handler: "glue_catalog_resource_policy.lambda_handler",
            runtime: Runtime.PYTHON_3_12,
            timeout: Duration.seconds( 120 ),
            role: catalogCrFunctionRole,
            naming: this.props.naming,
            createParams: false,
            createOutputs: false
        } );
        NagSuppressions.addResourceSuppressions(
            catalogResourcePolicyLambda,
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

        const catalogCrProviderFunctionName = this.props.naming.resourceName( "catalog-cr-prov", 64 )
        const catalogCrProviderRole = new CaefLambdaRole( this.scope, 'catalog-provider-role', {
            description: 'CR Role',
            roleName: 'catalog-provider-role',
            naming: this.props.naming,
            logGroupNames: [ catalogCrProviderFunctionName ],
            createParams: false,
            createOutputs: false
        } )

        const catalogResourcePolicyProvider = new Provider( this.scope, "datalake-catalog-cr-provider", {
            providerFunctionName: catalogCrProviderFunctionName,
            onEventHandler: catalogResourcePolicyLambda,
            role: catalogCrProviderRole
        } );

        NagSuppressions.addResourceSuppressions(
            catalogCrProviderRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            catalogResourcePolicyProvider,
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
        this.catalogResourcePolicyProvider = catalogResourcePolicyProvider
        return catalogResourcePolicyProvider
    }
}

