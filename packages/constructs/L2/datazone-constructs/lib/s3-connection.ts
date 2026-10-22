/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Aws } from 'aws-cdk-lib';
import { CfnConnection, CfnConnectionProps } from 'aws-cdk-lib/aws-datazone';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface MdaaDatazoneS3ConnectionProps extends MdaaConstructProps {
  /** Name used to generate the DataZone connection's resource name. */
  readonly name: string;
  /** DataZone domain ID in which the connection is created. */
  readonly domainIdentifier: string;
  /** DataZone project ID that will own the connection. */
  readonly projectIdentifier: string;
  /**
   * DataZone environment ID in which the connection is created.
   * Required for SMUS (SageMaker Unified Studio) projects; omit for DataZone (non-SMUS) projects.
   */
  readonly environmentIdentifier?: string;
  /**
   * Name of the S3 bucket to register as the connection's data source. Accepts a literal
   * bucket name or an MDAA `ssm-org:`/`ssm-domain:` reference to a bucket created by another
   * module (e.g. `ssm-org:/shared/datalake/bucket/research/name`).
   */
  readonly bucketName: string;
  /**
   * Key prefix within the bucket to register, e.g. `raw/`. Registers the whole bucket when
   * omitted.
   *
   * @default ''
   */
  readonly prefix?: string;
  /**
   * Whether to register an S3 Access Grants location for the connection. This is an
   * additional, optional governance layer on top of `grantReadRoleArn` (below), which is
   * MDAA's default, unconditional access control for this construct. When enabled, SageMaker
   * Unified Studio registers the S3 Access Grants location itself — creating an S3 Access
   * Grants instance first if none exists in the account/region — which requires
   * `s3:CreateAccessGrantsLocation`, `s3:CreateAccessGrant`, and related Access Grants
   * permissions on the caller. MDAA does not grant these permissions to any role, so enabling
   * this flag only works if that caller already has them from outside this construct.
   */
  readonly registerS3AccessGrantLocation?: boolean;
  /** S3 Access Grants location ID to associate with the connection. */
  readonly s3AccessGrantLocationId?: string;
  /**
   * ARN of an IAM role to grant read access (list + get object) on `bucketName`/`prefix`.
   * Typically the DataZone/SMUS project's environment user role. Unlike the Glue data source
   * path, DataZone does not grant Lake Formation permissions for a raw S3 connection, so this
   * is MDAA's default access-control mechanism for a raw S3 connection — both L3 callers
   * (sagemaker-project, dataops-project) always pass the project's environment role here,
   * matching the Glue path's always-on Lake Formation grant. `registerS3AccessGrantLocation`
   * above is an optional, additional layer on top of this, not a substitute for it.
   *
   * This grant alone cannot make objects readable on every bucket: it adds no KMS access (see
   * `kmsKeyArn` below), and it cannot override a bucket policy that denies access by default.
   * A bucket with a default-deny policy, such as an MDAA data lake bucket's `accessPolicies`,
   * must also list this role on its own policy for reads to actually succeed.
   */
  readonly grantReadRoleArn?: string;
  /**
   * ARN of the KMS key used to encrypt `bucketName`, if SSE-KMS. When set alongside
   * `grantReadRoleArn`, grants that role `kms:Decrypt` on this key, scoped to calls made
   * through the S3 service. Without this, `grantReadRoleArn` cannot decrypt objects in an
   * SSE-KMS bucket even though it can list and get them.
   */
  readonly kmsKeyArn?: string;
}

/**
 * Strips leading/trailing '/' characters from a string. Used instead of a regex (e.g.
 * `/^\/+|\/+$/g`) because an anchored `+` quantifier like that is flagged by security
 * scanners as super-linear-backtracking-prone; this loop is O(n) by construction with no
 * regex engine involved.
 */
function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === '/') {
    start++;
  }
  while (end > start && value[end - 1] === '/') {
    end--;
  }
  return value.slice(start, end);
}

/**
 * A construct which creates a DataZone Connection pointing at a raw S3 location,
 * allowing that location to be onboarded as a data source in a DataZone/SMUS project's data catalog.
 */
export class MdaaDatazoneS3Connection extends Construct {
  public readonly connection: CfnConnection;

  constructor(scope: Construct, id: string, props: MdaaDatazoneS3ConnectionProps) {
    super(scope, id);

    if (props.bucketName.includes('*') || props.bucketName.includes('?')) {
      throw new Error(
        `bucketName '${props.bucketName}' must not contain '*' or '?'; the IAM grant below would resolve to a ` +
          'wildcard resource covering every bucket in the account.',
      );
    }

    // Strip leading/trailing slashes so 'raw', '/raw', 'raw/' and '/raw/' all normalize to the
    // same 'raw/' key prefix; otherwise a leading slash produces an S3 URI/ARN that matches no
    // key, and a missing trailing slash grants siblings like 'raw-archive/' or 'rawdata/' too.
    const trimmedPrefix = trimSlashes(props.prefix ?? '');
    const keyPrefix = trimmedPrefix ? `${trimmedPrefix}/` : '';
    // Built from a plain template literal rather than Bucket.fromBucketName(), which validates
    // the bucket-name charset at synth time. An `ssm-org:`/`ssm-domain:`-sourced bucket name
    // resolves to a literal `{{resolve:ssm:...}}` CloudFormation dynamic reference (resolved by
    // CloudFormation at deploy time, not CDK at synth time), which fails that validation even
    // though it is a perfectly valid S3 URI/ARN component. A plain template literal handles both
    // a literal bucket name and this dynamic-reference text identically.
    const s3Uri = `s3://${props.bucketName}/${keyPrefix}`;

    const connectionProps: CfnConnectionProps = {
      domainIdentifier: props.domainIdentifier,
      projectIdentifier: props.projectIdentifier,
      environmentIdentifier: props.environmentIdentifier,
      name: props.naming.withResourceType(MdaaResourceType.DATAZONE_CONNECTION).resourceName(props.name, 64),
      props: {
        s3Properties: {
          s3Uri: s3Uri,
          registerS3AccessGrantLocation: props.registerS3AccessGrantLocation,
          s3AccessGrantLocationId: props.s3AccessGrantLocationId,
        },
      },
    };
    this.connection = new CfnConnection(this, 'connection', connectionProps);

    if (props.grantReadRoleArn) {
      const bucketArn = `arn:${Aws.PARTITION}:s3:::${props.bucketName}`;
      const objectArn = `arn:${Aws.PARTITION}:s3:::${props.bucketName}/${keyPrefix}*`;
      const role = Role.fromRoleArn(this, 'grant-role', props.grantReadRoleArn, { mutable: true });
      role.addToPrincipalPolicy(
        new PolicyStatement({
          actions: ['s3:GetObject*'],
          resources: [objectArn],
        }),
      );
      role.addToPrincipalPolicy(
        new PolicyStatement({
          actions: ['s3:GetBucketLocation'],
          resources: [bucketArn],
        }),
      );
      role.addToPrincipalPolicy(
        new PolicyStatement({
          actions: ['s3:ListBucket'],
          resources: [bucketArn],
          conditions: keyPrefix ? { StringLike: { 's3:prefix': [keyPrefix, `${keyPrefix}*`] } } : undefined,
        }),
      );
      if (props.kmsKeyArn) {
        role.addToPrincipalPolicy(
          new PolicyStatement({
            actions: ['kms:Decrypt'],
            resources: [props.kmsKeyArn],
            conditions: { StringEquals: { 'kms:ViaService': `s3.${Aws.REGION}.amazonaws.com` } },
          }),
        );
      }
      MdaaNagSuppressions.addCodeResourceSuppressions(
        role,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason:
              "GetObject* is a wildcard action scoped to the object ARN of this connection's own registered " +
              'bucket and prefix only (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html). ' +
              'GetBucketLocation and ListBucket are not wildcarded and ListBucket is further scoped to the ' +
              'registered prefix via an s3:prefix condition.',
            appliesTo: ['Action::s3:GetObject*', { regex: String.raw`/^Resource::.*\/\*$/` }],
          },
          {
            id: 'NIST.800.53.R5-IAMNoInlinePolicy',
            reason:
              "Inline policy is specific to this role and the single S3 location it's granted to read: the " +
              'grant is applied via role.addToPrincipalPolicy() on a role imported with Role.fromRoleArn(..., ' +
              '{ mutable: true }), which necessarily produces a role-scoped inline policy rather than a shared ' +
              "managed policy, and the policy intentionally targets only this connection's own bucket/prefix.",
          },
          {
            id: 'HIPAA.Security-IAMNoInlinePolicy',
            reason:
              "Inline policy is specific to this role and the single S3 location it's granted to read: the " +
              'grant is applied via role.addToPrincipalPolicy() on a role imported with Role.fromRoleArn(..., ' +
              '{ mutable: true }), which necessarily produces a role-scoped inline policy rather than a shared ' +
              "managed policy, and the policy intentionally targets only this connection's own bucket/prefix.",
          },
          {
            id: 'PCI.DSS.321-IAMNoInlinePolicy',
            reason:
              "Inline policy is specific to this role and the single S3 location it's granted to read: the " +
              'grant is applied via role.addToPrincipalPolicy() on a role imported with Role.fromRoleArn(..., ' +
              '{ mutable: true }), which necessarily produces a role-scoped inline policy rather than a shared ' +
              "managed policy, and the policy intentionally targets only this connection's own bucket/prefix.",
          },
        ],
        true,
      );
    }
  }
}
