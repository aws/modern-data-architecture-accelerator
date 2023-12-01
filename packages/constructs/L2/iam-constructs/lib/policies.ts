/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from "@aws-caef/construct";
import { Arn, Stack } from "aws-cdk-lib";
import { IGroup, IManagedPolicy, IRole, IUser, ManagedPolicy, ManagedPolicyProps, PolicyDocument, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

/**
 * Interface definging a compliant IAM ManagedPolicy
 */
export interface CaefManagedPolicyProps extends CaefConstructProps {
    /**
     * The name of the managed policy. If you specify multiple policies for an entity,
     * specify unique names. For example, if you specify a list of policies for
     * an IAM role, each policy must have a unique name.
     *
     * @default - A name is automatically generated.
     */
    readonly managedPolicyName?: string;
    /**
     * A description of the managed policy. Typically used to store information about the
     * permissions defined in the policy. For example, "Grants access to production DynamoDB tables."
     * The policy description is immutable. After a value is assigned, it cannot be changed.
     *
     * @default - empty
     */
    readonly description?: string;
    /**
     * The path for the policy. This parameter allows (through its regex pattern) a string of characters
     * consisting of either a forward slash (/) by itself or a string that must begin and end with forward slashes.
     * In addition, it can contain any ASCII character from the ! (\u0021) through the DEL character (\u007F),
     * including most punctuation characters, digits, and upper and lowercased letters.
     *
     * For more information about paths, see IAM Identifiers in the IAM User Guide.
     *
     * @default - "/"
     */
    readonly path?: string;
    /**
     * Users to attach this policy to.
     * You can also use `attachToUser(user)` to attach this policy to a user.
     *
     * @default - No users.
     */
    readonly users?: IUser[];
    /**
     * Roles to attach this policy to.
     * You can also use `attachToRole(role)` to attach this policy to a role.
     *
     * @default - No roles.
     */
    readonly roles?: IRole[];
    /**
     * Groups to attach this policy to.
     * You can also use `attachToGroup(group)` to attach this policy to a group.
     *
     * @default - No groups.
     */
    readonly groups?: IGroup[];
    /**
     * Initial set of permissions to add to this policy document.
     * You can also use `addPermission(statement)` to add permissions later.
     *
     * @default - No statements.
     */
    readonly statements?: PolicyStatement[];
    /**
     * Initial PolicyDocument to use for this ManagedPolicy. If omited, any
     * `PolicyStatement` provided in the `statements` property will be applied
     * against the empty default `PolicyDocument`.
     *
     * @default - An empty policy.
     */
    readonly document?: PolicyDocument;
    /**
     * If specified, policy names will be created using this prefix instead of using the naming module.
     * This is useful when policy names need to be portable across accounts (such as for integration with SSO permission sets)
     */
    readonly verbatimPolicyName?: boolean
}

/**
 * Interface representing a compliant ManagedPolicy
 */
export interface ICaefManagedPolicy extends IManagedPolicy {

}

/**
 * Construct for creating compliant IAM ManagedPolicys
 */
export class CaefManagedPolicy extends ManagedPolicy {

    private static setProps ( props: CaefManagedPolicyProps ): ManagedPolicyProps {
        const overrideProps = {
            managedPolicyName: props.verbatimPolicyName ? props.managedPolicyName : props.naming.resourceName( props.managedPolicyName, 64 )
        }
        return { ...props, ...overrideProps }
    }
    private props: CaefManagedPolicyProps
    constructor( scope: Construct, id: string, props: CaefManagedPolicyProps ) {
        super( scope, id, CaefManagedPolicy.setProps( props ) )
        this.props = props
        this.checkPolicyLength()
        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "managed-policy",
                resourceId: props.managedPolicyName,
                name: "arn",
                value: this.managedPolicyArn
            }, ...props
        } )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "managed-policy",
                resourceId: props.managedPolicyName,
                name: "name",
                value: this.managedPolicyName
            }, ...props
        } )
    }

    public addStatements ( ...statement: PolicyStatement[] ): void {
        super.addStatements( ...statement )
        this.checkPolicyLength()
    }

    public checkPolicyLength ( alwaysLog: boolean = false ) {
        const policyDocLength = this.computePolicyLength()
        if ( policyDocLength > 5500 || alwaysLog ) {
            console.warn( `${ this.props.managedPolicyName } policy length ~${ policyDocLength } chars of maximum 6144. Note that the character length may increase after processing by CFN.` )
        }
        
    }
     
    public computePolicyLength (): number {
        const policyDoc = this.document.toJSON()
        if ( policyDoc ) {
            const policyDocLength = JSON.stringify( policyDoc ).replace( /\s*/i, '' ).replace( /\n*/i, '' ).length
            return policyDocLength
        } 
        return 0
    }
    /**
     * Re-implemented from cdk ManagedPolicy.fromAwsManagedPolicyName
     * in order to allow partition name literals
     */
    public static fromAwsManagedPolicyNameWithPartition ( scope: Construct, managedPolicyName: string ): IManagedPolicy {
        return {
            managedPolicyArn: Arn.format( {
                partition: Stack.of( scope ).partition,
                service: 'iam',
                region: '', // no region for managed policy
                account: 'aws', // the account for a managed policy is 'aws'
                resource: 'policy',
                resourceName: managedPolicyName,
            } )
        }
    }
}


