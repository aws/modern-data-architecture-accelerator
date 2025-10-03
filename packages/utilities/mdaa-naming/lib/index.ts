/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from 'constructs';
import { validateResourceName } from './utils';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for MDAA resource naming implementations that standardize AWS resource naming across domains, environments, and modules. This interface enables consistent, collision-free resource naming in multi-tenant MDAA deployments by providing organizational context and CDK node access for custom naming strategies.
 *
 * Use cases: Multi-domain data lake deployments requiring unique resource names; Cross-account data mesh architectures with consistent naming; Custom naming implementations for compliance requirements
 *
 * AWS: Configures naming patterns for all AWS resources deployed by MDAA modules including S3 buckets, IAM roles, Glue databases, and CloudFormation stacks
 *
 * Validation: All properties required; org/env/domain/moduleName must be valid AWS resource name components (alphanumeric, hyphens, underscores)
 */
export interface MdaaResourceNamingConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * CDK construct node providing access to context values for custom naming implementations. Enables retrieval of additional configuration through tryGetContext() for advanced naming strategies beyond the standard org/env/domain/module pattern.
   *
   * Use cases: Custom naming with environment-specific prefixes; Integration with external naming services; Context-driven naming for compliance requirements
   *
   * AWS: CDK context system for CloudFormation template generation
   *
   * Validation: Must be valid CDK Node instance with accessible context
   *   **/
  readonly cdkNode: Node;
  /**
   * Q-ENHANCED-PROPERTY
   * Organization identifier from MDAA configuration that serves as the top-level namespace for all AWS resource names. Forms the first component of the default naming pattern and ensures global uniqueness across multiple MDAA deployments.
   *
   * Use cases: Multi-organization AWS accounts; Shared service accounts with multiple tenants; Resource name collision prevention
   *
   * AWS: Prefix for all AWS resource names including S3 buckets, IAM roles, and CloudFormation stacks
   *
   * Validation: Must be valid AWS resource name component (3-63 characters, alphanumeric and hyphens only, no consecutive hyphens)
   **/
  readonly org: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Environment identifier from MDAA configuration that distinguishes deployment stages within the same domain. Forms the second component of the default naming pattern enabling parallel dev/test/prod deployments without resource conflicts.
   *
   * Use cases: Multi-stage deployments in same account; Environment-specific resource isolation; Progressive deployment strategies
   *
   * AWS: Environment component in all AWS resource names and CloudFormation stack names
   *
   * Validation: Must be valid AWS resource name component (typically 'dev', 'test', 'prod', 'staging')
   **/
  readonly env: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Domain identifier from MDAA configuration representing logical business or organizational boundaries within the data architecture. Forms the third component of the default naming pattern and enables data mesh architectures with domain-specific resource isolation.
   *
   * Use cases: Data mesh domain separation; Line-of-business resource isolation; Cross-domain data sharing with clear ownership
   *
   * AWS: Domain component in all AWS resource names, SSM parameter paths, and CloudFormation export names
   *
   * Validation: Must be valid AWS resource name component (typically business domain names like 'finance', 'marketing', 'shared')
   **/
  readonly domain: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Module name from MDAA configuration identifying the specific MDAA module deployment within a domain/environment. Forms the final component of the default naming pattern and enables multiple instances of the same module type within the same scope.
   *
   * Use cases: Multiple data lake instances per domain; Separate analytics workloads; Module-specific resource grouping
   *
   * AWS: Module component in all AWS resource names, SSM parameter paths, and CloudFormation stack names
   *
   * Validation: Must be valid AWS resource name component (typically module function like 'datalake', 'warehouse', 'analytics')
   **/
  readonly moduleName: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Interface specification for MDAA resource naming implementations that generate consistent, unique, and compliant AWS resource names. Implementations must support multi-tenant deployments by ensuring naming semantics prevent collisions across domains, environments, and modules within the same AWS account.
 *
 * Use cases: Custom naming for regulatory compliance; Integration with enterprise naming standards; Multi-tenant resource isolation
 *
 * AWS: Generates names for all AWS resources including S3 buckets, IAM roles, Glue databases, CloudFormation stacks, SSM parameters, and CloudFormation exports
 *
 * Validation: All generated names must comply with AWS service-specific naming requirements and be unique within account scope
 */
export interface IMdaaResourceNaming {
  /**
   * Q-ENHANCED-PROPERTY
   * Configuration properties containing organizational context and CDK node access for the naming implementation. Provides the foundational data required to generate consistent resource names across all MDAA modules.
   *
   * Use cases: Access to org/env/domain/module context; CDK context retrieval for custom naming; Immutable naming configuration
   *
   * AWS: Source data for all AWS resource name generation
   *
   * Validation: Must contain valid MdaaResourceNamingConfig with all required properties
   **/
  readonly props: MdaaResourceNamingConfig;

  withModuleName(moduleName: string): IMdaaResourceNaming;
  withModuleName(moduleName: string): IMdaaResourceNaming;

  resourceName(resourceNameSuffix?: string, maxLength?: number): string;

  ssmPath(path: string, includeModuleName?: boolean, lowerCase?: boolean): string;

  stackName(stackName?: string): string;

  exportName(path: string, includeModuleName?: boolean, lowerCase?: boolean): string;
}

/**
 * A default MDAA Naming implementation
 */
export class MdaaDefaultResourceNaming implements IMdaaResourceNaming {
  public readonly props: MdaaResourceNamingConfig;

  constructor(props: MdaaResourceNamingConfig) {
    this.props = props;
  }

  /**
   * Returns this naming object but with a new moduleName
   * @param moduleName The new module name
   */
  public withModuleName(moduleName: string): IMdaaResourceNaming {
    const newProps: MdaaResourceNamingConfig = {
      cdkNode: this.props.cdkNode,
      org: this.props.org,
      env: this.props.env,
      domain: this.props.domain,
      moduleName: moduleName,
    };
    return new MdaaDefaultResourceNaming(newProps);
  }

  /**
   * Generates a resource name in the format of <org>-<env>-<domain>-<module_name>
   * @param resourceNameSuffix Optional naming suffix to be added to the generated resource name.
   * Useful when multiple resources of the same type are created within the same stack.
   * @param maxLength Should be used to truncate the generated resource names to a specified length.
   * The result should still be unique and stable.
   * Caution: Known bug - names exactly equal to `maxLength` are unnecessarily truncated with hash suffix
   * (should use `>` instead of `>=`). Left unfixed to prevent breaking existing deployments that rely on
   * this behavior. Cosmetic issue only - does not affect infrastructure functionality.
   */
  public resourceName(resourceNameSuffix?: string, maxLength?: number): string {
    let name = `${this.props.org}-${this.props.env}-${this.props.domain}-${this.props.moduleName}`;
    if (resourceNameSuffix) {
      name = `${name}-${this.lowerCase(resourceNameSuffix)}`;
    }
    if (maxLength && name.length >= maxLength) {
      const hashCodeHex = MdaaDefaultResourceNaming.hashCodeHex(name);
      name = `${name.substring(0, maxLength - (hashCodeHex.length + 1))}-${hashCodeHex}`;
    }
    return validateResourceName(name);
  }

  /**
   * Generates a ssm param name in the format of /<org>/<env>/<domain>/<module_name>
   */
  public ssmPath(path: string, includeModuleName = true, lowerCase = true): string {
    let name = `/${this.props.org}/${this.props.domain}`;
    if (includeModuleName) {
      name = `${name}/${this.props.moduleName}`;
    }
    return lowerCase ? this.lowerCase(`${name}/${path}`) : `${name}/${path}`;
  }

  /**
   * Generates a export name in the format of <org>:<env>:<domain>:<module_name>
   */
  public exportName(path: string, includeModuleName = true, lowerCase = true): string {
    let name = `${this.props.org}:${this.props.domain}`;
    if (includeModuleName) {
      name = `${name}:${this.props.moduleName}`;
    }
    return lowerCase ? this.lowerCase(`${name}:${path}`) : `${name}:${path}`;
  }

  /**
   * Generates a stack name in the format of <org>-<env>-<domain>-<module_name>.
   * Sanitizes non-alpha numeric characters and replaces underscores with '-'
   */
  public stackName(stackNameSuffix?: string): string {
    const org = MdaaDefaultResourceNaming.sanitize(this.props.org);
    const env = MdaaDefaultResourceNaming.sanitize(this.props.env);
    const domain = MdaaDefaultResourceNaming.sanitize(this.props.domain);
    const module_name = MdaaDefaultResourceNaming.sanitize(this.props.moduleName);
    const suffix = stackNameSuffix ? MdaaDefaultResourceNaming.sanitize(stackNameSuffix) : undefined;

    let stackName = `${org}-${env}-${domain}-${module_name}`;
    if (suffix) {
      stackName = `${stackName}-${this.lowerCase(suffix)}`;
    }
    return stackName;
  }

  protected static sanitize(component: string): string | undefined {
    if (!component) {
      return component;
    }
    return component.replace(/^\W+$/g, '').replace(/_/g, '-');
  }

  protected static hashCodeHex(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h.toString(16);
  }

  protected lowerCase(input: string): string {
    return input.toLowerCase().replace(/\{token\[token\.(\d+)]}/, '{Token[TOKEN.$1]}');
  }
}
