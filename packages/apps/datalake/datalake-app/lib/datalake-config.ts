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
import * as configSchema from './config-schema.json';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for individual data lake bucket setup providing access control and operational features. Defines bucket-specific settings including access policies, inventory management, event notifications, and Lake Formation integration for structured data lake operations.
 *
 * Use cases: Data lake zone configuration; Bucket-specific access control; Operational feature management
 *
 * AWS: Configures individual S3 buckets within data lake architecture with policies, notifications, and Lake Formation integration
 *
 * Validation: accessPolicies is required; all access policy names must exist in parent accessPolicies configuration
 */
export interface BucketConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of access policy names to be applied to this bucket enabling role-based access control and permission management. Links the bucket to specific access policies defined in the parent configuration for consistent permission enforcement.
   *
   * Use cases: Role-based access control; Permission policy application; Consistent access management across buckets
   *
   * AWS: AWS S3 bucket policies derived from named access policy configurations
   *
   * Validation: Must be array of strings; required; all policy names must exist in parent accessPolicies configuration
   **/
  readonly accessPolicies: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of inventory configuration names to inventory definitions enabling bucket content tracking and analysis. Provides detailed inventory reporting for compliance, cost analysis, and data governance within the data lake.
   *
   * Use cases: Bucket content tracking; Compliance reporting; Cost analysis and data governance
   *
   * AWS: AWS S3 inventory configuration for bucket content tracking and analysis
   *
   * Validation: Must be object with string keys and InventoryDefinition values if provided; enables inventory tracking
   *   **/
  readonly inventories?: { [key: string]: InventoryDefinition };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling EventBridge notifications for bucket data events allowing event-driven processing and automation. Enables integration with EventBridge rules for automated data processing workflows and event-driven architectures.
   *
   * Use cases: Event-driven data processing; Automated workflow triggers; Real-time data event handling
   *
   * AWS: Amazon S3 EventBridge notification configuration for event-driven processing
   *
   * Validation: Boolean value; enables EventBridge notifications when true; allows event-driven automation
   **/
  readonly enableEventBridgeNotifications?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of Lake Formation location names to location configurations enabling fine-grained data access control through Lake Formation. Provides table and column-level permissions for advanced data governance and access control within the data lake.
   *
   * Use cases: Fine-grained data access control; Table/column-level permissions; Advanced data governance
   *
   * AWS: AWS Lake Formation resource registration and permission management for fine-grained access
   *
   * Validation: Must be object with string keys and LakeFormationLocationConfig values if provided; enables Lake Formation integration
   *   **/
  readonly lakeFormationLocations?: { [key: string]: LakeFormationLocationConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling automatic creation of folder objects for each access policy prefix enabling organized data structure. Creates placeholder objects to establish folder structure for better data organization and navigation.
   *
   * Use cases: Data organization; Folder structure establishment; Consistent data layout across buckets
   *
   * AWS: AWS S3 object creation for folder structure and data organization
   *
   * Validation: Boolean value; defaults to true; creates folder objects for access policy prefixes when enabled
   **/
  readonly createFolderSkeleton?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle configuration name reference for automated data management and cost optimization. Links the bucket to a named lifecycle configuration for automated data archival and retention management.
   *
   * Use cases: Automated data archival; Cost optimization; Data retention management
   *
   * AWS: AWS S3 lifecycle configuration for automated object management and cost optimization
   *
   * Validation: Must be valid lifecycle configuration name if provided; configuration must exist in parent lifecycleConfigurations
   **/
  readonly lifecycleConfiguration?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling default deny behavior for roles not explicitly listed in access policies ensuring secure-by-default access control. Provides additional security by blocking access from roles not specifically granted permissions.
   *
   * Use cases: Secure-by-default access; Additional security controls; Explicit permission enforcement
   *
   * AWS: AWS S3 bucket policy deny statements for enhanced security and access control
   *
   * Validation: Boolean value; defaults to true; blocks unlisted roles when enabled for enhanced security
   **/
  readonly defaultDeny?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lake Formation location registration enabling fine-grained data access control at the S3 prefix level. Defines specific S3 locations to be registered with Lake Formation for table and column-level permission management within the data lake.
 *
 * Use cases: Fine-grained data access control; S3 prefix-level permissions; Lake Formation resource registration
 *
 * AWS: Configures AWS Lake Formation resource registration for specific S3 locations and access control
 *
 * Validation: prefix is required; write is optional boolean for access level control
 */
export interface LakeFormationLocationConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix defining the specific location within the bucket to be registered with Lake Formation. Specifies the exact path where Lake Formation will manage fine-grained access control and permissions for data governance.
   *
   * Use cases: Specific location registration; Prefix-level access control; Granular data governance
   *
   * AWS: AWS Lake Formation resource registration for specific S3 prefix locations
   *
   * Validation: Must be valid S3 prefix string; required; defines the exact location for Lake Formation management
   **/
  readonly prefix: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag granting read-write access to the Lake Formation role for this location enabling data management permissions. When enabled, provides full read and write access for data operations and management within the registered location.
   *
   * Use cases: Full data access permissions; Read-write operations; data management capabilities
   *
   * AWS: AWS Lake Formation permission grants for read-write access to registered locations
   *
   * Validation: Boolean value; optional; grants read-write access when true, read-only when false or omitted
   **/
  readonly write?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for access policy rules defining role-based permissions for specific S3 prefixes within data lake buckets. Specifies granular access control with different permission levels for different roles at the prefix level.
 *
 * Use cases: Prefix-level access control; Role-based permissions; Granular data access management
 *
 * AWS: Configures AWS S3 bucket policy conditions for role-based access control at prefix level
 *
 * Validation: prefix is required; role arrays are optional but must reference valid role names from parent configuration
 */
export interface AccessPolicyRuleConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix where this access policy rule will be applied enabling location-specific access control within buckets. Defines the specific path within the bucket where the role-based permissions will be enforced for granular data access management.
   *
   * Use cases: Location-specific access control; Prefix-based permissions; Granular data path management
   *
   * AWS: AWS S3 bucket policy prefix conditions for location-specific access control
   *
   * Validation: Must be valid S3 prefix string; required; defines the specific location for access control enforcement
   **/
  readonly prefix: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of role names that will receive read-only access to this prefix enabling controlled data consumption. Provides read access for roles that need to consume data without modification capabilities for secure data access patterns.
   *
   * Use cases: Read-only data access; Data consumption; Secure data viewing without modification
   *
   * AWS: AWS S3 bucket policy allow statements for read-only access to specific prefixes
   *
   * Validation: Must be array of valid role names if provided; roles must exist in parent roles configuration
   **/
  readonly ReadRoles?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of role names that will receive read-write access to this prefix enabling full data operations. Provides data access for roles that need to both consume and modify data within the specified prefix.
   *
   * Use cases: Full data operations; Data modification; data management capabilities
   *
   * AWS: AWS S3 bucket policy allow statements for read-write access to specific prefixes
   *
   * Validation: Must be array of valid role names if provided; roles must exist in parent roles configuration
   **/
  readonly ReadWriteRoles?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of role names that will receive superuser access to this prefix enabling administrative operations including policy management. Provides full administrative access including the ability to manage access policies and perform administrative operations.
   *
   * Use cases: Administrative operations; Policy management; Full administrative control over prefix data
   *
   * AWS: AWS S3 bucket policy allow statements for administrative access to specific prefixes
   *
   * Validation: Must be array of valid role names if provided; roles must exist in parent roles configuration
   **/
  readonly ReadWriteSuperRoles?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for named access policies containing access rules for data lake bucket permissions. Wraps access policy rules to create reusable, named permission sets that can be applied to multiple buckets within the data lake architecture.
 *
 * Use cases: Reusable permission sets; Named access policies; Consistent access control across buckets
 *
 * AWS: Configures named AWS S3 bucket policy configurations for reusable access control patterns
 *
 * Validation: rule is required and must be valid AccessPolicyRuleConfig
 */
export interface AccessPolicyConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required access policy rule configuration defining the specific permissions and roles for this named policy. Contains the detailed permission specifications including prefixes, roles, and access levels that will be applied when this policy is referenced.
   *
   * Use cases: Permission specification; Role-based access definition; Detailed access control configuration
   *
   * AWS: AWS S3 bucket policy rule configuration for specific permission patterns
   *
   * Validation: Must be valid AccessPolicyRuleConfig; required; defines all permission specifications for this policy
   **/
  readonly rule: AccessPolicyRuleConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for S3 lifecycle transition rules enabling automated data archival and cost optimization. Defines specific transition rules for moving objects between storage classes based on age and access patterns for cost-effective data management.
 *
 * Use cases: Automated data archival; Cost optimization; Storage class transitions based on data age
 *
 * AWS: Configures AWS S3 lifecycle transition rules for automated object storage class management
 *
 * Validation: Days and StorageClass are required; NewerNoncurrentVersions is optional
 */
export interface LifecycleTransitionConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of days after object creation when the transition to the specified storage class will occur. Defines the age threshold for automatic data archival and storage class optimization within the lifecycle management strategy.
   *
   * Use cases: Age-based archival; Automated storage optimization; Cost-effective data lifecycle management
   *
   * AWS: AWS S3 lifecycle rule transition days for automated storage class changes
   *
   * Validation: Must be positive integer; required; defines the age threshold for storage class transition
   **/
  readonly Days: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required target storage class for the lifecycle transition enabling cost optimization through appropriate storage tiers. Specifies the destination storage class for objects meeting the age criteria for automated cost optimization.
   *
   * Use cases: Storage class optimization; Cost reduction; Appropriate storage tier selection
   *
   * AWS: AWS S3 storage classes for lifecycle transition targets and cost optimization
   *
   * Validation: Must be valid S3 storage class name; required; defines target storage class for transition
   **/
  readonly StorageClass: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of newer noncurrent versions to retain before applying transition rules enabling version-aware lifecycle management. Provides control over version retention during lifecycle transitions for data protection and compliance.
   *
   * Use cases: Version-aware lifecycle management; Data protection during transitions; Compliance-driven version retention
   *
   * AWS: AWS S3 lifecycle rule noncurrent version transition controls for version management
   *
   * Validation: Must be non-negative integer if provided; controls version retention during transitions
   **/
  readonly NewerNoncurrentVersions?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for S3 lifecycle configuration rules enabling automated data management and cost optimization. Defines complete lifecycle behavior including transitions, expiration, and version management for efficient data lake operations.
 *
 * Use cases: Comprehensive data lifecycle management; Automated cost optimization; Data retention and expiration policies
 *
 * AWS: Configures AWS S3 lifecycle configuration rules for complete automated object management
 *
 * Validation: Status is required; all other properties are optional for flexible lifecycle configuration
 */
export interface LifecycleConfigurationRuleConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required status of the lifecycle rule enabling or disabling the rule for lifecycle management. Controls whether the lifecycle rule is active and will be applied to objects matching the rule criteria.
   *
   * Use cases: Rule activation control; Lifecycle management enablement; Rule-specific configuration control
   *
   * AWS: AWS S3 lifecycle rule status for rule activation and management
   *
   * Validation: Must be "Enabled" or "Disabled"; required; controls rule activation and application
   **/
  readonly Status: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 prefix filter for applying lifecycle rules to specific object paths enabling targeted lifecycle management. Restricts the lifecycle rule application to objects with specific prefixes for granular lifecycle control.
   *
   * Use cases: Targeted lifecycle management; Prefix-specific rules; Granular object lifecycle control
   *
   * AWS: AWS S3 lifecycle rule prefix filter for targeted object management
   *
   * Validation: Must be valid S3 prefix string if provided; restricts rule application to specific object paths
   **/
  readonly Prefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum object size filter for lifecycle rule application enabling size-based lifecycle management. Applies lifecycle rules only to objects larger than the specified size for appropriate lifecycle handling.
   *
   * Use cases: Size-based lifecycle management; Large object handling; Appropriate lifecycle rule application
   *
   * AWS: AWS S3 lifecycle rule object size filter for size-based management
   *
   * Validation: Must be positive integer if provided; defines minimum object size for rule application
   **/
  readonly ObjectSizeGreaterThan?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum object size filter for lifecycle rule application enabling size-based lifecycle management. Applies lifecycle rules only to objects smaller than the specified size for appropriate lifecycle handling.
   *
   * Use cases: Size-based lifecycle management; Small object handling; Appropriate lifecycle rule application
   *
   * AWS: AWS S3 lifecycle rule object size filter for size-based management
   *
   * Validation: Must be positive integer if provided; defines maximum object size for rule application
   **/
  readonly ObjectSizeLessThan?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of days after which incomplete multipart uploads will be automatically aborted enabling storage cleanup and cost control. Prevents incomplete uploads from consuming storage indefinitely and incurring unnecessary costs.
   *
   * Use cases: Storage cleanup; Cost control; Incomplete upload management
   *
   * AWS: AWS S3 lifecycle rule abort incomplete multipart upload for storage cleanup
   *
   * Validation: Must be positive integer if provided; defines cleanup period for incomplete uploads
   **/
  readonly AbortIncompleteMultipartUploadAfter?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of transition configurations for current object versions enabling automated storage class optimization. Defines multiple transition rules for moving objects through different storage classes based on age for cost optimization.
   *
   * Use cases: Multi-tier storage optimization; Automated cost reduction; Progressive data archival
   *
   * AWS: AWS S3 lifecycle rule transitions for automated storage class management
   *
   * Validation: Must be array of valid LifecycleTransitionConfig if provided; defines storage class transitions
   **/
  readonly Transitions?: LifecycleTransitionConfig[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of days after which current object versions will be automatically deleted enabling data retention management. Provides automatic cleanup of old data for compliance and cost control within the data lifecycle strategy.
   *
   * Use cases: Data retention management; Automatic cleanup; Compliance-driven data expiration
   *
   * AWS: AWS S3 lifecycle rule expiration for automated object deletion
   *
   * Validation: Must be positive integer if provided; defines retention period before automatic deletion
   **/
  readonly ExpirationDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling automatic deletion of expired object delete markers for storage optimization. Removes unnecessary delete markers to reduce storage costs and improve bucket performance in versioned buckets.
   *
   * Use cases: Storage optimization; Delete marker cleanup; Versioned bucket performance improvement
   *
   * AWS: AWS S3 lifecycle rule expired object delete marker removal for optimization
   *
   * Validation: Boolean value; enables delete marker cleanup when true for storage optimization
   **/
  readonly ExpiredObjectDeleteMarker?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of transition configurations for noncurrent object versions enabling version-aware storage optimization. Defines transition rules for older versions of objects to optimize storage costs while maintaining version history.
   *
   * Use cases: Version-aware storage optimization; Historical data archival; Cost-effective version management
   *
   * AWS: AWS S3 lifecycle rule noncurrent version transitions for version management
   *
   * Validation: Must be array of valid LifecycleTransitionConfig if provided; defines version transition rules
   **/
  readonly NoncurrentVersionTransitions?: LifecycleTransitionConfig[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of days after which noncurrent object versions will be automatically deleted enabling version retention management. Provides automatic cleanup of old object versions for compliance and cost control.
   *
   * Use cases: Version retention management; Automatic version cleanup; Cost control for versioned objects
   *
   * AWS: AWS S3 lifecycle rule noncurrent version expiration for version management
   *
   * Validation: Must be positive integer if provided; defines retention period for noncurrent versions
   **/
  readonly NoncurrentVersionExpirationDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of noncurrent versions to retain before applying expiration rules enabling controlled version history management. Maintains a specified number of object versions while allowing older versions to be automatically cleaned up for balanced version management.
   *
   * Use cases: Controlled version history; Balanced version management; Version retention with cleanup
   *
   * AWS: AWS S3 lifecycle rule noncurrent version retention for controlled version management
   *
   * Validation: Must be non-negative integer if provided; defines number of versions to retain before cleanup
   **/
  readonly NoncurrentVersionsToRetain?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for named lifecycle configuration collections enabling reusable lifecycle rule sets. Organizes multiple lifecycle rules under named configurations that can be applied to different buckets within the data lake architecture.
 *
 * Use cases: Reusable lifecycle rule sets; Named lifecycle configurations; Consistent lifecycle management across buckets
 *
 * AWS: Configures named collections of AWS S3 lifecycle rules for reusable lifecycle management patterns
 *
 * Validation: Must be object with string keys and LifecycleConfigurationRuleConfig values
 */
export interface LifecycleConfigurationConfig {
  [ruleName: string]: LifecycleConfigurationRuleConfig;
}

export interface DataLakeConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of named role references for use in access policies enabling role-based access control across data lake buckets. Each role name can reference multiple physical IAM roles for flexible access management and cross-account scenarios.
   *
   * Use cases: Role-based access control; Cross-account data access; Flexible permission management; Multi-role access patterns
   *
   * AWS: AWS IAM role references for S3 bucket policy conditions and LakeFormation permissions
   *
   * Validation: Must be object with string keys and MdaaRoleRef array values; roles referenced in access policies must be defined
   *   **/
  readonly roles: { [key: string]: MdaaRoleRef[] };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of named access policies defining permission sets for data lake buckets. Each policy specifies read, write, and administrative access for different roles and S3 prefixes within the data lake architecture.
   *
   * Use cases: Granular access control; Prefix-based permissions; Role-based data access
   *
   * AWS: AWS S3 bucket policies and LakeFormation permissions for data access control
   *
   * Validation: Must be object with string keys and AccessPolicyConfig values; policies referenced in buckets must be defined
   *   **/
  readonly accessPolicies: { [key: string]: AccessPolicyConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of named lifecycle configurations for automated data management and cost optimization. Defines rules for transitioning data between storage classes and expiring old data based on age and access patterns.
   *
   * Use cases: Cost optimization; Automated data archival; Compliance-driven data retention
   *
   * AWS: AWS S3 lifecycle configuration rules for automated object management
   *
   * Validation: Must be object with string keys and LifecycleConfigurationConfig values if provided
   *   **/
  readonly lifecycleConfigurations?: { [configName: string]: LifecycleConfigurationConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of named bucket definitions that define the structure and configuration of the data lake. Each bucket represents a different zone or purpose within the data lake with specific access policies and operational features.
   *
   * Use cases: Multi-zone data lake structure; Raw/processed/curated data separation; Zone-specific configurations
   *
   * AWS: AWS S3 bucket creation and configuration for structured data lake architecture
   *
   * Validation: Must be object with string keys and BucketConfig values; bucket names must be unique
   *   **/
  readonly buckets: { [key: string]: BucketConfig };
}

export class DataLakeConfigParser extends MdaaAppConfigParser<DataLakeConfigContents> {
  public readonly roles: { [key: string]: MdaaRoleRef[] };
  public readonly buckets: BucketDefinition[];
  public readonly accessPolicies: { [name: string]: AccessPolicyProps };
  public readonly lifecycleConfigurations?: { [configName: string]: LifecycleConfigurationRuleProps[] };
  public readonly inventories?: { [key: string]: string };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.roles = 'roles' in this.configContents ? this.configContents['roles'] : {};
    this.accessPolicies =
      'accessPolicies' in this.configContents ? this.buildAccessPolicies(this.configContents.accessPolicies) : {};
    this.lifecycleConfigurations = this.configContents.lifecycleConfigurations
      ? this.buildLifecycleConfigurations(this.configContents.lifecycleConfigurations)
      : undefined;

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
}
