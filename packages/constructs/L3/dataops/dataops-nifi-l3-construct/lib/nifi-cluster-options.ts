/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';

export type NodeSize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "2XLARGE"

export interface AutomaticNifiAuthorizations {
    /**
     * Nifi Nodes (from clusters created by this construct) will be automatically added to policies matching these patterns 
     */
    readonly clusterNodePolicyPatterns?: string[]
    /**
     * External Nifi Nodes (not created by this construct) will be automatically added to policies matching these patterns 
     */
    readonly externalNodePolicyPatterns?: string[]
    /**
     * Users (from userIdentities) will be automatically added to policies matching these patterns 
     */
    readonly userPolicyPatterns?: string[]
    /**
     * Admins (initialAdminIdentity and additionalAdminIdentities) will be automatically added to policies matching these patterns 
     */
    readonly adminPolicyPatterns?: string[]
}

export interface NifiSamlProps {
    /**
     * URL from which the IDP SAML Metadata is available.
     */
    readonly idpMetadataUrl: string
}

export interface NifiClusterOptions {
    /**
     * Initial number of nodes in the cluster.
     * Defaults to 1.
     */
    readonly nodeCount?: number

    /**
     * Size of the Nifi cluster nodes. 
     * Defaults to SMALL.
     */
    readonly nodeSize?: NodeSize

    /**
     * The tag of the Nifi docker image to use. If not specified,
     * defaults to the latest tested version (currently 1.23.2). Specify 'latest' to pull
     * the latest version (might be untested).
     */
    readonly nifiImageTag?: string

    /**
     * Initial Nifi admin identity. If using SAML, this should match the admin SAML identity.
     * If not using SAML, a local user with this name will be created and a password stored in AWS Secrets Manager
     */
    readonly initialAdminIdentity: string
    /**
     * If specified, the Nifi cluster will be configured to use a SAML identity provider
     */
    readonly saml?: NifiSamlProps

    /**
     * The port on which the cluster HTTPS interfaces will listen
     */
    readonly httpsPort?: number
    /**
     * The port on which the cluster remote RAW interfaces will listen
     */
    readonly remotePort?: number
    /**
     * The port on which the internal cluster communications will occur
     */
    readonly clusterPort?: number

    /**
     * Egress rules to be added to all Nifi cluster security groups.
     * These may also be specified globally.
     */
    readonly nifiSecurityGroupEgressRules?: CaefSecurityGroupRuleProps

    /**
     * Security groups which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly nifiSecurityGroupIngressSGs?: string[]

    /**
     * IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly nifiSecurityGroupIngressIPv4s?: string[]

    /**
     * Security groups which will be provided ingress access to the Nifi cluster EFS security group.
     * These may also be specified globally.
     */
    readonly additionalEfsIngressSecurityGroupIds?: string[]
    /**
     * External nodes which will be granted remote access (by TLS certificate common name).
     * Note that these nodes will also need to be granted security group access via 'nifiSecurityGroupIngressSGs' or 'nifiSecurityGroupIngressIPv4s'
     */
    readonly externalNodeIdentities?: string[]
    /**
     * AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly clusterRoleAwsManagedPolicies?: AwsManagedPolicySpec[]
    /**
     * Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly clusterRoleManagedPolicies?: string[]
    /**
     * Authorized registry user identities to be pre-created. These users will not have any permissions by default, unless
     * policy patterns are specified in autoAddNifiAuthorizations.userPolicyPatterns
     */
    readonly userIdentities?: string[]
    /**
     * Authorized registry admin identities to be pre-created. These admins will not have any permissions by default, unless
     * policy patterns are specified in autoAddNifiAuthorizations.adminPolicyPatterns
     */
    readonly additionalAdminIdentities?: string[]
    /**
     * Policy patterns for automatically adding authorizations for nifi nodes (from clusters in this construct), external nifi nodes (provisioned outside of this construct),
     * admins (both initialAdminIdentity and additionalAdminIdentities), as well as userIdentities
     */
    readonly autoAddNifiAuthorizations?: AutomaticNifiAuthorizations
}

export interface AwsManagedPolicySpec {
    /**
     * Name of the AWS Managed Policy
     */
    readonly policyName: string,
    /**
     * A suppression reason to be recorded in order to suppress AWSSolutions-IAM4
     */
    readonly suppressionReason: string
}