/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnUserProfile, CfnUserProfileProps, CfnGroupProfile, CfnGroupProfileProps } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';

export interface UserConfig {
  readonly identifier: string;
  readonly userType: 'IAM_ROLE' | 'SSO_USER';
}

export interface GroupConfig {
  readonly identifier: string;
}

export interface ProfileManagementConstructProps extends MdaaConstructProps {
  readonly domainId: string;
  readonly domainName: string;
  readonly users?: { [name: string]: UserConfig };
  readonly groups?: { [name: string]: GroupConfig };
  readonly domainVersion: 'V1' | 'V2';
}

export class ProfileManagementConstruct extends Construct {
  public readonly userProfiles: { [name: string]: CfnUserProfile } = {};
  public readonly groupProfiles: { [name: string]: CfnGroupProfile } = {};

  constructor(scope: Construct, id: string, props: ProfileManagementConstructProps) {
    super(scope, id);
    //Maintains backwards compat for before domains were their own L2 construct

    const resolvedScope = props.domainVersion == 'V1' ? scope : this;
    const idPrefix = props.domainVersion == 'V1' ? `${props.domainName}-` : '';

    // Create user profiles
    if (props.users) {
      Object.entries(props.users).forEach(([userName, userConfig]) => {
        const userProfileProps: CfnUserProfileProps = {
          domainIdentifier: props.domainId,
          userIdentifier: userConfig.identifier,
          userType: userConfig.userType,
          status: 'ACTIVATED',
        };
        this.userProfiles[userName] = new CfnUserProfile(
          resolvedScope,
          `${idPrefix}user-${userName}`,
          userProfileProps,
        );
      });
    }

    // Create group profiles
    if (props.groups) {
      Object.entries(props.groups).forEach(([groupName, groupConfig]) => {
        const groupProfileProps: CfnGroupProfileProps = {
          domainIdentifier: props.domainId,
          groupIdentifier: groupConfig.identifier,
          status: 'ASSIGNED',
        };
        this.groupProfiles[groupName] = new CfnGroupProfile(
          resolvedScope,
          `${idPrefix}group-${groupName}`,
          groupProfileProps,
        );
      });
    }
  }
}
