/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaStringParameter } from '@aws-mdaa/construct'; //NOSONAR
import { AuthorizationPolicy } from '@aws-mdaa/datazone-constructs/lib/authorization';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CommonDomainHelperProps } from './private/common-domain-helper';
import { DataZoneDomainHelper } from './private/datazone-domain-helper';
import { SageMakerDomainHelper } from './private/sagemaker-domain-helper';
import { MdaaSageMakerBluePrintParameterConfig } from '@aws-mdaa/datazone-constructs';

// User identity for DataZone domain access — either IAM or SSO based.
export interface DataZoneUser {
  /**
   * IAM role reference for this user's domain access. The role is resolved via
   * MDAA role helper (by ARN, name, or SSM ref). Use this for IAM-based users;
   * mutually exclusive with ssoId.
   *
   * Use cases: IAM-based domain access; Role-based user identity; Non-SSO environments
   *
   * AWS: IAM role associated as a DataZone user profile
   *
   * Validation: Optional; valid MdaaRoleRef; mutually exclusive with ssoId
   */
  readonly iamRole?: MdaaRoleRef;
  /**
   * IAM Identity Center (SSO) user ID for federated domain access. Use this for
   * SSO-based users; mutually exclusive with iamRole.
   *
   * Use cases: SSO-based domain access; Federated identity; IAM Identity Center integration
   *
   * AWS: DataZone SSO user profile linked to IAM Identity Center
   *
   * Validation: Optional; valid SSO user ID; mutually exclusive with iamRole
   */
  readonly ssoId?: string;
}

// SSO group identity for DataZone domain access.
export interface DataZoneGroup {
  /**
   * IAM Identity Center (SSO) group ID for group-based domain access.
   * Groups are SSO-only; IAM role groups are not supported.
   *
   * Use cases: Team-based domain access; SSO group permissions; Collective governance
   *
   * AWS: DataZone SSO group profile linked to IAM Identity Center
   *
   * Validation: Required; valid SSO group ID; group must exist in SSO directory
   */
  readonly ssoId: string;
}

// Map of friendly group names to DataZone group definitions.
export interface NamedDataZoneGroups {
  /** @jsii ignore */
  readonly [name: string]: DataZoneGroup;
}

// Map of friendly user names to DataZone user definitions.
export interface NamedDataZoneUsers {
  /** @jsii ignore */
  readonly [name: string]: DataZoneUser;
}

export interface SageMakerAssociatedAccountProps extends AssociatedAccountProps {
  /**
   * Externally-defined IAM roles for blueprint provisioning in the associated account.
   * A base blueprint provisioning policy is attached; blueprint-specific permissions
   * must be attached directly to the role. Must be referenced by name or ARN (no SSM refs).
   *
   * Use cases: Custom blueprint provisioning roles; Cross-account environment deployment
   *
   * AWS: IAM roles for DataZone blueprint provisioning in associated accounts
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly blueprintProvisioningRoles?: MdaaRoleRef[];
  /**
   * Required Tooling blueprint configuration for the associated account, including
   * VPC and subnet settings for SageMaker environment provisioning.
   *
   * Use cases: Associated account Tooling blueprint setup; VPC-based environment provisioning
   *
   * AWS: SageMaker Tooling blueprint with VPC configuration
   *
   * Validation: Required; valid ToolingBlueprintProps
   */
  readonly tooling: ToolingBlueprintProps;
  /**
   * Additional managed blueprints to enable in the associated account with
   * optional parameter values and domain unit authorization.
   *
   * Use cases: LakehouseCatalog, CustomAwsService, or other managed blueprints in associated accounts
   *
   * AWS: DataZone managed blueprint configurations
   *
   * Validation: Optional; map of blueprint name to EnabledBlueprintProps
   */
  readonly enabledManagedBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: EnabledBlueprintProps;
  };
  /**
   * Custom blueprints to enable in the associated account with optional
   * parameter values and domain unit authorization.
   *
   * Use cases: Custom blueprint deployment in associated accounts
   *
   * AWS: DataZone custom blueprint configurations
   *
   * Validation: Optional; map of blueprint name to EnabledBlueprintProps
   */
  readonly enabledCustomBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: EnabledBlueprintProps;
  };
}

// Cross-account association for DataZone domain governance.
export interface AssociatedAccountProps {
  /**
   * AWS account ID of the associated account. Must also be configured as an
   * additional_account on the MDAA module in mdaa.yaml.
   *
   * Use cases: Cross-account domain association; Multi-account data governance
   *
   * AWS: DataZone cross-account association target
   *
   * Validation: Required; valid 12-digit AWS account ID
   */
  readonly account: string;
  /**
   * KMS key ARN for Glue catalog encryption in the associated account. If omitted,
   * looked up from a standard SSM parameter created by the Glue Catalog Settings
   * module and RAM-shared to associated accounts.
   *
   * Use cases: Cross-account catalog encryption; Customer-managed key for associated account Glue catalog
   *
   * AWS: KMS key for Glue Data Catalog encryption in the associated account
   *
   * Validation: Optional; valid KMS key ARN; key must be accessible from the associated account
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * IAM role ARN for Lake Formation access management in the associated account.
   * Should be an LF Admin role, likely created by the LF Settings module. If omitted,
   * looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: Cross-account Lake Formation governance; Fine-grained data permissions in associated accounts
   *
   * AWS: IAM role for Lake Formation permission management in the associated account
   *
   * Validation: Optional; valid IAM role ARN with Lake Formation admin permissions
   */
  readonly lakeformationManageAccessRoleArn?: string;
  /**
   * AWS region for the associated account resources. Defaults to the deploying
   * stack's region if omitted.
   *
   * Use cases: Multi-region domain association; Regional resource targeting
   *
   * AWS: Target region for cross-account DataZone resources
   *
   * Validation: Optional; valid AWS region identifier
   */
  readonly region?: string;
  /**
   * CDK deployment role ARN for cross-account infrastructure provisioning in the
   * associated account.
   *
   * Use cases: Cross-account CDK deployments; Automated infrastructure provisioning
   *
   * AWS: IAM role for CDK cross-account deployment
   *
   * Validation: Optional; valid IAM role ARN with CDK deployment permissions
   */
  readonly cdkRoleArn?: string;
  /**
   * When true, creates a DataZone domain user for CDK-based deployments in the
   * associated account.
   *
   * Use cases: Automated CDK deployments within DataZone; Programmatic project management
   *
   * AWS: DataZone user profile for CDK automation
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly createCdkUser?: boolean;
}

// Map of friendly names to DataZone associated account configs.
export interface NamedDataZoneAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AssociatedAccountProps;
}

// Map of friendly names to SageMaker associated account configs.
export interface NamedSageMakerAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: SageMakerAssociatedAccountProps;
}

// Hierarchical organizational unit within a DataZone domain.
export interface DomainUnit {
  /**
   * Associated account names that receive ownership of this domain unit,
   * allowing project creation within it. Names must match entries in the
   * domain's associatedAccounts config.
   *
   * Use cases: Cross-account project creation; Delegated domain unit ownership
   *
   * AWS: DataZone domain unit owner (account-based)
   *
   * Validation: Optional; string array; names must match associatedAccounts keys
   */
  readonly ownerAccounts?: string[];
  /**
   * User names that receive ownership of this domain unit. Names must match
   * entries in the domain's users config.
   *
   * Use cases: User-based domain unit administration; Individual ownership delegation
   *
   * AWS: DataZone domain unit owner (user-based)
   *
   * Validation: Optional; string array; names must match domain users keys
   */
  readonly ownerUsers?: string[];
  /**
   * Group names that receive ownership of this domain unit. Names must match
   * entries in the domain's groups config.
   *
   * Use cases: Team-based domain unit administration; Group ownership delegation
   *
   * AWS: DataZone domain unit owner (group-based)
   *
   * Validation: Optional; string array; names must match domain groups keys
   */
  readonly ownerGroups?: string[];
  /**
   * Human-readable description of this domain unit's purpose and scope.
   *
   * Use cases: Organizational documentation; Domain unit identification
   *
   * AWS: DataZone domain unit description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Child domain units nested under this unit, enabling recursive hierarchical
   * organization. Each child inherits the parent's domain context.
   *
   * Use cases: Multi-level organizational hierarchy; Nested governance scopes
   *
   * AWS: DataZone nested domain units
   *
   * Validation: Optional; valid NamedDomainUnits; supports arbitrary nesting depth
   */
  readonly domainUnits?: NamedDomainUnits;
  /**
   * Fine-grained authorization policies for this domain unit. Supports policy types
   * like CREATE_DOMAIN_UNIT, CREATE_GLOSSARY, and CREATE_PROJECT with user/group
   * principals.
   *
   * Use cases: Permission scoping per domain unit; Policy-driven project creation control
   *
   * AWS: DataZone authorization policies (CREATE_DOMAIN_UNIT, CREATE_PROJECT, etc.)
   *
   * Validation: Optional; Record of AuthorizationPolicy objects
   */
  readonly authorizationPolicies?: NamedAuthorizationPolicies;

  /**
   * When true, all domain users are allowed access to this domain unit.
   *
   * Use cases: Open-access domain units; Unrestricted project creation
   *
   * AWS: DataZone domain unit access control
   *
   * Validation: Optional; boolean
   */
  readonly allowAllUsers?: boolean;

  /**
   * Specific user names allowed access to this domain unit. Names must match
   * entries in the domain's users config.
   *
   * Use cases: User-scoped domain unit access; Restricted project creation
   *
   * AWS: DataZone domain unit user access list
   *
   * Validation: Optional; string array; names must match domain users keys
   */
  readonly allowedUsers?: string[];

  /**
   * Specific group names allowed access to this domain unit. Names must match
   * entries in the domain's groups config.
   *
   * Use cases: Group-scoped domain unit access; Team-restricted project creation
   *
   * AWS: DataZone domain unit group access list
   *
   * Validation: Optional; string array; names must match domain groups keys
   */
  readonly allowedGroups?: string[];
}

// Map of domain unit names to their configurations.
export interface NamedDomainUnits {
  /** @jsii ignore */
  readonly [name: string]: DomainUnit;
}

export interface NamedAuthorizationPolicies {
  /** @jsii ignore */
  readonly [name: string]: AuthorizationPolicy; // AuthorizationPolicy from datazone-constructs
}

// Shared domain properties for both DataZone and SageMaker domain types.
export interface BaseDomainProps {
  /**
   * IAM role with administrative privileges over the domain. Used for user
   * management, resource configuration, and governance policy administration.
   * Resolved via MDAA role helper.
   *
   * Use cases: Domain administration; Governance policy management; Resource configuration
   *
   * AWS: IAM role granted DataZone domain admin permissions
   *
   * Validation: Required; valid MdaaRoleRef
   */
  readonly dataAdminRole: MdaaRoleRef;

  /**
   * Human-readable description of the domain's purpose and scope.
   *
   * Use cases: Domain documentation; Organizational context
   *
   * AWS: DataZone domain description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Controls how users are assigned to the domain. MANUAL requires explicit
   * assignment; AUTOMATIC assigns users based on organizational policies.
   *
   * Use cases: User provisioning control; Automated vs. manual user onboarding
   *
   * AWS: DataZone domain user assignment mode
   *
   * Validation: Optional; 'MANUAL' | 'AUTOMATIC'
   * @default 'MANUAL'
   */
  readonly userAssignment?: 'MANUAL' | 'AUTOMATIC';

  /**
   * Hierarchical domain units for organizing projects and governance scopes
   * within the domain.
   *
   * Use cases: Organizational hierarchy; Project grouping; Governance scope isolation
   *
   * AWS: DataZone domain units
   *
   * Validation: Optional; valid NamedDomainUnits
   */
  readonly domainUnits?: NamedDomainUnits;
  /**
   * Named users to be added to the domain. Each user is identified by a
   * friendly name and can be IAM-based or SSO-based.
   *
   * Use cases: Individual domain access; IAM and SSO user provisioning
   *
   * AWS: DataZone user profiles (IAM or SSO)
   *
   * Validation: Optional; valid NamedDataZoneUsers
   */
  readonly users?: NamedDataZoneUsers;
  /**
   * Named groups to be added to the domain. Groups are SSO-only and identified
   * by a friendly name mapped to an SSO group ID.
   *
   * Use cases: Team-based domain access; SSO group provisioning
   *
   * AWS: DataZone group profiles (SSO)
   *
   * Validation: Optional; valid NamedDataZoneGroups
   */
  readonly groups?: NamedDataZoneGroups;
  /**
   * User names granted ownership of the root domain unit. Names must match
   * entries in the domain's users config.
   *
   * Use cases: Root-level domain administration; User-based ownership
   *
   * AWS: DataZone root domain unit owner (user)
   *
   * Validation: Optional; string array; names must match domain users keys
   */
  readonly ownerUsers?: string[];
  /**
   * Group names granted ownership of the root domain unit. Names must match
   * entries in the domain's groups config.
   *
   * Use cases: Root-level domain administration; Team-based ownership
   *
   * AWS: DataZone root domain unit owner (group)
   *
   * Validation: Optional; string array; names must match domain groups keys
   */
  readonly ownerGroups?: string[];
  /**
   * Associated account names granted ownership of the root domain unit,
   * allowing project creation at the domain root. Names must match entries
   * in the domain's associatedAccounts config.
   *
   * Use cases: Cross-account root ownership; Delegated domain administration
   *
   * AWS: DataZone root domain unit owner (account)
   *
   * Validation: Optional; string array; names must match associatedAccounts keys
   */
  readonly ownerAccounts?: string[];
}

export interface ToolingBlueprintProps extends EnabledBlueprintProps {
  /**
   * VPC ID for the Tooling blueprint environment. Required for SageMaker
   * domain network configuration and security group management.
   *
   * Use cases: VPC-based SageMaker environment provisioning; Network isolation
   *
   * AWS: VPC for SageMaker Tooling blueprint
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet IDs within the VPC for the Tooling blueprint environment.
   *
   * Use cases: Subnet targeting for SageMaker environments; Network placement
   *
   * AWS: VPC subnets for SageMaker Tooling blueprint
   *
   * Validation: Required; array of valid subnet IDs within the specified VPC
   */
  readonly subnetIds: string[];
}

export interface EnabledBlueprintProps {
  /**
   * IAM role for DataZone environment provisioning. Used for resource creation,
   * security group management, and Lake Formation permissions during blueprint
   * environment deployment.
   *
   * Use cases: Blueprint environment provisioning; Custom provisioning role override
   *
   * AWS: IAM role for DataZone environment provisioning
   *
   * Validation: Optional; valid MdaaRoleRef; role needs DataZone provisioning permissions
   */
  readonly provisioningRole?: MdaaRoleRef;
  /**
   * Domain unit paths authorized to use this blueprint. Uses slash-delimited
   * paths (e.g., /root, /root/team-a).
   *
   * Use cases: Blueprint access scoping; Domain unit authorization
   *
   * AWS: DataZone blueprint authorization by domain unit
   *
   * Validation: Optional; array of valid domain unit path strings
   */
  readonly authorizedDomainUnits?: string[];
  /**
   * Key-value parameter values for blueprint configuration.
   *
   * Use cases: Blueprint-specific settings; Service configuration parameters
   *
   * AWS: DataZone blueprint parameter values
   *
   * Validation: Optional; map of parameter name to string value
   */
  readonly parameterValues?: {
    readonly [parameterName: string]: string;
  };
}

// DataZone (V1) domain configuration extending base domain props.
export interface DataZoneDomainProps extends BaseDomainProps {
  /**
   * SSO integration type for domain authentication. DISABLED uses IAM-only
   * authentication; IAM_IDC enables IAM Identity Center federation.
   *
   * Use cases: Federated authentication; IAM Identity Center integration; IAM-only domains
   *
   * AWS: DataZone domain SSO configuration
   *
   * Validation: Optional; 'DISABLED' | 'IAM_IDC'
   * @default 'DISABLED'
   */
  readonly singleSignOnType?: 'DISABLED' | 'IAM_IDC';
  /**
   * Additional AWS accounts associated with this domain for cross-account
   * data governance and resource sharing. Each account can have its own
   * Glue catalog encryption, LF roles, and CDK deployment configuration.
   *
   * Use cases: Multi-account data governance; Cross-account catalog sharing; Enterprise domain federation
   *
   * AWS: DataZone cross-account domain associations
   *
   * Validation: Optional; valid NamedDataZoneAssociatedAccounts
   */
  readonly associatedAccounts?: NamedDataZoneAssociatedAccounts;
}

export interface CustomBlueprintProps extends EnabledBlueprintProps {
  /**
   * Local file path to the custom blueprint CloudFormation template.
   * Mutually exclusive with url.
   *
   * Use cases: File-based custom blueprint templates; Local template development
   *
   * AWS: CloudFormation template for custom DataZone blueprint
   *
   * Validation: Optional; valid file path; mutually exclusive with url
   */
  readonly path?: string;
  /**
   * S3 URL for the custom blueprint CloudFormation template.
   * Mutually exclusive with path.
   *
   * Use cases: S3-hosted custom blueprint templates; Shared template repositories
   *
   * AWS: S3 URL for custom DataZone blueprint CloudFormation template
   *
   * Validation: Optional; valid S3 URL; mutually exclusive with path
   */
  readonly url?: string;
  /**
   * Blueprint parameter definitions for the custom blueprint.
   *
   * Use cases: Custom blueprint parameter configuration; Parameter schema definition
   *
   * AWS: DataZone custom blueprint parameter configurations
   *
   * Validation: Optional; map of parameter name to MdaaSageMakerBluePrintParameterConfig
   */
  readonly parameters?: { [key: string]: MdaaSageMakerBluePrintParameterConfig };
}

// SageMaker Unified Studio (DataZone V2) domain configuration.
export interface SageMakerDomainProps extends BaseDomainProps {
  /**
   * Externally-defined IAM roles for blueprint provisioning. A base blueprint
   * provisioning policy is attached; blueprint-specific permissions must be
   * attached directly to the role.
   *
   * Use cases: Custom blueprint provisioning roles; External role integration
   *
   * AWS: IAM roles for DataZone blueprint provisioning
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly blueprintProvisioningRoles?: MdaaRoleRef[];

  /**
   * Required Tooling blueprint configuration including VPC and subnet settings
   * for SageMaker environment provisioning.
   *
   * Use cases: SageMaker Tooling blueprint setup; VPC-based environment provisioning
   *
   * AWS: SageMaker Tooling blueprint with VPC configuration
   *
   * Validation: Required; valid ToolingBlueprintProps
   */
  readonly tooling: ToolingBlueprintProps;

  /**
   * Additional managed blueprints to enable with optional parameter values
   * and domain unit authorization (e.g., LakehouseCatalog, CustomAwsService).
   *
   * Use cases: Managed blueprint enablement; Blueprint parameter configuration
   *
   * AWS: DataZone managed blueprint configurations
   *
   * Validation: Optional; map of blueprint name to EnabledBlueprintProps
   */
  readonly enabledManagedBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: EnabledBlueprintProps;
  };

  /**
   * Custom blueprints with CloudFormation templates to enable in the domain.
   * Each blueprint can specify a local path or S3 URL for the template.
   *
   * Use cases: Custom blueprint deployment; Organization-specific environment types
   *
   * AWS: DataZone custom blueprint configurations
   *
   * Validation: Optional; map of blueprint name to CustomBlueprintProps
   */
  readonly customBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: CustomBlueprintProps;
  };

  /**
   * Additional AWS accounts associated with this SageMaker domain for cross-account
   * governance. Each account can have its own tooling config, blueprint provisioning
   * roles, Glue catalog encryption, and LF roles.
   *
   * Use cases: Multi-account SageMaker governance; Cross-account blueprint provisioning
   *
   * AWS: SageMaker (DataZone V2) cross-account domain associations
   *
   * Validation: Optional; valid NamedSageMakerAssociatedAccounts
   */
  readonly associatedAccounts?: NamedSageMakerAssociatedAccounts;
}

// Map of domain names to SageMaker domain configurations.
export interface NamedSageMakerDomainProps {
  /** @jsii ignore */
  readonly [name: string]: SageMakerDomainProps;
}

// Map of domain names to DataZone domain configurations.
export interface NamedDataZoneDomainProps {
  /** @jsii ignore */
  readonly [name: string]: DataZoneDomainProps;
}

export interface DataZoneL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * KMS key ARN for Glue catalog encryption. If omitted, looked up from the
   * standard LF Settings SSM parameter for the DataZone admin role.
   *
   * Use cases: Customer-managed catalog encryption; Compliance-driven key management
   *
   * AWS: KMS key for Glue Data Catalog encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * IAM role for Lake Formation permission management across all domains.
   * Should be an LF Admin role, typically created by the LF Settings module.
   * If omitted, looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: Automated LF permission grants; DataZone-LakeFormation integration
   *
   * AWS: IAM role for Lake Formation access management
   *
   * Validation: Optional; valid MdaaRoleRef
   */
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  /**
   * Custom execution role for SageMaker domains. When provided, uses this role
   * instead of creating a default execution role with AWS managed policies.
   *
   * Use cases: Least-privilege execution roles; Custom permission boundaries; Role reuse
   *
   * AWS: IAM role for SageMaker domain execution
   *
   * Validation: Optional; valid MdaaRoleRef
   */
  readonly sagemakerDomainExecutionRole?: MdaaRoleRef;
  /**
   * Map of domain names to DataZone (V1) domain configurations. Each domain
   * deploys a DataZone domain with KMS encryption, execution role, domain bucket,
   * user/group profiles, and optional associated accounts.
   *
   * Use cases: DataZone domain deployment; Data catalog governance; Multi-domain management
   *
   * AWS: DataZone domains, KMS keys, IAM roles, S3 buckets
   *
   * Validation: Optional; valid NamedDataZoneDomainProps
   */
  readonly dataZoneDomains?: NamedDataZoneDomainProps;

  /**
   * Map of domain names to SageMaker Unified Studio (DataZone V2) domain
   * configurations. Each domain deploys a SageMaker domain with KMS encryption,
   * service role, domain bucket, tooling blueprint, user/group profiles, and
   * optional cross-account associations.
   *
   * Use cases: SageMaker Unified Studio domain deployment; ML governance; Blueprint management
   *
   * AWS: SageMaker (DataZone V2) domains, KMS keys, IAM roles, S3 buckets
   *
   * Validation: Optional; valid NamedSageMakerDomainProps
   */
  readonly sageMakerDomains?: NamedSageMakerDomainProps;
}

export class DataZoneL3Construct extends MdaaL3Construct {
  protected readonly props: DataZoneL3ConstructProps;
  private readonly commonHelperProps: CommonDomainHelperProps;
  private readonly dataZoneHelper: DataZoneDomainHelper;
  private readonly sageMakerHelper: SageMakerDomainHelper;

  constructor(scope: Construct, id: string, props: DataZoneL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.commonHelperProps = {
      naming: this.props.naming,
      roleHelper: this.props.roleHelper,
      account: this.account,
      region: this.region,
      partition: this.partition,
      glueCatalogKmsKeyArn: this.props.glueCatalogKmsKeyArn,
    };

    this.dataZoneHelper = new DataZoneDomainHelper(this.commonHelperProps);
    this.sageMakerHelper = new SageMakerDomainHelper(this.commonHelperProps);

    const lakeformationManageAccessRole = props.lakeformationManageAccessRole
      ? Role.fromRoleArn(
          this,
          `lf-manage-access-role-import`,
          this.props.roleHelper
            .resolveRoleRefWithRefId(props.lakeformationManageAccessRole, 'lf-manage-access-role')
            .arn(),
        )
      : Role.fromRoleArn(
          this,
          `lf-manage-access-role-import`,
          MdaaStringParameter.valueForStringParameter(
            this,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );

    if (this.props.dataZoneDomains) {
      Object.entries(this.props.dataZoneDomains).forEach(([domainName, domainProps]) => {
        this.dataZoneHelper.createDataZoneDomain(this, domainName, domainProps, lakeformationManageAccessRole);
      });
    }
    if (this.props.sageMakerDomains) {
      this.sageMakerHelper.createSageMakerDomains(this, this.props.sageMakerDomains, lakeformationManageAccessRole);
    }
  }
}
