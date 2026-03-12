/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaStringParameter } from '@aws-mdaa/construct';
import { IStringParameter, ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface ProjectProfilesConfigProps {
  readonly ssmParamBase: string;
  readonly projectProfileIds: { [key: string]: string };
}

export class ProjectProfilesConfig extends Construct {
  public static readonly SSM_PARAM_PROJECT_PROFILE = 'project_profile';
  public readonly projectProfileIds: { [key: string]: string };
  public readonly ssmParamBase: string;

  constructor(scope: Construct, id: string, props: ProjectProfilesConfigProps) {
    super(scope, id);
    this.ssmParamBase = props.ssmParamBase;
    this.projectProfileIds = props.projectProfileIds;
  }

  public getProjectProfileId(projectProfileName: string): string {
    if (this.projectProfileIds[projectProfileName]) {
      return this.projectProfileIds[projectProfileName];
    }
    return this.ssmParamArnOrName(
      `ssm-${projectProfileName}-project-profile-id`,
      `${this.ssmParamBase}/${ProjectProfilesConfig.SSM_PARAM_PROJECT_PROFILE}/${projectProfileName}/id`,
    ).stringValue;
  }

  public createProjectProfileParams(): string[] {
    return Object.entries(this.projectProfileIds || {}).map(([profileName, profileId]) =>
      this.createProjectProfileParam(profileName, profileId),
    );
  }

  public createProjectProfileParam(profileName: string, profileId: string): string {
    return this.createDomainConfigParam(
      ProjectProfilesConfig.SSM_PARAM_PROJECT_PROFILE + '/' + profileName + '/id',
      profileId,
    ).parameterArn;
  }

  private createDomainConfigParam(name: string, value: string): MdaaStringParameter {
    const paramName = `${this.ssmParamBase}/${name}`;
    return new MdaaStringParameter(this, `ssm-${name}`, {
      parameterName: paramName,
      stringValue: value,
      simpleName: false,
      tier: ParameterTier.ADVANCED,
    });
  }

  private ssmParamArnOrName(id: string, arnOrName: string): IStringParameter {
    const existing = this.node.tryFindChild(id);
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return existing as any;
    }
    if (arnOrName.startsWith('arn:')) {
      return MdaaStringParameter.fromStringParameterArn(this, id, arnOrName);
    }
    const name = arnOrName.startsWith('/') ? arnOrName : '/' + arnOrName;
    return MdaaStringParameter.fromStringParameterName(this, id, name);
  }
}
