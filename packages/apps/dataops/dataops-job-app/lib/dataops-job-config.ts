/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { JobConfig } from '@aws-mdaa/dataops-job-l3-construct';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { ConfigurationElement } from '@aws-mdaa/config';

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject<T>(item: unknown): item is Record<string, T> {
  return Boolean(item) && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param sources
 */
export function mergeDeep<T>(target: T, ...sources: Array<T>): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

export interface GlueJobConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Name of the Data Ops project. The crawler config will be autowired to use existing resources deployed by the project.
   */
  projectName: string;
  /**
   * Map of job names to job definitions
   */
  jobs: { [key: string]: JobConfig };
  /**
   * Map of job template names to job definitions
   */
  templates?: { [key: string]: JobConfig };
}

export class GlueJobConfigParser extends MdaaDataOpsConfigParser<GlueJobConfigContents> {
  public readonly jobConfigs: { [key: string]: JobConfig };

  private static mergeJobConfigs(configContents: GlueJobConfigContents): GlueJobConfigContents {
    //Resolve jobs and their templates
    let resolvedJobConfigs: { [key: string]: JobConfig } = {};
    Object.keys(configContents.jobs).forEach(jobName => {
      let jobConfig = configContents.jobs[jobName];
      if (jobConfig.template) {
        if (!configContents.templates || !(jobConfig.template in configContents.templates)) {
          throw new Error(`Job Config ${jobName} references non-existent template: ${jobConfig.template}`);
        }
        const jobTemplate = configContents.templates[jobConfig.template];
        //Create a copy of the template as the merged job definition is not immutable
        const jobTemplateCopy = JSON.parse(JSON.stringify(jobTemplate)) as JobConfig;
        jobConfig = mergeDeep(jobTemplateCopy, jobConfig);
      }
      resolvedJobConfigs = { ...resolvedJobConfigs, ...{ [jobName]: jobConfig } };
    });
    const newConfig = configContents;
    newConfig['jobs'] = resolvedJobConfigs;
    newConfig['templates'] = undefined;
    return newConfig;
  }

  private static modifyProps(props: MdaaAppConfigParserProps): MdaaAppConfigParserProps {
    return {
      ...props,
      ...{
        rawConfig: {
          // TYPE_WARNING: need to trust that `rawConfig` looks like GlueJobConfigContents
          ...GlueJobConfigParser.mergeJobConfigs(props.rawConfig as unknown as GlueJobConfigContents),
        } as ConfigurationElement,
      },
    };
  }

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, GlueJobConfigParser.modifyProps(props), configSchema as Schema);
    this.jobConfigs = this.configContents.jobs;
  }
}
