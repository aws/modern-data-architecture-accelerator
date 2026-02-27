import { PolicyPrincipal } from './authorization';

export function validatePrincipal(principal: PolicyPrincipal) {
  if (Object.keys(principal).length != 1) {
    throw new Error(
      `Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName`,
    );
  }
}
