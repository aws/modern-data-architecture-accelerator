/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { CfnProject, CfnProjectMembership, CfnProjectMembershipProps, CfnProjectProps } from 'aws-cdk-lib/aws-datazone';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Properties for creating a compliant Mdaa Datazone Project
 */
export interface MdaaDatazoneProjectProps extends MdaaConstructProps {
  // The unique name of the job.
  readonly name?: string;
  readonly domainConfigSSMParam?: string;
  readonly domainId?: string;
  readonly domainArn?: string;
  readonly domainCustomEnvBlueprintId?: string;
  readonly datalakeManagementRoleArn?: string;
  readonly adminUserProfileId?: string;
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaDatazoneProject extends Construct {
  public readonly domainArn: string;
  public readonly domainId: string;
  public readonly domainCustomEnvBlueprintId: string;
  public readonly datalakeManagementRoleArn: string;
  public readonly project: CfnProject;
  public readonly adminUserProfileId: string;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id);

    const domainConfigParser = props.domainConfigSSMParam
      ? MdaaDatazoneProject.createSsmDomainConfigParser(scope, props.naming, props.domainConfigSSMParam)
      : undefined;

    const domainArn = props.domainArn || domainConfigParser?.getAttString('domainArn');
    if (!domainArn) throw new Error('domainArn must either be defined directly in props, or via domainConfigSSMParam');
    this.domainArn = domainArn;

    const domainId = props.domainId || domainConfigParser?.getAttString('domainId');
    if (!domainId) throw new Error('domainId must either be defined directly in props, or via domainConfigSSMParam');
    this.domainId = domainId;

    const domainCustomEnvBlueprintId =
      props.domainCustomEnvBlueprintId || domainConfigParser?.getAttString('datalakeEnvBlueprintId');
    if (!domainCustomEnvBlueprintId)
      throw new Error(
        'domainCustomEnvBlueprintId must either be defined directly in props, or via domainConfigSSMParam',
      );
    this.domainCustomEnvBlueprintId = domainCustomEnvBlueprintId;

    const datalakeManagementRoleArn =
      props.datalakeManagementRoleArn || domainConfigParser?.getAttString('datalakeManagementRoleArn');
    if (!datalakeManagementRoleArn)
      throw new Error(
        'datalakeManagementRoleArn must either be defined directly in props, or via domainConfigSSMParam',
      );
    this.datalakeManagementRoleArn = datalakeManagementRoleArn;

    const adminUserProfileId = props.adminUserProfileId || domainConfigParser?.getAttString('adminUserProfileId');
    if (!adminUserProfileId)
      throw new Error('adminUserProfileId must either be defined directly in props, or via domainConfigSSMParam');
    this.adminUserProfileId = adminUserProfileId;

    const projectProps: CfnProjectProps = {
      domainIdentifier: domainId,
      name: props.naming.resourceName(props.name, 80),
      ...props,
    };
    this.project = new CfnProject(this, 'project', projectProps);

    const projectMembershipProps: CfnProjectMembershipProps = {
      designation: 'PROJECT_OWNER',
      domainIdentifier: this.project.domainIdentifier,
      member: {
        userIdentifier: this.adminUserProfileId,
      },
      projectIdentifier: this.project.attrId,
    };
    const membership = new CfnProjectMembership(this, 'project-memebership', projectMembershipProps);
    membership.applyRemovalPolicy(RemovalPolicy.RETAIN);

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'project',
          resourceId: props.name,
          name: 'name',
          value: this.project.name,
        },
        ...props,
      },
      scope,
    );
  }
  private static createSsmDomainConfigParser(
    scope: Construct,
    naming: IMdaaResourceNaming,
    domainConfigSSMParam: string,
  ): MdaaCustomResource {
    const ssmParamArn = domainConfigSSMParam.startsWith('arn:')
      ? domainConfigSSMParam
      : `arn:${Stack.of(scope).partition}:ssm:${Stack.of(scope).region}:${
          Stack.of(scope).account
        }:parameter${domainConfigSSMParam}`;

    const handlerRolePolicyStatementstatements = [
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn],
        effect: Effect.ALLOW,
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainConfigParser',
      code: Code.fromAsset(`${__dirname}/../src/lambda/domain_configuration`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'domain_configuration.lambda_handler',
      handlerRolePolicyStatements: handlerRolePolicyStatementstatements,
      handlerProps: {
        domainConfigSSMParam: domainConfigSSMParam,
      },
      naming: naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
    };

    return new MdaaCustomResource(scope, 'domain-config-cr', crProps);
  }
}
