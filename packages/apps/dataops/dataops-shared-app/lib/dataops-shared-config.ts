/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  ConfigurationElement,
  IMdaaConfigTransformer,
  IMdaaConfigValueTransformer,
  MdaaConfigTransformer,
} from '@aws-mdaa/config';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

export interface MdaaDataOpsConfigContents extends MdaaBaseConfigContents {
  readonly securityConfigurationName: string;
  readonly projectName: string;
  readonly projectBucket: string;
  readonly projectTopicArn: string;
  readonly deploymentRole: string;
  readonly kmsArn: string;
}

export class MdaaDataOpsConfigParser<T extends MdaaDataOpsConfigContents> extends MdaaAppConfigParser<T> {
  public readonly securityConfigurationName: string;
  public readonly projectName: string;
  public readonly projectBucket: string;
  public readonly projectTopicArn: string;
  public readonly deploymentRole: string;
  public readonly kmsArn: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps, configSchema: Schema) {
    super(stack, props, configSchema, [new ProjectConfigTransformer(props.naming)]);
    this.securityConfigurationName = this.configContents.securityConfigurationName;
    this.projectName = this.configContents.projectName;
    this.projectBucket = this.configContents.projectBucket;
    this.projectTopicArn = this.configContents.projectTopicArn;
    this.deploymentRole = this.configContents.deploymentRole;
    this.kmsArn = this.configContents.kmsArn;
  }
}

class ProjectConfigTransformer implements IMdaaConfigTransformer {
  private readonly naming: IMdaaResourceNaming;

  constructor(naming: IMdaaResourceNaming) {
    this.naming = naming;
  }

  public transformConfig(config: ConfigurationElement): ConfigurationElement {
    const projectName = config['projectName'];
    if (typeof projectName !== 'string')
      throw new Error(`Project name is expected to be a string, not ${typeof projectName})`);
    const moddedConfig = config;
    moddedConfig['securityConfigurationName'] = moddedConfig['securityConfigurationName']
      ? moddedConfig['securityConfigurationName']
      : 'project:securityConfiguration/default';
    moddedConfig['projectBucket'] = moddedConfig['projectBucket']
      ? moddedConfig['projectBucket']
      : 'project:projectBucket/default';
    moddedConfig['projectTopicArn'] = moddedConfig['projectTopicArn']
      ? moddedConfig['projectTopicArn']
      : 'project:projectTopicArn/default';
    moddedConfig['deploymentRole'] = moddedConfig['deploymentRole']
      ? moddedConfig['deploymentRole']
      : 'project:deploymentRole/default';
    moddedConfig['kmsArn'] = moddedConfig['kmsArn'] ? moddedConfig['kmsArn'] : 'project:kmsArn/default';

    const projectConfigValTransformer = new ProjectConfigValueTransformer(projectName, this.naming);
    return new MdaaConfigTransformer(projectConfigValTransformer).transformConfig(moddedConfig);
  }
}

class ProjectConfigValueTransformer implements IMdaaConfigValueTransformer {
  private readonly projectName: string;
  private readonly naming: IMdaaResourceNaming;

  constructor(projectName: string, naming: IMdaaResourceNaming) {
    this.projectName = projectName;
    this.naming = naming;
  }

  public transformValue(value: string): string {
    if (value.startsWith('project:')) {
      return 'ssm:' + this.naming.ssmPath(`${this.projectName}/${value.split(':')[1]}`, false, false);
    } else {
      return value;
    }
  }
}
