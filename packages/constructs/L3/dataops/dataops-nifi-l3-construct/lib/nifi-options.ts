/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';

export type NodeSize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "2XLARGE"

export interface NifiSamlProps {
    /**
     * URL from which the IDP SAML Metadata is available.
     */
    readonly idpMetadataUrl: string
}

/**
 * @jsii ignore
 */
export interface NamedNifiRegistryClientProps { 
    /**
     * @jsii ignore
     */
    [ clientName: string ]: NifiRegistryClientProps 
}

export interface NifiRegistryClientProps {
    readonly url: string
}

export interface NifiClusterOptions extends NifiIdentityAuthorizationOptions, NifiNetworkOptions {
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
     * The configuration required to configure the Nifi cluster to use a SAML identity provider
     */
    readonly saml: NifiSamlProps

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
    readonly securityGroupEgressRules?: CaefSecurityGroupRuleProps

    /**
     * AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly clusterRoleAwsManagedPolicies?: AwsManagedPolicySpec[]
    /**
     * Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly clusterRoleManagedPolicies?: string[]
    /**
     * @jsii ignore
     */
    readonly registryClients?: NamedNifiRegistryClientProps

}
export interface NifiIdentityAuthorizationOptions {

    readonly adminIdentities: string[]
    readonly externalNodeIdentities?: string[]
    readonly identities?: string[]
    readonly groups?: { [ key: string ]: string[] }
    readonly policies?: NifiPolicy[]
    readonly authorizations?: NifiAuthorization[]

}

export interface NifiNetworkOptions {
    /**
     * The port on which the cluster HTTPS interfaces will listen
     */
    readonly httpsPort?: number

    /**
     * Security groups which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly securityGroupIngressSGs?: string[]

    /**
     * IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly securityGroupIngressIPv4s?: string[]

    /**
     * Security groups which will be provided ingress access to the Nifi cluster EFS security group.
     * These may also be specified globally.
     */
    readonly additionalEfsIngressSecurityGroupIds?: string[]
}

export interface NifiPolicy {
    readonly resource: string
    readonly action: PolicyAction
}

export interface NifiAuthorization {
    readonly policyResourcePattern: string
    readonly actions: PolicyAction[]
    readonly identities?: string[]
    readonly groups?: string[]
}

export type PolicyAction = 'READ' | 'WRITE' | 'DELETE'

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