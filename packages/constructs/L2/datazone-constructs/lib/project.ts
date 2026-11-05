/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration, Token } from 'aws-cdk-lib';
import { CfnProject, CfnProjectMembership, CfnProjectMembershipProps, CfnProjectProps } from 'aws-cdk-lib/aws-datazone';
import { IManagedPolicy, IRole, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DomainConfig } from './domain_config';

export interface ProjectEnvironmentConfiguration {
  readonly parameters?: { [name: string]: string };
  /**
   * ID of an already-provisioned DataZone environment to target for this configuration,
   * in place of addressing it by its configuration name. Required once the environment
   * exists, since DataZone rejects an update that still addresses it by configuration
   * name alone.
   *
   * The first deploy that creates this entry also resolves the environment's live ID and
   * publishes it to an SSM parameter at
   * `<naming.ssmPath>/project/<name>-env-<configKey>/environment-id`, within a short retry
   * budget - best-effort, and a one-time attempt: the underlying custom resource has no
   * way to tell CloudFormation to invoke it again on a later deploy, since none of its
   * own properties change between deploys. If the environment is still provisioning once
   * that budget runs out (environments commonly take several minutes), the parameter is
   * left holding a placeholder (`UNRESOLVED`) rather than a real ID, permanently, until
   * something else (e.g. a config change prompting the resource to run again) causes a
   * re-resolution. Check the parameter's actual value - or look the ID up directly via
   * `aws datazone list-environments` - before pointing this property at it with an
   * `ssm:<path>` config value. Leave unset for first-time environment provisioning.
   *
   * Use cases: Updating environment parameters, or making any other change (including
   * `nameOverride`), on an already-deployed project whose environments are ACTIVE
   *
   * AWS: AWS::DataZone::Project UserParameters EnvironmentId
   *
   * Validation: Optional; leave unset for first-time environment provisioning, where
   * `environmentConfigurationName` is required instead. Find the value via the
   * DataZone/SMUS console, `aws datazone list-environments`, or the published SSM
   * parameter described above.
   */
  readonly environmentId?: string;
}

export interface MdaaDatazoneProjectProps extends MdaaConstructProps {
  /** Project name for DataZone project identification overriding automatic naming conventions */
  readonly name?: string;
  /**
   * Exact DataZone project name, used verbatim and bypassing MDAA naming conventions.
   * Intended for the user-facing SMUS project title, which is a free-form label chosen
   * by the business and is not derivable from org/env/domain/module metadata. All other
   * resources created by the module keep MDAA naming.
   *
   * AWS: AWS::DataZone::Project Name
   *
   * Validation: Optional; 1-64 chars matching `^[\w -]+$` (spaces and mixed case
   * allowed); must be unique within the DataZone domain.
   */
  readonly nameOverride?: string;
  /** Domain unit specification for project organization within DataZone domains enabling */
  readonly domainUnit?: string;
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
  readonly domainConfig: DomainConfig;

  readonly profileName?: string;

  readonly projectProfileId?: string;
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
  public readonly domainConfig: DomainConfig;
  public readonly domainKmsUsagePolicy: IManagedPolicy;
  public readonly project: CfnProject;
  protected props: MdaaDatazoneProjectProps;
  public generatedProjectName: string;
  /**
   * The EnvironmentIdResolver custom resource created for each entry in
   * `environmentConfigurations`, in the same order. A subclass that establishes its
   * custom-resource role's project membership separately from project creation
   * (required for the resolver's `ListEnvironments` call) must depend each of these on
   * that membership - see `MdaaSageMakerProject`.
   */
  protected readonly environmentIdResolvers: MdaaCustomResource[];
  private readonly _customResourceRole: IRole;
  /** The domain custom-resource role (a project owner), used for privileged DataZone API calls. */
  public get customResourceRole(): IRole {
    return this._customResourceRole;
  }
  private static readonly NAME_OVERRIDE_PATTERN = /^[\w -]+$/;
  private static readonly SSM_PATH_UNSAFE_CHARS = /[^a-zA-Z0-9_.-]+/g;
  /**
   * Replaces any character not valid in an SSM parameter name segment
   * (`[a-zA-Z0-9_.-]`) with a hyphen, so a value with spaces or other
   * punctuation - a `nameOverride` or a free-form environment configuration
   * key - can't produce an invalid parameter name.
   */
  private static sanitizeForSsmPath(value: string): string {
    return value.replace(MdaaDatazoneProject.SSM_PATH_UNSAFE_CHARS, '-');
  }
  /**
   * Returns the verbatim DataZone project name for a `nameOverride`, after checking it
   * against the constraints of `AWS::DataZone::Project` `Name` (Pattern `^[\w -]+$`,
   * Minimum 1, Maximum 64). Unlike MDAA naming, spaces and mixed case are permitted and
   * the value is not routed through `validateResourceName` (which rejects spaces). Throws
   * with an explicit message rather than silently truncating or hashing.
   *
   * An unresolved token, such as an `ssm:` config reference, has no value at synth, and
   * its marker punctuation would fail the pattern. It is returned unchanged, and DataZone
   * enforces the constraints at deploy.
   */
  public static resourceNameFromNameOverride(nameOverride: string): string {
    if (Token.isUnresolved(nameOverride)) {
      return nameOverride;
    }
    const pattern = MdaaDatazoneProject.NAME_OVERRIDE_PATTERN;
    if (nameOverride.length < 1 || nameOverride.length > 64 || !pattern.test(nameOverride)) {
      throw new Error(
        `Invalid nameOverride "${nameOverride}": must be 1-64 characters matching /${pattern.source}/ ` +
          `(letters, digits, underscore, space and hyphen), per AWS::DataZone::Project Name.`,
      );
    }
    return nameOverride;
  }

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id);
    this.props = props;
    this.domainConfig = props.domainConfig;

    this._customResourceRole = Role.fromRoleName(this, 'cr-role', this.domainConfig.customResourceRoleName);
    this.domainKmsUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-kms-policy',
      this.domainConfig.domainKmsUsagePolicyName,
    );
    this.generatedProjectName =
      props.nameOverride === undefined
        ? props.naming.withResourceType(MdaaResourceType.DATAZONE_PROJECT).resourceName(props.name, 64)
        : MdaaDatazoneProject.resourceNameFromNameOverride(props.nameOverride);
    const projectProps: CfnProjectProps = {
      domainIdentifier: this.domainConfig.domainId,
      name: this.generatedProjectName,
      domainUnitId: props.domainUnit ? this.domainConfig.getDomainUnitId(props.domainUnit) : undefined,
      projectProfileId: props.projectProfileId,
      // DataZone's UpdateProject requires projectProfileVersion whenever userParameters is
      // set ("Cannot provide userParameters without also providing projectProfileVersion");
      // CreateProject has no such field at all. Gated on an entry actually being addressed
      // by ID, not merely on environmentConfigurations being set: an existing ACTIVE
      // project whose entries have no environmentId yet must synth byte-identical
      // UserParameters/ProjectProfileVersion to before this property existed, or
      // introducing it here would itself make CloudFormation call UpdateProject - with
      // UserParameters still addressed by configuration name, which is exactly the error
      // this property exists to avoid. "latest" is the only value DataZone accepts here.
      projectProfileVersion: Object.values(props.environmentConfigurations ?? {}).some(c => c.environmentId)
        ? 'latest'
        : undefined,
      userParameters: props.environmentConfigurations
        ? Object.entries(props.environmentConfigurations).map(([configName, configProps]) => ({
            ...(configProps.environmentId
              ? { environmentId: configProps.environmentId }
              : { environmentConfigurationName: configName }),
            environmentParameters: Object.entries(configProps.parameters || {}).map(([name, value]) => {
              return { name: name, value: value };
            }),
          }))
        : undefined,
    };
    this.project = new CfnProject(this, 'project', projectProps);

    // Add owner users - pass identifiers directly (can be SSM params or actual IDs)
    Object.entries(this.props.ownerUsers || {}).forEach(([id, userIdentifier]) => {
      this.addOwnerUser(id, userIdentifier);
    });

    // Add owner groups - pass identifiers directly (can be SSM params or actual IDs)
    Object.entries(this.props.ownerGroups || {}).forEach(([id, groupIdentifier]) => {
      this.addOwnerGroup(id, groupIdentifier);
    });

    // Add contributor users - pass identifiers directly (can be SSM params or actual IDs)
    Object.entries(this.props.users || {}).forEach(([id, userIdentifier]) => {
      this.addUser(id, userIdentifier);
    });

    // Add contributor groups - pass identifiers directly (can be SSM params or actual IDs)
    Object.entries(this.props.groups || {}).forEach(([id, groupIdentifier]) => {
      this.addGroup(id, groupIdentifier);
    });

    // Best-effort: publish each configured environment's resolved ID to SSM, for reuse
    // via `environmentId` on a later deploy. Never blocks this deploy - see
    // resolve_environment_id.py.
    this.environmentIdResolvers = Object.keys(props.environmentConfigurations || {}).map(configName =>
      this.publishEnvironmentId(configName),
    );

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
    // If this is a user membership (has userIdentifier), manage the user profile first
    if (member.userIdentifier) {
      // Create membership after user profile is managed
      const projectMembershipProps: CfnProjectMembershipProps = {
        designation: designation,
        domainIdentifier: this.project.domainIdentifier,
        member: member,
        projectIdentifier: this.project.attrId,
      };

      const membership = new CfnProjectMembership(this, id, projectMembershipProps);
      return membership;
    } else {
      // For group memberships, create directly
      const projectMembershipProps: CfnProjectMembershipProps = {
        designation: designation,
        domainIdentifier: this.project.domainIdentifier,
        member: member,
        projectIdentifier: this.project.attrId,
      };
      return new CfnProjectMembership(this, id, projectMembershipProps);
    }
  }

  /**
   * Creates a custom resource to check, delete, and recreate DataZone user profile
   * @param userIdentifier User identifier (ARN or username) to process
   * @returns Custom resource for managing user profile
   */
  protected createUserProfileChecker(id: string, userIdentifier: string) {
    const crProps: MdaaCustomResourceProps = {
      resourceType: 'UserProfileManager',
      code: Code.fromAsset(`${__dirname}/../src/lambda/check_user_profiles`),
      runtime: Runtime.PYTHON_3_14,
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

  /**
   * Resolves the given environment configuration's live environment ID and publishes it
   * to SSM, so a later deploy can address it via `environmentId` instead of
   * `environmentConfigurationName` (see `ProjectEnvironmentConfiguration.environmentId`).
   * Best-effort: never fails this deploy if the environment isn't resolvable yet - the
   * Lambda writes a non-empty placeholder in that case, since `AWS::SSM::Parameter`
   * rejects an empty `Value` (see `resolve_environment_id.py`). Returns the resolver so a
   * subclass can depend it on project membership - see `environmentIdResolvers`.
   */
  protected publishEnvironmentId(envConfigName: string): MdaaCustomResource {
    const crProps: MdaaCustomResourceProps = {
      resourceType: 'EnvironmentIdResolver',
      code: Code.fromAsset(`${__dirname}/../src/lambda/resolve_environment_id`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'resolve_environment_id.lambda_handler',
      handlerRole: this.customResourceRole,
      handlerProps: {
        domainId: this.domainConfig.domainId,
        projectId: this.project.attrId,
        envConfigName: envConfigName,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    const resolver = new MdaaCustomResource(this, `env-id-resolver-${envConfigName}`, crProps);
    resolver.node.addDependency(this.project);

    // `name` is the SSM-safe identifier by convention; nameOverride/generatedProjectName
    // may contain spaces or mixed case, which are invalid in an SSM parameter name.
    // envConfigName is an arbitrary user-chosen map key with no such convention, so it
    // needs the same sanitization.
    const projectKey = MdaaDatazoneProject.sanitizeForSsmPath(this.props.name ?? this.generatedProjectName);
    new MdaaParamAndOutput(
      this,
      {
        ...this.props,
        resourceType: 'project',
        resourceId: `${projectKey}-env-${MdaaDatazoneProject.sanitizeForSsmPath(envConfigName)}`,
        name: 'environment-id',
        value: resolver.getAttString('environmentId'),
      },
      this.node.scope,
    );
    return resolver;
  }
}

/**
 * A construct which creates a compliant Datazone Project.
 */
export class MdaaSageMakerProject extends MdaaDatazoneProject {
  public readonly toolingEnvId: string;
  public readonly glueConnectionId: string;
  public readonly envUserArn: string;
  /**
   * Makes the domain custom-resource role a PROJECT_OWNER. Resources created through that
   * role's DataZone API calls (e.g. form types) must depend on this.
   */
  public readonly crRoleProjectMembership: CfnProjectMembership;

  constructor(scope: Construct, id: string, props: MdaaDatazoneProjectProps) {
    super(scope, id, props);

    this.crRoleProjectMembership = this.createCrRoleProjectMembership();
    // The base constructor's environmentIdResolvers run before this membership exists,
    // so without this they could call ListEnvironments before the custom-resource role
    // is a project owner and be denied - permanently, since the resolver only runs once.
    this.environmentIdResolvers.forEach(resolver => resolver.node.addDependency(this.crRoleProjectMembership));
    const envDeploymentMonitor = this.getSagemakerEnvironmentDeploymentMonitor(
      this,
      'env-deployment-monitor',
      'Tooling',
      'LAKEHOUSE',
    );
    envDeploymentMonitor.node.addDependency(this.crRoleProjectMembership);

    this.toolingEnvId = envDeploymentMonitor.getAttString('environmentId');
    this.glueConnectionId = envDeploymentMonitor.getAttString('connectionId');
    this.envUserArn = envDeploymentMonitor.getAttString('userRoleArn');
  }

  private createCrRoleProjectMembership(): CfnProjectMembership {
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
    return new CfnProjectMembership(this, `monitor-cr-project-membership`, membershipProps);
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
      runtime: Runtime.PYTHON_3_14,
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

    return new MdaaCustomResource(scope, id, crProps);
  }
}
