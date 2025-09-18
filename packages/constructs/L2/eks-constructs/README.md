# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs for EKS ensuring compliance with CDK Nag rulesets for AWS Solutions, NIST-800-53-r5 and HIPPA.

## Kubernetes Version Updates

To add support for new Kubernetes versions when AWS EKS releases them:

1. Update the `versionMap` in `getKubectlUrl()` method in `lib/cluster.ts`
2. Add new kubectl layer case in `getKubectlLayer()` switch statement
3. Check [AWS EKS supported versions](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) for kubectl binary URLs
4. Update tests to use supported versions and remove deprecated ones
5. Update Kubernetes version in `packages/constructs/L3/dataops/dataops-nifi-l3-construct/lib/dataops-nifi-l3-construct.ts`

Currently supported: 1.28, 1.29, 1.30, 1.31, 1.32, 1.33

## Security/Compliance

### EKS Cluster
* Enforce Cluster Name
* Private endpoint access only.
* Enables all cluster logging facets.
* Enforces use of KMS CMK for encryption of all Kubernetes secrets.
* Adds configured principals as admin roles
