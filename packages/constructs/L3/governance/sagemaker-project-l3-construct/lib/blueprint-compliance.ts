/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParamOverride {
  readonly name: string;
  readonly value?: string;
  readonly isEditable?: boolean;
}

const PARAM_OVERRIDES: Record<string, ParamOverride[]> = {
  Tooling: [
    { name: 'logGroupRetention', value: '' },
    { name: 'sagemakerDomainNetworkType', value: 'VpcOnly' },
    { name: 'enableNetworkIsolation', value: 'true' },
  ],
  DataLake: [],
};

export function getParamComplianceOverrides(blueprintName: string): ParamOverride[] {
  const overrides = PARAM_OVERRIDES[blueprintName];
  if (overrides) {
    return overrides.map(x => ({ ...x, isEditable: false }));
  }
  console.warn(`No compliance overrides found for ${blueprintName}.`);
  return [];
}
