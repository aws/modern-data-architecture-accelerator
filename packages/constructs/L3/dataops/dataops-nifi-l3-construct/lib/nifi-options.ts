/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';

export type NodeSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | '2XLARGE';

/**
 * Q-ENHANCED-INTERFACE
 * NiFi configuration interface for data flow orchestration and processing.
 *
 * Use cases: Data flow orchestration; Event-driven processing; Data routing; Flow management
 *
 * AWS: Apache NiFi configuration for data flow orchestration and event-driven processing
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Apache NiFi and MDAA requirements
 */
export interface NifiSamlProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SAML Identity Provider metadata URL for NiFi authentication configuration enabling enterprise SSO integration. Specifies the URL from which NiFi will retrieve SAML metadata for identity provider configuration and user authentication in enterprise environments.
   *
   * Use cases: Enterprise SSO integration; SAML authentication; Identity provider configuration; User authentication
   *
   * AWS: NiFi SAML configuration for identity provider integration and enterprise authentication
   *
   * Validation: Must be valid HTTPS URL string; required for SAML authentication and identity provider integration
   **/
  readonly idpMetadataUrl: string;
}

/**
 * @jsii ignore
 */
/**
 * Q-ENHANCED-INTERFACE
 * NiFi Registry configuration interface for flow versioning and template management.
 *
 * Use cases: Data flow orchestration; Event-driven processing; Data routing; Flow management
 *
 * AWS: Apache NiFi configuration for data flow orchestration and event-driven processing
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Apache NiFi and MDAA requirements
 */
export interface NamedNifiRegistryClientProps {
  /**
   * @jsii ignore
   */
  [clientName: string]: NifiRegistryClientProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * NiFi Registry configuration interface for flow versioning and template management.
 *
 * Use cases: Data flow orchestration; Event-driven processing; Data routing; Flow management
 *
 * AWS: Apache NiFi configuration for data flow orchestration and event-driven processing
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Apache NiFi and MDAA requirements
 */
export interface NifiRegistryClientProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required NiFi Registry URL for flow versioning and template management enabling centralized flow version control. Specifies the URL of the NiFi Registry instance for storing, versioning, and managing NiFi flow templates and process group configurations.
   *
   * Use cases: Flow versioning; Template management; Version control; Flow sharing
   *
   * AWS: NiFi Registry URL for flow versioning and template management integration
   *
   * Validation: Must be valid URL string; required for NiFi Registry integration and flow version control
   **/
  readonly url: string;
}

export interface NifiClusterOptions extends NifiIdentityAuthorizationOptions, NifiNetworkOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Initial number of nodes in the Apache NiFi cluster for distributed data processing and high availability. Configures the cluster size for horizontal scaling, load distribution, and fault tolerance enabling parallel data flow processing across multiple NiFi instances.
   *
   * Use cases: Horizontal scaling; High availability; Load distribution; Performance optimization; Fault tolerance
   *
   * AWS: EKS deployment replica count for NiFi StatefulSet pods in the cluster
   *
   * Validation: Must be positive integer; defaults to 1 for single-node deployment; recommended 3+ for production clusters
   **/
  readonly nodeCount?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Size of the Apache NiFi cluster nodes determining compute resources and processing capacity for data flow operations. Configures the EC2 instance type equivalent for NiFi pods affecting memory, CPU, and throughput capabilities for data processing workloads and flow management.
   *
   * Use cases: Performance tuning; Resource allocation; Cost optimization; Workload sizing; Processing capacity planning
   *
   * AWS: EKS pod resource requests and limits corresponding to EC2 instance types for NiFi containers
   *
   * Validation: Must be one of: SMALL, MEDIUM, LARGE, XLARGE, 2XLARGE; defaults to SMALL for basic workloads
   *   **/
  readonly nodeSize?: NodeSize;

  /**
   * The tag of the Nifi docker image to use. If not specified,
   * defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull
   * the latest version (might be untested).
   */
  readonly nifiImageTag?: string;
  /**
   * The configuration required to configure the Nifi cluster to use a SAML identity provider
   */
  readonly saml: NifiSamlProps;
  /**
   * Q-ENHANCED-PROPERTY
   * The port on which the cluster remote RAW interfaces will listen for site-to-site communication and data transfer. Configures the port for NiFi's site-to-site protocol enabling secure data transfer between NiFi instances, remote process groups, and external systems for distributed data flow management.
   *
   * Use cases: Site-to-site communication; Remote data transfer; Inter-cluster connectivity; External system integration; Distributed data flows
   *
   * AWS: EKS service port configuration for NiFi site-to-site communication and load balancer target port
   *
   * Validation: Must be valid port number between 1024-65535; used for RAW socket communication protocol
   **/
  readonly remotePort?: number;
  /**
   * The port on which the internal cluster communications will occur
   */
  readonly clusterPort?: number;
  /**
   * Egress rules to be added to all Nifi cluster security groups.
   * These may also be specified globally.
   */
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * AWS managed policies which will be granted to the NiFi cluster role for access to AWS services enabling integration with AWS data services. Defines AWS-managed IAM policies that provide the NiFi cluster with necessary permissions for accessing S3, DynamoDB, and other AWS services for data processing workflows.
   *
   * Use cases: AWS service integration; S3 data access; DynamoDB connectivity; AWS service permissions; Data pipeline integration
   *
   * AWS: AWS IAM managed policies attached to EKS service account role for NiFi cluster
   *
   * Validation: Must be valid AwsManagedPolicySpec array with valid AWS managed policy names; optional array for AWS service access
   *   **/
  readonly clusterRoleAwsManagedPolicies?: AwsManagedPolicySpec[];
  /**
   * Q-ENHANCED-PROPERTY
   * Customer managed policies which will be granted to the NiFi cluster role for access to AWS services enabling custom permission configurations. Defines customer-managed IAM policies that provide the NiFi cluster with specific custom permissions for accessing AWS resources and services based on organizational requirements.
   *
   * Use cases: Custom AWS permissions; Organization-specific access; Custom resource access; Tailored security policies; Custom service integration
   *
   * AWS: Customer-managed IAM policies attached to EKS service account role for NiFi cluster
   *
   * Validation: Must be valid policy ARN strings for customer-managed policies; optional array for custom permissions
   **/
  readonly clusterRoleManagedPolicies?: string[];
  /**
   * @jsii ignore
   */
  readonly registryClients?: NamedNifiRegistryClientProps;
}
export interface NifiIdentityAuthorizationOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of admin identities for NiFi cluster administration enabling administrative access and cluster management. Specifies user identities or distinguished names that have administrative privileges for NiFi cluster configuration, user management, and system administration.
   *
   * Use cases: Administrative access; Cluster management; User administration; System configuration
   *
   * AWS: NiFi admin identities for EKS-based cluster administration and management
   *
   * Validation: Must be array of valid identity strings; required for cluster administration and management access
   **/
  readonly adminIdentities: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional external node identities for Apache NiFi cluster configuration defining trusted external nodes that can participate in the NiFi cluster. Specifies identity certificates or distinguished names for external NiFi nodes that are authorized to join the cluster for distributed data processing and flow management.
   *
   * Use cases: Multi-cluster connectivity; External node integration; Distributed NiFi deployment; Cross-cluster communication
   *
   * AWS: Apache NiFi on EKS external node identity configuration for cluster membership and security
   *
   * Validation: Must be array of valid identity strings if provided; enables external node authorization when specified
   **/
  readonly externalNodeIdentities?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of user identities for NiFi cluster access enabling user-level access control and authentication. Specifies user identities or distinguished names that are authorized to access the NiFi cluster for data flow development and management operations.
   *
   * Use cases: User access control; Authentication management; User authorization; Access control
   *
   * AWS: NiFi user identities for EKS-based cluster access control and authentication
   *
   * Validation: Must be array of valid identity strings if provided; enables user access control when specified
   **/
  readonly identities?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional user groups configuration for NiFi cluster access control enabling group-based permission management. Defines user groups with member lists for organized access control and simplified permission management in NiFi cluster environments.
   *
   * Use cases: Group-based access; Permission management; Organized access control; User group management
   *
   * AWS: NiFi user groups for EKS-based cluster group access control and permission management
   *
   * Validation: Must be valid group name to member array mapping if provided; enables group-based access control when specified
   *   **/
  readonly groups?: { [key: string]: string[] };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional NiFi policies for fine-grained access control enabling resource-level permission management. Defines access policies for NiFi resources including processors, process groups, and system resources for detailed authorization and security control.
   *
   * Use cases: Fine-grained access control; Resource-level permissions; Policy-based security; Authorization management
   *
   * AWS: NiFi access policies for EKS-based cluster resource access control and authorization
   *
   * Validation: Must be array of valid NifiPolicy objects if provided; enables fine-grained access control when specified
   *   **/
  readonly policies?: NifiPolicy[];
  /**
   * Q-ENHANCED-PROPERTY
   * Authorization configurations for Apache NiFi access control defining user and group permissions for NiFi resources. Specifies authorization rules including resource access permissions, user privileges, and group-based access control for secure NiFi cluster operation and data flow management.
   *
   * Use cases: User access control; Resource permissions; Group-based authorization; Security policy enforcement; NiFi cluster security
   *
   * AWS: Apache NiFi on EKS authorization configuration for access control and security management
   *
   * Validation: Must be valid NifiAuthorization array with proper resource and permission specifications; optional array for authorization rules
   *   **/
  readonly authorizations?: NifiAuthorization[];
}

export interface NifiNetworkOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * The port on which the cluster HTTPS interfaces will listen for secure web-based access to the Apache NiFi cluster. Configures the HTTPS port for the NiFi web interface, API access, and secure cluster communication enabling encrypted access to the NiFi management console and REST API endpoints.
   *
   * Use cases: Secure web access; API connectivity; Management console access; Encrypted communication; Custom port configuration
   *
   * AWS: EKS service port configuration for NiFi HTTPS interface and load balancer target port
   *
   * Validation: Must be valid port number between 1024-65535; defaults to standard HTTPS port if not specified
   **/
  readonly httpsPort?: number;

  /**
   * Security groups which will be provided ingress access to the Nifi cluster security group.
   * These may also be specified globally.
   */
  readonly securityGroupIngressSGs?: string[];
  /**
   * IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
   * These may also be specified globally.
   */
  readonly securityGroupIngressIPv4s?: string[];
  /**
   * Security groups which will be provided ingress access to the Nifi cluster EFS security group.
   * These may also be specified globally.
   */
  readonly additionalEfsIngressSecurityGroupIds?: string[];
}
/**
 * Q-ENHANCED-INTERFACE
 * NifiPolicy interface.
 *
 * Use cases: Data flow orchestration; Event-driven processing; Data routing; Flow management
 *
 * AWS: Apache NiFi configuration for data flow orchestration and event-driven processing
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Apache NiFi and MDAA requirements
 */
export interface NifiPolicy {
  /**
   * Q-ENHANCED-PROPERTY
   * Required resource identifier for NiFi policy targeting enabling specific resource access control. Specifies the NiFi resource (processor, process group, system resource) that the policy applies to for fine-grained access control and security management.
   *
   * Use cases: Resource targeting; Access control; Security management; Policy specification
   *
   * AWS: NiFi resource identifier for policy-based access control and authorization
   *
   * Validation: Must be valid NiFi resource identifier string; required for policy targeting and access control
   **/
  readonly resource: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required policy action specification for NiFi resource access control enabling permission-level security management. Defines the specific action (read, write, delete, etc.) that the policy grants or denies for the specified resource.
   *
   * Use cases: Permission specification; Action control; Security management; Access authorization
   *
   * AWS: NiFi policy action for resource access control and permission management
   *
   * Validation: Must be valid PolicyAction enum value; required for policy action specification and access control
   *   **/
  readonly action: PolicyAction;
}

/**
 * Q-ENHANCED-INTERFACE
 * NiFi authorization configuration interface for access control with pattern-based resource matching and multi-action permissions. Defines authorization rules for NiFi resources including resource pattern matching, action permissions, and identity/group assignments for flexible and scalable access control management.
 *
 * Use cases: Pattern-based access control; Multi-action permissions; Identity authorization; Group-based access
 *
 * AWS: NiFi authorization configuration for EKS-based cluster access control and security management
 *
 * Validation: policyResourcePattern and actions are required; identities and groups are optional
 */
export interface NifiAuthorization {
  /**
   * Q-ENHANCED-PROPERTY
   * Required policy resource pattern for NiFi authorization targeting enabling pattern-based resource access control. Specifies a resource pattern that matches multiple NiFi resources for scalable and flexible authorization rule application across similar resources.
   *
   * Use cases: Pattern-based targeting; Scalable authorization; Resource matching; Flexible access control
   *
   * AWS: NiFi resource pattern for authorization rule targeting and access control
   *
   * Validation: Must be valid NiFi resource pattern string; required for authorization targeting and access control
   **/
  readonly policyResourcePattern: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of policy actions for NiFi authorization enabling multi-action permission specification. Defines the specific actions (read, write, delete) that the authorization rule grants for the matched resources providing permission control.
   *
   * Use cases: Multi-action permissions; access control; Permission specification; Action authorization
   *
   * AWS: NiFi policy actions for authorization rule permission specification and access control
   *
   * Validation: Must be array of valid PolicyAction enum values; required for authorization permission specification
   *   **/
  readonly actions: PolicyAction[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of user identities for NiFi authorization enabling user-specific access control. Specifies user identities that the authorization rule applies to for individual user access control and permission management.
   *
   * Use cases: User-specific access; Individual permissions; Identity-based authorization; User access control
   *
   * AWS: NiFi user identities for authorization rule application and user access control
   *
   * Validation: Must be array of valid identity strings if provided; enables user-specific authorization when specified
   **/
  readonly identities?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of user groups for NiFi authorization enabling group-based access control. Specifies user groups that the authorization rule applies to for organized group access control and simplified permission management.
   *
   * Use cases: Group-based access; Organized permissions; Group authorization; Simplified management
   *
   * AWS: NiFi user groups for authorization rule application and group access control
   *
   * Validation: Must be array of valid group name strings if provided; enables group-based authorization when specified
   **/
  readonly groups?: string[];
}

export type PolicyAction = 'READ' | 'WRITE' | 'DELETE';

/**
 * Q-ENHANCED-INTERFACE
 * AwsManagedPolicySpec interface.
 *
 * Use cases: Data flow orchestration; Event-driven processing; Data routing; Flow management
 *
 * AWS: Apache NiFi configuration for data flow orchestration and event-driven processing
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Apache NiFi and MDAA requirements
 */
export interface AwsManagedPolicySpec {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS managed policy name for NiFi cluster IAM permissions enabling AWS service access and integration. Specifies the name of the AWS managed policy that will be attached to the NiFi cluster service account for accessing AWS services and resources.
   *
   * Use cases: AWS service access; Managed policy attachment; Service integration; Permission management
   *
   * AWS: AWS IAM managed policy name for NiFi cluster service account permissions
   *
   * Validation: Must be valid AWS managed policy name string; required for policy attachment and service access
   **/
  readonly policyName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required suppression reason for CDK Nag compliance enabling security control exception documentation. Provides justification for using AWS managed policies in compliance with security controls and audit requirements for transparent security exception management.
   *
   * Use cases: Compliance documentation; Security exception justification; Audit requirements; Control suppression
   *
   * AWS: CDK Nag suppression reason for AWS managed policy usage compliance
   *
   * Validation: Must be descriptive suppression reason string; required for compliance and audit documentation
   **/
  readonly suppressionReason: string;
}
