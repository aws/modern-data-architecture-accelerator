# Construct Overview

Opinionated L2 constructs for Redshift.

## Security/Compliance

### Redshift Cluster
* Enforce Cluster Name
* Enforce use of Secret for admin credentials
* Enforce non-public access
* Enforce KMS CMK encryption at rest
* Enforce retention on stack deletion
* Enforce enhanced VPC routing
* Enforce admin credential rotations

## Optional Features

### Multi-AZ Deployment
Set `multiAz: true` to enable multi-AZ deployment for high availability.

Multi-AZ has the following constraints (validated at synth time):
* At least 2 nodes per AZ (`numberOfNodes >= 2`, single-node not supported)
* Subnet group must span at least 3 Availability Zones (`subnetIds` must contain ≥ 3 subnets in different AZs)
* Port must be in range 5431–5455 or 8191–8215
* Cluster must be encrypted (enforced by default in this construct)
* Pause/resume scheduled actions are not supported
* Elastic IP addresses are not supported

### Cross-Region Snapshot Copy
Set `backupRegion` to a target AWS region to enable cross-region snapshot copy for disaster recovery. The backup region must differ from the cluster's deployment region.