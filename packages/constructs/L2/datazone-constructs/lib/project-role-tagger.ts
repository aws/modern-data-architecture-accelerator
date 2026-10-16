/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

const INLINE_POLICY_REASON =
  "Each tagger's statements are an inline policy on the shared custom resource handler role, and the tagger's " +
  'custom resource depends on it, so removing a tagger deletes the resource, untagging its roles, before its ' +
  'statements are removed.';

/** Properties for tagging IAM roles into a DataZone (SMUS) project. */
export interface MdaaDatazoneProjectRoleTaggerProps extends MdaaConstructProps {
  /** DataZone project ID written as the `AmazonDataZoneProject` tag value. */
  readonly projectId: string;
  /** ARNs of the IAM roles to tag. Must not be empty, and every role must be in the stack's account. */
  readonly roleArns: string[];
}

/**
 * Tags IAM roles with `AmazonDataZoneProject=<projectId>` through a custom resource.
 * SageMaker Unified Studio grants a project's subscribed tables to every principal whose tag
 * holds the project's ID, so the tag authorizes the role into the project's subscriptions. The
 * tag also makes the role a Lake Formation member of the project, with create, drop, and write
 * on the project database. Lake Formation treats every principal carrying the tag key as opted
 * in to Lake Formation permissions for all Data Catalog resources, so a tagged role no longer
 * reaches any table through IAMAllowedPrincipals or hybrid access mode.
 * The handler fails rather than overwrite another project's ID, and on removal or delete
 * untags a role only while it still holds this project's ID.
 */
export class MdaaDatazoneProjectRoleTagger extends Construct {
  /** IAM role tag key whose value SageMaker Unified Studio matches against the consumer project ID. */
  public static readonly PROJECT_TAG_KEY = 'AmazonDataZoneProject';

  /** Custom resource that applies and removes the tag. */
  public readonly tagger: MdaaCustomResource;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectRoleTaggerProps) {
    super(scope, id);
    if (props.roleArns.length === 0) {
      throw new Error('MdaaDatazoneProjectRoleTagger requires at least one role ARN');
    }

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DataZoneProjectRoleTagger',
      code: Code.fromAsset(`${__dirname}/../src/lambda/tag_project_roles`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'tag_project_roles.lambda_handler',
      handlerProps: {
        projectId: props.projectId,
        roleArns: props.roleArns,
      },
      naming: props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(300),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    // Keep this id stable. A new logical ID makes CloudFormation delete the old resource after
    // creating the new one, and that Delete untags every role with nothing to tag them again.
    this.tagger = new MdaaCustomResource(this, 'role-tagger', crProps);

    // Every tagger in a stack shares one handler role, but each gets its own policy, which its
    // resource depends on. Removing a tagger then deletes its resource, untagging its roles, before
    // its policy; with one shared policy the statements would be dropped first and the untag denied.
    const handlerPolicy = new Policy(this, 'handler-policy', {
      statements: MdaaDatazoneProjectRoleTagger.handlerStatements(Stack.of(this), props),
    });
    // MdaaCustomResource always gives its handler function a role.
    handlerPolicy.attachToRole(this.tagger.handlerFunction.role!);
    this.tagger.node.addDependency(handlerPolicy);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      handlerPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'iam:ListRoleTags and iam:UntagRole cover every role in the account so a role removed from config can still ' +
            'be untagged after the policy drops its ARN; ListRoleTags is read-only, and UntagRole is limited by ' +
            'aws:ResourceTag to roles holding this project ID and by aws:TagKeys to the AmazonDataZoneProject key ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_iam.html).',
          appliesTo: [{ regex: String.raw`/^Resource::arn:.+:iam::.+:role\/\*$/` }],
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: INLINE_POLICY_REASON,
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: INLINE_POLICY_REASON,
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: INLINE_POLICY_REASON,
        },
      ],
      true,
    );
  }

  private static handlerStatements(stack: Stack, props: MdaaDatazoneProjectRoleTaggerProps): PolicyStatement[] {
    const tagKey = MdaaDatazoneProjectRoleTagger.PROJECT_TAG_KEY;
    const accountRoles = `arn:${stack.partition}:iam::${stack.account}:role/*`;
    const onlyProjectTagKey = { 'ForAllValues:StringEquals': { 'aws:TagKeys': [tagKey] } };
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:ListRoleTags'],
        resources: [accountRoles],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:TagRole'],
        resources: props.roleArns,
        conditions: {
          ...onlyProjectTagKey,
          StringEquals: { [`aws:RequestTag/${tagKey}`]: props.projectId },
        },
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:UntagRole'],
        resources: [accountRoles],
        conditions: {
          ...onlyProjectTagKey,
          StringEquals: { [`aws:ResourceTag/${tagKey}`]: props.projectId },
        },
      }),
    ];
  }
}
