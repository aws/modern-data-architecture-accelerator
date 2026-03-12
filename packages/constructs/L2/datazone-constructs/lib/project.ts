/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration } from 'aws-cdk-lib';
import { CfnProject, CfnProjectMembership, CfnProjectMembershipProps, CfnProjectProps } from 'aws-cdk-lib/aws-datazone';
import { IManagedPolicy, IRole, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DomainConfig } from './domain_config';

export interface ProjectEnvironmentParameter {
  /** Parameter name for DataZone project environment configuration enabling environment-specific settings */
  readonly name: string;
  /** Parameter value for DataZone project environment configuration enabling environment-specific values */
  readonly value: string;
}

export interface ProjectEnvironmentConfiguration {
  /** Array of environment parameters for DataZone project environment configuration enabling */
  readonly environmentParameters: ProjectEnvironmentParameter[];
}

export interface MdaaDatazoneProjectProps extends MdaaConstructProps {
  /** Project name for DataZone project identification overriding automatic naming conventions */
  readonly name?: string;
  /** Domain unit specification for project organization within DataZone domains enabling */
  readonly domainUnit?: string;
  /** Domain configuration for DataZone project integration enabling domain association and configuration management */
  readonly domainConfig: DomainConfig;
  /** Profile name for DataZone project profile association enabling profile-based project configuration */
  readonly profileName?: string;
  /** Project profile ID for direct profile association enabling explicit profile configuration */
  readonly projectProfileId?: string;
  /** Environment configurations for DataZone project environment setup enabling */
  readonly environmentConfigurations?: { [name: string]: ProjectEnvironmentConfiguration };
  /** Owner user references for project ownership enabling user-based project administration and full */
  readonly ownerUsers?: { [id: string]: string };
  /** Owner group references for project ownership enabling group-based project administration and */
  readonly ownerGroups?: { [id: string]: string };
  /** Contributor user references for project access enabling user-based project contribution and standard permissions */
  readonly users?: { [id: string]: string };
  /** Contributor group references for project access enabling group-based project contribution and */
  readonly groups?: { [id: string]: string };
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaDatazoneProject extends Construct {
  /** Domain configuration object for DataZone project domain integration providing domain settings and configuration access */
  public readonly domainConfig: DomainConfig;
  /** IAM managed policy for DataZone domain KMS key usage enabling encryption and decryption operations */
  public readonly domainKmsUsagePolicy: IManagedPolicy;
  /** CloudFormation DataZone project resource for project deployment and management */
  public readonly project: CfnProject;
  protected props: MdaaDatazoneProjectProps;
  /** Generated project name after applying naming conventions for consistent resource identification */
  public generatedProjectName: string;
  protected customResourceRole: IRole;
  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id);
    this.props = props;
    this.domainConfig = props.domainConfig;

    this.customResourceRole = Role.fromRoleName(this, 'cr-role', this.domainConfig.customResourceRoleName);
    this.domainKmsUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-kms-policy',
      this.domainConfig.domainKmsUsagePolicyName,
    );
    this.generatedProjectName = props.naming.resourceName(props.name, 64);
    const projectProps: CfnProjectProps = {
      domainIdentifier: this.domainConfig.domainId,
      name: this.generatedProjectName,
      domainUnitId: props.domainUnit ? this.domainConfig.getDomainUnitId(props.domainUnit) : undefined,
      projectProfileId: props.projectProfileId,
      userParameters: props.environmentConfigurations
        ? Object.entries(props.environmentConfigurations).map(([configName, configProps]) => ({
            environmentConfigurationName: configName,
            environmentParameters: configProps.environmentParameters,
          }))
        : undefined,
    };
    this.project = new CfnProject(this, 'project', projectProps);

    // Add owner users - pass identifiers directly (can be SSM params or actual IDs)
    for (const [id, userIdentifier] of Object.entries(this.props.ownerUsers || {})) {
      this.addOwnerUser(id, userIdentifier);
    }

    // Add owner groups - pass identifiers directly (can be SSM params or actual IDs)
    for (const [id, groupIdentifier] of Object.entries(this.props.ownerGroups || {})) {
      this.addOwnerGroup(id, groupIdentifier);
    }

    // Add contributor users - pass identifiers directly (can be SSM params or actual IDs)
    for (const [id, userIdentifier] of Object.entries(this.props.users || {})) {
      this.addUser(id, userIdentifier);
    }

    // Add contributor groups - pass identifiers directly (can be SSM params or actual IDs)
    for (const [id, groupIdentifier] of Object.entries(this.props.groups || {})) {
      this.addGroup(id, groupIdentifier);
    }

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'project',
        resourceId: props.name,
        name: 'name',
        value: this.project.name,
        ...props,
      },
      scope,
    );
  }

  public addOwnerUser(id: string, userIdentifier: string) {
    const member: CfnProjectMembership.MemberProperty = { userIdentifier: userIdentifier };
    const membership = this.addMembership(`owner-user-${id}`, member, 'PROJECT_OWNER');
    const userChecker = this.createUserProfileChecker(id, userIdentifier);
    membership.node.addDependency(userChecker);
    return membership;
  }

  public addOwnerGroup(id: string, groupIdentifier: string) {
    const member: CfnProjectMembership.MemberProperty = {
      groupIdentifier: groupIdentifier,
    };
    return this.addMembership(`owner-group-${id}`, member, 'PROJECT_OWNER');
  }

  public addUser(id: string, userIdentifier: string) {
    const member: CfnProjectMembership.MemberProperty = { userIdentifier: userIdentifier };
    const membership = this.addMembership(`user-${id}`, member, 'PROJECT_CONTRIBUTOR');
    const userChecker = this.createUserProfileChecker(id, userIdentifier);
    membership.node.addDependency(userChecker);
    return membership;
  }

  public addGroup(id: string, groupIdentifier: string) {
    const member: CfnProjectMembership.MemberProperty = {
      groupIdentifier: groupIdentifier,
    };
    return this.addMembership(`group-${id}`, member, 'PROJECT_CONTRIBUTOR');
  }

  public addMembership(
    id: string,
    member: CfnProjectMembership.MemberProperty,
    designation: 'PROJECT_OWNER' | 'PROJECT_CONTRIBUTOR',
  ) {
    // For group memberships, create directly
    const projectMembershipProps: CfnProjectMembershipProps = {
      designation: designation,
      domainIdentifier: this.project.domainIdentifier,
      member: member,
      projectIdentifier: this.project.attrId,
    };
    return new CfnProjectMembership(this, id, projectMembershipProps);
  }

  /**
   * Creates a custom resource to check, delete, and recreate DataZone user profile
   * @param id
   * @param userIdentifier User identifier (ARN or username) to process
   * @returns Custom resource for managing user profile
   */
  protected createUserProfileChecker(id: string, userIdentifier: string) {
    const crProps: MdaaCustomResourceProps = {
      resourceType: 'UserProfileManager',
      code: Code.fromAsset(`${__dirname}/../src/lambda/check_user_profiles`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'check_user_profiles.lambda_handler',
      handlerRole: this.customResourceRole,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'DataZone user profile operations require wildcard resources',
        },
      ],
      handlerProps: {
        domain_id: this.domainConfig.domainId,
        user_identifier: userIdentifier,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(300),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(this, `user-profile-manager-${id}`, crProps);
  }
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaSageMakerProject extends MdaaDatazoneProject {
  public readonly toolingEnvId: string;
  public readonly glueConnectionId: string;
  public readonly envUserArn: string;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id, props);

    const envDeploymentMonitor = this.getSagemakerEnvironmentDeploymentMonitor(
      this,
      'env-deployment-monitor',
      'Tooling',
      'LAKEHOUSE',
    );

    this.toolingEnvId = envDeploymentMonitor.getAttString('environmentId');
    this.glueConnectionId = envDeploymentMonitor.getAttString('connectionId');
    this.envUserArn = envDeploymentMonitor.getAttString('userRoleArn');
  }

  private getSagemakerEnvironmentDeploymentMonitor(
    scope: Construct,
    id: string,
    envName: string,
    connectionName: string,
  ) {
    const crProps: MdaaCustomResourceProps = {
      resourceType: 'EnvDeploymentMonitor',
      code: Code.fromAsset(`${__dirname}/../src/lambda/monitor_env_deployment`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'monitor_env_deployment.lambda_handler',
      handlerRole: this.customResourceRole,
      handlerProps: {
        domainId: this.project.domainIdentifier,
        projectId: this.project.attrId,
        envName: envName,
        connectionName: connectionName,
        kmsPolicyArn: this.domainKmsUsagePolicy.managedPolicyArn,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(900),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    const monitorCr = new MdaaCustomResource(scope, id, crProps);
    const handlerRoleProfileChecker = this.createUserProfileChecker(
      'monitor-handler-role',
      this.customResourceRole.roleArn,
    );
    const membershipProps: CfnProjectMembershipProps = {
      designation: 'PROJECT_OWNER',
      domainIdentifier: this.project.domainIdentifier,
      member: {
        userIdentifier: handlerRoleProfileChecker.getAttString('id'),
      },
      projectIdentifier: this.project.attrId,
    };
    const membership = new CfnProjectMembership(this, `monitor-cr-project-membership`, membershipProps);
    monitorCr.node.addDependency(membership);

    return monitorCr;
  }
}
