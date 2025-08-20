/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CreatedDomainUnit } from './datazone-l3-construct';

export function flattenDomainUnitPaths(
  currentPath: string,
  domainUnits: { [name: string]: CreatedDomainUnit },
): { [path: string]: string } {
  return Object.fromEntries(
    Object.entries(domainUnits).flatMap(([domainUnitName, domainUnit]) => {
      const path = `${currentPath}/${domainUnitName}`;
      return [[path, domainUnit.id], ...Object.entries(flattenDomainUnitPaths(path, domainUnit.domainUnits || {}))];
    }),
  );
}
