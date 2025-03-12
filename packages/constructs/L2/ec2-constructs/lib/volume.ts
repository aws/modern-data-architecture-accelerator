/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from "@aws-mdaa/construct";
import { RemovalPolicy, Size } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Volume, VolumeProps, EbsDeviceVolumeType } from "aws-cdk-lib/aws-ec2";
import { NagSuppressions } from "cdk-nag";

/**
 * Properties for creating a Compliance EC2 instance
 */

export interface MdaaEC2VolumeProps extends MdaaConstructProps {
    /**
     * The Availability Zone in which to create the volume.
     */
    readonly availabilityZone: string;
    /**
     * Indicates whether the volume is auto-enabled for I/O operations.
     */
    readonly autoEnableIo?: boolean;
    /**
     * Indicates whether Amazon EBS Multi-Attach is enabled.
     */
    readonly enableMultiAttach?: boolean;
    /**
     * The customer-managed encryption key that is used to encrypt the Volume.
     */
    readonly encryptionKey: IMdaaKmsKey;
    /**
     * The number of I/O operations per second (IOPS) to provision for the volume.
     */
    readonly iops?: number;
    /**
     * The size of the volume, in GiBs.
     */
    readonly size?: Size;
    /**
     * The snapshot from which to create the volume.
     */
    readonly snapshotId?: string;
    /**
     * The value of the physicalName property of this resource.
     */
    readonly volumeName?: string;
    /**
     * The type of the volume.
     */
    readonly volumeType?: EbsDeviceVolumeType;

}

/**
 * A construct for creating a compliant EBS volume resource.
 * Specifically, the construct ensures that the EBS volume
 * is encrypted.
 */
export class MdaaEC2Volume extends Volume {

    private static setProps ( props: MdaaEC2VolumeProps ): VolumeProps {
        const overrideProps = {
            volumeName: props.naming.resourceName( props.volumeName ),
            removalPolicy: RemovalPolicy.RETAIN,
            encrypted: true,
        }
        const allProps = { ...props, ...overrideProps }
        return allProps
    }
    constructor( scope: Construct, id: string, props: MdaaEC2VolumeProps ) {
        super( scope, id, MdaaEC2Volume.setProps( props ) )

        NagSuppressions.addResourceSuppressions( this, [
            {
                id: 'NIST.800.53.R5-EC2EBSInBackupPlan',
                reason: 'MDAA does not enforce NIST.800.53.R5-EC2EBSInBackupPlan on EBS volume.',
            },
            {
                id: 'HIPAA.Security-EC2EBSInBackupPlan',
                reason: 'MDAA does not enforce HIPAA.Security-EC2EBSInBackupPlan on EBS volume.',
            },
            {
                id: 'PCI.DSS.321-EC2EBSInBackupPlan',
                reason: 'MDAA does not enforce PCI.DSS.321-EC2EBSInBackupPlan on EBS volume.',
            },
        ] );

        new MdaaParamAndOutput( this, {
            ...{
                resourceType: "volume",
                name: "id",
                value: this.volumeId
            }, ...props
        },scope )
        new MdaaParamAndOutput( this, {
            ...{
                resourceType: "volume",
                name: "az",
                value: this.availabilityZone
            }, ...props
        },scope )
    }
}
