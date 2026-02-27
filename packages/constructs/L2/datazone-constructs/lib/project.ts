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
  /**
   * Q-ENHANCED-PROPERTY
   * Required parameter name for DataZone project environment configuration enabling environment-specific settings. Specifies the name of the environment parameter for configuration management and environment customization within DataZone projects.
   *
   * Use cases: Environment configuration; Parameter naming; Configuration management; Environment customization
   *
   * AWS: DataZone project environment parameter name for configuration identification and management
   *
   * Validation: Must be non-empty string; required for environment parameter configuration
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required parameter value for DataZone project environment configuration enabling environment-specific values. Specifies the value of the environment parameter for configuration application and environment customization within DataZone projects.
   *
   * Use cases: Environment values; Configuration application; Environment customization; Parameter values
   *
   * AWS: DataZone project environment parameter value for configuration application and management
   *
   * Validation: Must be non-empty string; required for environment parameter configuration
   **/
  readonly value: string;
}

export interface ProjectEnvironmentConfiguration {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of environment parameters for DataZone project environment configuration enabling customizable environment settings. Defines the collection of environment parameters that configure the DataZone project environment for specific deployment and operational requirements.
   *
   * Use cases: Environment configuration; Parameter collections; Deployment settings; Operational customization
   *
   * AWS: DataZone project environment parameters for environment configuration and customization
   *
   * Validation: Must be array of valid ProjectEnvironmentParameter objects; required for environment configuration
   **/
  readonly environmentParameters: ProjectEnvironmentParameter[];
}

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
   * Required domain configuration for DataZone project integration enabling domain association and configuration management. Provides domain configuration object for project-domain association and integration with DataZone domain settings.
   *
   * Use cases: Domain integration; Project-domain association; Configuration management; Domain settings
   *
   * AWS: DataZone domain configuration for project integration and domain association
   *
   * Validation: Must be valid DomainConfig object; required for DataZone project creation
   *   **/
  readonly domainConfig: DomainConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional profile name for DataZone project profile association enabling profile-based project configuration. Specifies the profile name for associating the project with a specific DataZone profile configuration for standardized project settings.
   *
   * Use cases: Profile association; Standardized configuration; Profile-based settings; Project templates
   *
   * AWS: DataZone project profile name for profile-based project configuration and standardization
   *
   * Validation: Must be valid profile name string if provided; profile must exist in the DataZone domain
   **/
  readonly profileName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional project profile ID for direct profile association enabling explicit profile configuration. Specifies the profile ID for direct association with a DataZone project profile for explicit configuration management.
   *
   * Use cases: Direct profile association; Explicit configuration; Profile ID reference; Configuration management
   *
   * AWS: DataZone project profile ID for direct profile association and configuration
   *
   * Validation: Must be valid profile ID string if provided; profile must exist in the DataZone domain
   **/
  readonly projectProfileId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment configurations for DataZone project environment setup enabling environment-specific parameter management. Defines named environment configurations with parameters for customizing DataZone project environments with specific settings and values.
   *
   * Use cases: Environment customization; Parameter management; Environment-specific settings; Configuration collections
   *
   * AWS: DataZone project environment configurations for environment-specific parameter management
   *
   * Validation: Must be object mapping environment names to ProjectEnvironmentConfiguration if provided; enables environment customization
   **/
  readonly environmentConfigurations?: { [name: string]: ProjectEnvironmentConfiguration };
  /**
   * Q-ENHANCED-PROPERTY
   * Owner user references for project ownership enabling user-based project administration and full administrative permissions. Specifies MDAA module user configuration names (not DataZone usernames or Identity Center identifiers) that have PROJECT_OWNER designation with full administrative access to the DataZone project, supporting user-based project governance and individual administration.
   *
   * Use cases: User-based project ownership; Project administration; Full administrative access; Owner permissions; Project governance
   *
   * AWS: Amazon DataZone project owner users with PROJECT_OWNER designation for full administrative access
   *
   * Validation: Must be array of valid MDAA user configuration names as defined in the module users section; references must exist in module configuration
   **/
  readonly ownerUsers?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Owner group references for project ownership enabling group-based project administration and collective administrative permissions. Specifies MDAA module group configuration names (not DataZone group names or Identity Center group identifiers) that have PROJECT_OWNER designation with full administrative access to the DataZone project, supporting group-based project governance and collective administration.
   *
   * Use cases: Group-based project ownership; Collective administration; Full administrative access; Owner permissions; Team governance
   *
   * AWS: Amazon DataZone project owner groups with PROJECT_OWNER designation for full administrative access
   *
   * Validation: Must be array of valid MDAA group configuration names as defined in the module groups section; references must exist in module configuration
   **/
  readonly ownerGroups?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Contributor user references for project access enabling user-based project contribution and standard permissions. Specifies MDAA module user configuration names (not DataZone usernames or Identity Center identifiers) that have PROJECT_CONTRIBUTOR designation with contributor-level access to the DataZone project, supporting user-based project collaboration and individual contribution.
   *
   * Use cases: User-based project access; Project contribution; Contributor permissions; Collaboration; Standard access
   *
   * AWS: Amazon DataZone project contributor users with PROJECT_CONTRIBUTOR designation for contributor-level access
   *
   * Validation: Must be array of valid MDAA user configuration names as defined in the module users section; references must exist in module configuration
   **/
  readonly users?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Contributor group references for project access enabling group-based project contribution and collective standard permissions. Specifies MDAA module group configuration names (not DataZone group names or Identity Center group identifiers) that have PROJECT_CONTRIBUTOR designation with contributor-level access to the DataZone project, supporting group-based project collaboration and collective contribution.
   *
   * Use cases: Group-based project access; Collective contribution; Contributor permissions; Team collaboration; Standard access
   *
   * AWS: Amazon DataZone project contributor groups with PROJECT_CONTRIBUTOR designation for contributor-level access
   *
   * Validation: Must be array of valid MDAA group configuration names as defined in the module groups section; references must exist in module configuration
   **/
  readonly groups?: { [id: string]: string };
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaDatazoneProject extends Construct {
  /**
   * Q-ENHANCED-PROPERTY
   * Domain configuration object for DataZone project domain integration providing domain settings and configuration access. Exposes the domain configuration for the project enabling access to domain-specific settings and integration parameters.
   *
   * Use cases: Domain configuration access; Integration settings; Domain parameters; Configuration retrieval
   *
   * AWS: DataZone domain configuration for project domain integration and settings access
   *
   * Validation: Initialized from props.domainConfig; provides read-only access to domain configuration
   **/
  public readonly domainConfig: DomainConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM managed policy for DataZone domain KMS key usage enabling encryption and decryption operations. Provides managed policy that grants permissions to use the domain KMS key for data encryption and decryption within the DataZone project.
   *
   * Use cases: KMS key usage; Encryption operations; Decryption operations; Key permissions
   *
   * AWS: IAM managed policy for DataZone domain KMS key usage and encryption operations
   *
   * Validation: Retrieved from domain configuration; provides KMS key usage permissions
   **/
  public readonly domainKmsUsagePolicy: IManagedPolicy;
  /**
   * Q-ENHANCED-PROPERTY
   * CloudFormation DataZone project resource for project deployment and management. Exposes the underlying CloudFormation project resource for advanced configuration and dependency management.
   *
   * Use cases: Project deployment; CloudFormation management; Advanced configuration; Dependency management
   *
   * AWS: CloudFormation DataZone project resource for project deployment and management
   *
   * Validation: Created during construct initialization; represents the deployed DataZone project
   **/
  public readonly project: CfnProject;
  protected props: MdaaDatazoneProjectProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Generated project name after applying naming conventions for consistent resource identification. Provides the final project name after applying organizational naming conventions for consistent resource naming and identification.
   *
   * Use cases: Resource identification; Naming consistency; Project naming; Resource management
   *
   * AWS: DataZone project name after naming convention application for resource identification
   *
   * Validation: Generated from props.naming.resourceName; applies naming conventions to project name
   **/
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
