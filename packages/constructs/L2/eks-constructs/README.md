# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs for EKS ensuring compliance with CDK Nag rulesets for AWS Solutions, NIST-800-53-r5 and HIPPA.

## Compliance

The construct specifically enforces the following:

* Private endpoint access only.
* Enables all cluster logging facets.
* Enforces use of KMS CMK for encryption of all Kubernetes secrets.
