/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { AuditHelper } from '@aws-caef/s3-audit-helper';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface AuditTrailProps {
    /**
 * The bucket name to which CloudTrail will be written
 */
    readonly cloudTrailAuditBucketName: string;
    /**
     * KMS Key which will be used to encrypt the CloudTrail when writing to S3
     */
    readonly cloudTrailAuditKmsKeyArn: string;
    /**
     * If true, management/control plane events will be included in trail.
     * Otherwise, only S3 Data Events will be included.
     */
    readonly includeManagementEvents?: boolean
}

export interface AuditTrailL3ConstructProps extends CaefL3ConstructProps {
    readonly trail: AuditTrailProps
}

export class AuditTrailL3Construct extends CaefL3Construct {
    protected readonly props: AuditTrailL3ConstructProps


    constructor( scope: Construct, id: string, props: AuditTrailL3ConstructProps ) {
        super( scope, id, props )
        this.props = props
        this.createAuditResources()
    }

    private createAuditResources () {

        const auditBucket = CaefBucket.fromBucketName( this, "audit-bucket", this.props.trail.cloudTrailAuditBucketName )
        const auditKmsKey = CaefKmsKey.fromKeyArn( this, "audit-kms-key", this.props.trail.cloudTrailAuditKmsKeyArn )

        const auditTrail = AuditHelper.createCloudTrail( this, auditBucket, auditKmsKey, this.props.naming, "s3-audit", this.props.trail.includeManagementEvents )
        NagSuppressions.addResourceSuppressions(
            auditTrail,
            [
                { id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
                { id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' }
            ],
            true
        );

    }
}
