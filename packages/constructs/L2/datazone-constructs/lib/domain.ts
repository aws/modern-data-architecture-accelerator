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
  readonly domainName: string;
  readonly domainExecutionRole: IRole;
  readonly kmsKey: IKey;
  readonly description?: string;
  readonly singleSignOnType?: 'DISABLED' | 'IAM_IDC';
  readonly userAssignment?: 'MANUAL' | 'AUTOMATIC';
  readonly domainVersion?: 'V1' | 'V2';
  readonly serviceRole?: IRole;
  readonly dataAdminRole: IRole;
}

export class DataZoneDomainConstruct extends Construct {
  public readonly domain: CfnDomain;
  public readonly domainId: string;
  public readonly rootDomainUnitId: string;
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
