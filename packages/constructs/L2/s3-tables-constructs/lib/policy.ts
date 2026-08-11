/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { Effect, PolicyDocument, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnTableBucketPolicy, CfnTablePolicy } from 'aws-cdk-lib/aws-s3tables';
import { Construct } from 'constructs';

/**
 * Builds the mandatory deny-non-TLS enforcement statement for an S3 Tables resource policy.
 * Denies all S3 Tables actions when the request is not made over HTTPS.
 *
 * The statement must cover every ARN the policy is meant to protect. For a table bucket that
 * means both the bucket ARN AND the contained-resources wildcard (`<bucketArn>/table/*`): S3
 * Tables scopes table-level data actions (GetTableData, PutTableData, etc.) to individual table
 * ARNs, which the bare bucket ARN does not match, so a bucket-only Resource would leave non-TLS
 * reads/writes against tables un-denied. This mirrors the standard S3 deny-insecure-transport
 * pattern that covers both `bucketArn` and `bucketArn/*`.
 *
 * @param resourceArns - The ARNs to protect (bucket ARN plus its contained-tables wildcard for a
 *   bucket policy; the single table ARN for a table policy).
 */
function buildDenyNonTlsStatement(resourceArns: string[]): PolicyStatement {
  return new PolicyStatement({
    sid: 'DenyNonTLS',
    effect: Effect.DENY,
    principals: [new StarPrincipal()],
    actions: ['s3tables:*'],
    resources: resourceArns,
    conditions: {
      Bool: {
        'aws:SecureTransport': 'false',
      },
    },
  });
}

/**
 * Assembles a resource policy document, always leading with the mandatory deny-non-TLS
 * statement (scoped to the supplied ARNs) followed by any caller-supplied statements.
 */
function buildPolicyDocument(denyTlsResourceArns: string[], additionalStatements?: PolicyStatement[]): PolicyDocument {
  return new PolicyDocument({
    statements: [buildDenyNonTlsStatement(denyTlsResourceArns), ...(additionalStatements ?? [])],
  });
}

/**
 * Props for the MdaaTableBucketPolicy construct.
 */
export interface MdaaTableBucketPolicyProps extends MdaaConstructProps {
  /** ARN of the table bucket the policy is attached to. */
  readonly tableBucketArn: string;
  /**
   * Additional IAM policy statements (e.g. the deny-all baseline and grant Allow statements)
   * to include alongside the mandatory deny-non-TLS statement. Typed as CDK PolicyStatement so
   * statement content is validated at compile time. Omit for a TLS-only policy.
   */
  readonly additionalStatements?: PolicyStatement[];
}

/**
 * L2 construct wrapping AWS::S3Tables::TableBucketPolicy. Enforces in-transit protection as a
 * compliance-by-default control: the rendered policy always includes a deny-non-TLS statement
 * (deny when aws:SecureTransport is false), with any additional statements appended after it.
 */
export class MdaaTableBucketPolicy extends Construct {
  constructor(scope: Construct, id: string, props: MdaaTableBucketPolicyProps) {
    super(scope, id);

    // Scope the deny-non-TLS statement to the bucket ARN AND its contained-tables wildcard so
    // in-transit enforcement extends to every namespace and table under the bucket (table-level
    // actions are scoped to `<bucketArn>/table/*`, which the bare bucket ARN does not match).
    new CfnTableBucketPolicy(this, 'Resource', {
      tableBucketArn: props.tableBucketArn,
      resourcePolicy: buildPolicyDocument(
        [props.tableBucketArn, `${props.tableBucketArn}/table/*`],
        props.additionalStatements,
      ).toJSON(),
    });
  }
}

/**
 * Props for the MdaaTablePolicy construct.
 */
export interface MdaaTablePolicyProps extends MdaaConstructProps {
  /** ARN of the table the policy is attached to. */
  readonly tableArn: string;
  /**
   * Additional IAM policy statements (grant Allow statements) to include alongside the
   * mandatory deny-non-TLS statement. Typed as CDK PolicyStatement so statement content is
   * validated at compile time. Omit for a TLS-only policy.
   */
  readonly additionalStatements?: PolicyStatement[];
}

/**
 * L2 construct wrapping AWS::S3Tables::TablePolicy. Enforces in-transit protection as a
 * compliance-by-default control: the rendered policy always includes a deny-non-TLS statement,
 * with any additional statements appended after it. Table policies do not include a deny-all
 * baseline; table-level access is via explicit grants only.
 */
export class MdaaTablePolicy extends Construct {
  constructor(scope: Construct, id: string, props: MdaaTablePolicyProps) {
    super(scope, id);

    // A table ARN is a leaf resource (no child ARNs), so the deny-non-TLS statement targets it alone.
    new CfnTablePolicy(this, 'Resource', {
      tableArn: props.tableArn,
      resourcePolicy: buildPolicyDocument([props.tableArn], props.additionalStatements).toJSON(),
    });
  }
}
