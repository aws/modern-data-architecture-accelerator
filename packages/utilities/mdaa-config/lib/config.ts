/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnParameter, CfnParameterProps, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
// nosemgrep
import path = require('path');
// nosemgrep
import XRegExp = require('xregexp');

export type ConfigurationElement = { [key: string]: unknown };
export type TagElement = { [key: string]: string };
export type Workspace = {
  name: string;
  location: string;
};

type TransformResult = string | number;

export interface IMdaaConfigValueTransformer {
  transformValue(value: string, contextPath?: string): TransformResult;
}

export interface IMdaaConfigTransformer {
  transformConfig(config: ConfigurationElement): ConfigurationElement;
}

/**
 * A utility class which executs transformer functions against MDAA Configs.
 */
export class MdaaConfigTransformer implements IMdaaConfigTransformer {
  private readonly valueTransformer: IMdaaConfigValueTransformer;
  private readonly keyTransformer?: IMdaaConfigValueTransformer;

  constructor(valueTransformer: IMdaaConfigValueTransformer, keyTransformer?: IMdaaConfigValueTransformer) {
    this.valueTransformer = valueTransformer;
    this.keyTransformer = keyTransformer;
  }

  public transformConfig(config: ConfigurationElement): ConfigurationElement {
    return this.transformConfigObject('/', config);
  }

  /**
   * A recursive function which applies a transformation function to all config values.
   * @param contextPath
   * @param resolvedConfig The config object being transformed
   * @returns A config object with the transformation function applied to all config values.
   */
  public transformConfigObject(contextPath: string, resolvedConfig: ConfigurationElement): ConfigurationElement {
    const transformedConfig: ConfigurationElement = {};
    for (const key in resolvedConfig) {
      const value = resolvedConfig[key];
      const transformedKey = this.keyTransformer
        ? this.keyTransformer.transformValue(key, contextPath + '/' + key)
        : key;
      if (typeof value === 'string' || value instanceof String)
        transformedConfig[transformedKey] = this.valueTransformer.transformValue(
          value.toString(),
          contextPath + '/' + key,
        );
      else if (value instanceof Array)
        transformedConfig[transformedKey] = this.transformConfigArray(contextPath + '/' + key, value);
      else if (value instanceof Object) {
        transformedConfig[transformedKey] = this.transformConfigObject(
          contextPath + '/' + key,
          value as ConfigurationElement,
        );
      } else transformedConfig[transformedKey] = value;
    }
    return transformedConfig;
  }

  /**
   * A helper function for transformConfigObject for use with Arrays.
   * @param contextPath
   * @param resolvedConfig (Required) - The config object being transformed
   * @returns A config object with the transformation function applied to all config values.
   */
  public transformConfigArray(contextPath: string, resolvedConfig: unknown[]): unknown[] {
    const transformedConfig: ConfigurationElement | unknown[] = [];
    resolvedConfig.forEach(value => {
      if (typeof value === 'string' || value instanceof String)
        transformedConfig.push(this.valueTransformer.transformValue(value.toString(), contextPath));
      else if (value instanceof Array)
        transformedConfig.push(this.transformConfigArray(contextPath, value as unknown[]));
      else if (value instanceof Object)
        transformedConfig.push(this.transformConfigObject(contextPath, value as ConfigurationElement));
      else transformedConfig.push(value);
    });
    return transformedConfig;
  }
}

export class ConfigConfigPathValueTransformer implements IMdaaConfigValueTransformer {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  public transformValue(value: string): string {
    if (value.startsWith('../')) {
      // Resolve to baseDir's parent path
      // nosemgrep
      return path.resolve(this.baseDir, value);
    } else if (value.startsWith('./')) {
      // Resolve relative to baseDir
      // nosemgrep
      return path.resolve(value.replace(/^\./, this.baseDir));
    } else {
      return value;
    }
  }
}

export class MdaaConfigSSMValueTransformer implements IMdaaConfigValueTransformer {
  public transformValue(value: string, contextPath: string): string {
    const ignorePaths = ['policyDocument/Statement/Action'];
    if (
      value.startsWith('ssm:') &&
      ignorePaths.every(ignorePath => !contextPath.toLowerCase().endsWith(ignorePath.toLowerCase()))
    ) {
      const paramName = value.replace(/^ssm:\s*/, '');
      return `{{resolve:ssm:${paramName}}}`;
    } else {
      return value;
    }
  }
}

export interface MdaaConfigRefValueTransformerProps {
  readonly org: string;
  readonly domain: string;
  readonly env: string;
  readonly module_name: string;
  readonly scope?: Construct;
  readonly context?: ConfigurationElement;
}

export class MdaaConfigRefValueTransformer implements IMdaaConfigValueTransformer {
  protected props: MdaaConfigRefValueTransformerProps;

  constructor(props: MdaaConfigRefValueTransformerProps) {
    this.props = props;
  }

  public transformValue(value: string): TransformResult {
    const refMatch = XRegExp.matchRecursive(value, '{{', '}}', 'g', {
      unbalanced: 'skip',
    });
    if (refMatch.length > 0) {
      return this.parseRef(value, refMatch);
    } else {
      return value;
    }
  }

  protected parseRef(value: string, refMatch: string[]): string | number {
    const refMap: { [refInner: string]: string | undefined } = {
      org: this.props.org,
      env: this.props.env,
      domain: this.props.domain,
      module_name: this.props.module_name,
      partition: this.props.scope ? Stack.of(this.props.scope).partition : undefined,
      region: this.props.scope ? Stack.of(this.props.scope).region : undefined,
      account: this.props.scope ? Stack.of(this.props.scope).account : undefined,
    };

    // In all other cases, return a recursively substituted string
    let toReturn: string = value;
    refMatch.forEach(ref => {
      let resolvedValue: string | undefined;
      const refInner = this.transformValue(ref).toString();

      if (refMap[refInner]) {
        resolvedValue = refMap[refInner];
      } else if (refInner.startsWith('context:')) {
        resolvedValue = this.parseContext(refInner) as string;
      } else if (refInner.startsWith('env_var:')) {
        const envVar = refInner.replace(/^env_var:/, '');
        resolvedValue = process.env[envVar];
      } else if (refInner.startsWith('resolve:ssm:')) {
        const ssmPath = refInner.replace(/^resolve:ssm:/, '');
        if (!this.props.scope) {
          throw new Error('Unable to resolve ssm param outside of a Construct');
        }

        resolvedValue = this.props.scope?.node.tryGetContext('@mdaaLookupSSMValues')
          ? StringParameter.valueFromLookup(Stack.of(this.props.scope), ssmPath)
          : StringParameter.valueForStringParameter(Stack.of(this.props.scope), ssmPath);
      }

      toReturn = resolvedValue ? toReturn.replace(`{{${ref}}}`, resolvedValue) : toReturn;
    });
    return toReturn;
  }

  private parseContext(refInner: string): unknown {
    const refInnerContext = refInner.replace(/^context:/, '');
    const scopeContextValue: unknown = this.props.scope?.node.tryGetContext(refInnerContext);
    const scopeInnerContextValue = this.props.context ? this.props.context[refInnerContext] : undefined;
    const contextValue = scopeContextValue ? scopeContextValue : scopeInnerContextValue;

    if (!contextValue) {
      throw new Error(`Failed to resolve context: ${refInnerContext}`);
    }
    if (typeof contextValue === 'string') {
      if (contextValue.startsWith('obj:')) {
        return JSON.parse(JSON.parse(contextValue.replace(/^obj:/, ''))) as ConfigurationElement;
      } else if (contextValue.startsWith('list:')) {
        return JSON.parse(JSON.parse(contextValue.replace(/^list:/, ''))) as string[];
      }
    }
    return contextValue;
  }
}

export interface MdaaConfigParamRefValueTransformerProps extends MdaaConfigRefValueTransformerProps {
  readonly serviceCatalogConfig?: MdaaServiceCatalogProductConfig;
}

export class MdaaConfigParamRefValueTransformer extends MdaaConfigRefValueTransformer {
  private readonly serviceCatalogConfig?: MdaaServiceCatalogProductConfig;

  constructor(props: MdaaConfigParamRefValueTransformerProps) {
    super(props);
    this.serviceCatalogConfig = props.serviceCatalogConfig;
  }

  protected override parseRef(value: string, refMatch: string[]): string | number {
    /**
     * Handle base case where we resolve and return a single naked parameter value,
     * Important as we need to avoid building a string if we have a standalone numerical value
     */
    const standaloneParam = this.resolveStandaloneParam(value, refMatch);
    if (standaloneParam) {
      return standaloneParam;
    }

    // In all other cases, return a recursively substituted string
    let toReturn: string = value;
    refMatch.forEach(ref => {
      let resolvedValue: string | undefined;
      const refInner = this.transformValue(ref).toString();
      if (refInner.startsWith('param:') && this.props.scope instanceof Stack) {
        resolvedValue = this.createParam(refInner).toString();
      }

      toReturn = resolvedValue ? toReturn.replace(`{{${ref}}}`, resolvedValue) : toReturn;
    });
    return toReturn;
  }

  /**
   * Resolve standalone parameters with no other content in the value.
   * "Standalone" means it is not embedded in a string value.
   * Important as this can be a case where a number should be returned instead of a string.
   *
   * @param value
   * @param refMatch
   * @returns
   */
  private resolveStandaloneParam(value: string, refMatch: string[]): string | number | undefined {
    if (refMatch.length === 1) {
      const strippedValue = value.replace(`{{${refMatch[0]}}}`, '').trim();
      if (strippedValue.length === 0) {
        const refInner = this.transformValue(refMatch[0]);
        if (typeof refInner === 'string') {
          if (refInner.startsWith('param:') && this.props.scope instanceof Stack) {
            return this.createParam(refInner);
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Create new or resolve existing parameter for a given parameter reference
   * @param refInner
   * @returns Value of CfnParameter
   */
  private createParam(refInner: string): string | number {
    if (!this.props.scope) {
      throw new Error('Unable to create parameters outside of a Construct');
    }
    const stack = Stack.of(this.props.scope);
    const paramBase = refInner.replace(/^param:/, '');
    const paramName = paramBase
      .replace(/^string:/, '')
      .replace(/^number:/, '')
      .replace(/^list:/, '');
    const paramProps = this.getParamProps(paramName);
    const exists = stack.node.tryFindChild(paramName) as CfnParameter;

    // Return values for existing parameter if it already exists
    if (exists?.type) {
      if (this.isStringType(exists.type)) return exists.valueAsString;
      else if (this.isNumberType(exists.type)) return exists.valueAsNumber;
      else if (this.isListType(exists.type)) return exists.valueAsList.join(',');
    }

    // If parameter exists, but we weren't able to infer a type, return it as a string
    if (exists) {
      return exists.valueAsString;
    }

    // If parameter properties are present, use them to infer the parameter type if possible
    if (paramProps?.type) {
      return this.createParamUsingProps(paramName, paramProps.type, paramProps);
    }

    // If no paramProps type was found, create a new parameter based on type labels if present
    return this.createParamUsingTypeLabels(paramBase, paramName, paramProps);
  }

  private createParamUsingProps(paramName: string, paramType: string, paramProps: CfnParameterProps) {
    if (!this.props.scope) {
      throw new Error('Unable to create params outside of a Construct');
    }
    if (this.isNumberType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsNumber;
    } else if (this.isStringType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsString;
    } else if (this.isListType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsList.join(',');
    } else {
      throw new Error(
        `Invalid parameter type passed to paramProps: "${paramType}". Type must be one of ['String', 'Number', 'CommaDelimitedList']`,
      );
    }
  }

  protected createParamUsingTypeLabels(
    paramBase: string,
    paramName: string,
    paramProps: CfnParameterProps | undefined,
  ) {
    if (!this.props.scope) {
      throw new Error('Unable to create params outside of a Construct');
    }
    if (paramBase.startsWith('string:')) {
      const typedProps = { ...paramProps, type: 'String' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsString;
    } else if (paramBase.startsWith('number')) {
      const typedProps = { ...paramProps, type: 'Number' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsNumber;
    } else if (paramBase.startsWith('list')) {
      const typedProps = { ...paramProps, type: 'CommaDelimitedList' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsList.join(',');
    }
    // If no type is specified in paramProps, then assume that the parameter is a string
    return new CfnParameter(this.props.scope, paramName, paramProps).valueAsString;
  }

  /**
   * Whether the given parameter type is a list type
   * Follows conventions of CfnParameter internal functions
   */
  private isListType(type: string) {
    return type.indexOf('List<') >= 0 || type.indexOf('CommaDelimitedList') >= 0;
  }

  /**
   * Whether the given parameter type is a number type
   * Follows conventions of CfnParameter internal functions
   */
  private isNumberType(type: string) {
    return type === 'Number';
  }

  /**
   * Whether the given parameter type is a string type
   * Follows conventions of CfnParameter internal functions
   */
  private isStringType(type: string) {
    return !this.isListType(type) && !this.isNumberType(type);
  }

  private getParamProps(paramName: string): CfnParameterProps | undefined {
    if (this.serviceCatalogConfig?.parameters?.[paramName]?.props) {
      return this.serviceCatalogConfig.parameters[paramName].props;
    }

    return undefined;
  }
}

export interface MdaaCustomAspect {
  readonly aspect_module: string;
  readonly aspect_class: string;
  readonly aspect_props?: ConfigurationElement;
}

export interface MdaaCustomNaming {
  readonly naming_module: string;
  readonly naming_class: string;
  readonly naming_props?: ConfigurationElement;
}

export interface MdaaNagSuppressions {
  readonly by_path: MdaaNagSuppressionByPath[];
}

export interface MdaaNagSuppressionByPath {
  readonly path: string;
  readonly suppressions: {
    readonly id: string;
    readonly reason: string;
  }[];
}

export interface MdaaServiceCatalogConstraintRuleAssertionConfig {
  readonly assert: string;
  readonly description: string;
}

// It seems we need this empty interface in the schema even though no one uses it
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MdaaServiceCatalogConstraintRuleCondititionConfig {}

export interface MdaaServiceCatalogConstraintRuleConfig {
  readonly condition: MdaaServiceCatalogConstraintRuleCondititionConfig;
  readonly assertions: MdaaServiceCatalogConstraintRuleAssertionConfig[];
}

export interface MdaaServiceCatalogConstraintConfig {
  readonly description: string;
  readonly rules: { [key: string]: MdaaServiceCatalogConstraintRuleConfig };
}

export interface MdaaServiceCatalogParameterConfig {
  props: CfnParameterProps;
  constraints?: MdaaServiceCatalogConstraintConfig;
}

export interface MdaaServiceCatalogProductConfig {
  portfolio_arn: string;
  owner: string;
  name: string;
  launch_role_name?: string;
  parameters?: { [key: string]: MdaaServiceCatalogParameterConfig };
}
