/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import {
  CfnDomainUnit,
  CfnDomainUnitProps,
  CfnGroupProfile,
  CfnOwner,
  CfnOwnerProps,
  CfnUserProfile,
} from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';

export interface DomainUnitOwnership {
  readonly ownerAccounts?: string[];
  readonly ownerUsers?: string[];
  readonly ownerGroups?: string[];
}

export interface DataZoneDomainUnitConstructProps extends MdaaConstructProps {
  readonly domainId: string;
  readonly domainVersion: 'V1' | 'V2';
  readonly parentDomainUnitId: string;
  readonly name: string;
  readonly description?: string;
  readonly ownership?: DomainUnitOwnership;
  readonly dataAdminUserProfile: CfnUserProfile;
  readonly userProfiles?: { [name: string]: CfnUserProfile };
  readonly groupProfiles?: { [name: string]: CfnGroupProfile };
  readonly associatedAccountUserProfiles?: { [name: string]: CfnUserProfile };
}

export class DataZoneDomainUnitConstruct extends Construct {
  public readonly props: DataZoneDomainUnitConstructProps;
  public readonly domainUnit: CfnDomainUnit;
  public readonly domainUnitId: string;

  constructor(scope: Construct, id: string, props: DataZoneDomainUnitConstructProps, ownersCollector: CfnOwner[]) {
    super(scope, id);
    //Maintains backwards compat for before domains were their own L2 construct
    const resolvedScope = props.domainVersion == 'V1' ? scope : this;
    const idSuffix = props.domainVersion == 'V1' ? `-${props.name}` : '';
    this.props = props;
    const cfnDomainUnitProps: CfnDomainUnitProps = {
      domainIdentifier: props.domainId,
      name: props.name,
      parentDomainUnitIdentifier: props.parentDomainUnitId,
      description: props.description,
    };

    this.domainUnit = new CfnDomainUnit(resolvedScope, 'domain-unit' + idSuffix, cfnDomainUnitProps);
    this.domainUnitId = this.domainUnit.attrId;

    // Always create data admin ownership
    ownersCollector.push(
      this.createOwnership('user-data-admin', {
        user: { userIdentifier: props.dataAdminUserProfile.attrId },
      }),
    );

    // Create ownership for specified accounts, users, and groups
    if (props.ownership) {
      ownersCollector.push(
        ...this.createAccountOwnership(props.ownership.ownerAccounts, props.associatedAccountUserProfiles),
        ...this.createUserOwnership(props.ownership.ownerUsers, props.userProfiles),
        ...this.createGroupOwnership(props.ownership.ownerGroups, props.groupProfiles),
      );
    }
  }

  private createOwnership(
    id: string,
    owner: { user?: { userIdentifier: string }; group?: { groupIdentifier: string } },
  ): CfnOwner {
    const ownerProps: CfnOwnerProps = {
      domainIdentifier: this.domainUnit.domainIdentifier,
      entityIdentifier: this.domainUnitId,
      entityType: 'DOMAIN_UNIT',
      owner: owner,
    };
    return new CfnOwner(this.domainUnit, `owner-${id}`, ownerProps);
  }

  private createAccountOwnership(
    ownerAccounts?: string[],
    associatedAccountUserProfiles?: { [name: string]: CfnUserProfile },
  ): CfnOwner[] {
    return (
      ownerAccounts?.map(accountName => {
        const userProfile = associatedAccountUserProfiles?.[accountName];
        if (!userProfile) {
          throw new Error(`Unknown owner account ${accountName} for domain unit ${this.domainUnit.name}`);
        }

        return this.createOwnership(`account-${accountName}`, {
          user: { userIdentifier: userProfile.attrId },
        });
      }) || []
    );
  }

  private createUserOwnership(ownerUsers?: string[], userProfiles?: { [name: string]: CfnUserProfile }): CfnOwner[] {
    return (
      ownerUsers?.map(userName => {
        const userProfile = userProfiles?.[userName];
        if (!userProfile) {
          throw new Error(`Unknown owner user ${userName} for domain unit ${this.domainUnit.name}`);
        }
        return this.createOwnership(`user-${userName}`, {
          user: { userIdentifier: userProfile.attrId },
        });
      }) || []
    );
  }

  private createGroupOwnership(
    ownerGroups?: string[],
    groupProfiles?: {
      [name: string]: CfnGroupProfile;
    },
  ): CfnOwner[] {
    return (
      ownerGroups?.map(groupName => {
        const groupProfile = groupProfiles?.[groupName];
        if (!groupProfile) {
          throw new Error(`Unknown owner group ${groupName} for domain unit ${this.domainUnit.name}`);
        }
        return this.createOwnership(`group-${groupName}`, {
          group: { groupIdentifier: groupProfile.attrId },
        });
      }) || []
    );
  }
}
