/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from 'constructs';
import { validateResourceName } from './utils';

/**
 * Basic config for a MDAA naming implementation.
 * Standard config properties are passed directly, while
 * additional config values can be pulled from CDK context using
 * the provided cdkNode.tryGetContext()
 * */
export interface MdaaResourceNamingConfig {
  /** A CDK node on which tryGetContext()
   * can be used to obtain additional naming config context
   * for use in non-default implementations */
  readonly cdkNode: Node;
  /** 'org' from the MDAA config */
  readonly org: string;
  /** 'env' from the MDAA config */
  readonly env: string;
  /** 'domain' from the MDAA config */
  readonly domain: string;
  /** 'module_name' from the MDAA config */
  readonly moduleName: string;
}

/**
 * Interface specification for a MDAA naming implementation.
 * Can be implemented in any way, but should ensure that naming
 * semantics support deployment of multiple domains/envs/modules
 * within the same account, otherwise resource naming collisions may occur.
 */
export interface IMdaaResourceNaming {
  readonly props: MdaaResourceNamingConfig;

  /**
   * Returns this naming object but with a new moduleName
   *
   * @param moduleName The new module name
   */
  withModuleName(moduleName: string): IMdaaResourceNaming;

  /**
   * Should produce unique but stable resource names.
   *
   * @param resourceNameSuffix Optional naming suffix to be added to the generated resource name.
   * Useful when multiple resources of the same type are created within the same stack.
   *
   * @param maxLength Should be used to truncate the generated resource names to a specified length.
   * The result should still be unique and stable.
   */
  resourceName(resourceNameSuffix?: string, maxLength?: number): string;

  /**
   * Generates an SSM param name.
   *
   * @param path The generated name will be suffixed by the path component.
   * The base path should provide uniqueness across stacks, and the path component should provide uniqueness within stacks.
   *
   * @param includeModuleName Optionally include the module name in the base path of the SSM param name.
   * Usefull when scoping params at the domain/env level instead of the module level.
   *
   * @param lowerCase Optionally force the generated param name to lower case
   */
  ssmPath(path: string, includeModuleName?: boolean, lowerCase?: boolean): string;

  /**
   * Generates a compliance stack name
   * @param stackName The base stack name. Should be used to implement a globally unique stack name.
   */
  stackName(stackName?: string): string;

  /**
   * Generates an CFN Stack Export name.
   *
   * @param path The generated name will be suffixed by the path component.
   * The base path should provide uniqueness across stacks, and the path component should provide uniqueness within stacks.
   *
   * @param includeModuleName Optionally include the module name in the base path of the export name.
   * Usefull when scoping params at the domain/env level instead of the module level.
   *
   * @param lowerCase Optionally force the generated export name to lower case
   */
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
   *
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
    return input.toLowerCase().replace(/\{token\[token\.(\d+)\]\}/, '{Token[TOKEN.$1]}');
  }
}
