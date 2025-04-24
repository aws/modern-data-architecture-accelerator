# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs.

## Security/Compliance

### ECS Clusters
* Enforce Cluster Name
* Enforces KMS CMK encryption at rest
* Enforces container insights
* Enforces CloudWatch logging

### Fargate Services
* Enforce Fargate Name
* Enforces non-public IP

### Container Definitions
* Enforce Definition Name
* Enforces CloudWatch logging