# DataOps Nifi Clusters

The Data Ops Nifi CDK App is used to deploy the resources required to orchestrate data operations on the data lake using Nifi clusters and flows.

***

## Deployed Resources and Compliance Details

![dataops-nifi](../../../constructs/L3/dataops/dataops-nifi-l3-construct/docs/dataops-nifi.png)

* **EKS Cluster** - A single EKS cluster is provisioned hosting Zookeeper and multiple Nifi clusters. The cluster is configured to run all pods on managed Fargate compute. All secrets are encrypted with the Data Ops project KMS Key. Additional services are deployed onto the EKS cluster to support Nifi:

  * **Internal CA** - A CA is provisioned internally (using a cert-manager Helm chart) on the EKS cluster for minting of all SSL certs required by both Nifi and Zookeeper. This internal CA will optionally use an external ACM Private CA to mint its certificate. CA certificate and private key secrets are stored internally within the cluster (encrypted by KMS).
  * **External Secrets** - An external secrets integration is deployed (using a Helm chart) onto the EKS cluster to allow consumption of AWS Secrets Manager secrets into the cluster.
  * **External DNS** - An external-dns integration is deployed (using a CDK8S chart) to facilitate automatic updating of Route53 private hosted zone with Nifi cluster node hostnames.
  * **Zookeeper Cluster** - A secured Zookeeper cluster is deployed (using a CDK8S chart) to facilitate Nifi cluster coordination. All Zookeeper communications are TLS-encrypted using certs minted by the internal CA.

* **Route53 Private Hosted Zone** - Used to provide resolution of Nifi cluster node hostnames.

* **Nifi Clusters** - Multiple Nifi clusters are deployed onto EKS as separate StatefulSets (using CDK8S charts), running in separate Namespaces. Each Nifi cluster has its own ServiceAccount connected to a separate IAM Role, which can be used by the cluster to access AWS services. All Nifi communications are TLS-encrypted using certs minted by the internal CA. Additionally, each Nifi cluster may be configured to federate user access from a SAML identity provider (including AWS IAM Identity Center/SSO).

  * **Nifi EFS** - Each cluster node/pod is provided with PersistentVolumes running on a cluster-specific EFS FileSystem, with separate Access Points per cluster node. The Filesystem is encrypted using the DataOps project KMS key.
  * **Nifi Node Certs** -- Each cluster node is provisioned with a TLS certificate (signed by the internal CA) used for all interactions with other Nifi nodes and Zookeeper. The certificates and keys are mounted as JKS key stores into the Nifi pods from a Kubernetes Secret. The passwords for the JKS stores is stored in AWS Secrets Manager, and published to the Nifi container as a secret environment variable.
  * **Nifi Security Group** - A security group is provisioned for each Nifi cluster providing ingress/egress control to/from the cluster.
  * **Nifi Service Account Role** - An IAM role is provisioned for each cluster, bound to the Nifi StatefulSet as a ServiceAccount. This role may be granted access to AWS resources using either AWS or Customer Managed Policies.

* **Nifi Registry** - Nifi Registry is optionally deployed as a Kubernetes Deployment. Each Nifi cluster deployed by this module will be automatically integrated with this Nifi Registry.

  * **Nifi Registry EFS** - Nifi Registry is provided with a PersistentVolume running on an EFS FileSystem. The Filesystem is encrypted using the DataOps project KMS key.
  * **Nifi Registry Certs** - Nifi Registry  is provisioned with a TLS certificate (signed by the internal CA) used for all interactions with other Nifi nodes and Zookeeper. The certificate and key is mounted as JKS key stores into the Registry pod from a Kubernetes Secret. The passwords for the JKS stores is stored in AWS Secrets Manager, and published to the Nifi container as a secret environment variable.
  * **Nifi Registry Security Group** - A security group is provisioned for Registry providing ingress/egress control to/from the services.
  * **Nifi Registry Service Account Role** - An IAM role is provisioned for Registry, bound to the Nifi StatefulSet as a ServiceAccount. This role may be granted access to AWS resources using either AWS or Customer Managed Policies.

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          dataops-nifi: # Module Name can be customized
            module_path: "@aws-caef/dataops-nifi" # Must match module NPM package name
            module_configs:
              - ./dataops-nifi.yaml # Filename/path can be customized
```

### Module Config (./dataops-nifi.yaml)

[Config Schema Docs](SCHEMA.md)

### Sample Nifi Config

```yaml
# (Required) Name of the Data Ops Project
# Name the the project the resources of which will be used by these functions.
# Other resources within the project can be referenced in the functions config using
# the "project:" prefix on the config value.
projectName: dataops-project-test

nifi:
  # This is a set of Role/Principal Arns which will be granted access to the Kubernetes cluster
  adminRoles:
    - name: Admin
    - name: eks-admin

  # (Optional) - If specified, an EC2 instance will be created with tooling and access required
  # to manage the EKS cluster.
  mgmtInstance:
    # The subnet on which the Management Instance will be placed
    subnetId: test-subnet-id
    # The AZ in which the Management Instance will be placed.
    # This must be the AZ in which the subnet is located.
    availabilityZone: test-az
    # (Optional) - The name of an SSH keypair to use.
    # If not specified, one will be created and then private key placed in a Secret
    keyPairName: test-key-pair

  # The VPC onto which Nifi clusters will be deployed
  vpcId: test-vpc-id

  # The subnets on which Nifi clusters will be deployed
  subnetIds:
    subnet1: test-subnet-id-1
    subnet2: test-subnet-id-2

  # (Optional) - Specify the Arn of a ACM Private CA to be used as a root of the trust chain
  # for all signed Nifi certs. The cert-manager service accounts within the EKS cluster will be
  # granted access to mint certs via this ACM PCA.
  # If not specified, an ACM private CA will be created.
  existingPrivateCaArn: arn:aws:acm-pca:test-region:test-account:certificate-authority/test-acm-pca-id

  # (Optional) An internal CA will be created within the Nifi EKS cluster (either self-signed or signed by a ACM Private CA).
  # All Nifi and Zookeeper node certs will be minted within the cluster via the internal CA.
  # This is the validity duration of the internal CA cert. If using an ACM Private CA with short-lived certs, this should be
  # less than 7 days (the max validity for a short-lived ACM PCA cert).
  # Defaults to 6 days.
  caCertDuration: 144h0m0s
  # (Optional) The time before CA cert expiration at which point the cert will be automatically renewed.
  # Defaults to 12 hours.
  caCertRenewBefore: 12h0m0s

  # (Optional) The validity period of the Nifi and Zookeeper node certs. This should be some period less than the validity of the
  # CA cert itself. Note that Nifi node cert renewal will result in automatic restart of the Nifi app running in the EKS pod.
  # Defaults to 5 days.
  nodeCertDuration: 140h0m0s
  # (Optional) The time before node cert expiration at which point the certs will be automatically renewed.
  # Defaults to 12 hours.
  nodeCertRenewBefore: 6h0m0s

  # Applied to the EKS cluster control plane, for providing access to the cluster via kubectl
  eksSecurityGroupIngressRules:
    # Allow ingress from kubectl client Security Group (IE a bastion EC2 host, or Cloud9 instance)
    sg:
      - sgId: sg-kubectlclientid
        protocol: tcp
        port: 443

  # Allows mounting of the Nifi EFS from outside of the EKS cluster.
  # These can also be configured on a per Nifi cluster basis
  additionalEfsIngressSecurityGroupIds:
    - sg-glefsclientid

  # Applied to the Nifi pods, allowing remote connectivity to Nifi HTTPS and remote cluster ports
  # for specified Security Groups. These can also be configured on a per Nifi cluster basis.
  securityGroupIngressSGs:
    - sg-glnificlientid

  # Applied to the Nifi pods, allowing remote connectivity to Nifi HTTPS and remote cluster ports
  # for specified IPv4 CIDRs. These can also be configured on a per Nifi cluster basis.
  securityGroupIngressIPv4s:
    - 10.10.10.10/24

  # The list of Nifi cluster instances to be created.
  # Each cluster will deployed into separate namespaces on the EKS cluster,
  # but will share the same Zookeeper cluster for coordination (using separate Zookeeper nodes per Nifi cluster).
  clusters:
    # Test cluster name. Each cluster in the config should have a unique name.
    test1:
      # The initial number of nodes in the cluster.
      nodeCount: 2
      # The size of the Nifi nodes.
      # One of "SMALL" (1CPU2GB) | "MEDIUM" (2CPU,4GB) | "LARGE" (4CPU,8GB) | "XLARGE" (8CPU,16GB) | "2XLARGE" (16CPU,32GB)
      nodeSize: SMALL
      # The identities which will be granted admin access to the nifi cluster.
      # This should be the SAML identities of the federated admin users.
      # If deleted in Nifi UI, admin identities will be constantly recreated by a background process until removed from this config.
      adminIdentities:
        - "some-admin-identity"
        - "some-other-admin-identity"
      # (Optional) - A list of other Nifi clusters within this config which will automatically be provided
      # security group connectivity as well as remote access to this cluster.
      peerClusters:
        - test2
      # (Optional) - Registry client configurations which will be added to the cluster.
      # Note that this cluster will automatically be integrated with the Registry deployed by this module.
      registryClients:
        example-extra-client:
          url: https://some-external-registry-url:8443
      # (Optional) External Nifi node identities which will automatically be added to policies required for remote data transfer to and from this cluster.
      # They will also be added to an 'external-nodes' group which can be referenced by 'authorizations'.
      # Note that nodes from clusters created by this config do not need to be specified here. They can instead be specified via "peerClusters".
      # If deleted in Nifi UI, external node identities will be constantly recreated by a background process until removed from this config.
      # Note that these external nodes will also need to be provided connectivity to the cluster via securityGroupIngress configurations.
      externalNodeIdentities:
        - CN=test-external-node1
        - CN=test-external-node2
      # (Optional) Additional identities which will be added to the cluster. 
      # Note that identities may already exist if they have been used to login to the cluster via SAML federation.
      # Using this option ensures the identities will exist and can be referenced in "groups" or "authorizations".
      # Otherwise, these identities will not be automatically granted any permissions.
      # If deleted in Nifi UI, identities will be constantly recreated by a background process until removed from this config.
      identities:
        - test-identity-1
        - test-identity-2
        - test-identity-3
      # (Optional) Groups which will be automtically created within the cluster.
      # Note that groups will only be created, not deleted when removed from this configuration.
      # If deleted in Nifi UI, groups will be constantly recreated by a background process until removed from this config.
      groups:
        # Each group name should be unique.
        test_group:
          # This is the list of member identities. If not specified in the 'identities', 'adminIdentities', or 'externalNodeIdentities' sections,
          # or automatically created via 'peerClusters', then the identity must pre-exist within the cluster.
          - test-identity-1
          - test-identity-2
      # (Optional) A set of policies which will be automatically created if they don't exist, and if matched
      # by an authorization in the 'authorizations' section. Empty policies will not be created.
      # If deleted in Nifi UI, policies will be constantly recreated by a background process until removed from this config.
      policies:
        # This policy resource will have the  Nifi Flow Root ID substituted automatically, as
        # this is not typically known at deployment time.
        - resource: /data/ROOT_ID
          # This policy will be a READ policy
          action: READ
        - resource: /data/ROOT_ID
          # This policy will be a WRITE policy
          action: WRITE
      # (Optional) Below are configurations used by a background manager process to automatically add identities and groups to 
      # policies based on policy resource pattern matching. This alleviates the need to manually add critical identities and groups
      # to policies as they are created within Nifi. Note that this functionality only adds authorizations, but will not remove them
      # (this must still be done within the Nifi UI/). 
        # If deleted in Nifi UI, authorizations will be constantly recreated by a background process until removed from this config.
      authorizations:
        # The policyResourcePattern can be a literal pattern or a regex.
        # This policy pattern will also have the Nifi Flow Root ID substituted automatically, as
        # this is not typically known at deployment time.
        - policyResourcePattern: /data/ROOT_ID
          # This authorization will be added only to "READ" policies matching the resource pattern
          actions:
            - READ
          # The test group will automatically be added to this policy.
          groups:
            - test_group
          # The 'test-identity'
          identities:
            - "test-identity-1"
        # This authorization will match any policy with a /data/ resource prefix
        - policyResourcePattern: /data/.*
          # This authorization will be added both to "READ" and "WRITE" policies matching the resource pattern
          actions:
            - READ
            - WRITE
          # The test group will automatically be added to this policy.
          groups:
            - test_group
          # The "test-identity-1" will automatically be added to this policy
          identities:
            - "test-identity-1"

      # The Nifi cluster will be configured for authentication of users via SAML federation
      saml:
        # The IDP Metadata URL where the SAML metadata can be fetched from the IDP
        idpMetadataUrl: "https://portal.sso.ca-central-1.amazonaws.com/saml/metadata/abc-123"

      # Allows mounting of the Nifi EFS from outside of the EKS cluster
      # This list will be combined with the global 'additionalEfsIngressSecurityGroupIds' list to determine the
      # effective ingress config.
      additionalEfsIngressSecurityGroupIds:
        - sg-efsclientid

      # Applied to the Nifi pods, allowing remote connectivity to Nifi HTTPS and remote cluster ports
      # This list will be combined with the global 'securityGroupIngressSGs' list to determine the
      # effective ingress config.
      securityGroupIngressSGs:
        - sg-nificlientid

      # Applied to the Nifi pods, allowing remote connectivity to Nifi HTTPS and remote cluster ports
      # for specified IPv4 CIDRs.
      # This list will be combined with the global 'securityGroupIngressIPv4s' list to determine the
      # effective ingress config.
      securityGroupIngressIPv4s:
        - 10.10.10.10/24

      # List of AWS Managed policies which will be added to the Nifi cluster role, which is used by the Nifi cluster to
      # access AWS services.
      # Note each AWS managed policy requires a CDK Nag suppression reason, as their use
      # is discouraged by rule AWS-Solutions-IAM4
      clusterRoleAwsManagedPolicies:
        - policyName: AmazonS3ReadOnlyAccess
          suppressionReason: "AmazonS3ReadOnlyAccess authorized for use"

      # List of Customer Managed policies which will be added to the Nifi cluster role, which is used by the Nifi cluster to
      # access AWS services. Note that the managed policy must already exist.
      clusterRoleManagedPolicies:
        - "customer-managed-policy-1"

    test2:
      nodeCount: 2
      nodeSize: SMALL
      # The Nifi cluster will be configured for authentication of users via SAML federation
      saml:
        # The IDP Metadata URL where the SAML metadata can be fetched from the IDP
        idpMetadataUrl: "https://portal.sso.ca-central-1.amazonaws.com/saml/metadata/abc-123"
      adminIdentities: 
       - "example_admin_identity"
      # (Optional) - The port on which Nifi HTTPS interface will listen.
      # If not specified, defaults to 8443
      httpsPort: 8444
      # (Optional) - The port on which the Nifi raw protocol interface will listen for
      # remote cluster connections. Defaults to 10000
      remotePort: 10001
      # (Optional) - The port on which the Nifi cluster protocol interface will listen for
      # intra cluster communications. Defaults to 14443
      clusterPort: 14444
      peerClusters:
        - test1

  # (Optional) Configuration specific to Nifi Registry
  # If not specified, no Registry service is deployed.
  registry:
    # The identities which will be granted admin access to the Registry instance.
    # These should be the common names of administrator TLS certificates minted by the CA trusted by this Registry instance.
    # Note that Registry does not currently support SAML federation.
    # If deleted in Registry UI, admin identities will be constantly recreated by a background process until removed from this config.
    adminIdentities:
      - "CN=some-admin-identity"
      - "CN=some-other-admin-identity"
    # (Optional) External Nifi node identities which will automatically be added to policies required for interacting with this Registry instance.
    # They will also be added to an 'external-nodes' group which can be referenced by 'authorizations'.
    # Note that nodes from clusters created by this config do not need to be specified here. The will automatically be provided acccess to the Registry instance.
    # If deleted in Registry UI, external node identities will be constantly recreated by a background process until removed from this config.
    # Note that these external nodes will also need to be provided connectivity to the cluster via securityGroupIngress configurations.
    externalNodeIdentities:
      - CN=test-external-node1
      - CN=test-external-node2
    # (Optional) Additional identities which will be added to the Registry instance. 
    # Note that identities may already exist if they have been used to login to the cluster via SAML federation.
    # Using this option ensures the identities will exist and can be referenced in "groups" or "authorizations".
    # Otherwise, these identities will not be automatically granted any permissions.
    # If deleted in Registry UI, identities will be constantly recreated by a background process until removed from this config.
    identities:
      - test-identity-1
      - test-identity-2
      - test-identity-3
    # (Optional) Groups which will be automtically created within the Registry instance.
    # Note that groups will only be created, not deleted when removed from this configuration.
    # If deleted in Registry UI, groups will be constantly recreated by a background process until removed from this config.
    groups:
      # Each group name should be unique.
      test_group:
        # This is the list of member identities. If not specified in the 'identities', 'adminIdentities', or 'externalNodeIdentities' sections,
        # then the identity must pre-exist within the cluster.
        - test-identity-1
        - test-identity-2

    # (Optional) - Registry Buckets and authorizations which will be added to the Registry automatically.
    # Note that a bucket and appropriate authorizations will automatically be added for each Nifi cluster in the config.
    buckets:
      # Bucket name
      example-extra-bucket:
        READ: # One of READ, WRITE, DELETE
          # These groups and identities will be granted READ access to the bucket
          groups:
            - test_group
          identities:
            - test-identity-1
        WRITE: # One of READ, WRITE, DELETE
          # These identities will be granted WRITE access to the bucket
          identities:
            - test-identity-2
    
    # (Optional) A set of policies which will be automatically created if they don't exist, and if matched
    # by an authorization in the 'authorizations' section. Empty policies will not be created.
    # If deleted in Registry UI, policies will be constantly recreated by a background process until removed from this config.
    policies:
      # This will ensure a /buckets policy will be created if matched by an authorization policyResourcePattern.
      - resource: /buckets
        # This policy will be a READ policy
        action: READ
    # (Optional) Below are configurations used by a background manager process to automatically add identities and groups to
    # policies based on policy resource pattern matching. This alleviates the need to manually add critical identities and groups
    # to policies as they are created within Nifi Registry. Note that this functionality only adds authorizations, but will not remove them
    # (this must still be done within the Registry UI/). 
      # If deleted in Registry UI, authorizations will be constantly recreated by a background process until removed from this config.
    authorizations:
      # The policyResourcePattern can be a literal pattern or a regex.
      - policyResourcePattern: /data/
        # This authorization will be added only to "READ" policies matching the resource pattern
        actions:
          - READ
        # The test group will automatically be added to this policy.
        groups:
          - test_group
        # The 'test-identity'
        identities:
          - "test-identity-1"
      # This authorization will match any policy with a /data/ resource prefix
      - policyResourcePattern: /data/.*
        # This authorization will be added both to "READ" and "WRITE" policies matching the resource pattern
        actions:
          - READ
          - WRITE
        # The test group will automatically be added to this policy.
        groups:
          - test_group
        # The "test-identity-1" will automatically be added to this policy
        identities:
          - "test-identity-1"
```

### Nifi Cluster SAML Integration

Each Nifi cluster will be configured to integrate with a SAML IDP to provide user access. The following information should be configured on the SAML IDP side (per cluster):

* **Application start URL**: https://nifi-0.< private_hosted_zone_name >:8443/nifi
* **Relay state URL**: https://nifi-0.< private_hosted_zone_name >:8443/nifi
* **Application ACS Url**: https://nifi-0.< private_hosted_zone_name >:8443/nifi-api/access/saml/login/consumer
* **Application SAML audience**: org:apache:nifi:saml:sp-< nifi-cluster-name >

'nifi-0' is the first cluster node and will always exist regardless of cluster node count.
