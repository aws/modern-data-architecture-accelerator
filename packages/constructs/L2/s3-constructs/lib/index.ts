/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mdaa_construct from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  BucketProps,
  CorsRule,
  IBucket,
  IntelligentTieringConfiguration,
  Inventory,
  LifecycleRule,
} from 'aws-cdk-lib/aws-s3';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

const PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON =
  'publicAccessBlockManagedExternally is enabled. Block public access is managed externally via AWS account-level settings and/or SCPs. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html';

/** CDK-nag suppressions to apply when publicAccessBlockManagedExternally is enabled. */
export const PUBLIC_ACCESS_BLOCK_NAG_SUPPRESSIONS = [
  { id: 'AwsSolutions-S2', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'NIST.800.53.R5-S3BucketLevelPublicAccessProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'NIST.800.53.R5-S3BucketPublicReadProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'NIST.800.53.R5-S3BucketPublicWriteProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'HIPAA.Security-S3BucketLevelPublicAccessProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'HIPAA.Security-S3BucketPublicReadProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'HIPAA.Security-S3BucketPublicWriteProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'PCI.DSS.321-S3BucketLevelPublicAccessProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'PCI.DSS.321-S3BucketPublicReadProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
  { id: 'PCI.DSS.321-S3BucketPublicWriteProhibited', reason: PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON },
];

export interface MdaaBucketProps extends mdaa_construct.MdaaConstructProps {
  readonly additionalKmsKeyArns?: string[];
  readonly enforceExclusiveKmsKeys?: boolean;
  readonly encryptionKey: IMdaaKmsKey;
  /** Physical name for the S3 bucket that will be processed through MDAA naming conventions */
  readonly bucketName?: string;
  readonly eventBridgeEnabled?: boolean;
  readonly lifecycleRules?: LifecycleRule[];

  /** Array of inventory configurations for automated bucket content reporting and analysis */
  readonly inventories?: Inventory[];

  readonly transferAcceleration?: boolean;

  readonly intelligentTieringConfigurations?: IntelligentTieringConfiguration[];

  /** Cross-origin resource sharing rules for the bucket */
  readonly corsRules?: CorsRule[];

  readonly uniqueBucketName?: boolean;

  /**
   * When true, omits the explicit blockPublicAccess setting so CDK does not emit
   * a PutBucketPublicAccessBlock API call. Use this when public access block is
   * managed externally (e.g., by AWS defaults and/or SCPs that deny
   * s3:PutBucketPublicAccessBlock).
   * @default false
   */
  readonly publicAccessBlockManagedExternally?: boolean;
}

/**
 * Interface spec for MDAA Buckets
 */
export type IMdaaBucket = IBucket;

/**
 * A construct for a compliant S3 bucket. Specifically, we ensure that:
 *  * KMS encryption enabled by default
 *  * Public access policies disabled
 *  * Bucket versioning enabled
 *  * SSL is enforced
 *  * Bucket keys are enabled
 */
export class MdaaBucket extends Bucket implements IMdaaBucket {
  public static readonly UNIQUE_NAME_CONTEXT_KEY = '@aws-mdaa/enableUniqueBucketNames';
  public static readonly PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_CONTEXT_KEY =
    '@aws-mdaa/publicAccessBlockManagedExternally';

  private static setProps(props: MdaaBucketProps, scope: Construct): BucketProps {
    const uniqueBucketNamePrefixContext = scope.node.tryGetContext(MdaaBucket.UNIQUE_NAME_CONTEXT_KEY);

    const uniqueBucketNamePrefix =
      props.uniqueBucketName?.valueOf() ||
      (uniqueBucketNamePrefixContext ? Boolean(uniqueBucketNamePrefixContext) : false);

    const publicAccessBlockManagedExternallyContext = scope.node.tryGetContext(
      MdaaBucket.PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_CONTEXT_KEY,
    );
    const publicAccessBlockManagedExternally =
      props.publicAccessBlockManagedExternally ??
      (publicAccessBlockManagedExternallyContext ? Boolean(publicAccessBlockManagedExternallyContext) : false);

    const stackId = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(scope).stackId))));
    const prefix = props.bucketName
      ? stackId + '-' + props.naming.resourceName(props.bucketName, 62 - stackId.length)
      : stackId;
    const bucketName = uniqueBucketNamePrefix ? prefix : props.naming.resourceName(props.bucketName, 63);

    const overrideProps: Record<string, unknown> = {
      bucketName: bucketName,
      encryption: BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
      bucketKeyEnabled: true,
      cors: props.corsRules,
    };

    if (!publicAccessBlockManagedExternally) {
      overrideProps.blockPublicAccess = BlockPublicAccess.BLOCK_ALL;
    }

    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaBucketProps) {
    super(scope, id, MdaaBucket.setProps(props, scope));

    const publicAccessBlockManagedExternallyContext = scope.node.tryGetContext(
      MdaaBucket.PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_CONTEXT_KEY,
    );
    const publicAccessBlockManagedExternally =
      props.publicAccessBlockManagedExternally ??
      (publicAccessBlockManagedExternallyContext ? Boolean(publicAccessBlockManagedExternallyContext) : false);

    this.policy?.applyRemovalPolicy(RemovalPolicy.RETAIN);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        {
          id: 'AwsSolutions-S1',
          reason: 'Server access logs do not support KMS on targets. MDAA uses CloudTrail data events instead.',
        },
        {
          id: 'NIST.800.53.R5-S3BucketLoggingEnabled',
          reason: 'Server access logs do not support KMS on targets. MDAA uses CloudTrail data events instead.',
        },
        {
          id: 'HIPAA.Security-S3BucketLoggingEnabled',
          reason: 'Server access logs do not support KMS on targets. MDAA uses CloudTrail data events instead.',
        },
        {
          id: 'PCI.DSS.321-S3BucketLoggingEnabled',
          reason: 'Server access logs do not support KMS on targets. MDAA uses CloudTrail data events instead.',
        },
      ],
      true,
    );

    if (publicAccessBlockManagedExternally) {
      MdaaNagSuppressions.addCodeResourceSuppressions(this, PUBLIC_ACCESS_BLOCK_NAG_SUPPRESSIONS, true);
    }

    if (props.enforceExclusiveKmsKeys == undefined || props.enforceExclusiveKmsKeys.valueOf()) {
      /**
       * Bucket policies to only permit the use of a customer managed KMS key for encryption and preventing
       * the use of any key except the one we have been called with.
       * Ref: https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingKMSEncryption.html (see: Requiring server-side encryption)
       */
      const DenyAESStatement = new PolicyStatement({
        sid: 'DenyAES',
        effect: Effect.DENY,
        resources: [this.bucketArn + '/*'],
        actions: ['s3:PutObject'],
      });
      DenyAESStatement.addCondition('StringEquals', {
        's3:x-amz-server-side-encryption': 'AES256',
      });
      DenyAESStatement.addAnyPrincipal();
      this.addToResourcePolicy(DenyAESStatement);

      const ForceKMSKeyStatement = new PolicyStatement({
        sid: 'ForceKMS',
        effect: Effect.DENY,
        resources: [this.bucketArn + '/*'],
        actions: ['s3:PutObject'],
      });
      if (props.additionalKmsKeyArns) {
        ForceKMSKeyStatement.addCondition('ForAllValues:StringNotLikeIfExists', {
          's3:x-amz-server-side-encryption-aws-kms-key-id': [props.encryptionKey.keyArn, ...props.additionalKmsKeyArns],
        });
      } else {
        ForceKMSKeyStatement.addCondition('StringNotLikeIfExists', {
          's3:x-amz-server-side-encryption-aws-kms-key-id': props.encryptionKey.keyArn,
        });
      }
      ForceKMSKeyStatement.addAnyPrincipal();
      this.addToResourcePolicy(ForceKMSKeyStatement);
    }

    new mdaa_construct.MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'bucket',
          resourceId: props.bucketName,
          name: 'name',
          value: this.bucketName,
        },
        ...props,
      },
      scope,
    );

    new mdaa_construct.MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'bucket',
          resourceId: props.bucketName,
          name: 'arn',
          value: this.bucketArn,
        },
        ...props,
      },
      scope,
    );
  }
  /**
   * Helper function to format S3 prefixes. By default, strips leading and trailing slashes.
   * @param prefix S3 Prefix to be formatted
   * @param forceLeadingSlash If true (default false), will ensure returned prefix has a leading slash
   * @param forceTrailingSlash If true (default false), will ensure returned prefix has a trail slash
   * @returns A formatted S3 Prefix
   */
  public static formatS3Prefix(
    prefix: string | undefined,
    forceLeadingSlash = false,
    forceTrailingSlash = false,
  ): string | undefined {
    if (!prefix) {
      return prefix;
    }
    let rawPrefix = prefix;
    // Removes trailing slashes
    rawPrefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
    // Removes leading slashes
    rawPrefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
    if (forceLeadingSlash) {
      rawPrefix = '/' + rawPrefix;
    }
    if (forceTrailingSlash) {
      rawPrefix = rawPrefix + '/';
    }
    return rawPrefix;
  }
}
