/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from "@aws-mdaa/construct"
import { Token } from "aws-cdk-lib"
import { CfnSecurityGroupEgress, CfnSecurityGroupIngress, IPeer, IVpc, Peer, Port, PortProps, Protocol, SecurityGroup, SecurityGroupProps } from "aws-cdk-lib/aws-ec2"
import { NagSuppressions } from "cdk-nag"
import { Construct } from "constructs"

export interface MdaaSecurityGroupRuleProps {
    readonly ipv4?: MdaaCidrPeer[]
    readonly sg?: MdaaSecurityGroupPeer[]
    readonly prefixList?: MdaaPrefixListPeer[]
}

export interface NagSuppressionProps {
    readonly id: string
    readonly reason: string
}

export interface MdaaPeer {
    readonly port?: number
    readonly toPort?: number
    readonly protocol: string
    readonly description?: string
    readonly suppressions?: NagSuppressionProps[]
}

export interface MdaaPrefixListPeer extends MdaaPeer {
    readonly prefixList: string
}

export interface MdaaCidrPeer extends MdaaPeer {
    readonly cidr: string
}

export interface MdaaSecurityGroupPeer extends MdaaPeer {
    readonly sgId: string
}

export interface MdaaSecurityGroupProps extends MdaaConstructProps {
    /**
     * The name of the security group. For valid values, see the GroupName
     * parameter of the CreateSecurityGroup action in the Amazon EC2 API
     * Reference.
     *
     * It is not recommended to use an explicit group name.
     *
     * @default If you don't specify a GroupName, AWS CloudFormation generates a
     * unique physical ID and uses that ID for the group name.
     */
    readonly securityGroupName?: string;

    /**
     * A description of the security group.
     *
     * @default The default name will be the construct's CDK path.
     */
    readonly description?: string;
    /**
     * The VPC in which to create the security group.
     */
    readonly vpc: IVpc;
    /**
     * Whether to allow all outbound traffic by default.
     *
     * If this is set to true, there will only be a single egress rule which allows all
     * outbound traffic. If this is set to false, no outbound traffic will be allowed by
     * default and all egress traffic must be explicitly authorized.
     *
     * To allow all ipv6 traffic use allowAllIpv6Outbound
     *
     * @default false
     */
    readonly allowAllOutbound?: boolean;
    /**
     * Whether to allow all outbound ipv6 traffic by default.
     *
     * If this is set to true, there will only be a single egress rule which allows all
     * outbound ipv6 traffic. If this is set to false, no outbound traffic will be allowed by
     * default and all egress ipv6 traffic must be explicitly authorized.
     *
     * To allow all ipv4 traffic use allowAllOutbound
     *
     * @default false
     */
    readonly allowAllIpv6Outbound?: boolean;
    /**
     * Whether to disable inline ingress and egress rule optimization.
     *
     * If this is set to true, ingress and egress rules will not be declared under the
     * SecurityGroup in cloudformation, but will be separate elements.
     *
     * Inlining rules is an optimization for producing smaller stack templates. Sometimes
     * this is not desirable, for example when security group access is managed via tags.
     *
     * The default value can be overriden globally by setting the context variable
     * '@aws-cdk/aws-ec2.securityGroupDisableInlineRules'.
     *
     * @default false
     */
    readonly disableInlineRules?: boolean;
    readonly ingressRules?: MdaaSecurityGroupRuleProps
    readonly egressRules?: MdaaSecurityGroupRuleProps
    readonly addSelfReferenceRule?: boolean

}

/**
 * MDAA L2 Security Group. Provides a simplified interface for SG rules creation
 */
export class MdaaSecurityGroup extends SecurityGroup {

    private static setProps ( props: MdaaSecurityGroupProps ): SecurityGroupProps {

        const overrideProps = {
            //Invert the default for allowAllOutbound
            allowAllOutbound: props.allowAllOutbound ?? false,
            securityGroupName: props.naming.resourceName( props.securityGroupName )
        }
        const allProps = { ...props, ...overrideProps }
        return allProps
    }


    constructor( scope: Construct, id: string, props: MdaaSecurityGroupProps ) {
        super( scope, id, MdaaSecurityGroup.setProps( props ) )

        // Add Ingress rules
        props.ingressRules?.ipv4?.forEach( rule => {
            const peer = Peer.ipv4( rule.cidr )
            this.addSuppressableIngressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )
        props.ingressRules?.sg?.forEach( rule => {
            const peer = Peer.securityGroupId( rule.sgId )
            this.addSuppressableIngressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )
        props.ingressRules?.prefixList?.forEach( rule => {
            const peer = Peer.prefixList( rule.prefixList )
            this.addSuppressableIngressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )
        // Add Egress rules
        props.egressRules?.ipv4?.forEach( rule => {
            const peer = Peer.ipv4( rule.cidr )
            this.addSuppressableEgressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )
        props.egressRules?.sg?.forEach( rule => {
            const peer = Peer.securityGroupId( rule.sgId )
            this.addSuppressableEgressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )
        props.egressRules?.prefixList?.forEach( rule => {
            const peer = Peer.prefixList( rule.prefixList )
            this.addSuppressableEgressRule( peer, MdaaSecurityGroup.resolvePeerToPort( rule ), rule.description, false, rule.suppressions );
        } )

        // Allow all tcp connections from the same security group
        if ( props.addSelfReferenceRule != undefined && props.addSelfReferenceRule ) {
            const suppressions = [ {
                id: "NIST.800.53.R5-EC2RestrictedCommonPorts",
                reason: "Ingress/Egress is limited to this security group"
            },
            {
                id: "HIPAA.Security-EC2RestrictedCommonPorts",
                reason: "Ingress/Egress is limited to this security group"
            } ,
            {
                id: "PCI.DSS.321-EC2RestrictedCommonPorts",
                reason: "Ingress/Egress is limited to this security group"
            } ]
            this.addSuppressableIngressRule( this, Port.allTraffic(), `Self-Ref`, false, suppressions );
            //Only add self ref egress rule if all outbound traffic is not otherwise allowed
            if ( !props.allowAllOutbound ) {
                this.addSuppressableEgressRule( this, Port.allTraffic(), `Self-Ref`, false, suppressions );
            }
        }

        new MdaaParamAndOutput( this, {
            naming: props.naming,
            resourceType: "security-group",
            resourceId: props.securityGroupName,
            name: "id",
            value: this.securityGroupId
        },scope )

    }

    public addSuppressableIngressRule ( peer: IPeer, connection: Port, description?: string, remoteRule?: boolean, suppressions?: NagSuppressionProps[] ) {
        if ( description === undefined ) {
            description = `from ${ peer.uniqueId }:${ connection }`;
        }

        const { scope, id } = this.determineRuleScope( peer, connection, 'from', remoteRule );

        // Skip duplicates
        if ( scope.node.tryFindChild( id ) === undefined ) {
            const ingress = new CfnSecurityGroupIngress( scope, id, {
                groupId: this.securityGroupId,
                ...peer.toIngressRuleConfig(),
                ...connection.toRuleJson(),
                description,
            } );
            if ( suppressions ) {
                NagSuppressions.addResourceSuppressions( ingress, suppressions, true )
            }
        }
    }

    public addSuppressableEgressRule ( peer: IPeer, connection: Port, description?: string, remoteRule?: boolean, suppressions?: NagSuppressionProps[] ) {
        if ( description === undefined ) {
            description = `to ${ peer.uniqueId }:${ connection }`;
        }

        const { scope, id } = this.determineRuleScope( peer, connection, 'to', remoteRule );

        // Skip duplicates
        if ( scope.node.tryFindChild( id ) === undefined ) {
            const egress = new CfnSecurityGroupEgress( scope, id, {
                groupId: this.securityGroupId,
                ...peer.toEgressRuleConfig(),
                ...connection.toRuleJson(),
                description,
            } );
            if ( suppressions ) {
                NagSuppressions.addResourceSuppressions( egress, suppressions, true )
            }
        }
    }

    public static resolvePeerToPort ( peer: MdaaPeer ): Port {
        const protocol: Protocol = ( <any>Protocol )[ peer.protocol.toUpperCase() ]
        if ( typeof protocol === undefined || protocol == undefined ) {
            throw new Error( `Unknown protocol defined: ${ peer.protocol }` )
        }
        const fromPort = peer.port
        const toPort = peer.toPort || fromPort

        let stringRepresentation = `${ protocol.toString() }`
        if ( protocol == Protocol.ALL ) {
            stringRepresentation = `${ stringRepresentation } ALL TRAFFIC`
        } else {
            if ( fromPort && toPort ) {
                if ( toPort == fromPort ) {
                    stringRepresentation = `${ stringRepresentation } PORT ${ this.renderPort( fromPort ) }`
                } else {
                    stringRepresentation = `${ stringRepresentation } RANGE ${ this.renderPort( fromPort ) }-${ this.renderPort( toPort ) }`
                }
            } else {
                throw new Error( "Port must be specified if protocol is not 'ALL'" )
            }
        }
        const portProps: PortProps = {
            protocol: protocol,
            fromPort: fromPort,
            toPort: toPort,
            stringRepresentation: stringRepresentation
        }
        return new Port( portProps )
    }
    public static renderPort ( port: number ) {
        return Token.isUnresolved( port ) ? '{IndirectPort}' : port.toString();
    }

    public static mergeRules ( rules1: MdaaSecurityGroupRuleProps, rules2: MdaaSecurityGroupRuleProps ): MdaaSecurityGroupRuleProps {
        return {
            sg: [
                ...rules1.sg || [], ...rules2.sg || []
            ],
            ipv4: [
                ...rules1.ipv4 || [], ...rules2.ipv4 || []
            ],
            prefixList: [
                ...rules1.prefixList || [], ...rules2.prefixList || []
            ]
        }
    }
}
