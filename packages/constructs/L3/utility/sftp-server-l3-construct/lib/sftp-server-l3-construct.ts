/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefSFTPServer } from '@aws-caef/transfer-family-constructs';

import { CfnSecurityGroup, CfnEIP } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnServer } from 'aws-cdk-lib/aws-transfer';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface ServerProps {
    /**
     * ID of the VPC to which the server will be bound
     */
    readonly vpcId: string
    /**
     * IDs of the subnets on which the server will be hosted
     */
    readonly subnetIds: string[]
    /**
     * If specified, the SFTP server will be internet facing and allocated a public IP address.
     */
    readonly internetFacing?: boolean
    /**
     * List in CIDR ranges which will be permitted to connect via the server Security Group
     */
    readonly ingressCidrs: string[]
}
export interface SftpServerL3ConstructProps extends CaefL3ConstructProps {
    /**
     * The SFTP Server definition.
     */
    readonly server: ServerProps;
}

export class SftpServerL3Construct extends CaefL3Construct<SftpServerL3ConstructProps> {
    protected readonly server: CfnServer

    constructor( scope: Construct, id: string, props: SftpServerL3ConstructProps ) {
        super( scope, id, props );

        let elasticIp = undefined;

        // Create our Security Group
        let ingressRules: CfnSecurityGroup.IngressProperty[] = this.props.server.ingressCidrs.map( cidr => {
            return {
                ipProtocol: 'tcp',
                cidrIp: cidr,
                fromPort: 22,
                toPort: 22
            }
        } )
        const securityGroup = new CfnSecurityGroup( this, 'SFTPSecurityGroup', {
            groupName: props.naming.resourceName( 'security-group' ),
            groupDescription: `SFTP Transfer Service port 22`,
            vpcId: this.props.server.vpcId,
            securityGroupIngress: ingressRules
        } )

        // Create our role to permit the SFTP server to create logs
        const loggingRole = new CaefRole( this, 'TransferServerSFTPLoggingRole', {
            naming: props.naming,
            roleName: 'logging-role',
            assumedBy: new ServicePrincipal( 'transfer.amazonaws.com' ),
            createOutputs: false,
            createParams: false
        } )

        if ( this.props.server.internetFacing === true ) {
            elasticIp = new CfnEIP( this, 'EIP', {
                domain: this.props.server.vpcId
            } )
        }

        const SFTPServerProps =
        {
            naming: props.naming,
            vpcId: this.props.server.vpcId,
            addressAllocationIds: ( this.props.server.internetFacing === true ) ? [ elasticIp!.attrAllocationId ] : undefined,
            securityGroupId: securityGroup.attrGroupId,
            subnetIds: this.props.server.subnetIds,
            loggingRole: loggingRole
        }

        // Build our SFTP server!
        this.server = new CaefSFTPServer( this, 'SFTPServer', SFTPServerProps )

        // Grant logging role access to the server's cloudwatch log groups
        const cloudwatchPolicyStatement = new PolicyStatement( {
            effect: Effect.ALLOW,
            actions: [
                "logs:CreateLogStream",
                "logs:DescribeLogStreams",
                "logs:CreateLogGroup",
                "logs:PutLogEvents"
            ],
            resources: [
                `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:/aws/transfer/${ this.server.attrServerId }`,
                `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:/aws/transfer/${ this.server.attrServerId }/*`
            ]
        } )

        loggingRole.addToPolicy( cloudwatchPolicyStatement )

        NagSuppressions.addResourceSuppressions(
            loggingRole,
            [
                { id: 'AwsSolutions-IAM5', reason: 'Wildcard is for log stream names, which are not known at deployment time.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is specific to this server. Inline policy is appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Role is specific to this server. Inline policy is appropriate.' }
            ],
            true
        );

    }
}
