/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefLogGroup, CaefLogGroupProps } from "@aws-caef/cloudwatch-constructs";
import { CaefParamAndOutput } from "@aws-caef/construct";
import { CaefManagedPolicy, CaefRole } from '@aws-caef/iam-constructs';
import { CaefResolvableRole, CaefRoleRef } from "@aws-caef/iam-role-helper";
import { CaefKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from "@aws-caef/kms-constructs";
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefLambdaFunction, CaefLambdaRole } from "@aws-caef/lambda-constructs";
import { Duration } from 'aws-cdk-lib';
import { AccessLogFormat, AuthorizationType, CfnAccount, CognitoUserPoolsAuthorizer, LambdaIntegration, LogGroupLogDestination, MethodLoggingLevel, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AccountRecovery, CfnUserPool, IUserPool, OAuthScope, ResourceServerScope, UserPool, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { AnyPrincipal, Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnIPSet, CfnLoggingConfiguration, CfnWebACL, CfnWebACLAssociation, CfnWebACLProps } from 'aws-cdk-lib/aws-wafv2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface M2MApiProps {
    /**
     * Roles which will be provided Admin access to the 
     * KMS key, and KeyPair secrets.
     */
    readonly adminRoles: CaefRoleRef[]
    /**
     * API stage name. Defaults to 'prod'
     */
    readonly stageName?: string
    /**
     * Required. Identifies the target bucket
     */
    readonly targetBucketName: string
    /**
     * Required. Identifies the target prefix within the bucket
     */
    readonly targetPrefix: string
    /**
     * Identifies the target prefix for metadata within the bucket.
     * If not specified, will default to targetPrefix. 
     */
    readonly metadataTargetPrefix?: string
    /**
     * List in CIDR ranges which will be permitted to connect to the API resource policy
     */
    readonly allowedCidrs: string[]
    /**
     * Concurrency limits to be placed on API Lambda functions. This will essentially limit the number of concurrent
     * API requests.
     */
    readonly concurrencyLimit: number

    /**
     * Arns of WAF to be applied to API.
     */
    readonly wafArns?: { [ wafname: string ]: string }
    /**
     * Specific key to use to encrypt CloudWatch logs. If not specifed, one will be created.
     */
    readonly kmsKeyArn?: string;
    /**
     * If true (default false), the API Gateway Cloudwatch role will be set at the account/region level.
     * This should be done only once per account/region.
     */
    readonly setAccountCloudWatchRole?: boolean;
    /**
     * If specified, the integration Lambda function will run as this role.
     * If not specified, one will be generated
     */
    readonly integrationLambdaRoleArn?: string
    /**
     * List of Cognito app clients to be created.
     */
    readonly appClients?: NamedAppClientProps
    /**
     * Map of accepted request parameter names to boolean indicating if they are required.
     * If specified, API gateway will validate that: 1) each provided parameter is accepted; 
     * and 2) all required parameters have been provided.
     */
    readonly requestParameters?: { [ paramName: string ]: boolean }
    /**
     * Specified fields will be mapped from the request into the metadata
     * persisted in S3 for each upload request. The key is the destination
     * key in the metadata, and the value is the event source key in dot notation
     * such as "requestContext.requestTime".
     */
    readonly eventMetadataMappings?: { [ dest: string ]: string }
}

export interface NamedAppClientProps {
    readonly [ name: string ]: AppClientProps
}

export interface AppClientProps {
    /**
    * The validity period of the ID Token in minutes (default 60 minutes).
    * Valid values are between 5 minutes and 1 day
    */
    readonly idTokenValidityMinutes?: number
    /**
     * The validity period of the Refresh Token in hours (default 30 days).
     * Valid values between 60 minutes and 10 years
     */
    readonly refreshTokenValidityHours?: number
    /**
     * The validity period of the access token (default 60 minutes).
     * Valid values are between 5 minutes and 1 day
     */
    readonly accessTokenValidityMinutes?: number
}

export interface M2MApiL3ConstructProps extends CaefL3ConstructProps {
    /**
     * The Ingestion App definition.
     */
    readonly m2mApiProps: M2MApiProps;
}

export class M2MApiL3Construct extends CaefL3Construct<M2MApiL3ConstructProps> {
    private readonly adminRoles: CaefResolvableRole[]

    private static readonly identifier: string = "m2m-api"

    constructor( scope: Construct, id: string, props: M2MApiL3ConstructProps ) {
        super( scope, id, props );

        this.adminRoles = props.roleHelper.resolveRoleRefsWithOrdinals( props.m2mApiProps.adminRoles, "admin" )

        const kmsKey = props.m2mApiProps.kmsKeyArn
            ? Key.fromKeyArn( this, 'kms-key', props.m2mApiProps.kmsKeyArn )
            : this.createKmsKey()

        const apiScope = new ResourceServerScope( { scopeName: 'm2m-custom', scopeDescription: 'Generate URL Access' } );
        const cognitoPool = this.setupCognitoM2M( apiScope )

        this.createAPI(
            cognitoPool,
            apiScope,
            kmsKey
        )
    }

    private createKmsKey (): IKey {
        const kmsKey = new CaefKmsKey( this, 'kms-key', {
            naming: this.props.naming,
            keyAdminRoleIds: this.adminRoles.map( x => x.id() ),
            keyUserRoleIds: this.adminRoles.map( x => x.id() )
        } )
        const cloudwatchStatement = new PolicyStatement( {
            sid: "CloudWatchLogsEncryption",
            effect: Effect.ALLOW,
            actions: [
                ...DECRYPT_ACTIONS,
                ...ENCRYPT_ACTIONS
            ],
            principals: [ new ServicePrincipal( `logs.${ this.region }.amazonaws.com` ) ],
            resources: [ "*" ],
            //Limit access to use this key only for log groups within this account
            conditions: {
                "ArnEquals": {
                    "kms:EncryptionContext:aws:logs:arn": `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*`
                }
            }
        } )
        kmsKey.addToResourcePolicy( cloudwatchStatement )
        return kmsKey
    }

    private setupCognitoM2M ( apiScope: ResourceServerScope ): UserPool {

        const userPool = new UserPool( this, 'user-pool', {
            enableSmsRole: false,
            userPoolName: this.props.naming.resourceName(),
            selfSignUpEnabled: false,
            accountRecovery: AccountRecovery.NONE
        } );

        NagSuppressions.addResourceSuppressions(
            userPool,
            [
                { id: 'AwsSolutions-COG1', reason: 'User Pool used only for app integration, and will not contain users or passwords.' },
                { id: 'AwsSolutions-COG2', reason: 'User Pool used only for app integration, and will not contain users.' },
            ],
            true
        );

        ( userPool.node.defaultChild as CfnUserPool ).userPoolAddOns = {
            advancedSecurityMode: "ENFORCED"
        }

        const domainName = userPool.addDomain( 'DomainName', {
            cognitoDomain: {
                domainPrefix: this.props.naming.resourceName( undefined, 64 )
            }
        } );

        const resourceServer = userPool.addResourceServer( 'resource-server', {
            userPoolResourceServerName: this.props.naming.resourceName( undefined, 64 ),
            identifier: M2MApiL3Construct.identifier,
            scopes: [ apiScope ]
        } );

        const oauthScope = OAuthScope.resourceServer( resourceServer, apiScope );

        Object.entries( this.props.m2mApiProps.appClients || {} ).forEach( appClientEntry => {
            const appClientName = appClientEntry[ 0 ]
            const appClientProps = appClientEntry[ 1 ]

            userPool.addClient( `oauth-client-${ appClientName }`, {
                userPoolClientName: this.props.naming.resourceName( appClientName, 64 ),
                idTokenValidity: appClientProps.idTokenValidityMinutes ? Duration.minutes( appClientProps.idTokenValidityMinutes ) : undefined,
                accessTokenValidity: appClientProps.accessTokenValidityMinutes ? Duration.minutes( appClientProps.accessTokenValidityMinutes ) : undefined,
                refreshTokenValidity: appClientProps.refreshTokenValidityHours ? Duration.hours( appClientProps.refreshTokenValidityHours ) : undefined,
                authFlows: {
                    userPassword: false,
                    userSrp: false,
                    custom: true,
                },
                oAuth: {
                    flows: {
                        authorizationCodeGrant: false,
                        implicitCodeGrant: false,
                        clientCredentials: true
                    },
                    scopes: [ oauthScope ]
                },
                preventUserExistenceErrors: true,
                generateSecret: true,
                enableTokenRevocation: true
            } );
        } )

        const cognitoAuthLogFunctionRole = new CaefLambdaRole( this, "cognito-auth-lambda-role", {
            description: 'Lambda Role for Cognito Auth Logger function',
            roleName: "cognito-auth",
            naming: this.props.naming,
            logGroupNames: [ this.props.naming.resourceName( "log-auth-event" ) ],
            createParams: false,
            createOutputs: false
        } );

        const postAuthLogFn = new CaefLambdaFunction( this, 'postAuthLogFn', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'index.handler',
            functionName: "log-auth-event",
            role: cognitoAuthLogFunctionRole,
            naming: this.props.naming,
            code: Code.fromInline( `
                const handler = async function(event) {
                    console.log("Authentication successful");
                    console.log("Trigger function =", event.triggerSource);
                    console.log("User pool = ", event.userPoolId);
                    console.log("App client ID = ", event.callerContext.clientId);
                    console.log("User ID = ", event.userName);
                    return event;
                };
                exports.handler = handler;
                `
            ),
        } )

        NagSuppressions.addResourceSuppressions(
            postAuthLogFn,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function only logs to stdout. DLQ is not required.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is logging Cognito events directly to CloudWatch via stdout and is not VPC bound by design.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is logging successful authentication requests. Concurrency is unbounded by design.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function only logs to stdout. DLQ is not required.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is logging Cognito events directly to CloudWatch via stdout and is not VPC bound by design.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is logging successful authentication requests. Concurrency is unbounded by design.' }
            ],
            true
        );

        userPool.addTrigger( UserPoolOperation.POST_AUTHENTICATION, postAuthLogFn );

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "cognito-userpool-id",
                resourceId: "m2m-cognito-userpool-id",
                name: "m2m-userpool-id",
                value: userPool.userPoolProviderName
            },
            naming: this.props.naming
        } );

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "cognito-userpool-domain-name",
                resourceId: "cognito-userpool-domain-name-id",
                name: "m2m-userpool-domain-id",
                value: `https://${ domainName.domainName }.auth.${ this.region }.amazoncognito.com`
            },
            naming: this.props.naming
        } );

        return userPool;

    }

    private createAPI ( m2mUserPool: IUserPool,
        apiScope: ResourceServerScope,
        kmsKey: IKey ): void {

        const stageName = this.props.m2mApiProps.stageName || "prod"

        const integrationLambdaRole = this.props.m2mApiProps.integrationLambdaRoleArn ?
            CaefLambdaRole.fromRoleArn( this, 'imported-integration-role', this.props.m2mApiProps.integrationLambdaRoleArn )
            : new CaefLambdaRole( this, "url-gen-lambda-role", {
                description: 'Lambda Role for presigned S3 URL generation Logger function',
                roleName: "url-gen-lambda-role",
                naming: this.props.naming,
                logGroupNames: [ this.props.naming.resourceName( "signed-s3-url-gen" ) ],
                createParams: false,
                createOutputs: false
            } );

        // creates lambda function to generate presigned URL
        const s3UrlGenLambda = new CaefLambdaFunction( this, 's3-url-gen-lambda', {
            runtime: Runtime.PYTHON_3_10,
            handler: 's3_url.handler',
            functionName: "signed-s3-url-gen",
            role: integrationLambdaRole,
            naming: this.props.naming,
            code: Code.fromAsset( `${ __dirname }/../src/lambda/s3_url` ),
            environment: {
                "EXPIRY_TIME_SECONDS": "300",
                "TARGET_BUCKET": this.props.m2mApiProps.targetBucketName,
                "TARGET_PREFIX": this.props.m2mApiProps.targetPrefix,
                "METADATA_TARGET_PREFIX": this.props.m2mApiProps.metadataTargetPrefix || this.props.m2mApiProps.targetPrefix,
                "EVENT_METADATA_MAPPINGS": JSON.stringify( this.props.m2mApiProps.eventMetadataMappings || {} )
            },
            reservedConcurrentExecutions: this.props.m2mApiProps.concurrencyLimit
        } );

        NagSuppressions.addResourceSuppressions(
            s3UrlGenLambda,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked syncronously. Error handling is handled by API spec. DLQ not required.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is API implementation behind API gateway.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is API implementation and will be invoked syncronously. Error handling is handled by API spec. DLQ not required.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is API implementation behind API gateway.' },
            ],
            true
        );

        //create API and components

        const apiResourcePolicy = new PolicyDocument( {
            statements: [
                new PolicyStatement( {
                    effect: Effect.ALLOW,
                    actions: [ 'execute-api:Invoke' ],
                    principals: [ new AnyPrincipal() ],
                    resources: [ `execute-api:/${ stageName }/GET/upload` ],
                } ),
                new PolicyStatement( {
                    effect: Effect.DENY,
                    principals: [ new AnyPrincipal() ],
                    actions: [ 'execute-api:Invoke' ],
                    resources: [ `execute-api:/${ stageName }/GET/upload` ],
                    conditions: {
                        'NotIpAddress': {
                            "aws:SourceIp": this.props.m2mApiProps.allowedCidrs
                        }
                    }
                } )
            ]
        } )

        const accessLogGroupProps: CaefLogGroupProps = {
            logGroupName: "access-logs",
            encryptionKey: kmsKey,
            logGroupNamePathPrefix: "",
            retention: RetentionDays.INFINITE,
            naming: this.props.naming
        }

        const accessLogGroup = new CaefLogGroup( this, "access-log-group", accessLogGroupProps )

        const restApi = new RestApi( this, "rest-api", {
            restApiName: this.props.naming.resourceName( undefined, 128 ),
            description: "REST API to endpoint to proxy an S3 Signed URL generation Lambda",
            policy: apiResourcePolicy,
            cloudWatchRole: false, //Will be created below
            deployOptions: {
                stageName: stageName,
                accessLogDestination: new LogGroupLogDestination( accessLogGroup ),
                accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
                tracingEnabled: true,
                methodOptions: {
                    "/*/*": {
                        loggingLevel: MethodLoggingLevel.INFO,
                        cachingEnabled: false,
                        cacheDataEncrypted: false
                    }
                }
            }
        } );

        NagSuppressions.addResourceSuppressions(
            restApi,
            [
                { id: 'NIST.800.53.R5-APIGWSSLEnabled', reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.' },
                { id: 'HIPAA.Security-APIGWSSLEnabled', reason: 'Integrations/backend are Lambda functions. Backend client certificate not required.' },
                { id: 'NIST.800.53.R5-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
                { id: 'HIPAA.Security-APIGWCacheEnabledAndEncrypted', reason: 'Caching intentionally disabled.' },
            ],
            true
        );

        if ( this.props.m2mApiProps.setAccountCloudWatchRole ?? false ) {
            const cloudwatchRole = new CaefRole( this, 'cloudwatch-role', {
                roleName: "cloudwatch",
                naming: this.props.naming,
                assumedBy: new ServicePrincipal( "apigateway.amazonaws.com" ),
            } )
            cloudwatchRole.addManagedPolicy( CaefManagedPolicy.fromAwsManagedPolicyNameWithPartition( this, "service-role/AmazonAPIGatewayPushToCloudWatchLogs" ) )

            NagSuppressions.addResourceSuppressions(
                cloudwatchRole,
                [
                    { id: 'AwsSolutions-IAM4', reason: 'AmazonAPIGatewayPushToCloudWatchLogs provides the minimum required permissions for API Gateway logging to Cloudwatch: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html' }
                ],
                true
            );
            const account = new CfnAccount( this, 'api-gw-account', {
                cloudWatchRoleArn: cloudwatchRole.roleArn,
            } );
            restApi.node.addDependency( account )
        }

        const ipAllowSet = new CfnIPSet( this, "ip-allow-set", {
            addresses: this.props.m2mApiProps.allowedCidrs,
            ipAddressVersion: "IPV4",
            scope: "REGIONAL",
            name: this.props.naming.resourceName( "ip-allow-set", 255 )
        } )

        const ipAllowRuleProps: CfnWebACL.RuleProperty = {
            name: "ipAllow",
            priority: 0,
            visibilityConfig: {
                cloudWatchMetricsEnabled: false,
                metricName: this.props.naming.resourceName( "ip-allow", 255 ),
                sampledRequestsEnabled: false,
            },
            statement: {
                ipSetReferenceStatement: {
                    arn: ipAllowSet.attrArn
                }
            },
            action: {
                allow: {}
            }
        }

        const defaultWafProps: CfnWebACLProps = {
            name: this.props.naming.resourceName( "default-waf", 128 ),
            defaultAction: {
                block: {}
            },
            scope: "REGIONAL",
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: this.props.naming.resourceName( undefined, 255 ),
                sampledRequestsEnabled: false,
            },
            rules: [
                ipAllowRuleProps
            ]
        }

        const defaultWaf = new CfnWebACL( this, 'default-waf', defaultWafProps )

        const defaultWafLogGroupProps: CaefLogGroupProps = {
            logGroupName: "default-waf",
            encryptionKey: kmsKey,
            // WAF log group destination names must start with aws-waf-logs-
            // https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
            logGroupNamePathPrefix: "aws-waf-logs-",
            retention: RetentionDays.INFINITE,
            naming: this.props.naming
        }

        const defaultWafLogGroup = new CaefLogGroup( this, "default-waf-log-group", defaultWafLogGroupProps )

        new CfnLoggingConfiguration( this, 'default-waf-logging-config', {
            logDestinationConfigs: [ defaultWafLogGroup.logGroupArn ],
            resourceArn: defaultWaf.attrArn
        } )

        new CfnWebACLAssociation( this, `default-waf-association`, {
            resourceArn: restApi.deploymentStage.stageArn,
            webAclArn: defaultWaf.attrArn
        } )

        Object.entries( this.props.m2mApiProps.wafArns || {} ).forEach( wafEntry => {
            new CfnWebACLAssociation( this, `waf-association-${ wafEntry[ 0 ] }`, {
                resourceArn: restApi.deploymentStage.stageArn,
                webAclArn: wafEntry[ 1 ]
            } )
        } )

        const cognitoAuthorizer = new CognitoUserPoolsAuthorizer( this, "cognito-authorizer", {
            authorizerName: this.props.naming.resourceName(),
            resultsCacheTtl: Duration.seconds( 0 ),
            cognitoUserPools: [ m2mUserPool ],
        } );

        const restApiRole = new CaefRole( this, `integration-role`, {
            roleName: `integration`,
            assumedBy: new ServicePrincipal( 'apigateway.amazonaws.com' ),
            naming: this.props.naming,
        } );

        restApiRole.addToPolicy( new PolicyStatement( {
            resources: [ s3UrlGenLambda.functionArn ],
            actions: [ 'lambda:InvokeFunction' ],
            effect: Effect.ALLOW
        } ) );

        NagSuppressions.addResourceSuppressions(
            restApiRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' }
            ],
            true
        );

        const integrationRequestParamers = Object.fromEntries( Object.keys( this.props.m2mApiProps.requestParameters || {} ).map( param => {
            return [ `integration.request.querystring.${ param }`, `method.request.querystring.${ param }` ]
        } ) )

        const integration = new LambdaIntegration( s3UrlGenLambda, {
            credentialsRole: restApiRole,
            requestParameters: integrationRequestParamers
        } );

        const uploadResource = restApi.root.addResource( "upload" );

        const methodRequestParamers = Object.fromEntries( Object.entries( this.props.m2mApiProps.requestParameters || {} ).map( entry => {
            return [ `method.request.querystring.${ entry[ 0 ] }`, entry[ 1 ] ]
        } ) )

        uploadResource.addMethod( 'GET', integration, {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: cognitoAuthorizer,
            authorizationScopes: [ `${ M2MApiL3Construct.identifier }/${ apiScope.scopeName }` ],
            requestParameters: methodRequestParamers,
            requestValidatorOptions: {
                validateRequestParameters: true,
                validateRequestBody: true,
            },
        } );

        const apistagePath = `/${ stageName }`
        new CaefParamAndOutput( this, {
            ...{
                resourceType: "rest-api-url",
                resourceId: "rest-api-upload-url",
                name: "rest-api-end-point-stage-url",
                value: restApi.urlForPath( apistagePath )
            },
            naming: this.props.naming
        } );



    }


}
