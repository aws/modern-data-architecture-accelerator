/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Fn, Names, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
// nosemgrep
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import * as XRegExp from 'xregexp';
import { ConfigurationElement } from './config';
import { IMdaaConfigValueTransformer, TransformResult } from './transformer';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm';

export interface AwsEnvironment {
  readonly partition?: string;
  readonly region?: string;
  readonly account?: string;
}

export interface MdaaConfigRefValueTransformerProps {
  readonly naming?: IMdaaResourceNaming;
  readonly org: string;
  readonly domain: string;
  readonly env: string;
  readonly module_name: string;
  readonly scope?: Construct;
  readonly context?: ConfigurationElement;
  readonly awsEnvironment?: AwsEnvironment;
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
      return this.parseRef(value, refMatch) as TransformResult;
    } else {
      return value;
    }
  }

  protected parseRef(value: string, refMatch: string[]): string | number | object {
    const isNakedReference = this.isNakedReference(value, refMatch);

    // Handle naked references that might return objects/arrays
    if (isNakedReference) {
      const nakedResult = this.handleNakedReference(refMatch[0]);
      if (nakedResult !== undefined) {
        return nakedResult;
      }
    }
    // Substitute all references in the string
    return this.substituteReferences(value, refMatch, isNakedReference);
  }

  private isNakedReference(value: string, refMatch: string[]): boolean {
    return refMatch.length === 1 && value === `{{${refMatch[0]}}}`;
  }

  private handleNakedReference(ref: string) {
    const refInner = this.transformValue(ref).toString();

    if (refInner.startsWith('context:')) {
      const resolvedValue = this.parseContext(refInner);
      // If it's an object or array, return it directly
      if (typeof resolvedValue === 'object' && resolvedValue !== null) {
        return resolvedValue;
      }
    }

    return undefined;
  }

  private substituteReferences(value: string, refMatch: string[], isNakedReference: boolean): string {
    return refMatch.reduce((result, ref) => {
      const refInner = this.transformValue(ref).toString();
      const resolvedValue = this.resolveReference(refInner, isNakedReference);

      if (resolvedValue === undefined) {
        return result;
      }

      const stringValue = this.convertToString(resolvedValue);
      return result.replace(`{{${ref}}}`, stringValue);
    }, value);
  }

  private convertToString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // For objects, use JSON.stringify as a safe fallback
    return JSON.stringify(value);
  }

  private resolveReference(refInner: string, isNakedReference: boolean) {
    const simpleRefMap = this.getSimpleRefMap();

    if (simpleRefMap[refInner]) {
      return simpleRefMap[refInner];
    }

    if (refInner.startsWith('context:')) {
      return this.resolveContextReference(refInner, isNakedReference);
    }

    if (refInner.startsWith('env_var:')) {
      return this.resolveEnvVar(refInner);
    }

    if (refInner.startsWith('ssm-org:')) {
      return this.resolveSsmPartialPathReference(refInner);
    }

    if (refInner.startsWith('ssm-domain:')) {
      return this.resolveSsmPartialPathReference(refInner);
    }

    if (refInner.startsWith('ssm-env:')) {
      return this.resolveSsmPartialPathReference(refInner);
    }

    if (refInner.startsWith('resolve:ssm:')) {
      return this.resolveDirectSsm(refInner);
    }

    if (refInner.startsWith('ref:')) {
      return this.resolveRef(refInner);
    }

    return undefined;
  }

  private resolveRef(refInner: string): string {
    const dummyStack = new Stack(undefined);
    const withoutPrefix = refInner.replace(/^ref:/, '');
    const parts = withoutPrefix.split(':');

    // Remove leading slash if present from the path
    const pathWithSlash = parts[0];
    const path = pathWithSlash.startsWith('/') ? pathWithSlash.slice(1) : pathWithSlash;
    const attr = parts[1]; // Will be undefined if no attribute specified

    const logicalId = this.generateLogicalId(dummyStack, path);

    if (attr) {
      return Fn.getAtt(logicalId, attr).toString();
    } else {
      return Fn.ref(logicalId).toString();
    }
  }

  private generateLogicalId(parentScope: Construct, path: string): string {
    const pathComponents = path.split('/');
    const construct = new Construct(parentScope, pathComponents[0]);
    if (pathComponents.length == 1) {
      return Names.nodeUniqueId(construct.node);
    } else {
      return this.generateLogicalId(construct, pathComponents.slice(1).join('/'));
    }
  }

  private getSimpleRefMap(): { [key: string]: string | undefined } {
    const scopeStack = this.props.scope ? Stack.of(this.props.scope) : undefined;
    return {
      org: this.props.org,
      env: this.props.env,
      domain: this.props.domain,
      module_name: this.props.module_name,
      partition: this.props.awsEnvironment?.partition ?? scopeStack?.partition,
      region: this.props.awsEnvironment?.region ?? scopeStack?.region,
      account: this.props.awsEnvironment?.account ?? scopeStack?.account,
    };
  }

  private resolveContextReference(refInner: string, isNakedReference: boolean) {
    const resolvedValue = this.parseContext(refInner);

    // If the resolved value is an object or array, and we're not in a naked reference
    if (typeof resolvedValue === 'object' && resolvedValue !== null && !isNakedReference) {
      throw new Error('Cannot embed array or object context value in string');
    }

    return resolvedValue;
  }

  private resolveEnvVar(refInner: string): string | undefined {
    const envVar = refInner.replace(/^env_var:/, '');
    return process.env[envVar];
  }

  private extractSsmValue(refInner: string, prefix: string): string {
    const extracted = refInner.replace(new RegExp(String.raw`^${prefix}:\s*`), '');
    // Remove leading slash to prevent double slashes in the path
    return extracted.startsWith('/') ? extracted.slice(1) : extracted;
  }

  private resolveSsmPartialPathReference(refInner: string): string {
    if (!this.props.naming) {
      throw new Error(`Unable to resolve ${refInner} ssm param outside of a naming context`);
    }

    if (refInner.startsWith('ssm-org:')) {
      const ssmPath = this.props.naming.ssmOrgPath(this.extractSsmValue(refInner, 'ssm-org'));
      return `{{resolve:ssm:${ssmPath}}}`;
    }

    if (refInner.startsWith('ssm-domain:')) {
      const ssmPath = this.props.naming.ssmDomainPath(this.extractSsmValue(refInner, 'ssm-domain'));
      return `{{resolve:ssm:${ssmPath}}}`;
    }

    if (refInner.startsWith('ssm-env:')) {
      const ssmPath = this.props.naming.ssmEnvPath(this.extractSsmValue(refInner, 'ssm-env'));
      return `{{resolve:ssm:${ssmPath}}}`;
    }

    return refInner;
  }

  private resolveDirectSsm(refInner: string): string {
    if (!this.props.scope) {
      throw new Error('Unable to resolve ssm param outside of a Construct');
    }

    const ssmPath = refInner.replace(/^resolve:ssm:/, '');
    console.log(`Resolving SSM: ${ssmPath}`);
    return this.getSsmValue(ssmPath);
  }

  private getSsmValue(ssmPath: string): string {
    if (!this.props.scope) {
      throw new Error('Unable to resolve ssm param outside of a Construct');
    }
    //Handle full arn-based SSM paths (for referencing RAM shared SSM params from other accounts)
    if (ssmPath.startsWith('arn:')) {
      const stack = Stack.of(this.props.scope);
      const exists = stack.node.tryFindChild(ssmPath) as IStringParameter;
      if (exists) {
        return exists.stringValue;
      }
      return MdaaStringParameter.fromStringParameterArn(Stack.of(this.props.scope), ssmPath, ssmPath).stringValue;
    }
    return this.props.scope.node.tryGetContext('@mdaaLookupSSMValues')
      ? MdaaStringParameter.valueFromLookup(Stack.of(this.props.scope), ssmPath)
      : MdaaStringParameter.valueForStringParameter(Stack.of(this.props.scope), ssmPath);
  }

  private parseContext(refInner: string) {
    const refInnerContext = refInner.replace(/^context:/, '');
    const scopeContextValue = this.props.scope?.node.tryGetContext(refInnerContext);
    const scopeInnerContextValue = this.props.context ? this.props.context[refInnerContext] : undefined;
    const contextValue = scopeContextValue ?? scopeInnerContextValue;
    if (!contextValue) {
      throw new Error(`Failed to resolve context: ${refInnerContext}`);
    }
    if (typeof contextValue === 'string') {
      // Check if the value is encoded with quotes (from CLI encoding)
      if (contextValue.startsWith('"') && contextValue.endsWith('"')) {
        // Remove outer quotes
        const unquoted = contextValue.slice(1, -1);

        if (unquoted.startsWith('obj:')) {
          // Parse object: "obj:{...}" -> {...}
          return JSON.parse(unquoted.replace(/^obj:/, '')) as ConfigurationElement;
        } else if (unquoted.startsWith('list:')) {
          // Parse array: "list:[...]" -> [...]
          return JSON.parse(unquoted.replace(/^list:/, '')) as unknown[];
        }
      }
    }
    return contextValue;
  }
}
