/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnProject, CfnProjectMembership, CfnProjectMembershipProps, CfnProjectProps } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
import { DomainConfig, MdaaDataZoneDomainSSMConfigParser } from './domain_config_parser';

/**
 * Properties for creating a compliant Mdaa Datazone Project
 */
export interface MdaaDatazoneProjectProps extends MdaaConstructProps {
  readonly name?: string;
  readonly domainConfigSSMParam?: string;
  readonly domainConfig?: DomainConfig;
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaDatazoneProject extends Construct {
  public readonly domainConfig: DomainConfig;

  public readonly project: CfnProject;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id);

    const domainConfig = props.domainConfigSSMParam
      ? new MdaaDataZoneDomainSSMConfigParser(scope, 'domain-config-parser', {
          naming: props.naming,
          domainConfigSSMParam: props.domainConfigSSMParam,
        }).parsedConfig
      : props.domainConfig;

    if (!domainConfig) {
      throw new Error('One of domainConfig or domainConfigSSMParam must be specified');
    }

    this.domainConfig = domainConfig;

    const projectProps: CfnProjectProps = {
      domainIdentifier: domainConfig.domainId,
      name: props.naming.resourceName(props.name, 80),
    };
    this.project = new CfnProject(this, 'project', projectProps);

    const projectMembershipProps: CfnProjectMembershipProps = {
      designation: 'PROJECT_OWNER',
      domainIdentifier: this.project.domainIdentifier,
      member: {
        userIdentifier: domainConfig.adminUserProfileId,
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
}
