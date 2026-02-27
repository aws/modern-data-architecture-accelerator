# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs for Datazone.

## Security/Compliance

### DataZone Project
* Enforce Project Name
* Securely integrates DataZone Project with MDAA-produced DataZone Domain 
* Assigns project admin/owner membership

### DataZone Authorization
* Implements fine-grained authorization policies for DataZone domains and domain units
* Supports comprehensive policy types including CREATE_DOMAIN_UNIT, CREATE_PROJECT, and others
* Validates principal types (user, group, account) and resolves identifiers
* Enforces policy compatibility with entity types (DOMAIN_UNIT, ENVIRONMENT_PROFILE, etc.)
* Manages critical vs non-critical policy removal policies

