/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectiveConfig } from './config-types';

export function generateContextCdkParams(moduleEffectiveConfig: EffectiveConfig): string[] {
  return Object.entries(moduleEffectiveConfig.effectiveContext).map(contextEntry => {
    const contextKey = contextEntry[0];
    const contextValue = contextEntry[1];
    let encodedContextValue: string;
    if (contextValue instanceof Array) {
      let escaped = JSON.stringify(JSON.stringify(contextValue));
      escaped = escaped.substring(1, escaped.length - 1);
      encodedContextValue = `"list:${escaped}"`;
    } else if (contextValue instanceof Object) {
      let escaped = JSON.stringify(JSON.stringify(contextValue));
      escaped = escaped.substring(1, escaped.length - 1);
      encodedContextValue = `"obj:${escaped}"`;
    } else if (typeof contextValue === 'string') {
      encodedContextValue = contextValue;
    } else if (typeof contextValue === 'boolean') {
      encodedContextValue = contextValue ? 'true' : 'false';
    } else {
      throw Error(`Don't know how to handle type ${contextValue}`);
    }
    return `-c '${contextKey}=${encodedContextValue}'`;
  });
}
