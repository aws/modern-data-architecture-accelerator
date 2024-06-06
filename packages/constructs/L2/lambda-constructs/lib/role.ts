/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaRole, MdaaRoleProps, IMdaaRole } from '@aws-mdaa/iam-constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { IManagedPolicy, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';


export interface MdaaLambdaRoleProps extends MdaaConstructProps {
    /**
     * The set of Lambda function CloudWatch log group namess the role should be granted access to write to
     */
    readonly logGroupNames?: string[]
    /**
     * List of IDs that the role assumer needs to provide one of when assuming this role
     *
     * If the configured and provided external IDs do not match, the
     * AssumeRole operation will fail.
     *
     * @default No external ID required
     */
    readonly externalIds?: string[];
    /**
     * A list of managed policies associated with this role.
     *
     * You can add managed policies later using
     * `addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(policyName))`.
     *
     * @default - No managed policies.
     */
    readonly managedPolicies?: IManagedPolicy[];
    /**
     * A list of named policies to inline into this role. These policies will be
     * created with the role, whereas those added by ``addToPolicy`` are added
     * using a separate CloudFormation resource (allowing a way around circular
     * dependencies that could otherwise be introduced).
     *
     * @default - No policy is inlined in the Role resource.
     */
    readonly inlinePolicies?: {
        [ name: string ]: PolicyDocument;
    };
    /**
     * The path associated with this role. For information about IAM paths, see
     * Friendly Names and Paths in IAM User Guide.
     *
     * @default /
     */
    readonly path?: string;
    /**
     * AWS supports permissions boundaries for IAM entities (users or roles).
     * A permissions boundary is an advanced feature for using a managed policy
     * to set the maximum permissions that an identity-based policy can grant to
     * an IAM entity. An entity's permissions boundary allows it to perform only
     * the actions that are allowed by both its identity-based policies and its
     * permissions boundaries.
     *
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html#cfn-iam-role-permissionsboundary
     * @link https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
     *
     * @default - No permissions boundary.
     */
    readonly permissionsBoundary?: IManagedPolicy;
    /**
     * A name for the IAM role. For valid values, see the RoleName parameter for
     * the CreateRole action in the IAM API Reference.
     *
     * IMPORTANT: If you specify a name, you cannot perform updates that require
     * replacement of this resource. You can perform updates that require no or
     * some interruption. If you must replace the resource, specify a new name.
     *
     * If you specify a name, you must specify the CAPABILITY_NAMED_IAM value to
     * acknowledge your template's capabilities. For more information, see
     * Acknowledging IAM Resources in AWS CloudFormation Templates.
     *
     * @default - AWS CloudFormation generates a unique physical ID and uses that ID
     * for the role name.
     */
    readonly roleName: string;
    /**
     * The maximum session duration that you want to set for the specified role.
     * This setting can have a value from 1 hour (3600sec) to 12 (43200sec) hours.
     *
     * Anyone who assumes the role from the AWS CLI or API can use the
     * DurationSeconds API parameter or the duration-seconds CLI parameter to
     * request a longer session. The MaxSessionDuration setting determines the
     * maximum duration that can be requested using the DurationSeconds
     * parameter.
     *
     * If users don't specify a value for the DurationSeconds parameter, their
     * security credentials are valid for one hour by default. This applies when
     * you use the AssumeRole* API operations or the assume-role* CLI operations
     * but does not apply when you use those operations to create a console URL.
     *
     * @link https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use.html
     *
     * @default Duration.hours(1)
     */
    readonly maxSessionDuration?: Duration;
    /**
     * A description of the role. It can be up to 1000 characters long.
     *
     * @default - No description.
     */
    readonly description?: string;

}

export interface IMdaaLambdaRole extends IMdaaRole {

}

export class MdaaLambdaRole extends MdaaRole {

    private static setLambdaProps ( props: MdaaLambdaRoleProps ): MdaaRoleProps {
        const overrideProps = {
            assumedBy: new ServicePrincipal( "lambda.amazonaws.com" )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: MdaaLambdaRoleProps ) {
        super( scope, id, MdaaLambdaRole.setLambdaProps( props ) )

        if ( props.logGroupNames ) {
            this.addLogGroups( props.logGroupNames )
        }
    }
    private addLogGroups ( logGroupNames: string[] ) {
        const logGroupArns = logGroupNames.map( logGroup => `arn:${ Stack.of( this ).partition }:logs:*:*:log-group:/aws/lambda/${ logGroup }*` )
        const logStreamStatement = new PolicyStatement( {
            resources: logGroupArns,
            actions: [
                "logs:PutLogEvents",
                "logs:CreateLogStream"
            ],
        } )
        this.addToPolicy( logStreamStatement )
        const logGroupStatement = new PolicyStatement( {
            resources: logGroupArns,
            actions: [
                "logs:CreateLogGroup"
            ],
        } )
        this.addToPolicy( logGroupStatement )
        NagSuppressions.addResourceSuppressions(
            this,
            [
                { id: 'AwsSolutions-IAM5', reason: 'LogStream names dynamically generated by Lambda. Wildcard limited to log stream name.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' }
            ],
            true
        );
    }
}

