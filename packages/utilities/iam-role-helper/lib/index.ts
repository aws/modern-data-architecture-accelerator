/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefLambdaFunction, CaefLambdaRole } from '@aws-caef/lambda-constructs';
import { ICaefResourceNaming } from '@aws-caef/naming';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { ManagedPolicy, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
/**
 * A reference to an IAM role. Roles can be referenced by name, arn, and/or id.
 */
export interface CaefRoleRef {
    /**
     * A string which uniquely identifies the CaefRoleRef within a scope.
     */
    readonly refId?: string
    /**
     * Reference role by name
     */
    readonly name?: string
    /**
     * Reference role by arn
     */
    readonly arn?: string
    /**
     * Reference role by id
    */
    readonly id?: string
    /**
     * Indicates whether the role should be considered immutable (defaults false)
    */
    readonly immutable?: boolean
    /**
     * If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.
    */
    readonly sso?: boolean
}
/**
 * A CaefRoleRef which can be resolved within a scope.
 */
export interface CaefResolvableRoleRef {
    /**
     * A string which uniquely identifies the CaefRoleRef within a scope.
     */
    readonly refId: string
    /**
     * Reference role by name
     */
    readonly name?: string
    /**
     * Reference role by arn
     */
    readonly arn?: string
    /**
     * Reference role by id
    */
    readonly id?: string
    /**
     * Reference role by id
    */
    readonly immutable?: boolean
    /**
     * If true, role name will be resolved to an SSO auto-generated role
    */
    readonly sso?: boolean

}

/**
 * A role for which Role ID, Arn, or Name can be resolved using a custom resource. If one of these
 * properties is requested of the object and is not already populated, then a custom Cfn resource
 * will be created to facilitate the lookup.
 */
export class CaefResolvableRole {
    private readonly scope: Construct;
    private readonly roleHelper: CaefRoleHelper;
    private readonly roleRef: CaefResolvableRoleRef
    private roleCr?: CustomResource;

    /**
     * 
     * @param scope The scope in which custom resources for role resolution will be created (if required)
     * @param naming The CAEF naming implementation which will be used to name custom resources
     * @param roleHelper The CAEF role helper which will be used as a custom resource Provider
     * @param roleRef The role reference which will be used to resolve a role. The role ref must contain at least
     * one 'anchor' property (one of id, arn, or name) on which the remaining properties can be resolved.
     */
    constructor( scope: Construct, roleHelper: CaefRoleHelper, roleRef: CaefResolvableRoleRef ) {
        this.scope = scope
        this.roleHelper = roleHelper
        this.roleRef = roleRef
    }

    /**
     * 
     * @returns The unique reference id for the role ref
     */
    public refId (): string {
        return this.roleRef.refId
    }

    /**
     * 
     * @returns The immutability flag of the ref (defaults false)
     */
    public immutable (): boolean {
        return this.roleRef.immutable != undefined && this.roleRef.immutable || this.sso()
    }

    /**
     * @returns The sso flag of the ref( defaults false )
    */
    public sso(): boolean {
        return this.roleRef.sso != undefined && this.roleRef.sso
    }

    /**
     * 
     * @returns Either directly the role ref id (if already populated) or a CR attribute token which will contain the id at deployment time.
     */
    public id (): string {
        const id = this.roleRef.id ? this.roleRef.id : this.getCr().getAttString( "id" )
        return id
    }

    /**
     * 
     * @returns Either directly the role ref arn (if already populated) or a CR attribute token which will contain the arn at deployment time.
     */
    public arn (): string {
        const arn = this.roleRef.arn ? this.roleRef.arn : this.getCr().getAttString( "arn" )
        return arn
    }

    /**
     * 
     * @returns Either directly the role ref name (if already populated) or a CR attribute token which will contain the name at deployment time.
     */
    public name (): string {
        const name = this.roleRef.name ? this.roleRef.name : this.getCr().getAttString( "name" )
        return name
    }

    private getCr (): CustomResource {
        if ( this.roleCr ) {
            return this.roleCr
        }
        console.log( "Role resolution required by config. Creating CR." )
        const getRoleResource = new CustomResource( this.scope, `Role-Res-${ this.roleRef.refId }`, {
            serviceToken: this.roleHelper.createProviderServiceToken(),
            properties: {
                roleRef: this.roleRef
            }
        } );
        this.roleCr = getRoleResource
        return getRoleResource
    }
}

/**
 * A Helper class which can be used to resolve CaefRoleRefs using CustomResources.
 */
export class CaefRoleHelper {
    private readonly scope: Construct;
    private providerServiceToken?: string;
    private readonly naming: ICaefResourceNaming;

    private readonly resolveRefCache: { [ key: string ]: CaefResolvableRole } = {}
    private readonly resolveIdCache: { [ key: string ]: CaefResolvableRole } = {}
    private readonly resolveArnCache: { [ key: string ]: CaefResolvableRole } = {}
    private readonly resolveNameCache: { [ key: string ]: CaefResolvableRole } = {}
    /**
     * 
     * @param scope The scope in which role resolution CR Provider will be created.
     * @param naming The CAEF naming implementation which will be used to name resources
     * from the perspective of the calling module.
     */
    constructor( scope: Construct, naming: ICaefResourceNaming, providerServiceToken?: string ) {
        this.scope = scope
        this.naming = naming
        this.providerServiceToken = providerServiceToken
    }

    /**
     * Can be used to resolve CaefRoleRefs. Each CaefRoleRef is first converted
     * to a CaefResolvableRoleRef by auto generating a role ref unique id using
     * refPrefix and a generated ordinal.
     * @param roleRefs The role references to be resolved
     * @param refPrefix The prefix which will be used with ordinal to create a unique ID for use as a resource ID within scopes
     * @returns Resolvable roles.
     */
    public resolveRoleRefsWithOrdinals ( roleRefs: CaefRoleRef[], refPrefix: string ): CaefResolvableRole[] {
        let i = 0
        const resolvableRoleRefs = roleRefs.map( roleRef => {
            return {
                ...{
                    refId: roleRef.refId || `${ refPrefix }-${ i++ }`,
                }, ...roleRef
            }
        } )
        return this.resolveRoleRefs( resolvableRoleRefs )
    }

    /**
     * 
     * @param roleRefs The role references to be resolved
     * @returns Resolvable roles.
     */
    public resolveRoleRefs ( roleRefs: CaefResolvableRoleRef[] ): CaefResolvableRole[] {
        return roleRefs.map( roleRef => {
            return this.resolveRoleRef( roleRef )
        } )
    }
    /**
     * 
     * @param roleRef The role references to be resolved
     * @param refId The id of the reference to be used in creating the custom resource
     * @returns Resolvable roles.
     */
    public resolveRoleRefWithRefId ( roleRef: CaefRoleRef, refId: string ): CaefResolvableRole {
        const resolvableRoleRef = {
            ...{
                refId: refId
            }, ...roleRef
        }
        return this.resolveRoleRef( resolvableRoleRef )
    }
    /**
     * 
     * @param roleRef The role reference to be resolved
     * @returns Resolvable roles.
     */
    public resolveRoleRef ( roleRef: CaefResolvableRoleRef ): CaefResolvableRole {
        if ( !roleRef.id && !roleRef.arn && !roleRef.name ) {
            throw new Error( "Role References must have at least one of arn, id, or name specified." )
        }
        if ( roleRef.id && this.resolveIdCache[ roleRef.id ] ) {
            return this.resolveIdCache[ roleRef.id ]
        } else if ( roleRef.arn && this.resolveArnCache[ roleRef.arn ] ) {
            return this.resolveArnCache[ roleRef.arn ]
        } else if ( roleRef.name && this.resolveNameCache[ roleRef.name ] ) {
            return this.resolveNameCache[ roleRef.name ]
        } else {
            return this.createAndReturnResolvableRole( roleRef )
        }
    }

    private createAndReturnResolvableRole ( roleRef: CaefResolvableRoleRef ) {
        const resolvableRole = new CaefResolvableRole( this.scope, this, roleRef )
        this.resolveRefCache[ roleRef.refId ] = resolvableRole
        if ( roleRef.id ) {
            this.resolveIdCache[ roleRef.id ] = resolvableRole
        }
        if ( roleRef.arn ) {
            this.resolveArnCache[ roleRef.arn ] = resolvableRole
        }
        if ( roleRef.name ) {
            this.resolveNameCache[ roleRef.name ] = resolvableRole
        }
        return resolvableRole
    }

    /**
     * 
     * @returns A Custom Resource Provider Service Token which can be used to create role resolver custom resources.
     */
    public createProviderServiceToken (): string {

        if ( !this.providerServiceToken ) {
            console.log( "Role resolution required by config. Creating CR Provider." )
            this.providerServiceToken = this.createResolveRoleProvider().serviceToken
        }
        return this.providerServiceToken
    }

    private createResolveRoleProvider (): Provider {
        const crLambdaRole = new CaefLambdaRole( this.scope, "role-res-cr", {
            description: 'CR Role',
            roleName: "role-res-cr",
            naming: this.naming,
            logGroupNames: [ this.naming.resourceName( "role-res-cr" ) ],
            createParams: false,
            createOutputs: false
        } )
        const listRolesPolicyDoc = new PolicyDocument( {
            statements: [
                new PolicyStatement( {
                    resources: [ "*" ],
                    actions: [
                        "iam:ListRoles"
                    ],
                } )
            ],
        } );

        const iamPolicy = new ManagedPolicy( crLambdaRole, `role-res-pol`, {
            managedPolicyName: this.naming.resourceName( `role-res-pol` ),
            document: listRolesPolicyDoc,
            roles: [ crLambdaRole ]
        } )

        NagSuppressions.addResourceSuppressions(
            iamPolicy,
            [
                { id: 'AwsSolutions-IAM5', reason: 'iam:ListRoles does not take a resource.' }
            ],
            true
        );

        // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
        const resolveRoleLambda = new CaefLambdaFunction( this.scope, "resolve-role-res-cr-function", {
            functionName: "role-res-cr",
            code: Code.fromAsset( `${ __dirname }/../src/python/resolve_role/` ),
            handler: "resolve_role.lambda_handler",
            runtime: Runtime.PYTHON_3_12,
            timeout: Duration.seconds( 120 ),
            role: crLambdaRole,
            naming: this.naming,
            createParams: false,
            createOutputs: false
        } );
        resolveRoleLambda.node.addDependency( iamPolicy )
        NagSuppressions.addResourceSuppressions(
            resolveRoleLambda,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with IAM.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with IAM.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );
        const resolveRoleProviderFunctionName = this.naming.resourceName( "role-res-cr-prov", 64 )
        const resolveRoleCrProviderRole = new CaefLambdaRole( this.scope, "role-res-cr-prov", {
            description: 'CR Role Resolver Provider',
            roleName: "role-res-cr-prov",
            naming: this.naming,
            logGroupNames: [ resolveRoleProviderFunctionName ],
            createParams: false,
            createOutputs: false
        } )
        const resolveRoleProvider = new Provider( this.scope, "resolve-role-res-cr-provider", {
            providerFunctionName: resolveRoleProviderFunctionName,
            onEventHandler: resolveRoleLambda,
            role: resolveRoleCrProviderRole
        } );

        NagSuppressions.addResourceSuppressions(
            resolveRoleCrProviderRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            resolveRoleProvider,
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
        return resolveRoleProvider
    }
}