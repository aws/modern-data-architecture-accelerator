/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';

export type NodeSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | '2XLARGE';

/**
 * SAML Identity Provider configuration for NiFi authentication.
 *
 * Defines SAML IdP settings for enterprise SSO integration with NiFi clusters.
 *
 * Use cases: Enterprise SSO integration; SAML authentication; Identity provider configuration
 *
 * AWS: NiFi SAML configuration for identity provider integration
 *
 * Validation: idpMetadataUrl must be a valid HTTPS URL
 */
export interface NifiSamlProps {
  /** SAML Identity Provider metadata URL. */
  readonly idpMetadataUrl: string;
}

/**
 * @jsii ignore
 */
/**
 * Named NiFi Registry client configuration mapping.
 *
 * Maps client names to NiFi Registry client connection settings for
 * flow versioning and template management.
 *
 * Use cases: Registry client organization; Multi-registry connectivity; Flow versioning
 *
 * AWS: NiFi Registry client configuration for flow version control
 *
 * Validation: Client names must be unique identifiers
 */
export interface NamedNifiRegistryClientProps {
  /**
   * @jsii ignore
   */
  [clientName: string]: NifiRegistryClientProps;
}
/**
 * NiFi Registry client connection configuration.
 *
 * Defines the URL for connecting to a NiFi Registry instance for
 * flow versioning and template management.
 *
 * Use cases: Flow versioning; Template management; Version control; Flow sharing
 *
 * AWS: NiFi Registry client URL for flow versioning integration
 *
 * Validation: url must be a valid URL string
 */
export interface NifiRegistryClientProps {
  /** NiFi Registry URL for flow versioning. */
  readonly url: string;
}

export interface NifiClusterOptions extends NifiIdentityAuthorizationOptions, NifiNetworkOptions {
  /** Number of nodes in the NiFi cluster. Defaults to 1. */
  readonly nodeCount?: number;
  /** Node compute size (SMALL, MEDIUM, LARGE, XLARGE, 2XLARGE). Defaults to SMALL. */
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
  /** Port for site-to-site RAW communication. Must be 1024-65535. */
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
  /** AWS managed policies for the NiFi cluster role. */
  readonly clusterRoleAwsManagedPolicies?: AwsManagedPolicySpec[];
  /** Customer managed policy ARNs for the NiFi cluster role. */
  readonly clusterRoleManagedPolicies?: string[];
  /**
   * @jsii ignore
   */
  readonly registryClients?: NamedNifiRegistryClientProps;
}
export interface NifiIdentityAuthorizationOptions {
  /** Admin identities with administrative privileges for NiFi cluster management. */
  readonly adminIdentities: string[];
  /** External node identities authorized to join the NiFi cluster. */
  readonly externalNodeIdentities?: string[];
  /** User identities authorized to access the NiFi cluster. */
  readonly identities?: string[];
  /** User groups mapped to member identity arrays for group-based access control. */
  readonly groups?: { [key: string]: string[] };
  /** NiFi access policies for resource-level permission management. */
  readonly policies?: NifiPolicy[];
  /** Authorization rules with pattern-based resource matching and multi-action permissions. */
  readonly authorizations?: NifiAuthorization[];
}

export interface NifiNetworkOptions {
  /** HTTPS port for the NiFi web interface and API. Must be 1024-65535. */
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
 * NiFi access policy definition for resource-level permission management.
 *
 * Defines a policy targeting a specific NiFi resource with a given action
 * for fine-grained access control.
 *
 * Use cases: Fine-grained access control; Resource-level permissions; Policy-based security
 *
 * AWS: NiFi access policy for EKS-based cluster resource authorization
 *
 * Validation: resource and action are required
 */
export interface NifiPolicy {
  /** NiFi resource identifier the policy applies to. */
  readonly resource: string;
  /** Policy action (READ, WRITE, or DELETE). */
  readonly action: PolicyAction;
}

/**
 * NiFi authorization rule with pattern-based resource matching and multi-action permissions.
 *
 * Defines authorization rules for NiFi resources using resource patterns for scalable
 * access control with identity and group assignments.
 *
 * Use cases: Pattern-based access control; Multi-action permissions; Group-based authorization
 *
 * AWS: NiFi authorization configuration for EKS-based cluster access control
 *
 * Validation: policyResourcePattern and actions required; identities and groups optional
 */
export interface NifiAuthorization {
  /** Resource pattern for matching NiFi resources. */
  readonly policyResourcePattern: string;
  /** Policy actions (READ, WRITE, DELETE) granted for matched resources. */
  readonly actions: PolicyAction[];
  /** User identities the authorization rule applies to. */
  readonly identities?: string[];
  /** User groups the authorization rule applies to. */
  readonly groups?: string[];
}

export type PolicyAction = 'READ' | 'WRITE' | 'DELETE';

/**
 * AWS managed policy specification with CDK Nag suppression reason.
 *
 * Defines an AWS managed policy name and the compliance justification
 * for using it with CDK Nag security controls.
 *
 * Use cases: AWS service access; Managed policy attachment; Compliance documentation
 *
 * AWS: IAM managed policy specification with CDK Nag suppression
 *
 * Validation: policyName and suppressionReason are required
 */
export interface AwsManagedPolicySpec {
  /** AWS managed policy name. */
  readonly policyName: string;
  /** CDK Nag suppression reason for compliance documentation. */
  readonly suppressionReason: string;
}
