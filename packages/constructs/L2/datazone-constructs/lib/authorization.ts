/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnPolicyGrant } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
import { validatePrincipal } from './utils';

export type PolicyType =
  | 'CREATE_DOMAIN_UNIT'
  | 'OVERRIDE_DOMAIN_UNIT_OWNERS'
  | 'ADD_TO_PROJECT_MEMBER_POOL'
  | 'OVERRIDE_PROJECT_OWNERS'
  | 'CREATE_GLOSSARY'
  | 'CREATE_FORM_TYPE'
  | 'CREATE_ASSET_TYPE'
  | 'CREATE_PROJECT'
  | 'CREATE_ENVIRONMENT_PROFILE'
  | 'DELEGATE_CREATE_ENVIRONMENT_PROFILE'
  | 'CREATE_ENVIRONMENT'
  | 'CREATE_ENVIRONMENT_FROM_BLUEPRINT'
  | 'CREATE_PROJECT_FROM_PROJECT_PROFILE';

export enum EntityType {
  DOMAIN_UNIT = 'DOMAIN_UNIT',
  ENVIRONMENT_BLUEPRINT_CONFIGURATION = 'ENVIRONMENT_BLUEPRINT_CONFIGURATION',
  ENVIRONMENT_PROFILE = 'ENVIRONMENT_PROFILE',
  ASSET_TYPE = 'ASSET_TYPE',
}

// Path alias for the domain's root domain unit; DataZone itself only accepts domain unit IDs.
const ROOT_DOMAIN_UNIT_PATH = '/root';

export enum ProjectDesignation {
  OWNER = 'OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export interface BlueprintAuthorizationConfig {
  readonly projectDesignation?: ProjectDesignation;
  readonly includeChildDomainUnits?: boolean;
}

/**
 * Configuration for granting an authorization policy to project members via a
 * project grant filter, instead of to named users or groups. Required by DataZone
 * for policies such as CREATE_FORM_TYPE that are gated on project membership rather
 * than a specific principal.
 */
export interface ProjectAuthorizationConfig {
  /**
   * The project designation (OWNER or CONTRIBUTOR) whose members receive the grant.
   *
   * @default ProjectDesignation.OWNER
   */
  readonly projectDesignation?: ProjectDesignation;
  /**
   * The ID of the domain unit whose projects receive the grant, or '/root' for the
   * domain's root domain unit. Other domain unit paths are not supported.
   *
   * @default '/root'
   */
  readonly domainUnitId?: string;
  /**
   * Whether projects in domain units below the specified domain unit also receive the grant.
   *
   * @default false
   */
  readonly includeChildDomainUnits?: boolean;
}

export interface NamedPrincipalIdentifier {
  readonly name: string;
  readonly identifier: string;
}
export interface PolicyPrincipal {
  readonly userName?: string;
  readonly userIdentifier?: NamedPrincipalIdentifier;
  readonly groupName?: string;
  readonly groupIdentifier?: NamedPrincipalIdentifier;
  readonly accountName?: string;
  readonly allUsersGrantFilter?: boolean;
}

export interface NamedAuthorizationPolicies {
  /** @jsii ignore */
  readonly [name: string]: AuthorizationPolicy;
}

export type PolicyDetailValue = {
  includeChildDomainUnits?: boolean;
};

export interface AuthorizationPolicy {
  readonly policyType: PolicyType;
  readonly principals: PolicyPrincipal[];
  readonly description?: string;
  readonly includeChildDomainUnits?: boolean;
  readonly domainUnitId?: string; // Used for blueprint principal configuration, not detail
  readonly blueprintConfig?: BlueprintAuthorizationConfig;
  /**
   * When set, the grant uses a project grant filter principal (project members with the
   * given designation) rather than a user/group principal. Used for domain-unit policies
   * such as CREATE_FORM_TYPE that DataZone requires be granted to a project designation.
   * `principals` is required by the schema but ignored when this is set.
   *
   * @default - not a project-principal grant; principals is used instead
   */
  readonly projectConfig?: ProjectAuthorizationConfig;
}

export interface ResolvedUserPrincipalIdentifier {
  readonly userIdentifier?: string;
  readonly allUsersGrantFilter?: Record<string, unknown>;
}

export interface ResolvedGroupPrincipalIdentifier {
  readonly groupIdentifier: string;
}

export interface ResolvedPrincipalIdentifier {
  readonly user?: ResolvedUserPrincipalIdentifier;
  readonly group?: ResolvedGroupPrincipalIdentifier;
}

export type ResolvedBlueprintPrincipal = Record<string, unknown>;

export interface NamedUserIdentifiers {
  /** @jsii ignore */
  readonly [userName: string]: string; // Maps user name to  identifier (IAM role ARN or SSO ID)
}

export interface NamedGroupIdentifiers {
  /** @jsii ignore */
  readonly [groupName: string]: string; // Maps group name to  identifier (SSO group ID)
}

export interface DataZoneAuthorizationConstructProps extends MdaaConstructProps {
  readonly domainId: string;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly policies: NamedAuthorizationPolicies;
  readonly userIdentifiers?: NamedUserIdentifiers;
  readonly groupIdentifiers?: NamedGroupIdentifiers;
  readonly accountIdentifiers?: NamedUserIdentifiers;
  /**
   * ID of the domain's root domain unit. Required to resolve a projectConfig domainUnitId of
   * '/root' (the default), which is a path alias rather than a value DataZone accepts.
   */
  readonly rootDomainUnitId?: string;
}

export class PrincipalResolver {
  constructor(
    public readonly userIdentifiers?: NamedUserIdentifiers,
    public readonly groupIdentifiers?: NamedGroupIdentifiers,
    public readonly accountIdentifiers?: NamedUserIdentifiers,
  ) {}

  public resolvePrincipalIdentifier(principal: PolicyPrincipal): ResolvedPrincipalIdentifier {
    validatePrincipal(principal);

    if (principal.userIdentifier) return { user: { userIdentifier: principal.userIdentifier.identifier } };
    if (principal.groupIdentifier) return { group: { groupIdentifier: principal.groupIdentifier.identifier } };
    if (principal.userName) return this.resolveUserPrincipal(principal.userName, principal.allUsersGrantFilter);
    if (principal.groupName) return this.resolveGroupPrincipal(principal.groupName);
    if (principal.accountName) return this.resolveAccountPrincipal(principal.accountName);
    if (principal.allUsersGrantFilter) return { user: { allUsersGrantFilter: {} } };

    throw new Error('Invalid principal configuration');
  }

  private resolveUserPrincipal(userName: string, allUsersGrantFilter?: boolean): ResolvedPrincipalIdentifier {
    if (!this.userIdentifiers?.[userName]) {
      const availableUsers = this.userIdentifiers ? Object.keys(this.userIdentifiers) : [];
      throw new Error(`User '${userName}' not found. Available: ${availableUsers.join(', ')}`);
    }

    return {
      user: {
        userIdentifier: this.userIdentifiers[userName],
        ...(allUsersGrantFilter && { allUsersGrantFilter: {} }),
      },
    };
  }

  private resolveGroupPrincipal(groupName: string): ResolvedPrincipalIdentifier {
    if (!this.groupIdentifiers?.[groupName]) {
      const availableGroups = this.groupIdentifiers ? Object.keys(this.groupIdentifiers) : [];
      throw new Error(`Group '${groupName}' not found. Available: ${availableGroups.join(', ')}`);
    }

    return { group: { groupIdentifier: this.groupIdentifiers[groupName] } };
  }

  private resolveAccountPrincipal(accountId: string): ResolvedPrincipalIdentifier {
    if (!this.accountIdentifiers?.[accountId]) {
      const availableAccounts = this.accountIdentifiers ? Object.keys(this.accountIdentifiers) : [];
      throw new Error(`Account '${accountId}' not found. Available: ${availableAccounts.join(', ')}`);
    }

    return { user: { userIdentifier: this.accountIdentifiers[accountId] } };
  }
}

export class DataZoneAuthorizationConstruct extends Construct {
  public readonly principalResolver: PrincipalResolver;
  private readonly policyGrants: CfnPolicyGrant[];

  // Constants for blueprint authorization
  private static readonly BLUEPRINT_ENTITY_TYPE = EntityType.ENVIRONMENT_BLUEPRINT_CONFIGURATION;
  private static readonly BLUEPRINT_POLICY_TYPE: PolicyType = 'CREATE_ENVIRONMENT_FROM_BLUEPRINT';
  // Defaults for the blueprintConfig principal path.
  private static readonly DEFAULT_PROJECT_DESIGNATION = ProjectDesignation.CONTRIBUTOR;
  private static readonly DEFAULT_INCLUDE_CHILD_UNITS = true;
  // Defaults for the projectConfig principal path. Deliberately the narrowest grant, so an
  // empty projectConfig can never widen access; shared with createProjectAuthorizationPolicy.
  private static readonly DEFAULT_PROJECT_CONFIG_DESIGNATION = ProjectDesignation.OWNER;
  private static readonly DEFAULT_PROJECT_CONFIG_INCLUDE_CHILD_UNITS = false;
  private static readonly DEFAULT_PROJECT_CONFIG_DOMAIN_UNIT_ID = ROOT_DOMAIN_UNIT_PATH;

  constructor(scope: Construct, id: string, props: DataZoneAuthorizationConstructProps) {
    super(scope, id);

    this.principalResolver = new PrincipalResolver(
      props.userIdentifiers,
      props.groupIdentifiers,
      props.accountIdentifiers,
    );

    this.policyGrants = this.createPolicyGrants(props);
  }

  private createPolicyGrants(props: DataZoneAuthorizationConstructProps): CfnPolicyGrant[] {
    const grants: CfnPolicyGrant[] = [];

    Object.entries(props.policies).forEach(([policyName, policy]) => {
      // For project-principal policies, create a single grant (principals array is ignored).
      // The principal is a project grant filter (project members with a designation) rather
      // than a specific user/group, as required by DataZone for policies like CREATE_FORM_TYPE.
      if (policy.projectConfig) {
        const grant = new CfnPolicyGrant(this, `policy-grant-${policyName}`, {
          domainIdentifier: props.domainId,
          entityIdentifier: props.entityId,
          entityType: props.entityType,
          policyType: policy.policyType,
          principal: this.createProjectAuthorizationPrincipal(policy, props.rootDomainUnitId),
          detail: this.createProjectAuthorizationDetail(policy),
        });
        this.configureGrant(grant, policy, policyName, 'project');
        grants.push(grant);
      }
      // For blueprint policies, create a single grant (principals array is ignored)
      else if (this.isBlueprintPolicy(props.entityType, policy.policyType)) {
        const detail = this.createPolicyGrantDetail(props, policy);
        const grantId = `policy-grant-${policyName}`;

        const grant = new CfnPolicyGrant(this, grantId, {
          domainIdentifier: props.domainId,
          entityIdentifier: props.entityId,
          entityType: props.entityType,
          policyType: policy.policyType,
          principal: this.createBlueprintAuthorizationPrincipal(policy),
          detail: detail,
        });

        this.configureGrant(grant, policy, policyName, 'blueprint');
        grants.push(grant);
      } else {
        // For non-blueprint policies, iterate over principals
        policy.principals.forEach(principal => {
          const resolvedPrincipalName = this.resolvePrincipalName(policyName, principal);
          const principalIdentifier = this.principalResolver.resolvePrincipalIdentifier(principal);
          const detail = this.createPolicyGrantDetail(props, policy);
          const grant = new CfnPolicyGrant(this, `policy-grant-${policyName}-${resolvedPrincipalName}`, {
            domainIdentifier: props.domainId,
            entityIdentifier: props.entityId,
            entityType: props.entityType,
            policyType: policy.policyType,
            principal: principalIdentifier,
            detail: detail,
          });
          this.configureGrant(grant, policy, policyName, resolvedPrincipalName);
          grants.push(grant);
        });
      }
    });

    return grants;
  }

  private resolvePrincipalName(policyName: string, principal: PolicyPrincipal): string {
    validatePrincipal(principal);
    if (principal.allUsersGrantFilter) {
      return 'all-users';
    }

    const name =
      principal.userName ||
      principal.userIdentifier?.name ||
      principal.groupName ||
      principal.groupIdentifier?.name ||
      principal.accountName;
    if (!name) {
      throw new Error(
        `Invalid principal configuration in policy '${policyName}': must specify userName, userIdentifier, groupName, groupIdentifier or accountName`,
      );
    }
    return name;
  }

  private createPolicyGrantDetail(
    props: DataZoneAuthorizationConstructProps,
    policy: AuthorizationPolicy,
  ): CfnPolicyGrant.PolicyGrantDetailProperty | undefined {
    if (this.isBlueprintPolicy(props.entityType, policy.policyType)) {
      return this.createBlueprintAuthorizationDetail(policy.policyType);
    }

    return this.mapPolicyDetailFromFlattened(policy.policyType, policy);
  }

  private isBlueprintPolicy(entityType: EntityType, policyType: PolicyType): boolean {
    return (
      entityType === DataZoneAuthorizationConstruct.BLUEPRINT_ENTITY_TYPE &&
      policyType === DataZoneAuthorizationConstruct.BLUEPRINT_POLICY_TYPE
    );
  }

  private createBlueprintAuthorizationPrincipal(policy: AuthorizationPolicy): ResolvedBlueprintPrincipal {
    const domainUnitId = policy.domainUnitId || '/root';

    const config = policy.blueprintConfig || {};
    const projectDesignation = config.projectDesignation || DataZoneAuthorizationConstruct.DEFAULT_PROJECT_DESIGNATION;
    const includeChildUnits =
      config.includeChildDomainUnits ??
      policy.includeChildDomainUnits ??
      DataZoneAuthorizationConstruct.DEFAULT_INCLUDE_CHILD_UNITS;

    return {
      project: {
        projectGrantFilter: {
          domainUnitFilter: {
            domainUnit: domainUnitId,
            includeChildDomainUnits: includeChildUnits,
          },
        },
        projectDesignation: projectDesignation,
      },
    };
  }

  private createBlueprintAuthorizationDetail(policyType: PolicyType): CfnPolicyGrant.PolicyGrantDetailProperty {
    const propertyName = this.getPolicyDetailPropertyName(policyType);
    return { [propertyName]: {} };
  }

  private createProjectAuthorizationPrincipal(
    policy: AuthorizationPolicy,
    rootDomainUnitId?: string,
  ): ResolvedBlueprintPrincipal {
    const config = policy.projectConfig ?? {};
    const domainUnitId = DataZoneAuthorizationConstruct.resolveProjectDomainUnitId(
      config.domainUnitId || DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_DOMAIN_UNIT_ID,
      rootDomainUnitId,
    );
    const projectDesignation =
      config.projectDesignation || DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_DESIGNATION;
    const includeChildUnits =
      config.includeChildDomainUnits ?? DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_INCLUDE_CHILD_UNITS;

    return {
      project: {
        projectGrantFilter: {
          domainUnitFilter: {
            domainUnit: domainUnitId,
            includeChildDomainUnits: includeChildUnits,
          },
        },
        projectDesignation: projectDesignation,
      },
    };
  }

  /** Maps the '/root' alias to the real root domain unit ID; other values must already be IDs. */
  private static resolveProjectDomainUnitId(domainUnitId: string, rootDomainUnitId?: string): string {
    if (domainUnitId === ROOT_DOMAIN_UNIT_PATH) {
      if (!rootDomainUnitId) {
        throw new Error(`projectConfig.domainUnitId '${ROOT_DOMAIN_UNIT_PATH}' requires rootDomainUnitId to be set`);
      }
      return rootDomainUnitId;
    }
    if (domainUnitId.startsWith('/')) {
      throw new Error(
        `projectConfig.domainUnitId '${domainUnitId}' must be '${ROOT_DOMAIN_UNIT_PATH}' or a domain unit ID; other domain unit paths are not supported`,
      );
    }
    return domainUnitId;
  }

  private createProjectAuthorizationDetail(policy: AuthorizationPolicy): CfnPolicyGrant.PolicyGrantDetailProperty {
    const propertyName = this.getPolicyDetailPropertyName(policy.policyType);
    const includeChildUnits =
      policy.projectConfig?.includeChildDomainUnits ??
      DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_INCLUDE_CHILD_UNITS;
    return { [propertyName]: { includeChildDomainUnits: includeChildUnits } };
  }

  /**
   * Factory method to create blueprint authorization policies with proper configuration
   */
  public static createBlueprintAuthorizationPolicy(
    domainUnitId: string,
    principals: PolicyPrincipal[],
    description?: string,
    projectDesignation?: ProjectDesignation,
    includeChildDomainUnits?: boolean,
  ): AuthorizationPolicy {
    return {
      policyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
      principals: principals,
      domainUnitId,
      description,
      blueprintConfig: {
        projectDesignation,
        includeChildDomainUnits,
      },
    };
  }

  /**
   * Factory method to create domain unit authorization policies
   */
  public static createDomainUnitAuthorizationPolicy(
    policyType: Exclude<PolicyType, 'CREATE_ENVIRONMENT_FROM_BLUEPRINT'>,
    principals: PolicyPrincipal[],
    description?: string,
    includeChildDomainUnits?: boolean,
  ): AuthorizationPolicy {
    return {
      policyType,
      principals: principals,
      description,
      includeChildDomainUnits,
    };
  }

  /**
   * Factory method to create a domain-unit authorization policy whose principal is a
   * project grant filter (project members with a designation) rather than a user/group.
   * Required for policies such as CREATE_FORM_TYPE that DataZone gates on a project
   * designation instead of a specific principal.
   */
  public static createProjectAuthorizationPolicy(
    policyType: Exclude<PolicyType, 'CREATE_ENVIRONMENT_FROM_BLUEPRINT'>,
    domainUnitId: string,
    projectDesignation?: ProjectDesignation,
    includeChildDomainUnits?: boolean,
    description?: string,
  ): AuthorizationPolicy {
    return {
      policyType,
      principals: [],
      description,
      projectConfig: {
        domainUnitId,
        // Narrowest scope by default; callers opt into breadth.
        projectDesignation: projectDesignation ?? DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_DESIGNATION,
        includeChildDomainUnits:
          includeChildDomainUnits ?? DataZoneAuthorizationConstruct.DEFAULT_PROJECT_CONFIG_INCLUDE_CHILD_UNITS,
      },
    };
  }

  private mapPolicyDetailFromFlattened(
    policyType: PolicyType,
    policy: AuthorizationPolicy,
  ): CfnPolicyGrant.PolicyGrantDetailProperty | undefined {
    const propertyName = this.getPolicyDetailPropertyName(policyType);

    const detailValue: PolicyDetailValue = {};

    detailValue.includeChildDomainUnits = policy.includeChildDomainUnits ?? false;

    // Note: domainUnitId is handled in createBlueprintPrincipal for blueprint policies
    // and should not be in the detail object

    if (Object.keys(detailValue).length === 0) {
      return undefined;
    }

    return { [propertyName]: detailValue };
  }

  // Converts a policy type enum value to a camelCase property name for use in the DataZone policy detail configuration.
  // Like CREATE_DOMAIN_UNIT → createDomainUnit
  private getPolicyDetailPropertyName(policyType: PolicyType): string {
    return policyType
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^./, c => c.toLowerCase());
  }

  private configureGrant(
    grant: CfnPolicyGrant,
    policy: AuthorizationPolicy,
    policyName: string,
    principalName: string,
  ): void {
    grant.addMetadata('PolicyType', policy.policyType);
    grant.addMetadata('PolicyName', policyName);
    grant.addMetadata('PrincipalName', principalName);

    if (policy.description) grant.addMetadata('Description', policy.description);
  }

  public policyGrantsList(): CfnPolicyGrant[] {
    return [...this.policyGrants];
  }
}
