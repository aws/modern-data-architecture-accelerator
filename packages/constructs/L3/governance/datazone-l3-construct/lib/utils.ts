/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CreatedDomainUnit } from './private/common-domain-helper';

export function flattenDomainUnitPaths(
  currentPath: string,
  domainUnits: { [name: string]: CreatedDomainUnit },
  filter?: (domainUnit: CreatedDomainUnit) => boolean,
): { [path: string]: string } {
  return Object.fromEntries(
    Object.entries(domainUnits).flatMap(([domainUnitName, domainUnit]) => {
      const path = `${currentPath}/${domainUnitName}`;
      const includeCurrentNode = !filter || filter(domainUnit);
      return [
        ...(includeCurrentNode ? [[path, domainUnit.construct.domainUnitId]] : []),
        ...Object.entries(flattenDomainUnitPaths(path, domainUnit.domainUnits || {}, filter)),
      ];
    }),
  );
}
