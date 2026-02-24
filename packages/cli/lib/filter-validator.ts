/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConfigContents, MdaaDomainConfig, MdaaEnvironmentConfig } from './mdaa-cli-config-parser';

export interface FilterValidationOptions {
  domainFilter?: string[];
  envFilter?: string[];
  moduleFilter?: string[];
  config: MdaaConfigContents;
}

export function validateFilters(options: FilterValidationOptions): void {
  const { domainFilter, envFilter, moduleFilter, config } = options;
  const errors: string[] = [];

  // Validate domain filter
  if (domainFilter) {
    const validDomains = Object.keys(config.domains);
    const invalidDomains = domainFilter.filter(d => !validDomains.includes(d));
    if (invalidDomains.length > 0) {
      errors.push(`Unknown domain(s) in filter: ${invalidDomains.join(', ')}. Valid: ${validDomains.join(', ')}`);
    }
  }

  // Validate env filter
  if (envFilter) {
    const validEnvs = new Set(
      Object.entries(config.domains)
        .filter(([name]) => !domainFilter || domainFilter.includes(name))
        .flatMap(([, domain]: [string, MdaaDomainConfig]) => Object.keys(domain.environments)),
    );
    const invalidEnvs = envFilter.filter(e => !validEnvs.has(e));
    if (invalidEnvs.length > 0) {
      errors.push(`Unknown env(s) in filter: ${invalidEnvs.join(', ')}. Valid: ${[...validEnvs].join(', ')}`);
    }
  }

  // Validate module filter
  if (moduleFilter) {
    const validModules = new Set(
      Object.entries(config.domains)
        .filter(([name]) => !domainFilter || domainFilter.includes(name))
        .flatMap(([, domain]: [string, MdaaDomainConfig]) =>
          Object.entries(domain.environments)
            .filter(([name]) => !envFilter || envFilter.includes(name))
            .flatMap(([, env]: [string, MdaaEnvironmentConfig]) => {
              // Modules directly defined on the environment
              const envModules = Object.keys(env.modules ?? {});
              // Modules from the referenced template (if any)
              const templateModules = env.template
                ? Object.keys(
                    (domain.env_templates?.[env.template] ?? config.env_templates?.[env.template])?.modules ?? {},
                  )
                : [];
              return [...envModules, ...templateModules];
            }),
        ),
    );
    const invalidModules = moduleFilter.filter(m => !validModules.has(m));
    if (invalidModules.length > 0) {
      errors.push(`Unknown module(s) in filter: ${invalidModules.join(', ')}. Valid: ${[...validModules].join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Filter validation failed:\n${errors.join('\n')}`);
  }
}
