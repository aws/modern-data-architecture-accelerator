/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mdaa_construct from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
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
  ReplicationRule,
} from 'aws-cdk-lib/aws-s3';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

const PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_REASON =
  'publicAccessBlockManagedExternally is enabled. Block public access is managed externally via AWS account-level settings and/or SCPs. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html';

/**
 * CDK-nag suppressions applied only to buckets without a replication configuration, so the
 * reason is read as scoped to this bucket rather than as a statement about MDAA as a whole.
 * A bucket configured as a replication source satisfies these rules directly, so the
 * suppressions are withheld rather than hiding a genuine finding.
 *
 * The reason text is deliberately unchanged from before replication support existed: it is
 * embedded in the committed baselines of every module that creates a bucket, so rewording it
 * churns those baselines without changing any deployed behaviour.
 */
export const REPLICATION_NAG_SUPPRESSIONS = [
  { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
  { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
  { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
];

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

  /**
   * Replication rules making this bucket a replication source. Requires replicationRole.
   *
   * When set, the S3BucketReplicationEnabled nag suppressions are not applied, as the
   * bucket now satisfies those rules on its own.
   *
   * Because this bucket always encrypts with a CMK, every rule must set both `kmsKey` and
   * `sseKmsEncryptedObjects`, and the construct rejects rules that do not: S3 skips SSE-KMS
   * encrypted objects unless the rule opts in and names a replica key, so an incomplete rule
   * deploys cleanly and then replicates nothing. Granting the replication role decrypt on this
   * bucket's key and encrypt on the replica key remains the caller's responsibility.
   * @default - no replication configuration
   */
  readonly replicationRules?: ReplicationRule[];

  /**
   * Role assumed by S3 to replicate objects out of this bucket. Required whenever
   * replicationRules is set, and the construct rejects rules without one: CDK would otherwise
   * create its own role, which would miss MDAA naming and, more importantly, the bucket-policy
   * exclusion a replication role needs - leaving a bucket that deploys and replicates nothing.
   * CDK grants an explicitly supplied role nothing, so the caller attaches all replication
   * permissions itself.
   * @default - none; required when replicationRules is set
   */
  readonly replicationRole?: IRole;

  /**
   * Tier for the SSM parameters this construct publishes. Only Advanced-tier parameters can be
   * shared with another account through AWS RAM, and Advanced-tier parameters are billed, so
   * leave this unset unless a parameter is being shared.
   * @default - ParameterTier.STANDARD, as applied by SSM
   */
  readonly tier?: ParameterTier;
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

  /**
   * A replication rule on a CMK-encrypted bucket has to opt in to SSE-KMS objects and name a
   * replica key, or S3 accepts the configuration and silently replicates nothing.
   * https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
   */
  private static validateReplicationRules(props: MdaaBucketProps) {
    if ((props.replicationRules?.length ?? 0) > 0 && !props.replicationRole) {
      throw new Error(
        `Bucket '${props.bucketName}': replicationRules requires replicationRole. Left to CDK, the role it creates is not exempted from the bucket's default-deny statement, so replication would be configured and copy nothing.`,
      );
    }
    props.replicationRules?.forEach((rule, index) => {
      const missing = [
        ...(rule.sseKmsEncryptedObjects ? [] : ['sseKmsEncryptedObjects']),
        ...(rule.kmsKey ? [] : ['kmsKey']),
      ];
      if (missing.length > 0) {
        throw new Error(
          `Bucket '${props.bucketName}': replication rule ${rule.id ?? index} is missing ${missing.join(
            ' and ',
          )}. Objects in this bucket are encrypted with a customer managed key, and S3 replicates SSE-KMS encrypted objects only when the rule opts in and names a replica key.`,
        );
      }
    });
  }

  private static setProps(props: MdaaBucketProps, scope: Construct): BucketProps {
    MdaaBucket.validateReplicationRules(props);

    const uniqueBucketNamePrefixContext = scope.node.tryGetContext(MdaaBucket.UNIQUE_NAME_CONTEXT_KEY);

    const uniqueBucketNamePrefix =
      props.uniqueBucketName?.valueOf() ||
      (uniqueBucketNamePrefixContext ? Boolean(uniqueBucketNamePrefixContext) : false);

    const s3Naming = props.naming.withResourceType(MdaaResourceType.S3_BUCKET);
    const publicAccessBlockManagedExternallyContext = scope.node.tryGetContext(
      MdaaBucket.PUBLIC_ACCESS_BLOCK_MANAGED_EXTERNALLY_CONTEXT_KEY,
    );
    const publicAccessBlockManagedExternally =
      props.publicAccessBlockManagedExternally ??
      (publicAccessBlockManagedExternallyContext ? Boolean(publicAccessBlockManagedExternallyContext) : false);

    const stackId = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(scope).stackId))));
    const prefix = props.bucketName
      ? stackId + '-' + s3Naming.resourceName(props.bucketName, 62 - stackId.length)
      : stackId;
    const bucketName = uniqueBucketNamePrefix ? prefix : s3Naming.resourceName(props.bucketName, 63);

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

    const replicationConfigured = (props.replicationRules?.length ?? 0) > 0;

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
        ...(replicationConfigured ? [] : REPLICATION_NAG_SUPPRESSIONS),
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
