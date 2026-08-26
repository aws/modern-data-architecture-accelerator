/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationElement, MdaaCustomAspect, MdaaCustomNaming, TagElement } from '@aws-mdaa/config';
import { TerraformConfig } from './mdaa-cli-config-parser';
import { EffectiveConfig } from './config-types';
// nosemgrep
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _ = require('lodash');

/** Resolve effective MDAA version: child overrides parent */
export function computeEffectiveMdaaVersion(
  parent: Pick<EffectiveConfig, 'effectiveMdaaVersion'>,
  child?: string,
): string | undefined {
  return child || parent.effectiveMdaaVersion;
}

/** Resolve effective context: child merges over parent */
export function computeEffectiveContext(parent: EffectiveConfig, child?: ConfigurationElement): ConfigurationElement {
  return { ...parent.effectiveContext, ...child };
}

/** Resolve effective tag config: child merges over parent */
export function computeEffectiveTagConfig(parent: EffectiveConfig, child?: TagElement): TagElement {
  return { ...parent.effectiveTagConfig, ...child };
}

/** Resolve effective tag config files: child appends to parent */
export function computeEffectiveTagConfigFiles(parent: EffectiveConfig, child?: string[]): string[] {
  return [...(parent.tagConfigFiles || []), ...(child || [])];
}

/** Resolve effective custom aspects: child appends to parent */
export function computeEffectiveCustomAspects(parent: EffectiveConfig, child?: MdaaCustomAspect[]): MdaaCustomAspect[] {
  return [...(parent.customAspects || []), ...(child || [])];
}

/** Resolve effective custom naming: child overrides parent */
export function computeEffectiveCustomNaming(
  parent: EffectiveConfig,
  child?: MdaaCustomNaming,
): MdaaCustomNaming | undefined {
  return child || parent.customNaming;
}

/** Resolve effective Terraform config: child deep-merges over parent (child wins on conflicts) */
export function computeEffectiveTerraformConfig(
  parent: EffectiveConfig,
  child?: TerraformConfig,
): TerraformConfig | undefined {
  if (!child && !parent.terraform) return undefined;
  // Merge into a fresh object — merging directly into `child` would mutate the
  // caller's object and, with `child` as the first argument, would let
  // `parent.terraform` win on conflicting keys (source overrides object in
  // lodash's merge semantics) — the opposite of every other computeEffective*
  // function in this module, which all let the child override the parent.
  return _.mergeWith({}, parent.terraform, child);
}

/** Resolve effective permissions boundary ARN: child overrides parent (nullish coalescing) */
export function computeEffectivePermissionsBoundaryArn(parent: EffectiveConfig, child?: string): string | undefined {
  return child ?? parent.permissionsBoundaryArn;
}
