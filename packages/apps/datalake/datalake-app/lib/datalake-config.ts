/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';

import {
  AccessPolicyProps,
  BucketDefinition,
  InventoryDefinition,
  LifecycleConfigurationRuleProps,
  LifecycleTransitionProps,
} from '@aws-mdaa/datalake-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import { CorsRule, HttpMethods } from 'aws-cdk-lib/aws-s3';
import * as configSchema from './config-schema.json';

/**
 * Individual bucket configuration within the data lake, defining access policies,
 * inventory, event notifications, LakeFormation locations, and lifecycle rules.
 *
 * Use cases: Zone-specific bucket setup (raw/transformed/curated); Per-bucket access control; Operational feature toggles
 *
 * AWS: S3 bucket with bucket policy, inventory, EventBridge, LakeFormation integration
 *
 * Validation: accessPolicies required; all policy names must exist in parent accessPolicies config
 */
export interface BucketConfig {
  /**
   * Access policy names to apply to this bucket. Each name must reference a policy
   * defined in the top-level accessPolicies configuration.
   *
   * Use cases: Role-based bucket access; Multi-policy composition per bucket
   *
   * AWS: S3 bucket policy statements derived from named access policies
   *
   * Validation: Required; array of strings; each must match a key in accessPolicies
   */
  readonly accessPolicies: string[];
  /**
   * S3 inventory configurations for automated bucket content reporting.
   * Each entry generates inventory data for the specified prefix.
   *
   * Use cases: Data governance reporting; Cost analysis by prefix; Compliance auditing
   *
   * AWS: S3 inventory configuration
   *
   * Validation: Optional; map of inventory name to InventoryDefinition
   */
  readonly inventories?: { [key: string]: InventoryDefinition };
  /**
   * Enable EventBridge notifications for S3 data events on this bucket.
   *
   * Use cases: Event-driven data pipelines; Real-time processing triggers
   *
   * AWS: S3 EventBridge notification configuration
   *
   * Validation: Optional; boolean
   */
  readonly enableEventBridgeNotifications?: boolean;
  /**
   * LakeFormation location registrations for fine-grained access control
   * at specific S3 prefixes within this bucket.
   *
   * Use cases: Table/column-level permissions; LakeFormation-governed data zones
   *
   * AWS: LakeFormation resource registration
   *
   * Validation: Optional; map of location name to LakeFormationLocationConfig
   */
  readonly lakeFormationLocations?: { [key: string]: LakeFormationLocationConfig };
  /**
   * Create folder placeholder objects for each access policy prefix.
   *
   * Use cases: Pre-populated folder structure; Console navigation
   *
   * AWS: S3 zero-byte objects as folder markers
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly createFolderSkeleton?: boolean;
  /**
   * Name of a lifecycle configuration from the top-level lifecycleConfigurations
   * to apply to this bucket.
   *
   * Use cases: Automated archival; Cost optimization; Data retention
   *
   * AWS: S3 lifecycle rules
   *
   * Validation: Optional; must match a key in lifecycleConfigurations if provided
   */
  readonly lifecycleConfiguration?: string;
  /**
   * Deny access to any role not explicitly listed in access policies.
   *
   * Use cases: Secure-by-default bucket access; Explicit-only permissions
   *
   * AWS: S3 bucket policy deny statements
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly defaultDeny?: boolean;
  /**
   * Cross-origin resource sharing rules for this bucket.
   * Required when web browsers or AWS services need cross-origin access.
   *
   * Use cases: SageMaker Ground Truth labeling; Web-based data applications; AWS service integrations
   *
   * AWS: S3 CORS configuration
   *
   * Validation: Optional; array of CorsRuleConfig
   */
  readonly corsRules?: CorsRuleConfig[];
}

/**
 * S3 prefix to register as a LakeFormation location for fine-grained access control.
 *
 * Use cases: Table/column-level permissions; LakeFormation-governed data paths
 *
 * AWS: LakeFormation resource registration
 *
 * Validation: prefix required; write optional
 */
export interface LakeFormationLocationConfig {
  /**
   * S3 prefix within the bucket to register with LakeFormation.
   *
   * Use cases: Prefix-level LakeFormation governance; Data zone registration
   *
   * AWS: LakeFormation location S3 path
   *
   * Validation: Required; valid S3 prefix string
   */
  readonly prefix: string;
  /**
   * Grant write access to the LakeFormation role for this location.
   * When false or omitted, only read access is granted.
   *
   * Use cases: Read-write data processing; ETL write access
   *
   * AWS: LakeFormation location permissions
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly write?: boolean;
}

/**
 * HTTP method permitted in a CORS rule.
 */
export type HttpMethod = 'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE';

/**
 * Cross-origin resource sharing rule for an S3 bucket. Allows web browsers
 * to make cross-origin requests to the bucket.
 *
 * Use cases: SageMaker Ground Truth labeling; Web-based data applications; AWS service integrations
 *
 * AWS: S3 CORS configuration
 *
 * Validation: allowedMethods and allowedOrigins required
 */
export interface CorsRuleConfig {
  /**
   * A unique identifier for this CORS rule.
   *
   * Validation: Optional; string
   */
  readonly id?: string;
  /**
   * Time in seconds the browser caches the preflight response.
   *
   * Validation: Optional; non-negative integer
   */
  readonly maxAge?: number;
  /**
   * Headers allowed in cross-origin requests.
   *
   * Validation: Optional; array of strings; use ['*'] to allow all headers
   */
  readonly allowedHeaders?: string[];
  /**
   * HTTP methods allowed for cross-origin requests.
   *
   * Validation: Required; array of HttpMethod (enum: GET, PUT, HEAD, POST, DELETE)
   */
  readonly allowedMethods: HttpMethod[];
  /**
   * Origins allowed to make cross-origin requests to the bucket.
   *
   * Validation: Required; array of origin URLs or ['*'] for all origins
   */
  readonly allowedOrigins: string[];
  /**
   * Response headers exposed to the browser.
   *
   * Validation: Optional; array of strings
   */
  readonly exposedHeaders?: string[];
}

/**
 * Access policy rule defining role-based permissions for a specific S3 prefix.
 * Roles are referenced by name from the top-level roles configuration.
 *
 * Use cases: Prefix-level read/write/super access; Multi-role permission sets
 *
 * AWS: S3 bucket policy conditions per prefix
 *
 * Validation: prefix required; role arrays optional but must reference valid role names
 */
export interface AccessPolicyRuleConfig {
  /**
   * S3 prefix path where this access rule applies (e.g., '/data', '/').
   *
   * Use cases: Dataset-specific permissions; Root-level admin access
   *
   * AWS: S3 bucket policy prefix condition
   *
   * Validation: Required; valid S3 prefix string
   */
  readonly prefix: string;
  /**
   * Role names granted read-only access to this prefix.
   *
   * Use cases: Data consumers; Analysts with view-only access
   *
   * AWS: S3 bucket policy allow (GetObject, ListBucket)
   *
   * Validation: Optional; array of role names from top-level roles config
   */
  readonly ReadRoles?: string[];
  /**
   * Role names granted read-write access to this prefix.
   * Write access creates delete markers but cannot permanently delete versions.
   *
   * Use cases: ETL pipelines; Data engineers writing processed data
   *
   * AWS: S3 bucket policy allow (GetObject, PutObject, DeleteObject)
   *
   * Validation: Optional; array of role names from top-level roles config
   */
  readonly ReadWriteRoles?: string[];
  /**
   * Role names granted superuser access including permanent version deletion.
   *
   * Use cases: Data administrators; Compliance-driven data purge
   *
   * AWS: S3 bucket policy allow (full object operations including DeleteObjectVersion)
   *
   * Validation: Optional; array of role names from top-level roles config
   */
  readonly ReadWriteSuperRoles?: string[];
}

/**
 * Named access policy wrapping an access rule for reuse across multiple buckets.
 *
 * Use cases: Reusable permission sets; Consistent access patterns across zones
 *
 * AWS: S3 bucket policy rule set
 *
 * Validation: rule required
 */
export interface AccessPolicyConfig {
  /**
   * The access rule defining prefix, roles, and permission levels for this policy.
   *
   * Use cases: Permission specification; Role-to-prefix mapping
   *
   * AWS: S3 bucket policy conditions
   *
   * Validation: Required; valid AccessPolicyRuleConfig
   */
  readonly rule: AccessPolicyRuleConfig;
}

/**
 * Storage class transition rule specifying when objects move to a different tier.
 *
 * Use cases: Progressive archival (IA → Glacier → Deep Archive); Version-aware transitions
 *
 * AWS: S3 lifecycle transition rule
 *
 * Validation: Days and StorageClass required; NewerNoncurrentVersions optional
 */
export interface LifecycleTransitionConfig {
  /**
   * Number of days after object creation (or becoming noncurrent) to trigger the transition.
   *
   * Use cases: Age-based archival; Cost optimization scheduling
   *
   * AWS: S3 lifecycle transition days
   *
   * Validation: Required; positive integer
   */
  readonly Days: number;
  /**
   * Target S3 storage class for the transition.
   *
   * Use cases: STANDARD_IA, GLACIER_IR, GLACIER, DEEP_ARCHIVE tier selection
   *
   * AWS: S3 storage class
   *
   * Validation: Required; valid S3 storage class name
   */
  readonly StorageClass: string;
  /**
   * Number of newer noncurrent versions to retain before applying this transition.
   * Only applicable for noncurrent version transitions.
   *
   * Use cases: Version retention during archival; Keeping recent versions accessible
   *
   * AWS: S3 lifecycle noncurrent version retention
   *
   * Validation: Optional; non-negative integer
   */
  readonly NewerNoncurrentVersions?: number;
}

/**
 * Complete lifecycle rule with transitions, expiration, multipart cleanup,
 * and noncurrent version management. Multiple rules can be grouped into
 * a named LifecycleConfigurationConfig.
 *
 * Use cases: Multi-tier archival with expiration; Multipart upload cleanup; Version lifecycle
 *
 * AWS: S3 lifecycle rule
 *
 * Validation: Status required ('Enabled'/'Disabled'); all other fields optional
 */
export interface LifecycleConfigurationRuleConfig {
  /**
   * Whether this lifecycle rule is active.
   *
   * Use cases: Temporarily disabling rules; Staged rollout
   *
   * AWS: S3 lifecycle rule status
   *
   * Validation: Required; 'Enabled' or 'Disabled'
   */
  readonly Status: string;
  /**
   * S3 prefix filter restricting which objects this rule applies to.
   *
   * Use cases: Prefix-specific archival; Dataset-targeted lifecycle
   *
   * AWS: S3 lifecycle rule prefix filter
   *
   * Validation: Optional; valid S3 prefix string
   */
  readonly Prefix?: string;
  /**
   * Minimum object size (bytes) for rule application.
   *
   * Use cases: Excluding small metadata files from archival
   *
   * AWS: S3 lifecycle rule object size filter
   *
   * Validation: Optional; positive integer
   */
  readonly ObjectSizeGreaterThan?: number;
  /**
   * Maximum object size (bytes) for rule application.
   *
   * Use cases: Targeting small files for different lifecycle treatment
   *
   * AWS: S3 lifecycle rule object size filter
   *
   * Validation: Optional; positive integer
   */
  readonly ObjectSizeLessThan?: number;
  /**
   * Days after which incomplete multipart uploads are automatically aborted.
   *
   * Use cases: Storage cleanup; Cost control for abandoned uploads
   *
   * AWS: S3 lifecycle AbortIncompleteMultipartUpload
   *
   * Validation: Optional; positive integer
   */
  readonly AbortIncompleteMultipartUploadAfter?: number;
  /**
   * Storage class transitions for current object versions.
   *
   * Use cases: Progressive archival (STANDARD_IA → GLACIER → DEEP_ARCHIVE)
   *
   * AWS: S3 lifecycle transitions
   *
   * Validation: Optional; array of LifecycleTransitionConfig
   */
  readonly Transitions?: LifecycleTransitionConfig[];
  /**
   * Days after creation when current object versions expire (are deleted).
   * Cannot be set together with ExpiredObjectDeleteMarker.
   *
   * Use cases: Data retention enforcement; Compliance-driven expiration
   *
   * AWS: S3 lifecycle expiration
   *
   * Validation: Optional; positive integer; mutually exclusive with ExpiredObjectDeleteMarker
   */
  readonly ExpirationDays?: number;
  /**
   * Permanently remove expired object delete markers to reduce storage overhead.
   * Cannot be set together with ExpirationDays.
   *
   * Use cases: Delete marker cleanup in versioned buckets
   *
   * AWS: S3 lifecycle ExpiredObjectDeleteMarker
   *
   * Validation: Optional; boolean; mutually exclusive with ExpirationDays
   */
  readonly ExpiredObjectDeleteMarker?: boolean;
  /**
   * Storage class transitions for noncurrent (previous) object versions.
   *
   * Use cases: Archiving old versions; Cost-effective version retention
   *
   * AWS: S3 lifecycle noncurrent version transitions
   *
   * Validation: Optional; array of LifecycleTransitionConfig
   */
  readonly NoncurrentVersionTransitions?: LifecycleTransitionConfig[];
  /**
   * Days after which noncurrent versions expire (are permanently deleted).
   *
   * Use cases: Version retention limits; Compliance-driven version cleanup
   *
   * AWS: S3 lifecycle noncurrent version expiration
   *
   * Validation: Optional; positive integer
   */
  readonly NoncurrentVersionExpirationDays?: number;
  /**
   * Number of noncurrent versions to retain before applying expiration.
   *
   * Use cases: Keeping N recent versions; Balanced version history
   *
   * AWS: S3 lifecycle NoncurrentVersionsToRetain
   *
   * Validation: Optional; non-negative integer
   */
  readonly NoncurrentVersionsToRetain?: number;
}

/**
 * Named collection of lifecycle rules that can be applied to data lake buckets.
 * Each key is a rule name, value is the rule configuration.
 *
 * Use cases: Reusable lifecycle rule sets; Shared archival policies across buckets
 *
 * AWS: S3 lifecycle configuration rule collection
 *
 * Validation: Keys are rule names; values must be valid LifecycleConfigurationRuleConfig
 */
export interface LifecycleConfigurationConfig {
  [ruleName: string]: LifecycleConfigurationRuleConfig;
}

export interface DataLakeConfigContents extends MdaaBaseConfigContents {
  /**
   * Named role references for use in access policies. Each key is a logical role name,
   * value is an array of physical IAM role references (ARN, name, ID, or SSM parameter).
   *
   * Use cases: Multi-role access patterns; Cross-account data access; SSO role mapping
   *
   * AWS: IAM role references for S3 bucket policies and LakeFormation permissions
   *
   * Validation: Required; map of role name to MdaaRoleRef[]; roles referenced in accessPolicies must be defined here
   */
  readonly roles: { [key: string]: MdaaRoleRef[] };
  /**
   * Named access policies defining role-based permissions per S3 prefix.
   * Policies are referenced by name in bucket configurations.
   *
   * Use cases: Reusable permission sets; Prefix-level read/write/super access
   *
   * AWS: S3 bucket policy rule sets
   *
   * Validation: Required; map of policy name to AccessPolicyConfig; policies referenced in buckets must be defined here
   */
  readonly accessPolicies: { [key: string]: AccessPolicyConfig };
  /**
   * Named lifecycle configurations containing sets of lifecycle rules.
   * Referenced by name in bucket configurations.
   *
   * Use cases: Shared archival strategies; Environment-specific retention policies
   *
   * AWS: S3 lifecycle configuration rule collections
   *
   * Validation: Optional; map of config name to LifecycleConfigurationConfig
   */
  readonly lifecycleConfigurations?: { [configName: string]: LifecycleConfigurationConfig };
  /**
   * Data lake bucket definitions keyed by zone name (e.g., 'raw', 'transformed', 'curated').
   * Each bucket gets its own S3 bucket with the specified access policies and features.
   *
   * Use cases: Multi-zone data lake; Raw/processed/curated separation; Zone-specific access
   *
   * AWS: S3 buckets with bucket policies, encryption, versioning
   *
   * Validation: Required; map of zone name to BucketConfig; zone names must be unique
   */
  readonly buckets: { [key: string]: BucketConfig };
  /**
   * Enable S3 Storage Lens for the data lake buckets.
   * When true, creates a Storage Lens configuration covering all buckets defined in this app's config.
   */
  readonly storageLensEnabled?: boolean;
}

export class DataLakeConfigParser extends MdaaAppConfigParser<DataLakeConfigContents> {
  public readonly roles: { [key: string]: MdaaRoleRef[] };
  public readonly buckets: BucketDefinition[];
  public readonly accessPolicies: { [name: string]: AccessPolicyProps };
  public readonly lifecycleConfigurations?: { [configName: string]: LifecycleConfigurationRuleProps[] };
  public readonly inventories?: { [key: string]: string };
  public readonly storageLensEnabled: boolean;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.roles = 'roles' in this.configContents ? this.configContents['roles'] : {};
    this.accessPolicies =
      'accessPolicies' in this.configContents ? this.buildAccessPolicies(this.configContents.accessPolicies) : {};
    this.lifecycleConfigurations = this.configContents.lifecycleConfigurations
      ? this.buildLifecycleConfigurations(this.configContents.lifecycleConfigurations)
      : undefined;

    this.storageLensEnabled = this.configContents.storageLensEnabled ?? false;

    this.buckets = Object.entries(this.configContents.buckets).map(zoneAndBucketConfig => {
      const bucketZone: string = zoneAndBucketConfig[0];
      const configBucketProps: BucketConfig = zoneAndBucketConfig[1];
      const accessPolicies = configBucketProps.accessPolicies.map(accessPolicyName => {
        if (!(accessPolicyName in this.accessPolicies)) {
          throw new Error(
            `${accessPolicyName} is required in 'buckets' definition ${bucketZone} but not defined in 'accessPolicies'`,
          );
        }
        return {
          ...this.accessPolicies[accessPolicyName],
          ...{
            name: accessPolicyName,
          },
        };
      });
      const lakeFormationLocations = Object.fromEntries(
        Object.keys(configBucketProps.lakeFormationLocations || {}).map(lfLocationName => {
          const lfLocation = (configBucketProps.lakeFormationLocations || {})[lfLocationName];
          return [
            lfLocationName,
            {
              prefix: lfLocation.prefix,
              write: lfLocation.write,
            },
          ];
        }),
      );

      const lifecycleConfiguration: LifecycleConfigurationRuleProps[] =
        configBucketProps.lifecycleConfiguration && this.lifecycleConfigurations
          ? this.lifecycleConfigurations[configBucketProps.lifecycleConfiguration]
          : [];

      return {
        ...configBucketProps,
        ...{
          bucketZone: bucketZone,
          accessPolicies: accessPolicies,
          lakeFormationLocations: lakeFormationLocations,
          lifecycleConfiguration: lifecycleConfiguration,
          corsRules: configBucketProps.corsRules
            ? DataLakeConfigParser.buildCorsRules(configBucketProps.corsRules)
            : undefined,
        },
      };
    });
  }

  private buildAccessPolicies(accessPolicyConfigs: { [key: string]: AccessPolicyConfig }): {
    [name: string]: AccessPolicyProps;
  } {
    const accessPolicies: { [name: string]: AccessPolicyProps } = {};
    Object.entries(accessPolicyConfigs).forEach(nameAndPolicyConfig => {
      const policyName: string = nameAndPolicyConfig[0];
      const policyConfig: AccessPolicyConfig = nameAndPolicyConfig[1];

      const readRoles: string[] = policyConfig.rule.ReadRoles || [];
      const readWriteRoles: string[] = policyConfig.rule.ReadWriteRoles || [];
      const readWriteSuperRoles: string[] = policyConfig.rule.ReadWriteSuperRoles || [];

      const s3Prefix: string = policyConfig.rule.prefix;

      accessPolicies[policyName] = {
        name: policyName,
        s3Prefix: s3Prefix,
        readRoleRefs: readRoles.map(x => this.roles[x]).flat(),
        readWriteRoleRefs: readWriteRoles.map(x => this.roles[x]).flat(),
        readWriteSuperRoleRefs: readWriteSuperRoles.map(x => this.roles[x]).flat(),
      };
    });
    return accessPolicies;
  }

  private buildLifecycleConfigurations(arglifecycleConfigurations: {
    [configName: string]: LifecycleConfigurationConfig;
  }): { [configName: string]: LifecycleConfigurationRuleProps[] } {
    const lifecycleConfigurationProps: { [configName: string]: LifecycleConfigurationRuleProps[] } = {};
    Object.entries(arglifecycleConfigurations).forEach(nameAndLifecycleConfig => {
      const lifecycleConfigName: string = nameAndLifecycleConfig[0];
      const lifecycleConfigConfig: LifecycleConfigurationConfig = nameAndLifecycleConfig[1];
      lifecycleConfigurationProps[lifecycleConfigName] = Object.entries(lifecycleConfigConfig).map(
        ruleNameAndRuleConfig => {
          const ruleName: string = ruleNameAndRuleConfig[0];
          const ruleConfig: LifecycleConfigurationRuleConfig = ruleNameAndRuleConfig[1];
          const transitions: LifecycleTransitionProps[] = [];
          ruleConfig.Transitions?.forEach(transitionConfig => {
            const transition: LifecycleTransitionProps = {
              days: transitionConfig.Days,
              storageClass: transitionConfig.StorageClass,
            };
            transitions.push(transition);
          });

          const noncurrentVersionTransitions: LifecycleTransitionProps[] | undefined =
            ruleConfig.NoncurrentVersionTransitions?.map(transitionConfig => {
              const transition: LifecycleTransitionProps = {
                days: transitionConfig.Days,
                storageClass: transitionConfig.StorageClass,
                newerNoncurrentVersions: transitionConfig.NewerNoncurrentVersions,
              };
              return transition;
            });

          const lifecycleConfigRule: LifecycleConfigurationRuleProps = {
            id: ruleName,
            status: ruleConfig.Status,
            prefix: ruleConfig.Prefix,
            objectSizeGreaterThan: ruleConfig.ObjectSizeGreaterThan,
            objectSizeLessThan: ruleConfig.ObjectSizeLessThan,
            abortIncompleteMultipartUploadAfter: ruleConfig.AbortIncompleteMultipartUploadAfter,
            expirationdays: ruleConfig.ExpirationDays,
            expiredObjectDeleteMarker: ruleConfig.ExpiredObjectDeleteMarker,
            noncurrentVersionExpirationDays: ruleConfig.NoncurrentVersionExpirationDays,
            noncurrentVersionsToRetain: ruleConfig.NoncurrentVersionsToRetain,
            transitions: transitions,
            noncurrentVersionTransitions: noncurrentVersionTransitions,
          };

          return lifecycleConfigRule;
        },
      );
    });
    return lifecycleConfigurationProps;
  }

  private static buildCorsRules(corsRuleConfigs: CorsRuleConfig[]): CorsRule[] {
    return corsRuleConfigs.map(config => ({
      id: config.id,
      maxAge: config.maxAge,
      allowedHeaders: config.allowedHeaders,
      allowedMethods: config.allowedMethods.map(method => HttpMethods[method]),
      allowedOrigins: config.allowedOrigins,
      exposedHeaders: config.exposedHeaders,
    }));
  }
}
