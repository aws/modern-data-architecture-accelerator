/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Duration } from 'aws-cdk-lib';
import { LifecycleRule, NoncurrentVersionTransition, StorageClass, Transition } from 'aws-cdk-lib/aws-s3';

/**
 * A single storage-class transition within an S3 lifecycle rule.
 *
 * Use cases: Cost optimization by aging objects to cheaper storage; Archiving cold data
 *
 * AWS: S3 Lifecycle Transition (current or noncurrent version)
 *
 * Validation: days required; storageClass required
 */
export interface LifecycleTransitionProps {
  /**
   * Number of days after object creation (or after becoming noncurrent) before the transition applies.
   *
   * AWS: S3 Lifecycle Transition TransitionInDays / NoncurrentDays
   *
   * Validation: Required; positive integer
   */
  readonly days: number;
  /**
   * Target S3 storage class for the transition.
   *
   * AWS: S3 storage class
   *
   * Validation: Required; valid S3 storage class (e.g. STANDARD_IA, INTELLIGENT_TIERING, ONEZONE_IA, GLACIER_IR, GLACIER, DEEP_ARCHIVE)
   */
  readonly storageClass: string;
  /**
   * For noncurrent version transitions, the number of newer noncurrent versions to retain before transitioning older ones.
   *
   * AWS: S3 Lifecycle NoncurrentVersionTransition NewerNoncurrentVersions
   *
   * Validation: Optional; positive integer
   */
  readonly newerNoncurrentVersions?: number;
}

/**
 * A single S3 lifecycle rule controlling storage-class transitions and expiration for objects in a bucket.
 *
 * Use cases: Automated cost optimization; Data retention/expiration policies; Cleaning up incomplete multipart uploads and old versions
 *
 * AWS: S3 Bucket Lifecycle Rule
 *
 * Validation: id and status required; remaining fields optional
 */
export interface LifecycleConfigurationRuleProps {
  /**
   * Unique identifier for the lifecycle rule.
   *
   * AWS: S3 Lifecycle Rule ID
   *
   * Validation: Required; unique within the bucket
   */
  readonly id: string;
  /**
   * Whether the rule is active.
   *
   * AWS: S3 Lifecycle Rule Status
   *
   * Validation: Required; one of 'Enabled' or 'Disabled' (case-insensitive)
   */
  readonly status: string;
  /**
   * Object key prefix the rule applies to. When omitted, the rule applies to all objects in the bucket.
   *
   * AWS: S3 Lifecycle Rule Filter Prefix
   *
   * Validation: Optional; S3 key prefix
   */
  readonly prefix?: string;
  /**
   * Only apply the rule to objects larger than this size in bytes.
   *
   * AWS: S3 Lifecycle Rule Filter ObjectSizeGreaterThan
   *
   * Validation: Optional; positive integer (bytes)
   */
  readonly objectSizeGreaterThan?: number;
  /**
   * Only apply the rule to objects smaller than this size in bytes.
   *
   * AWS: S3 Lifecycle Rule Filter ObjectSizeLessThan
   *
   * Validation: Optional; positive integer (bytes)
   */
  readonly objectSizeLessThan?: number;
  /**
   * Days after which incomplete multipart uploads are aborted.
   *
   * AWS: S3 Lifecycle Rule AbortIncompleteMultipartUpload DaysAfterInitiation
   *
   * Validation: Optional; positive integer
   */
  readonly abortIncompleteMultipartUploadAfter?: number;
  /**
   * Storage-class transitions applied to current object versions.
   *
   * AWS: S3 Lifecycle Rule Transitions
   *
   * Validation: Optional; array of LifecycleTransitionProps
   */
  readonly transitions?: LifecycleTransitionProps[];
  /**
   * Days after object creation before current versions expire (are deleted).
   *
   * AWS: S3 Lifecycle Rule Expiration ExpirationInDays
   *
   * Validation: Optional; positive integer
   */
  readonly expirationdays?: number;
  /**
   * Whether to remove expired object delete markers.
   *
   * AWS: S3 Lifecycle Rule Expiration ExpiredObjectDeleteMarker
   *
   * Validation: Optional; boolean
   */
  readonly expiredObjectDeleteMarker?: boolean;
  /**
   * Storage-class transitions applied to noncurrent object versions.
   *
   * AWS: S3 Lifecycle Rule NoncurrentVersionTransitions
   *
   * Validation: Optional; array of LifecycleTransitionProps
   */
  readonly noncurrentVersionTransitions?: LifecycleTransitionProps[];
  /**
   * Days after a version becomes noncurrent before it expires (is deleted).
   *
   * AWS: S3 Lifecycle Rule NoncurrentVersionExpiration NoncurrentDays
   *
   * Validation: Optional; positive integer
   */
  readonly noncurrentVersionExpirationDays?: number;
  /**
   * Number of newer noncurrent versions to retain before expiring older ones.
   *
   * AWS: S3 Lifecycle Rule NoncurrentVersionExpiration NewerNoncurrentVersions
   *
   * Validation: Optional; positive integer
   */
  readonly noncurrentVersionsToRetain?: number;
}

/**
 * Helper for translating config-friendly S3 lifecycle rule definitions into CDK LifecycleRule objects.
 * Shared across MDAA L3 constructs (e.g. data lake, dataops project) so S3 lifecycle configuration has a
 * single canonical shape and resolution path, keeping config-to-props translation out of the L2 bucket construct.
 */
export class LifecycleHelper {
  /**
   * Resolve config-shaped lifecycle rules (string storage classes, day counts) into CDK LifecycleRule objects.
   * @param rules Config-shaped lifecycle rules.
   * @returns CDK LifecycleRule objects suitable for MdaaBucketProps.lifecycleRules or Bucket.addLifecycleRule().
   */
  public static resolveLifecycleRules(rules: LifecycleConfigurationRuleProps[]): LifecycleRule[] {
    return rules.map(rule => ({
      id: rule.id,
      enabled: rule.status.toLowerCase() === 'enabled',
      prefix: rule.prefix,
      objectSizeGreaterThan: rule.objectSizeGreaterThan,
      objectSizeLessThan: rule.objectSizeLessThan,
      abortIncompleteMultipartUploadAfter: rule.abortIncompleteMultipartUploadAfter
        ? Duration.days(rule.abortIncompleteMultipartUploadAfter)
        : undefined,
      transitions: rule.transitions ? LifecycleHelper.resolveLifecycleTransitions(rule.transitions) : undefined,
      expiration: rule.expirationdays ? Duration.days(rule.expirationdays) : undefined,
      expiredObjectDeleteMarker: rule.expiredObjectDeleteMarker,
      noncurrentVersionTransitions: rule.noncurrentVersionTransitions
        ? LifecycleHelper.resolveNoncurrentVersionTransitions(rule.noncurrentVersionTransitions)
        : undefined,
      noncurrentVersionExpiration: rule.noncurrentVersionExpirationDays
        ? Duration.days(rule.noncurrentVersionExpirationDays)
        : undefined,
      noncurrentVersionsToRetain: rule.noncurrentVersionsToRetain,
    }));
  }

  private static resolveLifecycleTransitions(transitions: LifecycleTransitionProps[]): Transition[] {
    return transitions.map(transition => ({
      storageClass: new StorageClass(transition.storageClass),
      transitionAfter: Duration.days(transition.days),
    }));
  }

  private static resolveNoncurrentVersionTransitions(
    transitions: LifecycleTransitionProps[],
  ): NoncurrentVersionTransition[] {
    return transitions.map(transition => ({
      storageClass: new StorageClass(transition.storageClass),
      transitionAfter: Duration.days(transition.days),
      noncurrentVersionsToRetain: transition.newerNoncurrentVersions ? transition.newerNoncurrentVersions : undefined,
    }));
  }
}
