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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for job integration and resource autowiring with existing project infrastructure. Enables seamless integration with deployed project resources including databases, IAM roles, and security configurations for coordinated data processing operations.
   *
   * Use cases: Project resource integration; Coordinated data processing; Infrastructure autowiring and resource sharing
   *
   * AWS: AWS Glue job project integration for resource coordination and shared infrastructure
   *
   * Validation: Must be valid DataOps project name; required; project must exist with deployed resources
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of job names to job definitions enabling multiple ETL processing workflows and data transformation operations. Provides job configuration for different data sources, transformation logic, and output destinations within the data lake architecture.
   *
   * Use cases: Multi-job ETL workflows; Data transformation operations; processing pipeline configuration
   *
   * AWS: AWS Glue job definitions for ETL processing and data transformation workflows
   *
   * Validation: Must be object with string keys and valid JobConfig values; required; defines all job processing operations
   *   **/
  readonly jobs: { [key: string]: JobConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of job template names to reusable job configurations enabling consistent job patterns and configuration inheritance. Provides template-based job configuration for standardized processing patterns, reducing duplication and ensuring consistency across similar jobs.
   *
   * Use cases: Reusable job patterns; Configuration inheritance; Standardized processing templates and consistency
   *
   * AWS: AWS Glue job template configurations for reusable processing patterns and inheritance
   *
   * Validation: Must be object with string keys and valid JobConfig values if provided; enables template inheritance
   *   **/
  readonly templates?: { [key: string]: JobConfig };
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

    return {
      ...configContents,
      jobs: resolvedJobConfigs,
      templates: undefined,
    };
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
