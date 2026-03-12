/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnPolicyGrant } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
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

export enum ProjectDesignation {
  OWNER = 'OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export interface BlueprintAuthorizationConfig {
  readonly projectDesignation?: ProjectDesignation;
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
}

interface PolicyConfig {
  readonly detailType: 'scoped' | 'targeted' | 'none';
  readonly requiredFields: string[];
  readonly compatibleEntities: string[];
  readonly critical: boolean;
}

const POLICY_CONFIGS: Record<PolicyType, PolicyConfig> = {
  CREATE_DOMAIN_UNIT: { detailType: 'scoped', requiredFields: [], compatibleEntities: ['DOMAIN_UNIT'], critical: true },
  OVERRIDE_DOMAIN_UNIT_OWNERS: {
    detailType: 'scoped',
    requiredFields: [],
    compatibleEntities: ['DOMAIN_UNIT'],
    critical: true,
  },
  ADD_TO_PROJECT_MEMBER_POOL: {
    detailType: 'scoped',
    requiredFields: [],
    compatibleEntities: ['DOMAIN_UNIT'],
    critical: false,
  },
  OVERRIDE_PROJECT_OWNERS: {
    detailType: 'scoped',
    requiredFields: [],
    compatibleEntities: ['DOMAIN_UNIT'],
    critical: true,
  },
  CREATE_GLOSSARY: { detailType: 'scoped', requiredFields: [], compatibleEntities: ['DOMAIN_UNIT'], critical: false },
  CREATE_FORM_TYPE: { detailType: 'scoped', requiredFields: [], compatibleEntities: ['DOMAIN_UNIT'], critical: false },
  CREATE_ASSET_TYPE: {
    detailType: 'scoped',
    requiredFields: [],
    compatibleEntities: ['DOMAIN_UNIT', 'ASSET_TYPE'],
    critical: false,
  },
  CREATE_PROJECT: { detailType: 'scoped', requiredFields: [], compatibleEntities: ['DOMAIN_UNIT'], critical: true },
  CREATE_ENVIRONMENT_PROFILE: {
    detailType: 'targeted',
    requiredFields: ['domainUnitId'],
    compatibleEntities: ['DOMAIN_UNIT', 'ENVIRONMENT_PROFILE'],
    critical: false,
  },
  DELEGATE_CREATE_ENVIRONMENT_PROFILE: {
    detailType: 'targeted',
    requiredFields: ['domainUnitId'],
    compatibleEntities: ['DOMAIN_UNIT', 'ENVIRONMENT_PROFILE'],
    critical: false,
  },
  CREATE_ENVIRONMENT: {
    detailType: 'targeted',
    requiredFields: ['domainUnitId'],
    compatibleEntities: ['DOMAIN_UNIT', 'ENVIRONMENT_BLUEPRINT_CONFIGURATION', 'ENVIRONMENT_PROFILE'],
    critical: false,
  },
  CREATE_ENVIRONMENT_FROM_BLUEPRINT: {
    detailType: 'targeted',
    requiredFields: ['domainUnitId'],
    compatibleEntities: ['DOMAIN_UNIT', 'ENVIRONMENT_BLUEPRINT_CONFIGURATION'],
    critical: false,
  },
  CREATE_PROJECT_FROM_PROJECT_PROFILE: {
    detailType: 'scoped',
    requiredFields: [],
    compatibleEntities: ['DOMAIN_UNIT'],
    critical: false,
  },
};

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
  private static readonly DEFAULT_PROJECT_DESIGNATION = ProjectDesignation.CONTRIBUTOR;
  private static readonly DEFAULT_INCLUDE_CHILD_UNITS = true;

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
      // For blueprint policies, create a single grant (principals array is ignored)
      if (this.isBlueprintPolicy(props.entityType, policy.policyType)) {
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

  private mapPolicyDetailFromFlattened(
    policyType: PolicyType,
    policy: AuthorizationPolicy,
  ): CfnPolicyGrant.PolicyGrantDetailProperty | undefined {
    const propertyName = this.getPolicyDetailPropertyName(policyType);

    const detailValue: PolicyDetailValue = {};

    if (policy.includeChildDomainUnits !== undefined) {
      detailValue.includeChildDomainUnits = policy.includeChildDomainUnits;
    }

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
    const config = POLICY_CONFIGS[policy.policyType];

    grant.addMetadata('PolicyType', policy.policyType);
    grant.addMetadata('PolicyName', policyName);
    grant.addMetadata('PrincipalName', principalName);

    if (policy.description) grant.addMetadata('Description', policy.description);

    grant.applyRemovalPolicy(config.critical ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY);
  }

  public policyGrantsList(): CfnPolicyGrant[] {
    return [...this.policyGrants];
  }
}
