/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NamedAuthorizationPolicies, PolicyPrincipal, PolicyType } from '@aws-mdaa/datazone-constructs';
import { AuthorizationIdentities, Authorizations } from './datazone-l3-construct';
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

/**
 * Converts an AuthorizationIdentities object into an array of PolicyPrincipal.
 * When all is true, returns a single allUsersGrantFilter principal.
 * Otherwise maps users → userName, groups → groupName, userIdentifiers → userIdentifier,
 * and groupsIdentifiers → groupIdentifier.
 */
function identitiesToPrincipals(identities: AuthorizationIdentities): PolicyPrincipal[] {
  if (identities.all) {
    return [{ allUsersGrantFilter: true }];
  }
  const userPrincipals: PolicyPrincipal[] = (identities.users ?? []).map(userName => ({ userName }));
  const groupPrincipals: PolicyPrincipal[] = (identities.groups ?? []).map(groupName => ({ groupName }));
  const userIdPrincipals: PolicyPrincipal[] = Object.entries(identities.userIdentifiers ?? {}).map(
    ([name, identifier]) => ({
      userIdentifier: { name, identifier },
    }),
  );
  const groupIdPrincipals: PolicyPrincipal[] = Object.entries(identities.groupsIdentifiers ?? {}).map(
    ([name, identifier]) => ({
      groupIdentifier: { name, identifier },
    }),
  );
  return [...userPrincipals, ...groupPrincipals, ...userIdPrincipals, ...groupIdPrincipals];
}

/**
 * Converts simplified Authorizations into NamedAuthorizationPolicies.
 *
 * - projectCreators → CREATE_PROJECT (V1) or CREATE_PROJECT_FROM_PROJECT_PROFILE (V2)
 * - eligibleProjectMembers → ADD_TO_PROJECT_MEMBER_POOL policy
 * - domainUnitCreators → CREATE_DOMAIN_UNIT policy
 * - glossaryCreators → CREATE_GLOSSARY policy
 * - environmentCreators → CREATE_ENVIRONMENT policy
 *
 * Returns undefined when no authorizations produce any policies.
 */
export function convertAuthorizationsToNamedPolicies(
  authorizations: Authorizations | undefined,
  domainVersion: 'V1' | 'V2',
): NamedAuthorizationPolicies | undefined {
  if (!authorizations) {
    return undefined;
  }

  const projectCreatorsPolicyType: PolicyType =
    domainVersion === 'V1' ? 'CREATE_PROJECT' : 'CREATE_PROJECT_FROM_PROJECT_PROFILE';

  const mapping: ReadonlyArray<{ field: keyof Authorizations; policyName: string; policyType: PolicyType }> = [
    { field: 'projectCreators', policyName: 'simple-create-project', policyType: projectCreatorsPolicyType },
    {
      field: 'eligibleProjectMembers',
      policyName: 'simple-project-membership',
      policyType: 'ADD_TO_PROJECT_MEMBER_POOL',
    },
    { field: 'domainUnitCreators', policyName: 'simple-create-domain-unit', policyType: 'CREATE_DOMAIN_UNIT' },
    { field: 'glossaryCreators', policyName: 'simple-create-glossary', policyType: 'CREATE_GLOSSARY' },
    { field: 'environmentCreators', policyName: 'simple-create-environment', policyType: 'CREATE_ENVIRONMENT' },
  ];

  const policies: NamedAuthorizationPolicies = Object.fromEntries(
    mapping
      .filter(({ field }) => authorizations[field])
      .map(({ field, policyName, policyType }) => [
        policyName,
        {
          policyType,
          principals: identitiesToPrincipals(authorizations[field]!),
          includeChildDomainUnits: true,
        },
      ]),
  );

  return Object.keys(policies).length > 0 ? policies : undefined;
}
