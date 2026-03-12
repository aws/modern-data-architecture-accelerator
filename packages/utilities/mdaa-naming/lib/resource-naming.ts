/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from 'constructs';

export interface MdaaResourceNamingConfig {
  /** CDK construct node providing access to context values for custom naming implementations */
  readonly cdkNode: Node;
  /** Organization identifier from MDAA configuration that serves as the top-level namespace for all AWS resource names */
  readonly org: string;
  /** Environment identifier from MDAA configuration that distinguishes deployment stages within the same domain */
  readonly env: string;
  /** Domain identifier from MDAA configuration representing logical business or organizational boundaries */
  readonly domain: string;
  /** Module name from MDAA configuration identifying the specific MDAA module deployment within a domain/environment */
  readonly moduleName: string;
}

export interface IMdaaResourceNaming {
  /** Configuration properties containing organizational context and CDK node access for the naming implementation */
  readonly props: MdaaResourceNamingConfig;

  withOrg(org: string): IMdaaResourceNaming;

  withEnv(env: string): IMdaaResourceNaming;

  withDomain(domain: string): IMdaaResourceNaming;

  withModuleName(moduleName: string): IMdaaResourceNaming;

  withSuffix(suffix: string): IMdaaResourceNaming;

  resourceName(resourceNameSuffix?: string, maxLength?: number): string;

  stackName(stackName?: string): string;

  exportName(path: string): string;

  ssmPath(path: string, includeModuleName?: boolean, lowerCase?: boolean): string;

  ssmOrgPath(path: string, lowerCase?: boolean): string;

  ssmDomainPath(path: string, lowerCase?: boolean): string;

  ssmEnvPath(path: string, lowerCase?: boolean): string;
}
