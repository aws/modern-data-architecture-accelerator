/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack, Token } from 'aws-cdk-lib';
import { NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';
import * as path from 'node:path';

/**
 * Renders a resolved CloudFormation value the way cdk-nag renders the resources and actions it
 * reports, replacing each reference with its `<...>` placeholder (cdk-nag's internal
 * `flattenCfnReference`, which it does not export).
 */
function flattenCfnValue(resolved: unknown): string {
  if (Array.isArray(resolved)) {
    return resolved.map(flattenCfnValue).join('');
  }
  if (resolved !== null && typeof resolved === 'object') {
    const entries = Object.entries(resolved as Record<string, unknown>);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      if (key === 'Ref') {
        return `<${flattenCfnValue(value)}>`;
      }
      if (key === 'Fn::GetAtt') {
        const [resource, attribute] = value as unknown[];
        return `<${flattenCfnValue(resource)}.${flattenCfnValue(attribute)}>`;
      }
      if (key === 'Fn::Join') {
        const [delimiter, parts] = value as [unknown, unknown[]];
        return parts.map(flattenCfnValue).join(flattenCfnValue(delimiter));
      }
    }
  }
  // A label reached through a Ref, Fn::GetAtt or Fn::Join is already a string and passes straight
  // through. Anything else is an intrinsic not handled above, and it still has to render the way
  // cdk-nag renders it or the entry will not match the finding it is meant to suppress: cdk-nag
  // falls back to JSON for any value it does not special-case, where the default object
  // stringification would yield `[object Object]` and never match.
  return typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
}

/**
 * cdk-nag compares a suppression's `appliesTo` entries against the resources and actions of the
 * finding, which it renders by resolving them and flattening every CloudFormation reference to a
 * `<...>` placeholder. An `appliesTo` built from an unresolved value therefore never matches its own
 * finding: on an env-agnostic synth (no `account` in the MDAA config and no resolvable credentials)
 * an entry interpolating the stack account carries CDK's token marker, while the finding it is meant
 * to suppress reads `<AWS::AccountId>` — so the suppression silently misses and the rule fails the
 * synth. Resolving and flattening here produces the same text cdk-nag does. Entries that are already
 * resolved are returned untouched, so suppressions in an account-specific synth are unaffected.
 */
function alignAppliesToWithNag(scope: IConstruct, suppression: NagPackSuppression): NagPackSuppression {
  if (!suppression.appliesTo?.some(entry => typeof entry === 'string' && Token.isUnresolved(entry))) {
    return suppression;
  }
  const stack = Stack.of(scope);
  return {
    ...suppression,
    appliesTo: suppression.appliesTo.map(entry =>
      typeof entry === 'string' && Token.isUnresolved(entry) ? flattenCfnValue(stack.resolve(entry)) : entry,
    ),
  };
}

export interface NagSuppressionConfig {
  /** CDK Nag rule identifier for specific security rule suppression targeting */
  readonly id: string;
  /** Justification for security rule suppression providing detailed explanation for compliance and audit purposes */
  readonly reason: string;
}

export class MdaaNagSuppressions {
  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addCodeResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const oldLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    const location = new Error().stack
      ?.split('\n')[2]
      .replace(/.*\(/, '') //NOSONAR
      .replace(/\).*/, '')
      .replace(/.*\/constructs\/L./, '@aws-mdaa') //NOSONAR
      .replace(/.*@aws-mdaa/, '@aws-mdaa') //NOSONAR
      .replace(/:\d+:\d+$/, ''); // Strip line:col for stable nag suppression reasons
    Error.stackTraceLimit = oldLimit;
    Error.stackTraceLimit = oldLimit;
    const suppressionsWithSource = suppressions.map(x => {
      return alignAppliesToWithNag(construct, {
        ...x,
        reason: `[MDAA:${location}] ${x.reason}`,
      });
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const configFilePath = construct.node.tryGetContext('module_configs');
    const configFileName = configFilePath ? path.relative(process.cwd(), path.resolve(configFilePath)) : configFilePath;
    const suppressionsWithSource = suppressions.map(x => {
      return alignAppliesToWithNag(construct, {
        ...x,
        reason: `[CONFIG:${configFileName}] ${x.reason}`,
      });
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children via its path
   * @param stack The Stack the construct belongs to
   * @param path The path(s) to the construct in the provided stack
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressionsByPath(
    stack: Stack,
    path: string | string[],
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const suppressionsWithSource = suppressions.map(x => {
      return alignAppliesToWithNag(stack, {
        ...x,
        reason: `[CONFIG] ${x.reason}`,
      });
    });
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressionsWithSource, applyToChildren);
  }
}
