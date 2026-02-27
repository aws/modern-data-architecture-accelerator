/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import {
  CfnDomain,
  CfnDomainProps,
  CfnOwner,
  CfnOwnerProps,
  CfnUserProfile,
  CfnUserProfileProps,
} from 'aws-cdk-lib/aws-datazone';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { LEGACY_DATAZONE_SCOPE_CONTEXT_KEY } from '.';

export interface DataZoneDomainConstructProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain name for DataZone domain identification and management. Specifies the name of the DataZone domain for identification and organizational management.
   *
   * Use cases: Domain identification; Domain naming; Organizational management; Domain management
   *
   * AWS: DataZone domain name for identification and management
   *
   * Validation: Must be non-empty string; required for domain creation
   **/
  readonly domainName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role for DataZone domain execution enabling domain operations and management. Specifies the IAM role that DataZone will use for domain-level operations and resource management.
   *
   * Use cases: Domain operations; Resource management; Execution permissions; Domain administration
   *
   * AWS: IAM role for DataZone domain execution and operations
   *
   * Validation: Must be valid IRole instance; required for domain creation
   **/
  readonly domainExecutionRole: IRole;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key for DataZone domain encryption enabling data protection and security. Specifies the KMS key used for encrypting domain data and resources for data protection and compliance.
   *
   * Use cases: Data encryption; Security; Compliance; Data protection
   *
   * AWS: KMS key for DataZone domain encryption and data protection
   *
   * Validation: Must be valid IKey instance; required for domain encryption
   **/
  readonly kmsKey: IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain description for documentation and management clarity. Provides human-readable description of the domain's purpose and usage for operational understanding.
   *
   * Use cases: Domain documentation; Operational clarity; Purpose explanation; Management understanding
   *
   * AWS: DataZone domain description for documentation and operational clarity
   *
   * Validation: Must be descriptive text if provided; recommended for domain documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional single sign-on type for domain authentication enabling IAM Identity Center or disabled SSO. Specifies the SSO configuration for domain user authentication and access control.
   *
   * Use cases: Authentication configuration; SSO setup; Access control; User authentication
   *
   * AWS: DataZone domain SSO type for authentication configuration
   *
   * Validation: Must be 'DISABLED' or 'IAM_IDC' if provided; defaults to IAM_IDC
   **/
  readonly singleSignOnType?: 'DISABLED' | 'IAM_IDC';
  /**
   * Q-ENHANCED-PROPERTY
   * Optional user assignment mode for domain access control enabling manual or automatic user provisioning. Specifies how users are assigned to the domain for access management and provisioning.
   *
   * Use cases: User provisioning; Access management; User assignment; Provisioning automation
   *
   * AWS: DataZone domain user assignment mode for access control and provisioning
   *
   * Validation: Must be 'MANUAL' or 'AUTOMATIC' if provided; defaults to AUTOMATIC
   **/
  readonly userAssignment?: 'MANUAL' | 'AUTOMATIC';
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain version for feature set selection enabling V1 or V2 capabilities. Specifies the DataZone domain version affecting available features and capabilities.
   *
   * Use cases: Feature selection; Version control; Capability management; Feature availability
   *
   * AWS: DataZone domain version for feature set selection
   *
   * Validation: Must be 'V1' or 'V2' if provided; affects available domain features
   **/
  readonly domainVersion?: 'V1' | 'V2';
  /**
   * Q-ENHANCED-PROPERTY
   * Optional service role for DataZone domain service operations enabling service-level permissions. Specifies the IAM role for DataZone service operations and integrations.
   *
   * Use cases: Service operations; Service permissions; Integration management; Service-level access
   *
   * AWS: IAM role for DataZone domain service operations and integrations
   *
   * Validation: Must be valid IRole instance if provided; enables service-level operations
   **/
  readonly serviceRole?: IRole;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role for data administration enabling administrative access and governance. Specifies the IAM role for data administrators with full administrative access to the domain.
   *
   * Use cases: Administrative access; Data governance; Domain administration; Administrative permissions
   *
   * AWS: IAM role for DataZone domain data administration and governance
   *
   * Validation: Must be valid IRole instance; required for domain administration
   **/
  readonly dataAdminRole: IRole;
}

export class DataZoneDomainConstruct extends Construct {
  /**
   * Q-ENHANCED-PROPERTY
   * CloudFormation DataZone domain resource for domain deployment and management. Exposes the underlying CloudFormation domain resource for advanced configuration and dependency management.
   *
   * Use cases: Domain deployment; CloudFormation management; Advanced configuration; Dependency management
   *
   * AWS: CloudFormation DataZone domain resource for domain deployment and management
   *
   * Validation: Created during construct initialization; represents the deployed DataZone domain
   **/
  public readonly domain: CfnDomain;
  /**
   * Q-ENHANCED-PROPERTY
   * DataZone domain identifier for domain reference and integration. Provides the unique domain ID for referencing the domain in other resources and integrations.
   *
   * Use cases: Domain reference; Resource integration; Domain identification; Cross-resource reference
   *
   * AWS: DataZone domain ID for domain reference and integration
   *
   * Validation: Retrieved from domain.attrId; unique identifier for the domain
   **/
  public readonly domainId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Root domain unit identifier for hierarchical domain organization. Provides the ID of the root domain unit for organizational hierarchy and domain unit management.
   *
   * Use cases: Domain hierarchy; Organizational structure; Root unit reference; Domain unit management
   *
   * AWS: DataZone root domain unit ID for hierarchical organization
   *
   * Validation: Retrieved from domain.attrRootDomainUnitId; represents the root of domain hierarchy
   **/
  public readonly rootDomainUnitId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Data administrator user profile for domain administration. Provides the user profile for the data administrator with full administrative access to the domain.
   *
   * Use cases: Domain administration; Administrative access; Admin user profile; Administrative operations
   *
   * AWS: DataZone user profile for data administrator with full domain access
   *
   * Validation: Created during construct initialization; provides administrative access to domain
   **/
  public readonly dataAdminUserProfile: CfnUserProfile;

  constructor(scope: Construct, id: string, props: DataZoneDomainConstructProps) {
    super(scope, id);
    //Maintains backwards compat for before domains were their own L2 construct
    const resolvedScope = scope.node.tryGetContext(LEGACY_DATAZONE_SCOPE_CONTEXT_KEY) ? scope : this;
    const idPrefix = scope.node.tryGetContext(LEGACY_DATAZONE_SCOPE_CONTEXT_KEY) ? `${props.domainName}-` : '';
    const singleSignOn: CfnDomain.SingleSignOnProperty = {
      type: props.singleSignOnType ?? 'DISABLED',
      userAssignment: props.userAssignment ?? 'MANUAL',
    };

    const cfnDomainProps: CfnDomainProps = {
      domainExecutionRole: props.domainExecutionRole.roleArn,
      name: props.naming.resourceName(props.domainName),
      kmsKeyIdentifier: props.kmsKey.keyArn,
      description: props.description,
      singleSignOn: singleSignOn,
      // V1 is the same as undefined (default)
      domainVersion: props.domainVersion === 'V1' ? undefined : props.domainVersion,
      serviceRole: props.serviceRole?.roleArn,
    };

    this.domain = new CfnDomain(resolvedScope, idPrefix + 'domain', cfnDomainProps);
    this.domainId = this.domain.attrId;
    this.rootDomainUnitId = this.domain.attrRootDomainUnitId;

    // Create data admin user profile
    const dataAdminUserProfileProps: CfnUserProfileProps = {
      domainIdentifier: this.domainId,
      userIdentifier: props.dataAdminRole.roleArn,
      userType: 'IAM_ROLE',
      status: 'ACTIVATED',
    };
    this.dataAdminUserProfile = new CfnUserProfile(
      resolvedScope,
      idPrefix + 'admin-user-profile',
      dataAdminUserProfileProps,
    );

    // Create data admin ownership
    const adminOwnerProps: CfnOwnerProps = {
      domainIdentifier: this.domainId,
      entityIdentifier: this.rootDomainUnitId,
      entityType: 'DOMAIN_UNIT',
      owner: {
        user: {
          userIdentifier: this.dataAdminUserProfile.attrId,
        },
      },
    };
    new CfnOwner(this.domain, 'owner-user-data-admin', adminOwnerProps);
  }
}
