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
  /** Domain name for DataZone domain identification and management */
  readonly domainName: string;
  /** IAM role for DataZone domain execution enabling domain operations and management */
  readonly domainExecutionRole: IRole;
  /** KMS key for DataZone domain encryption enabling data protection and security */
  readonly kmsKey: IKey;
  /** Domain description for documentation and management clarity */
  readonly description?: string;
  /** Single sign-on type for domain authentication enabling IAM Identity Center or disabled SSO */
  readonly singleSignOnType?: 'DISABLED' | 'IAM_IDC';
  /** User assignment mode for domain access control enabling manual or automatic user provisioning */
  readonly userAssignment?: 'MANUAL' | 'AUTOMATIC';
  /** Domain version for feature set selection enabling V1 or V2 capabilities */
  readonly domainVersion?: 'V1' | 'V2';
  /** Service role for DataZone domain service operations enabling service-level permissions */
  readonly serviceRole?: IRole;
  /** IAM role for data administration enabling administrative access and governance */
  readonly dataAdminRole: IRole;
}

export class DataZoneDomainConstruct extends Construct {
  /** CloudFormation DataZone domain resource for domain deployment and management */
  public readonly domain: CfnDomain;
  /** DataZone domain identifier for domain reference and integration */
  public readonly domainId: string;
  /** Root domain unit identifier for hierarchical domain organization */
  public readonly rootDomainUnitId: string;
  /** Data administrator user profile for domain administration */
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
