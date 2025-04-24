# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs for EKS ensuring compliance with CDK Nag rulesets for AWS Solutions, NIST-800-53-r5 and HIPPA.

## Security/Compliance

### EKS Cluster
* Enforce Cluster Name
* Private endpoint access only.
* Enables all cluster logging facets.
* Enforces use of KMS CMK for encryption of all Kubernetes secrets.
* Adds configured principals as admin roles
