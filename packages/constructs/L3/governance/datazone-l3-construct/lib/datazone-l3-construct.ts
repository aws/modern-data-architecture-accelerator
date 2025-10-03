/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaManagedPolicy, MdaaManagedPolicyProps, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Duration, Stack } from 'aws-cdk-lib';

import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR

import { DomainConfig, DomainConfigProps } from '@aws-mdaa/datazone-constructs';
import {
  CfnDomain,
  CfnDomainProps,
  CfnDomainUnit,
  CfnDomainUnitProps,
  CfnGroupProfile,
  CfnGroupProfileProps,
  CfnOwner,
  CfnOwnerProps,
  CfnUserProfile,
  CfnUserProfileProps,
} from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { flattenDomainUnitPaths } from './utils';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { GlueCatalogL3Construct } from '@aws-mdaa/glue-catalog-l3-construct';

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
export interface AsscociatedAccount {
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
  readonly glueCatalogKmsKeyArn: string;
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
export interface NamedAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AsscociatedAccount;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named base domain configuration interface for DataZone with systematic domain organization and management capabilities. Defines named base domain mappings for organized data governance including domain sets and systematic domain administration for data catalog governance.
 *
 * Use cases: Named domain sets; Domain organization; Systematic domain administration; Data governance organization
 *
 * AWS: Amazon DataZone named base domain configuration with systematic domain organization and management
 *
 * Validation: String keys must be unique domain names; values must be valid BaseDomainProps configurations
 */
export interface NamedBaseDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: BaseDomainProps;
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
   * Validation: Must be 'MANUAL' or 'AUTOMATIC'; required; determines user assignment and provisioning behavior
   *   **/
  readonly userAssignment: 'MANUAL' | 'AUTOMATIC';
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
  readonly associatedAccounts?: NamedAssociatedAccounts;
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
export interface DomainProps extends BaseDomainProps {
  /**
   * Q-ENHANCED-PROPERTY
   * DataZone domain version specification enabling version-specific features and capabilities. Controls the DataZone domain version, affecting available features, API compatibility, and governance capabilities within the data governance platform.
   *
   * Use cases: Version control; Feature availability; API compatibility; Governance capabilities; Platform versioning
   *
   * AWS: Amazon DataZone domain version configuration for feature availability and platform capabilities
   *
   * Validation: Must be 'V1' or 'V2' if specified; determines available features and governance capabilities
   *   **/
  readonly domainVersion?: 'V1' | 'V2';
  /**
   * Q-ENHANCED-PROPERTY
   * Single sign-on integration type for DataZone domain authentication enabling centralized identity management and federated access. Controls the SSO integration method, supporting either disabled SSO or IAM Identity Center integration for centralized authentication.
   *
   * Use cases: SSO integration; Centralized authentication; Identity management; Federated access; Authentication control
   *
   * AWS: Amazon DataZone SSO integration configuration for centralized authentication and identity management
   *
   * Validation: Must be 'DISABLED' or 'IAM_IDC'; required; determines authentication method and identity integration
   *   **/
  readonly singleSignOnType: 'DISABLED' | 'IAM_IDC';
}
/**
 * Q-ENHANCED-INTERFACE
 * NamedDomainsProps configuration interface for data governance and catalog management.
 *
 * Use cases: Data governance; Data catalog management; Data discovery; Governance workflows
 *
 * AWS: Amazon DataZone configuration for data governance and catalog management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon DataZone and MDAA requirements
 */
export interface NamedDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: DomainProps;
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
   * Required map of domain names to domain configurations for DataZone governance deployment enabling data governance platform setup. Provides domain configurations including user management, SSO integration, and governance settings for data collaboration and catalog management.
   *
   * Use cases: Domain management; Data governance setup; User collaboration; Catalog governance
   *
   * AWS: DataZone domains for data governance platform and collaboration management
   *
   * Validation: Must be valid NamedDomainsProps; required for DataZone domain deployment and governance platform setup
   *   **/
  readonly domains: NamedDomainsProps;
}

const DEFAULT_SSO_TYPE = 'DISABLED';
const DEFAULT_USER_ASSIGNMENT = 'MANUAL';

export interface CreatedDomainUnit {
  readonly id: string;
  readonly domainUnits?: { [name: string]: CreatedDomainUnit };
}

export class DataZoneL3Construct extends MdaaL3Construct {
  protected readonly props: DataZoneL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataZoneL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

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
          StringParameter.valueForStringParameter(
            this,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );

    Object.entries(this.props.domains || {}).forEach(entry => {
      const domainName = entry[0];
      const domainProps = entry[1];
      this.createDomain(domainName, domainProps, lakeformationManageAccessRole);
    });
  }
  private createDomain(domainName: string, domainProps: DomainProps, lakeformationManageAccessRole: IRole) {
    const dataAdminRole = this.props.roleHelper.resolveRoleRefWithRefId(domainProps.dataAdminRole, 'admin');

    const domainVersion = domainProps.domainVersion ?? 'V1';

    const kmsKey = this.createDomainKmsKey(domainName, domainProps, dataAdminRole);

    const executionRole = this.createExecutionRole(`${domainName}-execution-role`, kmsKey, domainVersion);

    const singleSignOn: CfnDomain.SingleSignOnProperty = {
      type: domainProps.singleSignOnType ?? DEFAULT_SSO_TYPE,
      userAssignment: domainProps.userAssignment ?? DEFAULT_USER_ASSIGNMENT,
    };

    const cfnDomainProps: CfnDomainProps = {
      domainExecutionRole: executionRole.roleArn,
      name: this.props.naming.resourceName(domainName),
      kmsKeyIdentifier: kmsKey.keyArn,
      description: domainProps.description,
      singleSignOn: singleSignOn,
      domainVersion: domainProps.domainVersion,
      serviceRole: domainVersion == 'V2' ? this.createServiceRole(`service-${domainName}`, kmsKey).roleArn : undefined,
    };

    // Create domain
    const domain = new CfnDomain(this, `${domainName}-domain`, cfnDomainProps);

    const domainCdkUserId = this.getDomainCdkUserId(domainName, domain, domain.attrId, kmsKey.keyArn);

    const customEnvBlueprintConfig = this.createCustomBlueprintConfig(
      domainName,
      this,
      domain.attrId,
      [this.region],
      kmsKey.keyArn,
      domainVersion,
    );

    const dataAdminUserProfileProps: CfnUserProfileProps = {
      domainIdentifier: domain.attrId,
      userIdentifier: dataAdminRole.arn(),
      userType: 'IAM_ROLE',
      status: 'ACTIVATED',
    };
    const dataAdminUserProfile = new CfnUserProfile(
      this,
      `${domainName}-admin-user-profile`,
      dataAdminUserProfileProps,
    );

    const admincfnOwnerProps: CfnOwnerProps = {
      domainIdentifier: domain.attrId,
      entityIdentifier: domain.attrRootDomainUnitId,
      entityType: 'DOMAIN_UNIT',
      owner: {
        user: {
          userIdentifier: dataAdminUserProfile.attrId,
        },
      },
    };
    new CfnOwner(domain, `owner-user-data-admin`, admincfnOwnerProps);

    const glueCatalogKmsKeyArns = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].glueCatalogKmsKeyArn),
      this.props.glueCatalogKmsKeyArn ||
        StringParameter.valueForStringParameter(this, GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH),
    ];

    const domainKmsUsagePolicyName = this.props.naming.resourceName(`domain-kms-use-${domainName}`);

    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].account),
      this.account,
    ];

    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(
      domainName,
      this,
      domainKmsUsagePolicyName,
      this.region,
      this.account,
      keyAccessAccounts,
      {
        domainKmsKeyArn: kmsKey.keyArn,
        glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
      },
    );

    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    executionRole.addManagedPolicy(domainKmsUsagePolicy);

    const domainUsers = Object.fromEntries(
      Object.entries(domainProps.users || {}).map(([userName, userProps]) => {
        const userIdentifier = userProps.iamRole
          ? this.props.roleHelper.resolveRoleRefWithRefId(userProps.iamRole, userName).arn()
          : userProps.ssoId;
        const userType = userProps.iamRole ? 'IAM_ROLE' : 'SSO_USER';

        if (!userType || !userIdentifier) {
          throw new Error(`One of user iamRole or ssoId must be specified in user props for user ${userName}`);
        }

        const userProfileProps: CfnUserProfileProps = {
          domainIdentifier: domain.attrId,
          userIdentifier: userIdentifier,
          userType: userType,
          status: 'ACTIVATED',
        };
        const user = new CfnUserProfile(this, `${domainName}-user-${userName}`, userProfileProps);
        return [userName, user];
      }),
    );

    const domainGroups = Object.fromEntries(
      Object.entries(domainProps.groups || {}).map(([groupName, groupProps]) => {
        const groupProfileProps: CfnGroupProfileProps = {
          domainIdentifier: domain.attrId,
          groupIdentifier: groupProps.ssoId,

          status: 'ASSIGNED',
        };
        const user = new CfnGroupProfile(this, `${domainName}-group-${groupName}`, groupProfileProps);
        return [groupName, user];
      }),
    );

    domainProps.ownerUsers?.forEach(ownerName => {
      const ownerUser = domainUsers[ownerName];
      if (!ownerUser) {
        throw new Error(`Unknown owner user ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        owner: {
          user: {
            userIdentifier: ownerUser.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-user-${ownerName}`, cfnOwnerProps);
    });

    domainProps.ownerGroups?.forEach(ownerName => {
      const ownerGroup = domainGroups[ownerName];
      if (!ownerGroup) {
        throw new Error(`Unknown owner group ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        owner: {
          group: {
            groupIdentifier: ownerGroup.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-group-${ownerName}`, cfnOwnerProps);
    });

    const associatedAccountCdkUserProfiles = this.createAccountAssociations(domainName, domainProps, domain);

    const createdDomainUnits = this.createDomainUnits(
      domain,
      domain.attrId,
      domain.attrRootDomainUnitId,
      {
        domainUsers: domainUsers,
        domainGroups: domainGroups,
        dataAdminUserProfile: dataAdminUserProfile,
        associatedAccountCdkUserProfiles: associatedAccountCdkUserProfiles || {},
      },
      domainProps.domainUnits,
    );

    this.createDomainUnitGrant(domain, `root-grant-create-project`, kmsKey.keyArn, domainName, domain, {
      policyType: 'CREATE_PROJECT',
      detail: {
        createProject: {
          includeChildDomainUnits: true,
        },
      },
      principal: {
        user: {
          userIdentifier: domainCdkUserId,
        },
      },
    });

    this.createDomainUnitGrant(domain, `root-grant-project-members`, kmsKey.keyArn, domainName, domain, {
      policyType: 'ADD_TO_PROJECT_MEMBER_POOL',

      detail: {
        addToProjectMemberPool: {
          includeChildDomainUnits: true,
        },
      },
      principal: {
        user: {
          allUsersGrantFilter: {},
        },
      },
    });
    const glueCatalogArns = [
      ...this.createDzGlueAccountStatementResources(this.account),
      ...Object.entries(domainProps.associatedAccounts || {}).flatMap(x =>
        this.createDzGlueAccountStatementResources(x[1].account),
      ),
    ];

    const domainUnitIds = flattenDomainUnitPaths('', createdDomainUnits);

    const domainConfigProps: DomainConfigProps = {
      naming: this.props.naming,
      domainName: domain.name,
      domainArn: domain.attrArn,
      domainId: domain.attrId,
      adminUserProfileId: dataAdminUserProfile.attrId,
      domainVersion,
      domainKmsKeyArn: kmsKey.keyArn,
      glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
      domainKmsUsagePolicyName: domainKmsUsagePolicy.managedPolicyName,
      domainUnits: domainUnitIds,
      glueCatalogArns: glueCatalogArns,
      domainCustomEnvBlueprintId: customEnvBlueprintConfig?.getAttString('id'),
    };

    const domainConfig = new DomainConfig(this, `domain-config-${domainName}`, domainConfigProps);

    const configParamArns = domainConfig.createDomainConfigParams(domainName);

    const baseConfigParam = new MdaaParamAndOutput(this, {
      createOutputs: false,
      resourceType: 'domain',
      resourceId: domainName,
      name: `config`,
      tier: ParameterTier.ADVANCED,
      value: JSON.stringify(configParamArns, undefined, 2),
      ...this.props,
    });

    if (domainProps.associatedAccounts) {
      const configParamRamShareProps: CfnResourceShareProps = {
        name: this.props.naming.resourceName(`domain-config-ssm-${domainName}`),
        resourceArns: [baseConfigParam.param!.parameterArn, ...configParamArns],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
      };
      const configRamShare = new CfnResourceShare(
        this,
        `domain-config-ram-share-${domainName}`,
        configParamRamShareProps,
      );

      Object.entries(domainProps.associatedAccounts || {}).forEach(associatedAccount => {
        this.getRamAssociationMonitor(
          domain,
          `domain-config-ram-association-monitor-${associatedAccount[0]}`,
          configRamShare,
          associatedAccount[1].account,
        );
        this.createAssociatedAccountStackResources(
          associatedAccount[0],
          associatedAccount[1],
          baseConfigParam.paramName,
          domainKmsUsagePolicyName,
          keyAccessAccounts,
          domainName,
        );
      });
    }
  }

  private createAccountAssociations(
    domainName: string,
    domainProps: DomainProps,
    domain: CfnDomain,
  ): { [name: string]: CfnUserProfile } {
    if (domainProps.associatedAccounts) {
      const domainramShareProps: CfnResourceShareProps = {
        name: `DataZone-${this.props.naming.resourceName()}-${domain.attrId}`,
        resourceArns: [domain.attrArn],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        permissionArns: ['arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAmazonDataZoneDomain'],
      };
      const domainRamShare = new CfnResourceShare(this, `domain-ram-share-${domainName}`, domainramShareProps);
      const associatedAccountCdkUserProfiles = Object.fromEntries(
        Object.entries(domainProps.associatedAccounts || {})
          .filter(associatedAccountProps => {
            return associatedAccountProps[1].createCdkUser;
          })
          .map(([associatedAccountName, associatedAccountProps]) => {
            const associatedAccountRamShareMonitor = this.getRamAssociationMonitor(
              domain,
              `domain-ram-association-monitor-${associatedAccountName}`,
              domainRamShare,
              associatedAccountProps.account,
            );

            const accountCdkUserProfileProps: CfnUserProfileProps = {
              domainIdentifier: domain.attrId,
              userIdentifier:
                associatedAccountProps.cdkRoleArn ??
                `arn:${this.partition}:iam::${associatedAccountProps.account}:role/cdk-hnb659fds-cfn-exec-role-${associatedAccountProps.account}-${this.region}`,
              userType: 'IAM_ROLE',
              status: 'ACTIVATED',
            };
            const associatedAccountCdkUserProfile = new CfnUserProfile(
              this,
              `${domainName}-${associatedAccountName}-cdk-user-profile`,
              accountCdkUserProfileProps,
            );
            associatedAccountCdkUserProfile.node.addDependency(associatedAccountRamShareMonitor);
            return [associatedAccountName, associatedAccountCdkUserProfile];
          }),
      );
      domainProps.ownerAccounts?.forEach(ownerName => {
        const ownerUser = associatedAccountCdkUserProfiles[ownerName];
        if (!ownerUser) {
          throw new Error(`Unknown owner account cdk user ${ownerName} on domain ${domainName}`);
        }
        const cfnOwnerProps: CfnOwnerProps = {
          domainIdentifier: domain.attrId,
          entityIdentifier: domain.attrRootDomainUnitId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: ownerUser.attrId,
            },
          },
        };
        new CfnOwner(domain, `owner-cdk-user-${ownerName}`, cfnOwnerProps);
      });
      return associatedAccountCdkUserProfiles;
    }
    return {};
  }
  private createDzGlueAccountStatementResources(account: string): string[] {
    return [
      `arn:${this.partition}:glue:${this.region}:${account}:catalog`,
      `arn:${this.partition}:glue:${this.region}:${account}:database/*`,
      `arn:${this.partition}:glue:${this.region}:${account}:table/*`,
      `arn:${this.partition}:glue:${this.region}:${account}:tableVersion/*`,
    ];
  }
  private createDomainUnits(
    scope: Construct,
    domainId: string,
    parentDomainId: string,
    userProfiles: {
      domainUsers: { [name: string]: CfnUserProfile };
      domainGroups: { [name: string]: CfnGroupProfile };
      dataAdminUserProfile: CfnUserProfile;
      associatedAccountCdkUserProfiles: { [name: string]: CfnUserProfile };
    },
    domainUnits?: NamedDomainUnits,
  ): { [name: string]: CreatedDomainUnit } {
    return Object.fromEntries(
      Object.entries(domainUnits ?? {}).map(([domainUnitName, domainUnitProps]) => {
        const cfnDomainUnitProps: CfnDomainUnitProps = {
          domainIdentifier: domainId,
          name: domainUnitName,
          parentDomainUnitIdentifier: parentDomainId,
          description: domainUnitProps.description,
        };
        const domainUnit = new CfnDomainUnit(scope, `domain-unit-${domainUnitName}`, cfnDomainUnitProps);

        const dataAdminOwnerProps: CfnOwnerProps = {
          domainIdentifier: domainId,
          entityIdentifier: domainUnit.attrId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: userProfiles.dataAdminUserProfile.attrId,
            },
          },
        };
        new CfnOwner(domainUnit, `owner-user-data-admin`, dataAdminOwnerProps);

        domainUnitProps.ownerAccounts?.forEach(ownerName => {
          const ownerUser = userProfiles.associatedAccountCdkUserProfiles[ownerName];
          if (!ownerUser) {
            throw new Error(`Unknown owner account ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              user: {
                userIdentifier: ownerUser.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-cdk-user-${ownerName}`, cfnOwnerProps);
        });

        domainUnitProps.ownerUsers?.forEach(ownerName => {
          const ownerUser = userProfiles.domainUsers[ownerName];
          if (!ownerUser) {
            throw new Error(`Unknown owner user ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              user: {
                userIdentifier: ownerUser.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-user-${ownerName}`, cfnOwnerProps);
        });

        domainUnitProps.ownerGroups?.forEach(ownerName => {
          const ownerGroup = userProfiles.domainGroups[ownerName];
          if (!ownerGroup) {
            throw new Error(`Unknown owner group ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              group: {
                groupIdentifier: ownerGroup.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-group-${ownerName}`, cfnOwnerProps);
        });

        const childDomainUnits = this.createDomainUnits(
          domainUnit,
          domainId,
          domainUnit.attrId,
          {
            domainUsers: userProfiles.domainUsers,
            domainGroups: userProfiles.domainGroups,
            dataAdminUserProfile: userProfiles.dataAdminUserProfile,
            associatedAccountCdkUserProfiles: userProfiles.associatedAccountCdkUserProfiles,
          },
          domainUnitProps.domainUnits,
        );
        return [domainUnitName, { id: domainUnit.attrId, domainUnits: childDomainUnits }];
      }),
    );
  }

  private createAssociatedAccountStackResources(
    associatedAccountName: string,
    assocatedAccountProps: AsscociatedAccount,
    domainConfigSsmParamName: string,
    domainKmsUsagePolicyName: string,
    keyAccessAccounts: string[],
    domainName: string,
  ) {
    const crossAccountStack = this.getCrossAccountStack(assocatedAccountProps.account);
    if (!crossAccountStack) {
      console.warn(
        `Cross account stack not defined for associated account ${associatedAccountName}/${assocatedAccountProps.account} on domain ${domainName}. Cross account association will not work.`,
      );
      return;
    }
    const region = assocatedAccountProps.region || this.region;
    //The cross account stack is going to consume the domain config via RAM-shared Domain Config SSM Param created above
    const domainConfigSsmParamArn = `arn:${this.partition}:ssm:${region}:${this.account}:parameter${domainConfigSsmParamName}`;

    const domainConfig = DomainConfig.fromSsm(
      crossAccountStack,
      `domain-config-parser-${domainName}`,
      domainConfigSsmParamArn,
      this.props.naming,
    );

    //Create a managed policy which can be used to provide access to the Domain and Glue Catalog KMS keys in associated accounts
    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(
      domainName,
      crossAccountStack,
      domainKmsUsagePolicyName,
      assocatedAccountProps.account,
      region,
      keyAccessAccounts,
      {
        domainKmsKeyArn: domainConfig.domainKmsKeyArn,
        glueCatalogKmsKeyArns: domainConfig.glueCatalogKmsKeyArns,
      },
    );
    const lakeformationManageAccessRole = assocatedAccountProps.lakeformationManageAccessRoleArn
      ? Role.fromRoleArn(
          crossAccountStack,
          `lf-manage-access-role-import-${domainName}`,
          assocatedAccountProps.lakeformationManageAccessRoleArn,
        )
      : Role.fromRoleArn(
          crossAccountStack,
          `lf-manage-access-role-import-${domainName}`,
          StringParameter.valueForStringParameter(
            crossAccountStack,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );
    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    //Enable custom blueprints in the target account for this domain
    this.createCustomBlueprintConfig(
      domainName,
      crossAccountStack,
      domainConfig.domainId,
      [region || this.region],
      domainConfig.domainKmsKeyArn,
      domainConfig.domainVersion,
    );
  }

  private createDomainKmsUsagePolicy(
    domainName: string,
    scope: Construct,
    policyName: string,
    account: string,
    region: string,
    keyAccessAccounts: string[],
    kmsArns: {
      domainKmsKeyArn: string;
      glueCatalogKmsKeyArns: string[];
    },
  ) {
    const kmsUsagePolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true, //policy name is passed verbatim as it will be the same in all accounts
    };
    const domainKmsUsagePolicy = new MdaaManagedPolicy(
      scope,
      `domain-kms-managed-policy-${domainName}`,
      kmsUsagePolicyProps,
    );

    // Reference https://docs.aws.amazon.com/datazone/latest/userguide/encryption-rest-datazone.html
    //Provide Decrypt on the Domain KMS Key when used within DataZone
    const domainKeyDecryptStatement = new PolicyStatement({
      sid: 'DomainKmsDecrypt',
      effect: Effect.ALLOW,
      resources: [kmsArns.domainKmsKeyArn],
      actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
      conditions: {
        'ForAnyValue:StringEquals': {
          'kms:EncryptionContextKeys': 'aws:datazone:domainId',
        },
      },
    });
    domainKmsUsagePolicy.addStatements(domainKeyDecryptStatement);

    //Provide Decrypt on the Domain KMS Key when used within DataZone
    const domainKeyGrantStatement = new PolicyStatement({
      sid: 'DomainKmsGrant',
      effect: Effect.ALLOW,
      resources: [kmsArns.domainKmsKeyArn],
      actions: ['kms:CreateGrant'],
      conditions: {
        StringLike: {
          'kms:CallerAccount': account,
          'kms:ViaService': `datazone.${region}.amazonaws.com`,
        },
        Bool: {
          'kms:GrantIsForAWSResource': 'true',
        },
        'ForAnyValue:StringEquals': {
          'kms:EncryptionContextKeys': 'aws:datazone:domainId',
        },
      },
    });
    domainKmsUsagePolicy.addStatements(domainKeyGrantStatement);

    //Provide DescribeKey on all Glue Catalog keys for all associated accounts
    const glueCatalogDescribeStatement = new PolicyStatement({
      sid: 'GlueKmsDescribe',
      effect: Effect.ALLOW,
      resources: kmsArns.glueCatalogKmsKeyArns,
      actions: ['kms:DescribeKey'],
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDescribeStatement);

    //Provide Decrypt on all Glue Catalog keys for all associated accounts when used only with glue catalogs for these accounts
    const glueCatalogDecryptStatement = new PolicyStatement({
      sid: 'GlueKmsDecrypt',
      effect: Effect.ALLOW,
      resources: kmsArns.glueCatalogKmsKeyArns,
      actions: ['kms:Decrypt'],
      conditions: {
        StringEquals: {
          'kms:EncryptionContext:glue_catalog_id': keyAccessAccounts,
        },
      },
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDecryptStatement);

    return domainKmsUsagePolicy;
  }

  private createDomainKmsKey(domainName: string, domainProps: DomainProps, dataAdminRole: MdaaResolvableRole): IKey {
    // Create KMS Key
    const kmsKey = new MdaaKmsKey(this, `${domainName}-cmk`, {
      naming: this.props.naming,
      alias: domainName,
      keyAdminRoleIds: [dataAdminRole.id()],
    });

    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].account),
      this.account,
    ];
    keyAccessAccounts.forEach(account => {
      //Add a statement that allows anyone in the account to use the key as long as it is via Datazone
      const accountKeyUsagePolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
      });
      accountKeyUsagePolicyStatement.addAnyPrincipal();
      accountKeyUsagePolicyStatement.addCondition('StringEquals', {
        'kms:CallerAccount': account,
        'kms:ViaService': `datazone.${this.region}.amazonaws.com`,
      });
      kmsKey.addToResourcePolicy(accountKeyUsagePolicyStatement);
    });
    return kmsKey;
  }

  /**
   * Creates an Execution Role for a DataZone Domain
   * @param roleName name to use for the role
   * @param kmsArn KMS key ARN created for the domain
   * @returns a Role
   */
  private createServiceRole(roleName: string, kmsKey: IKey): IRole {
    const serviceRoleConditions: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.account,
      },
    };

    const serviceRole = new MdaaRole(this, roleName, {
      naming: this.props.naming,
      roleName: roleName,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(serviceRoleConditions),
      // managedPolicies: [
      //   MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
      // ],
    });

    serviceRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      serviceRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
      ],
      true,
    );

    return serviceRole;
  }

  /**
   * Creates an Execution Role for a DataZone Domain
   * @param roleName name to use for the role
   * @param kmsArn KMS key ARN created for the domain
   * @returns a Role
   */
  private createExecutionRole(roleName: string, kmsKey: IKey, domainVersion?: string): IRole {
    const executionRoleCondition: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.account,
      },
      'ForAllValues:StringLike': {
        'aws:TagKeys': 'datazone*',
      },
    };

    const executionRole = new MdaaRole(this, roleName, {
      naming: this.props.naming,
      roleName: roleName,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition),
      managedPolicies: [
        domainVersion == 'V2'
          ? MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/SageMakerStudioDomainExecutionRolePolicy')
          : MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
      ],
    });

    executionRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition)],
      }),
    );

    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      executionRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Permissions are related DataZone and only one permission is given to RAM to get share associations.',
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
      ],
      true,
    );

    return executionRole;
  }

  private createCustomBlueprintConfig(
    domainName: string,
    scope: Construct,
    domainId: string,
    regions: string[],
    domainKmsKeyArn: string,
    domainVersion: string,
  ): MdaaCustomResource {
    const envBlueprintConfigsStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:PutEnvironmentBlueprintConfiguration', 'datazone:ListEnvironmentBlueprints'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'EnvBlueprintConfig',
      code: Code.fromAsset(`${__dirname}/../src/lambda/blueprint_configuration`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'blueprint_configuration.lambda_handler',
      handlerRolePolicyStatements: envBlueprintConfigsStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'PutEnvironmentBlueprintConfiguration does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domainId,
        enabledRegions: regions,
        domainVersion: domainVersion,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, `env-blueprint-config-cr-${domainName}`, crProps);
  }

  private createDomainUnitGrant(
    scope: Construct,
    grantId: string,
    domainKmsKeyArn: string,
    domainName: string,
    domain: CfnDomain,
    grantProps: {
      policyType:
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
        | 'CREATE_PROJECT_FROM_PROJECT_PROFILE'
        | 'USE_ASSET_TYPE';
      detail: unknown;
      principal: unknown;
    },
  ) {
    const addPolicyGrantStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:AddPolicyGrant'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'AddPolicyGrant',
      code: Code.fromAsset(`${__dirname}/../src/lambda/add_policy_grant`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'add_policy_grant.lambda_handler',
      handlerRolePolicyStatements: addPolicyGrantStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'AddPolicyGrant does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        policyType: grantProps.policyType,
        detail: grantProps.detail,
        principal: grantProps.principal,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    const grantCr = new MdaaCustomResource(scope, grantId, crProps);

    if (grantCr.handlerFunction.role) {
      const stack = Stack.of(scope);
      const ownerResourceId = `${domainName}-owner-grant-cr-user-profile`;
      const existingOwner = stack.node.tryFindChild(ownerResourceId);
      if (!existingOwner) {
        const dataAdminUserProfileProps: CfnUserProfileProps = {
          domainIdentifier: domain.attrId,
          userIdentifier: grantCr.handlerFunction.role?.roleArn,
          userType: 'IAM_ROLE',
          status: 'ACTIVATED',
        };
        const dataAdminUserProfile = new CfnUserProfile(
          this,
          `${domainName}-grant-cr-user-profile`,
          dataAdminUserProfileProps,
        );
        const adminCfnOwnerProps: CfnOwnerProps = {
          domainIdentifier: domain.attrId,
          entityIdentifier: domain.attrRootDomainUnitId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: dataAdminUserProfile.attrId,
            },
          },
        };
        const grantCrOwner = new CfnOwner(stack, ownerResourceId, adminCfnOwnerProps);
        grantCr.node.addDependency(grantCrOwner);
      }
    }
  }
  private getDomainCdkUserId(domainName: string, scope: Construct, domainId: string, domainKmsKeyArn: string): string {
    const searchUserProfileStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:SearchUserProfiles'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainCdkUserId',
      code: Code.fromAsset(`${__dirname}/../src/lambda/get_user_profile`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'get_user_profile.lambda_handler',
      handlerRolePolicyStatements: searchUserProfileStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'SearchUserProfiles does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domainId,
        arn: `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-cfn-exec-role-${this.account}-${this.region}`,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, `domain-cdk-user-id-cr-${domainName}`, crProps).getAttString('id');
  }

  private getRamAssociationMonitor(
    scope: Construct,
    id: string,
    domainRamShare: CfnResourceShare,
    associatedAccount: string,
  ) {
    const searchUserProfileStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['ram:GetResourceShareAssociations'],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'RamAssociationMonitor',
      code: Code.fromAsset(`${__dirname}/../src/lambda/monitor_ram_association`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'monitor_ram_association.lambda_handler',
      handlerRolePolicyStatements: searchUserProfileStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'GetResourceShareAssociations does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        resourceShareArn: domainRamShare.attrArn,
        associatedEntity: associatedAccount,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, id, crProps);
  }
}
