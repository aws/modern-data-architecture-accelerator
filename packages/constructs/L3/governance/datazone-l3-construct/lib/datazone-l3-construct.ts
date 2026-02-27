/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaStringParameter } from '@aws-mdaa/construct'; //NOSONAR
import { AuthorizationPolicy } from '@aws-mdaa/datazone-constructs/lib/authorization';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CommonDomainHelperProps } from './private/common-domain-helper';
import { DataZoneDomainHelper } from './private/datazone-domain-helper';
import { SageMakerDomainHelper } from './private/sagemaker-domain-helper';

/**
 * Q-ENHANCED-INTERFACE
 * DataZone user configuration interface for data governance providing user management and access control capabilities. Defines DataZone user properties for data governance including user identity, role assignments, and access permissions for systematic data catalog and governance user management.
 *
 * Use cases: Data governance user management; User access control; Identity management; Role assignments; Data catalog access; Governance permissions
 *
 * AWS: Amazon DataZone user configuration with identity management and access control for data governance
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface DataZoneUser {
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role reference for DataZone user identity and access control enabling role-based data governance permissions. Specifies the IAM role that will be associated with the DataZone user for access control and permission management within the data governance framework.
   *
   * Use cases: Role-based access control; IAM integration; Permission management; Data governance access; Identity management
   *
   * AWS: Amazon DataZone user IAM role association for access control and permission management
   *
   * Validation: Must be valid MdaaRoleRef if specified; role must exist and be accessible; mutually exclusive with ssoId
   **/
  readonly iamRole?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * SSO user identifier for DataZone user identity and federated access enabling single sign-on integration. Specifies the SSO user ID for federated identity management and centralized authentication within the DataZone data governance environment.
   *
   * Use cases: SSO integration; Federated identity; Centralized authentication; Single sign-on access; Identity federation
   *
   * AWS: Amazon DataZone SSO user integration for federated identity and centralized authentication
   *
   * Validation: Must be valid SSO user ID if specified; user must exist in SSO directory; mutually exclusive with iamRole
   **/
  readonly ssoId?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * DataZone group configuration interface for data governance providing group management and permission orchestration capabilities. Defines DataZone group properties for data governance including group identity, member management, and collective permissions for systematic data governance group administration.
 *
 * Use cases: Data governance group management; Group permissions; Member administration; Collective access control; Data catalog groups; Governance organization
 *
 * AWS: Amazon DataZone group configuration with group management and permission orchestration for data governance
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface DataZoneGroup {
  /**
   * Q-ENHANCED-PROPERTY
   * SSO group identifier for DataZone group identity and federated group management enabling centralized group-based access control. Specifies the SSO group ID for federated group management and collective permissions within the DataZone data governance environment.
   *
   * Use cases: SSO group integration; Federated group management; Centralized group access; Collective permissions; Group-based governance
   *
   * AWS: Amazon DataZone SSO group integration for federated group management and collective access control
   *
   * Validation: Must be valid SSO group ID; required; group must exist in SSO directory for proper integration
   **/
  readonly ssoId: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named DataZone group configuration interface for data governance with systematic group organization and management capabilities. Defines named DataZone group mappings for organized data governance including group sets, permission management, and systematic group administration for data catalog governance.
 *
 * Use cases: Named group sets; Group organization; Permission management; Systematic group administration; Data governance organization; Group mapping
 *
 * AWS: Amazon DataZone named group configuration with systematic group organization and management for data governance
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface NamedDataZoneGroups {
  /** @jsii ignore */
  readonly [name: string]: DataZoneGroup;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named DataZone user configuration interface for data governance with systematic user organization and management capabilities. Defines named DataZone user mappings for organized data governance including user sets, access management, and systematic user administration for data catalog governance.
 *
 * Use cases: Named user sets; User organization; Access management; Systematic user administration; Data governance organization; User mapping
 *
 * AWS: Amazon DataZone named user configuration with systematic user organization and management for data governance
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface NamedDataZoneUsers {
  /** @jsii ignore */
  readonly [name: string]: DataZoneUser;
}

export interface SageMakerAssociatedAccountProps extends AssociatedAccountProps {
  readonly tooling: ToolingBlueprintProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Associated account configuration interface for DataZone with cross-account data governance and multi-account integration capabilities. Defines associated account properties for DataZone including cross-account access, resource sharing, and multi-account data governance for enterprise data catalog management.
 *
 * Use cases: Cross-account data governance; Multi-account integration; Resource sharing; Enterprise data catalog; Cross-account access; Account association
 *
 * AWS: Amazon DataZone associated account configuration with cross-account governance and multi-account integration
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface AssociatedAccountProps {
  /**
   * Q-ENHANCED-PROPERTY
   * AWS account ID for DataZone cross-account association enabling multi-account data governance and resource sharing. Specifies the target account for DataZone association, supporting enterprise-wide data governance across multiple AWS accounts.
   *
   * Use cases: Cross-account data governance; Multi-account integration; Enterprise data catalog; Account association; Resource sharing
   *
   * AWS: Amazon DataZone cross-account association for multi-account data governance and resource sharing
   *
   * Validation: Must be valid AWS account ID; required; account must be accessible for DataZone association
   **/
  readonly account: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Glue catalog KMS key ARN for cross-account encryption and data protection enabling secure data catalog access. Specifies the KMS key used for encrypting Glue catalog resources in the associated account for secure cross-account data governance.
   *
   * Use cases: Cross-account encryption; Data protection; Secure catalog access; KMS key management; Data security
   *
   * AWS: AWS Glue catalog KMS encryption for secure cross-account data catalog access and protection
   *
   * Validation: Must be valid KMS key ARN; required; key must be accessible from both accounts for encryption operations
   **/
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation management access role ARN for cross-account data governance enabling fine-grained access control. Specifies the IAM role used for Lake Formation access management in the associated account for cross-account data governance and permission management.
   *
   * Use cases: Cross-account Lake Formation access; Fine-grained permissions; Data governance management; Access control; Permission delegation
   *
   * AWS: AWS Lake Formation cross-account access role for data governance and permission management
   *
   * Validation: Must be valid IAM role ARN if specified; role must have appropriate Lake Formation permissions
   **/
  readonly lakeformationManageAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Target region for DataZone cross-account association enabling multi-region data governance and resource management. Specifies the AWS region for the associated account resources, supporting multi-region data governance architectures.
   *
   * Use cases: Multi-region governance; Regional resource management; Cross-region association; Regional data catalog; Geographic distribution
   *
   * AWS: Amazon DataZone regional association for multi-region data governance and resource management
   *
   * Validation: Must be valid AWS region name if specified; region must support DataZone services
   **/
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * CDK deployment role ARN for cross-account infrastructure management enabling automated resource deployment. Specifies the IAM role used for CDK deployments in the associated account for infrastructure automation and resource management.
   *
   * Use cases: Cross-account CDK deployment; Infrastructure automation; Resource management; Deployment automation; Cross-account operations
   *
   * AWS: AWS CDK cross-account deployment role for infrastructure automation and resource management
   *
   * Validation: Must be valid IAM role ARN if specified; role must have appropriate CDK deployment permissions
   **/
  readonly cdkRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * CDK user creation flag for automated user provisioning enabling cross-account deployment user management. When enabled, automatically creates CDK deployment users in the associated account for infrastructure automation and deployment operations.
   *
   * Use cases: Automated user provisioning; Cross-account deployment; User management; Infrastructure automation; Deployment user creation
   *
   * AWS: AWS IAM user creation for CDK cross-account deployment and infrastructure automation
   *
   * Validation: Boolean value; when true, creates CDK deployment users in the associated account
   **/
  readonly createCdkUser?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named associated account configuration interface for DataZone with systematic cross-account organization and management capabilities. Defines named associated account mappings for organized multi-account data governance including account sets and systematic cross-account administration for enterprise data catalog governance.
 *
 * Use cases: Named account sets; Cross-account organization; Multi-account management; Systematic account administration; Enterprise governance organization; Account mapping
 *
 * AWS: Amazon DataZone named associated account configuration with systematic cross-account organization and management
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface NamedDataZoneAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AssociatedAccountProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named associated account configuration interface for DataZone with systematic cross-account organization and management capabilities. Defines named associated account mappings for organized multi-account data governance including account sets and systematic cross-account administration for enterprise data catalog governance.
 *
 * Use cases: Named account sets; Cross-account organization; Multi-account management; Systematic account administration; Enterprise governance organization; Account mapping
 *
 * AWS: Amazon DataZone named associated account configuration with systematic cross-account organization and management
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface NamedSageMakerAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: SageMakerAssociatedAccountProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataZone domain unit hierarchy enabling organizational data governance structure. Defines domain unit ownership, permissions, and nested hierarchical organization for systematic data catalog governance and access control within DataZone domains.
 *
 * Use cases: Hierarchical data governance; Domain unit organization; Nested organizational structure for data catalog management
 *
 * AWS: Configures AWS DataZone domain units with ownership and hierarchical organization for data governance
 *
 * Validation: All owner arrays are optional; domainUnits enables recursive nesting for hierarchical organization
 */
export interface DomainUnit {
  /**
   * Q-ENHANCED-PROPERTY
   * Owner account IDs for domain unit access control enabling cross-account ownership and administrative permissions. Specifies AWS accounts that have ownership and administrative access to the domain unit, supporting multi-account data governance and cross-account administration.
   *
   * Use cases: Cross-account ownership; Multi-account governance; Administrative access; Account-based permissions; Enterprise governance
   *
   * AWS: Amazon DataZone domain unit account ownership for cross-account governance and administrative access
   *
   * Validation: Must be array of valid AWS account IDs if specified; accounts must be accessible for ownership assignment
   **/
  readonly ownerAccounts?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Owner user names for domain unit access control enabling user-based ownership and administrative permissions. Specifies users that have ownership and administrative access to the domain unit, supporting user-based data governance and individual administration.
   *
   * Use cases: User-based ownership; Individual administration; User permissions; Personal governance; User access control
   *
   * AWS: Amazon DataZone domain unit user ownership for user-based governance and administrative access
   *
   * Validation: Must be array of valid user names if specified; users must exist in the DataZone domain for ownership assignment
   **/
  readonly ownerUsers?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Owner group names for domain unit access control enabling group-based ownership and collective administrative permissions. Specifies groups that have ownership and administrative access to the domain unit, supporting group-based data governance and collective administration.
   *
   * Use cases: Group-based ownership; Collective administration; Group permissions; Team governance; Group access control
   *
   * AWS: Amazon DataZone domain unit group ownership for group-based governance and administrative access
   *
   * Validation: Must be array of valid group names if specified; groups must exist in the DataZone domain for ownership assignment
   **/
  readonly ownerGroups?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Domain unit description for documentation and identification enabling clear unit purpose and organizational context. Provides descriptive information about the domain unit's purpose and scope within the data governance hierarchy.
   *
   * Use cases: Unit documentation; Purpose identification; Organizational context; Governance documentation; Unit description
   *
   * AWS: Amazon DataZone domain unit description for documentation and identification
   *
   * Validation: Must be valid description string if specified; provides context for domain unit purpose and scope
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Nested domain units for hierarchical organization enabling recursive domain unit structure and multi-level governance. Defines child domain units within the current unit, supporting complex organizational hierarchies and nested governance structures.
   *
   * Use cases: Hierarchical organization; Nested governance; Multi-level structure; Complex organization; Recursive units
   *
   * AWS: Amazon DataZone nested domain units for hierarchical governance and organizational structure
   *
   * Validation: Must be valid NamedDomainUnits if specified; enables recursive nesting for complex organizational hierarchies
   *   **/
  readonly domainUnits?: NamedDomainUnits;
  /**
   * Q-ENHANCED-PROPERTY
   * Authorization policies for domain unit access control enabling fine-grained permission management and governance. Defines authorization policies that grant specific permissions to principals (users, groups, accounts) within the domain unit, supporting comprehensive access control and data governance.
   *
   * Use cases: Fine-grained access control; Permission management; Data governance; Principal-based authorization; Policy-driven security
   *
   * AWS: Amazon DataZone authorization policies for domain unit access control and governance
   *
   * Validation: Must be Record of valid AuthorizationPolicy objects if specified; enables comprehensive domain unit authorization
   **/
  readonly authorizationPolicies?: NamedAuthorizationPolicies;

  readonly allowAllUsers?: boolean;

  readonly allowedUsers?: string[];

  readonly allowedGroups?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Named domain unit configuration interface for DataZone with systematic domain unit organization and management capabilities. Defines named domain unit mappings for organized hierarchical data governance including unit sets and systematic domain unit administration for data catalog governance.
 *
 * Use cases: Named domain unit sets; Domain unit organization; Hierarchical governance management; Systematic unit administration; Governance organization; Unit mapping
 *
 * AWS: Amazon DataZone named domain unit configuration with systematic domain unit organization and hierarchical management
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface NamedDomainUnits {
  /** @jsii ignore */
  readonly [name: string]: DomainUnit;
}

export interface NamedAuthorizationPolicies {
  /** @jsii ignore */
  readonly [name: string]: AuthorizationPolicy; // AuthorizationPolicy from datazone-constructs
}

/**
 * Q-ENHANCED-INTERFACE
 * Base domain configuration interface for DataZone providing data governance foundation and domain management capabilities. Defines base domain properties for DataZone including governance foundation, domain configuration, and administrative settings for systematic data catalog domain establishment.
 *
 * Use cases: Data governance foundation; Domain management; Governance configuration; Administrative settings; Data catalog domains; Domain establishment
 *
 * AWS: Amazon DataZone base domain configuration providing governance foundation and domain management
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface BaseDomainProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Data admin role reference for DataZone domain administration enabling domain management and administrative access. Specifies the IAM role that will have administrative privileges over the DataZone domain, including user management, resource configuration, and governance policy administration.
   *
   * Use cases: Domain administration; Administrative access; Domain management; Governance administration; Administrative privileges
   *
   * AWS: Amazon DataZone domain admin role for domain administration and management
   *
   * Validation: Must be valid MdaaRoleRef; required; role must have appropriate DataZone administrative permissions
   **/
  readonly dataAdminRole: MdaaRoleRef;

  /**
   * Q-ENHANCED-PROPERTY
   * Domain description for documentation and identification enabling clear domain purpose and organizational context. Provides descriptive information about the DataZone domain's purpose, scope, and role within the data governance framework.
   *
   * Use cases: Domain documentation; Purpose identification; Organizational context; Governance documentation; Domain description
   *
   * AWS: Amazon DataZone domain description for documentation and identification
   *
   * Validation: Must be valid description string if specified; provides context for domain purpose and governance scope
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * User assignment mode for DataZone domain access control enabling manual or automatic user provisioning. Controls how users are assigned to the domain, supporting either manual administrative control or automatic assignment based on organizational policies.
   *
   * Use cases: User provisioning control; Access management; Assignment automation; User lifecycle management; Access control
   *
   * AWS: Amazon DataZone domain user assignment configuration for user provisioning and access control
   *
   * Validation: Must be 'MANUAL' or 'AUTOMATIC'; optional; defaults to 'MANUAL'; determines user assignment and provisioning behavior
   *   **/
  readonly userAssignment?: 'MANUAL' | 'AUTOMATIC';

  /**
   * Q-ENHANCED-PROPERTY
   * Domain units for hierarchical organization enabling structured data governance and organizational alignment. Defines the organizational structure within the DataZone domain, supporting hierarchical governance and systematic data organization.
   *
   * Use cases: Hierarchical organization; Structured governance; Organizational alignment; Domain structure; Governance hierarchy
   *
   * AWS: Amazon DataZone domain units for hierarchical governance and organizational structure
   *
   * Validation: Must be valid NamedDomainUnits if specified; enables hierarchical domain organization and governance
   *   **/
  readonly domainUnits?: NamedDomainUnits;
  /**
   * Q-ENHANCED-PROPERTY
   * Domain users for user access management enabling individual user provisioning and access control. Defines users that will have access to the DataZone domain, supporting individual user management and personalized data governance access.
   *
   * Use cases: Individual user access; User provisioning; Personal access control; User management; Individual permissions
   *
   * AWS: Amazon DataZone domain user configuration for individual user access and management
   *
   * Validation: Must be valid NamedDataZoneUsers if specified; enables individual user access and management
   *   **/
  readonly users?: NamedDataZoneUsers;
  /**
   * Q-ENHANCED-PROPERTY
   * Domain groups for group-based access management enabling collective user provisioning and group-based access control. Defines groups that will have access to the DataZone domain, supporting group-based data governance and collective access management.
   *
   * Use cases: Group-based access; Collective provisioning; Group access control; Team management; Group permissions
   *
   * AWS: Amazon DataZone domain group configuration for group-based access and management
   *
   * Validation: Must be valid NamedDataZoneGroups if specified; enables group-based access and management
   *   **/
  readonly groups?: NamedDataZoneGroups;
  /**
   * Q-ENHANCED-PROPERTY
   * Owner user names for domain ownership enabling user-based domain administration and ownership control. Specifies users that have ownership privileges over the entire DataZone domain, supporting user-based domain administration and governance.
   *
   * Use cases: User-based ownership; Domain administration; User ownership control; Administrative users; Domain governance
   *
   * AWS: Amazon DataZone domain user ownership for user-based domain administration and control
   *
   * Validation: Must be array of valid user names if specified; users must exist in the DataZone domain for ownership assignment
   **/
  readonly ownerUsers?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Owner group names for domain ownership enabling group-based domain administration and collective ownership control. Specifies groups that have ownership privileges over the entire DataZone domain, supporting group-based domain administration and governance.
   *
   * Use cases: Group-based ownership; Collective administration; Group ownership control; Administrative groups; Domain governance
   *
   * AWS: Amazon DataZone domain group ownership for group-based domain administration and control
   *
   * Validation: Must be array of valid group names if specified; groups must exist in the DataZone domain for ownership assignment
   **/
  readonly ownerGroups?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Owner account IDs for domain ownership enabling cross-account domain administration and account-based ownership control. Specifies AWS accounts that have ownership privileges over the entire DataZone domain, supporting cross-account domain administration and governance.
   *
   * Use cases: Cross-account ownership; Account-based administration; Multi-account governance; Administrative accounts; Domain ownership
   *
   * AWS: Amazon DataZone domain account ownership for cross-account domain administration and control
   *
   * Validation: Must be array of valid AWS account IDs if specified; accounts must be accessible for ownership assignment
   **/
  readonly ownerAccounts?: string[];
}

export interface ToolingBlueprintProps extends EnabledBlueprintProps {
  readonly vpcId: string;
  readonly subnetIds: string[];
}

export interface EnabledBlueprintProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Provisioning role ARN for DataZone environment provisioning enabling environment provisioning and resource management. Specifies the IAM role ARN that will be used for DataZone environment provisioning, including resource creation, security group management, and Lake Formation permissions.
   *
   * Use cases: Environment provisioning; Resource management; Security management; Lake Formation integration
   *
   * AWS: IAM role ARN for DataZone environment provisioning and resource management
   *
   * Validation: Must be valid IAM role ARN if provided; role must have appropriate DataZone provisioning permissions
   **/
  readonly provisioningRoleArn?: string;
  readonly authorizedDomainUnits?: string[];
  readonly parameters?: {
    readonly [parameterName: string]: string;
  };
}

/**
 * Q-ENHANCED-INTERFACE
 * Domain configuration interface for DataZone providing data governance domain deployment and management capabilities. Defines domain properties for DataZone including domain versioning, SSO integration, and domain configuration for complete data governance domain establishment and management.
 *
 * Use cases: Data governance domains; Domain deployment; SSO integration; Domain versioning; Governance management; Data catalog domains
 *
 * AWS: Amazon DataZone domain configuration providing governance domain deployment and SSO integration
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface DataZoneDomainProps extends BaseDomainProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Single sign-on integration type for DataZone domain authentication enabling centralized identity management and federated access. Controls the SSO integration method, supporting either disabled SSO or IAM Identity Center integration for centralized authentication.
   *
   * Use cases: SSO integration; Centralized authentication; Identity management; Federated access; Authentication control
   *
   * AWS: Amazon DataZone SSO integration configuration for centralized authentication and identity management
   *
   * Validation: Must be 'DISABLED' or 'IAM_IDC'; optional; defaults to 'DISABLED'; determines authentication method and identity integration
   *   **/
  readonly singleSignOnType?: 'DISABLED' | 'IAM_IDC';
  /**
   * Q-ENHANCED-PROPERTY
   * Associated accounts for cross-account DataZone integration enabling multi-account data governance and resource sharing. Defines accounts that will be associated with the DataZone domain for cross-account data governance and collaborative data management.
   *
   * Use cases: Cross-account integration; Multi-account governance; Resource sharing; Enterprise data governance; Account association
   *
   * AWS: Amazon DataZone cross-account association for multi-account data governance and resource sharing
   *
   * Validation: Must be valid NamedAssociatedAccounts if specified; enables cross-account data governance and collaboration
   *   **/
  readonly associatedAccounts?: NamedDataZoneAssociatedAccounts;
}

export interface CustomEnabledBlueprintProps extends EnabledBlueprintProps {
  readonly path?: string;
  readonly url?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Domain configuration interface for DataZone providing data governance domain deployment and management capabilities. Defines domain properties for DataZone including domain versioning, SSO integration, and domain configuration for complete data governance domain establishment and management.
 *
 * Use cases: Data governance domains; Domain deployment; SSO integration; Domain versioning; Governance management; Data catalog domains
 *
 * AWS: Amazon DataZone domain configuration providing governance domain deployment and SSO integration
 *
 * Validation: Configuration must be valid for DataZone deployment; properties must conform to AWS DataZone and data governance requirements
 */
export interface SageMakerDomainProps extends BaseDomainProps {
  readonly tooling: ToolingBlueprintProps;

  readonly enabledManagedBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: EnabledBlueprintProps;
  };

  readonly customBlueprints?: {
    /** @jsii ignore */
    [blueprintName: string]: CustomEnabledBlueprintProps;
  };

  /**
   * Q-ENHANCED-PROPERTY
   * Associated accounts for cross-account DataZone integration enabling multi-account data governance and resource sharing. Defines accounts that will be associated with the DataZone domain for cross-account data governance and collaborative data management.
   *
   * Use cases: Cross-account integration; Multi-account governance; Resource sharing; Enterprise data governance; Account association
   *
   * AWS: Amazon DataZone cross-account association for multi-account data governance and resource sharing
   *
   * Validation: Must be valid NamedAssociatedAccounts if specified; enables cross-account data governance and collaboration
   *   **/
  readonly associatedAccounts?: NamedSageMakerAssociatedAccounts;
}

/**
 * Q-ENHANCED-INTERFACE
 * NamedSageMakerDomainBuildProps configuration interface for data governance and catalog management.
 *
 * Use cases: Data governance; Data catalog management; Data discovery; Governance workflows
 *
 * AWS: Amazon DataZone configuration for data governance and catalog management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon DataZone and MDAA requirements
 */
export interface NamedSageMakerDomainProps {
  /** @jsii ignore */
  readonly [name: string]: SageMakerDomainProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * NamedDataZoneDomainProps configuration interface for data governance and catalog management.
 *
 * Use cases: Data governance; Data catalog management; Data discovery; Governance workflows
 *
 * AWS: Amazon DataZone configuration for data governance and catalog management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon DataZone and MDAA requirements
 */
export interface NamedDataZoneDomainProps {
  /** @jsii ignore */
  readonly [name: string]: DataZoneDomainProps;
}

export interface DataZoneL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Glue catalog KMS key ARN for DataZone encryption enabling customer-controlled encryption and enhanced security compliance. When provided, uses existing KMS key for encrypting DataZone catalog resources; otherwise uses service-managed encryption for data protection.
   *
   * Use cases: Catalog encryption; Customer-controlled keys; Security compliance; Data protection
   *
   * AWS: KMS key ARN for DataZone Glue catalog encryption and customer-controlled data protection
   *
   * Validation: Must be valid KMS key ARN if provided; enables customer-controlled encryption for DataZone catalog resources
   **/
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional LakeFormation management access role reference for DataZone integration enabling automated LakeFormation permissions management and data governance coordination. Provides IAM role for DataZone to manage LakeFormation permissions automatically for integrated data governance workflows.
   *
   * Use cases: LakeFormation integration; Automated permissions; Data governance coordination; Permission management
   *
   * AWS: IAM role reference for DataZone LakeFormation integration and automated permission management
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables DataZone LakeFormation integration and automated governance
   **/
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SageMaker domain execution role reference for DataZone domain execution enabling custom execution role configuration. When provided, uses existing role instead of creating default execution role with AWS managed policies for enhanced security compliance.
   *
   * Use cases: Custom execution roles; Security compliance; Least privilege access; Role reuse
   *
   * AWS: IAM role reference for DataZone domain execution with custom permissions
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables custom execution role configuration
   **/
  readonly sagemakerDomainExecutionRole?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of domain names to domain configurations for DataZone governance deployment enabling data governance platform setup. Provides domain configurations including user management, SSO integration, and governance settings for data collaboration and catalog management.
   *
   * Use cases: Domain management; Data governance setup; User collaboration; Catalog governance
   *
   * AWS: DataZone domains for data governance platform and collaboration management
   *
   * Validation: Must be valid NamedDomainsProps; required for DataZone domain deployment and governance platform setup
   *   **/
  readonly dataZoneDomains?: NamedDataZoneDomainProps;

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

    let lakeformationManageAccessRole: IRole;
    if (props.lakeformationManageAccessRole) {
      lakeformationManageAccessRole = Role.fromRoleArn(
        this,
        `lf-manage-access-role-import`,
        this.props.roleHelper
          .resolveRoleRefWithRefId(props.lakeformationManageAccessRole, 'lf-manage-access-role')
          .arn(),
      );
    } else {
      try {
        const roleArn = MdaaStringParameter.valueForStringParameter(
          this,
          LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
        );
        if (!roleArn) {
          throw new Error(
            `SSM parameter ${LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH} is empty or undefined`,
          );
        }
        lakeformationManageAccessRole = Role.fromRoleArn(this, `lf-manage-access-role-import`, roleArn);
      } catch (error) {
        throw new Error(
          `Failed to retrieve LakeFormation manage access role from SSM parameter ${LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH}. ` +
            `Either provide 'lakeformationManageAccessRole' prop or ensure the SSM parameter exists. Error: ${error}`,
        );
      }
    }

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
