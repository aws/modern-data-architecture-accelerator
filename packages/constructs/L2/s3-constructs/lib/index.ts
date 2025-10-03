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
  IBucket,
  IntelligentTieringConfiguration,
  Inventory,
  LifecycleRule,
} from 'aws-cdk-lib/aws-s3';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

export interface MdaaBucketProps extends mdaa_construct.MdaaConstructProps {
  readonly additionalKmsKeyArns?: string[];
  readonly enforceExclusiveKmsKeys?: boolean;
  readonly encryptionKey: IMdaaKmsKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional physical name for the S3 bucket that will be processed through MDAA naming conventions. If not specified, CloudFormation will assign a unique name. When provided, enables predictable bucket naming for cross-stack references and external integrations.
   *
   * Use cases: Predictable bucket naming; Cross-stack references; External system integration
   *
   * AWS: AWS S3 bucket physical name for resource identification and cross-service integration
   *
   * Validation: Must be valid S3 bucket name if provided (3-63 characters, lowercase, no underscores); processed through MDAA naming
   **/
  readonly bucketName?: string;
  readonly eventBridgeEnabled?: boolean;
  readonly lifecycleRules?: LifecycleRule[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of inventory configurations for automated bucket content reporting and analysis. Enables scheduled generation of object metadata reports for data governance, cost analysis, and compliance auditing purposes.
   *
   * Use cases: Data governance reporting; Cost analysis and optimization; Compliance auditing and object tracking
   *
   * AWS: AWS S3 inventory configuration for automated bucket content reporting and analysis
   *
   * Validation: Must be array of valid Inventory objects if provided; defines inventory generation schedule and content
   *   **/
  readonly inventories?: Inventory[];

  readonly transferAcceleration?: boolean;

  readonly intelligentTieringConfigurations?: IntelligentTieringConfiguration[];

  readonly uniqueBucketName?: boolean;
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

  private static setProps(props: MdaaBucketProps, scope: Construct): BucketProps {
    const uniqueBucketNamePrefixContext = scope.node.tryGetContext(MdaaBucket.UNIQUE_NAME_CONTEXT_KEY);

    const uniqueBucketNamePrefix =
      props.uniqueBucketName?.valueOf() ||
      (uniqueBucketNamePrefixContext ? Boolean(uniqueBucketNamePrefixContext) : false);

    const stackId = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(scope).stackId))));
    const prefix = props.bucketName
      ? stackId + '-' + props.naming.resourceName(props.bucketName, 62 - stackId.length)
      : stackId;
    const bucketName = uniqueBucketNamePrefix ? prefix : props.naming.resourceName(props.bucketName, 63);

    const overrideProps = {
      bucketName: bucketName,
      encryption: BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
      bucketKeyEnabled: true,
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaBucketProps) {
    super(scope, id, MdaaBucket.setProps(props, scope));

    this.policy?.applyRemovalPolicy(RemovalPolicy.RETAIN);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
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
