/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnProject, CfnProjectMembership, CfnProjectMembershipProps, CfnProjectProps } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
import { DomainConfig } from './domain_config';
import { IManagedPolicy, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export interface MdaaDatazoneProjectProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional project name for DataZone project identification overriding automatic naming conventions. When specified, provides custom naming for the DataZone project for specific organizational or integration requirements.
   *
   * Use cases: Custom project naming; Organizational requirements; Integration with existing systems; Specific naming conventions
   *
   * AWS: Amazon DataZone project name for identification and management within the DataZone domain
   *
   * Validation: Must be valid project name string if provided; overrides automatic naming when specified
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain unit specification for project organization within DataZone domains enabling hierarchical project management. Provides organizational structure for projects within domains for improved governance and access control.
   *
   * Use cases: Project organization; Hierarchical management; Domain structure; Organizational governance
   *
   * AWS: DataZone domain unit for project organization and hierarchical management within domains
   *
   * Validation: Must be valid domain unit string if provided; enables hierarchical project organization
   **/
  readonly domainUnit?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SSM parameter name containing domain configuration for dynamic domain integration enabling flexible domain association. Provides mechanism to retrieve domain configuration from SSM Parameter Store for dynamic project-domain association.
   *
   * Use cases: Dynamic domain configuration; SSM integration; Flexible domain association; Configuration management
   *
   * AWS: AWS Systems Manager parameter for DataZone domain configuration and dynamic integration
   *
   * Validation: Must be valid SSM parameter name if provided; enables dynamic domain configuration retrieval
   **/
  readonly domainConfigSSMParam?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional direct domain configuration for static domain integration enabling explicit domain association. Provides direct domain configuration object for static project-domain association when SSM parameter is not used.
   *
   * Use cases: Static domain configuration; Direct domain association; Explicit configuration; Non-SSM integration
   *
   * AWS: DataZone domain configuration for direct project-domain association and static integration
   *
   * Validation: Must be valid DomainConfig object if provided; enables direct domain configuration
   *   **/
  readonly domainConfig?: DomainConfig;
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaDatazoneProject extends Construct {
  public readonly domainConfig: DomainConfig;
  public readonly domainKmsUsagePolicy: IManagedPolicy;
  public readonly project: CfnProject;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id);

    const domainConfig = props.domainConfigSSMParam
      ? DomainConfig.fromSsm(scope, 'domain-config-parser', props.domainConfigSSMParam, props.naming)
      : props.domainConfig;

    if (!domainConfig) {
      throw new Error('One of domainConfig or domainConfigSSMParam must be specified');
    }

    this.domainConfig = domainConfig;

    this.domainKmsUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-kms-policy',
      domainConfig.domainKmsUsagePolicyName,
    );

    const projectProps: CfnProjectProps = {
      domainIdentifier: domainConfig.domainId,
      name: props.naming.resourceName(props.name, 80),
      domainUnitId: props.domainUnit ? domainConfig.getDomainUnitId(props.domainUnit) : undefined,
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
