/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { BucketInventory, InventoryHelper } from '@aws-mdaa/s3-inventory-helper';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnResource } from 'aws-cdk-lib/aws-lakeformation';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  Bucket,
  CfnBucket,
  IBucket,
  LifecycleRule,
  NoncurrentVersionTransition,
  StorageClass,
  Transition,
} from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for S3 inventory generation targeting specific prefixes within data lake buckets. Enables automated inventory reporting for data governance, cost analysis, and compliance auditing of data lake contents with configurable scope and scheduling.
 *
 * Use cases: Data governance reporting; Cost analysis by prefix; Compliance auditing of data lake contents
 *
 * AWS: Configures AWS S3 inventory for automated bucket content reporting and analysis
 *
 * Validation: prefix must be valid S3 object prefix; inventoryName must be valid inventory configuration name
 */
export interface InventoryDefinition {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix that will be included in the inventory report for targeted content analysis. Enables focused inventory generation on specific data lake sections for efficient governance and cost analysis.
   *
   * Use cases: Targeted inventory generation; Specific data section analysis; Focused governance reporting
   *
   * AWS: S3 inventory prefix filter for targeted bucket content reporting
   *
   * Validation: Must be valid S3 object prefix; required; defines scope of inventory generation
   **/
  readonly prefix: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional destination bucket for inventory report storage enabling centralized inventory management. If not specified, inventory reports are written back to the source bucket under /inventory prefix for local storage.
   *
   * Use cases: Centralized inventory management; Cross-bucket inventory storage; Inventory report organization
   *
   * AWS: S3 inventory destination bucket for centralized report storage
   *
   * Validation: Must be valid S3 bucket name if provided; defaults to source bucket
   **/
  readonly destinationBucket?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 prefix for inventory report organization within the destination bucket. Enables structured inventory report storage and prevents conflicts with other bucket contents.
   *
   * Use cases: Inventory report organization; Structured storage; Conflict prevention
   *
   * AWS: S3 inventory destination prefix for organized report storage
   *
   * Validation: Must be valid S3 object prefix if provided; defaults to /inventory
   **/
  readonly destinationPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS account ID for destination bucket ownership validation ensuring secure inventory delivery. Used by S3 service to validate bucket ownership before writing inventory reports for cross-account scenarios.
   *
   * Use cases: Cross-account inventory delivery; Bucket ownership validation; Secure inventory storage
   *
   * AWS: S3 inventory destination account validation for secure cross-account delivery
   *
   * Validation: Must be valid 12-digit AWS account ID if provided; used for ownership validation
   **/
  readonly destinationAccount?: string;
}

export interface LakeFormationLocation {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix that will be registered as a LakeFormation location for fine-grained access control. Defines the specific path within the bucket that will be subject to table-level and column-level permissions through LakeFormation.
   *
   * Use cases: Fine-grained access control; Table-level permissions; Specific path access management
   *
   * AWS: LakeFormation location registration for S3 prefix-based access control
   *
   * Validation: Must be valid S3 object prefix; required; used for LakeFormation location registration
   **/
  readonly prefix: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag granting write access to the LakeFormation role in addition to read permissions. When enabled, allows data modification operations through LakeFormation-controlled access for data processing workflows.
   *
   * Use cases: Data processing workflows; Write access control; LakeFormation permission management
   *
   * AWS: LakeFormation location permissions for read and write access control
   *
   * Validation: Boolean value; defaults to false (read-only); enables write access when true
   **/
  readonly write?: boolean;
}

export interface BucketDefinition {
  readonly bucketZone: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of access policy configurations that define permissions for different roles and S3 prefixes within the bucket. Each policy specifies read, write, and administrative access patterns for secure data lake operations.
   *
   * Use cases: Role-based access control; Prefix-specific permissions; Secure data lake operations
   *
   * AWS: S3 bucket policies and IAM permissions for granular data access control
   *
   * Validation: Must be array of valid AccessPolicyProps objects; required; defines bucket access patterns
   **/
  readonly accessPolicies: AccessPolicyProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of S3 lifecycle configuration rules for automated data management and cost optimization. Defines transitions between storage classes and expiration policies based on data age and access patterns.
   *
   * Use cases: Cost optimization; Automated data archival; Compliance-driven data retention
   *
   * AWS: S3 lifecycle configuration for automated object management and cost control
   *
   * Validation: Must be array of valid LifecycleConfigurationRuleProps objects if provided
   **/
  readonly lifecycleConfiguration?: LifecycleConfigurationRuleProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of inventory configurations for automated bucket content reporting and analysis. Enables data governance, cost analysis, and compliance auditing through scheduled inventory generation.
   *
   * Use cases: Data governance reporting; Cost analysis; Compliance auditing of bucket contents
   *
   * AWS: S3 inventory configuration for automated bucket content reporting
   *
   * Validation: Must be object with string keys and InventoryDefinition values if provided
   *   **/
  readonly inventories?: { [key: string]: InventoryDefinition };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling EventBridge notifications for bucket data events allowing integration with event-driven architectures. Enables real-time processing workflows and automated responses to data changes.
   *
   * Use cases: Event-driven data processing; Real-time workflow triggers; Automated data pipeline activation
   *
   * AWS: S3 EventBridge notification configuration for event-driven architecture integration
   *
   * Validation: Boolean value; enables EventBridge notifications when true
   **/
  readonly enableEventBridgeNotifications?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of LakeFormation location configurations for fine-grained access control registration. Enables table-level and column-level permissions through LakeFormation for enhanced data security and governance.
   *
   * Use cases: Fine-grained access control; Table-level permissions; Enhanced data security and governance
   *
   * AWS: LakeFormation location registration for granular data access control
   *
   * Validation: Must be object with string keys and LakeFormationLocation values if provided
   *   **/
  readonly lakeFormationLocations?: { [key: string]: LakeFormationLocation };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling automatic creation of folder structure based on access policy prefixes. When enabled, creates organized folder hierarchy for improved data organization and user navigation.
   *
   * Use cases: Data organization; User navigation; Structured folder hierarchy
   *
   * AWS: S3 object creation for folder structure organization and user experience
   *
   * Validation: Boolean value; defaults to true; creates folder objects when enabled
   **/
  readonly createFolderSkeleton?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling default deny behavior for unlisted roles ensuring secure bucket access by default. When true (default), any roles not explicitly listed in access policies are blocked from accessing bucket objects for enhanced security posture.
   *
   * Use cases: Security by default; Access control enforcement; Unauthorized access prevention
   *
   * AWS: S3 bucket policy deny statements for unlisted roles and enhanced access control
   *
   * Validation: Boolean value; defaults to true; blocks unlisted roles when enabled for security
   **/
  readonly defaultDeny?: boolean;
}

export interface AccessPolicyProps {
  /**
   * Name of the access policy
   */
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 object prefix path defining the scope of access permissions within data lake buckets. Specifies the directory-like path structure where the access policy rules will be applied, enabling fine-grained access control for different data domains or datasets within the same bucket.
   *
   * Use cases: Fine-grained data access control; Dataset-specific permissions; Multi-tenant data organization; Domain-based data segregation
   * AWS: S3 bucket policy prefix condition for object-level access control in data lake buckets
   * Validation: Must be valid S3 prefix path; typically starts with '/' for root-level organization
   *   */
  readonly s3Prefix: string;
  /**
   * List of role ids which will be granted readonly access to the S3 prefix
   */
  readonly readRoleRefs?: MdaaRoleRef[];
  /**
   * List of role ids which will be granted read/write access to the S3 prefix
   */
  readonly readWriteRoleRefs?: MdaaRoleRef[];
  /**
   * List of role ids which will be granted superuser access to the S3 prefix
   */
  readonly readWriteSuperRoleRefs?: MdaaRoleRef[];
}
interface AccessPolicyResolved {
  readonly name: string;
  readonly s3Prefix: string;
  readonly readRoleIds: string[];
  readonly readWriteRoleIds: string[];
  readonly readWriteSuperRoleIds: string[];
  readonly defaultDeny?: boolean;
}
export interface LifecycleTransitionProps {
  readonly days: number;
  readonly storageClass: string;
  readonly newerNoncurrentVersions?: number;
}
export interface LifecycleConfigurationRuleProps {
  readonly id: string;
  readonly status: string;
  readonly prefix?: string;
  readonly objectSizeGreaterThan?: number;
  readonly objectSizeLessThan?: number;
  readonly abortIncompleteMultipartUploadAfter?: number;
  readonly transitions?: LifecycleTransitionProps[];
  readonly expirationdays?: number;
  readonly expiredObjectDeleteMarker?: boolean;
  readonly noncurrentVersionTransitions?: LifecycleTransitionProps[];
  readonly noncurrentVersionExpirationDays?: number;
  readonly noncurrentVersionsToRetain?: number;
}
export interface DataLakeL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of bucket definitions that define the structure and configuration of the data lake. Each bucket represents a different zone or purpose within the data lake architecture with specific access policies and lifecycle configurations.
   *
   * Use cases: Multi-zone data lake structure; Raw/processed/curated data separation; Zone-specific access controls
   *
   * AWS: AWS S3 bucket creation and configuration for structured data lake architecture
   *
   * Validation: Must be array of valid BucketDefinition objects; each bucket must have unique bucketZone identifier
   *   **/
  readonly buckets: BucketDefinition[];
}

export class S3DatalakeBucketL3Construct extends MdaaL3Construct {
  protected readonly props: DataLakeL3ConstructProps;

  private dataLakeFolderProvider?: Provider;
  public readonly buckets: { [key: string]: IBucket };
  public readonly kmsKey: IKey;
  constructor(scope: Construct, id: string, props: DataLakeL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    //Create a Glue Database to contain bucket utility tables such as inventory
    const glueUtilDatabase = new Database(this.scope, 'util-database', {
      databaseName: props.naming.resourceName('util').replace(/-/gi, '_'),
    });

    const dataLakeFolderFunctionRole = new MdaaLambdaRole(this.scope, 'folder-function-role', {
      description: 'CR Role',
      roleName: 'folder-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('folder-cr')],
      createParams: false,
      createOutputs: false,
    });

    const lakeFormationRole = new MdaaRole(this.scope, 'lake-formation-role', {
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
      roleName: 'lake-formation',
      description: 'Role for accessing the data lake via LakeFormation.',
    });
    this.props.buckets.sort((a, b) => a.bucketZone.localeCompare(b.bucketZone));
    const allRoleIds = this.props.buckets.flatMap(bucketProps => {
      bucketProps.accessPolicies.sort((a, b) => a.s3Prefix.localeCompare(b.s3Prefix));
      return bucketProps.accessPolicies
        .flatMap(ap => this.resolveAccessPolicy(ap))
        .flatMap(ap => [...ap.readRoleIds, ...ap.readWriteRoleIds, ...ap.readWriteSuperRoleIds]);
    });

    this.kmsKey = this.createDataLakeKmsKey([
      dataLakeFolderFunctionRole.roleId,
      lakeFormationRole.roleId,
      ...allRoleIds,
    ]);

    // Iterate over all the buckets we need to create
    this.buckets = Object.fromEntries(
      this.props.buckets.map(bucketDefinition => {
        const bucket = this.createBucket(
          bucketDefinition,
          this.kmsKey,
          props.naming,
          glueUtilDatabase,
          dataLakeFolderFunctionRole,
          this.getDataLakeFolderCrProvider(dataLakeFolderFunctionRole),
          lakeFormationRole,
        );
        return [bucketDefinition.bucketZone, bucket];
      }),
    );
  }

  private resolveAccessPolicy(accessPolicy: AccessPolicyProps): AccessPolicyResolved {
    return {
      name: accessPolicy.name,
      s3Prefix: accessPolicy.s3Prefix,
      readRoleIds: this.props.roleHelper
        .resolveRoleRefsWithOrdinals(accessPolicy.readRoleRefs || [], `${accessPolicy.name}-r`)
        .map(x => x.id()),
      readWriteRoleIds: this.props.roleHelper
        .resolveRoleRefsWithOrdinals(accessPolicy.readWriteRoleRefs || [], `${accessPolicy.name}-rw`)
        .map(x => x.id()),
      readWriteSuperRoleIds: this.props.roleHelper
        .resolveRoleRefsWithOrdinals(accessPolicy.readWriteSuperRoleRefs || [], `${accessPolicy.name}-rws`)
        .map(x => x.id()),
    };
  }

  private resolveTransitions(transitionsWithName: LifecycleTransitionProps[]): Transition[] {
    return Object.entries(transitionsWithName).map(transitionWithName => {
      const transition = transitionWithName[1];
      const lifecycleTransitionResolved: Transition = {
        storageClass: new StorageClass(transition.storageClass),
        transitionAfter: Duration.days(transition.days),
      };
      return lifecycleTransitionResolved;
    });
  }

  private resolveNoncurrentVersionTransitions(
    transitionsWithName: LifecycleTransitionProps[],
  ): NoncurrentVersionTransition[] {
    return Object.entries(transitionsWithName).map(transitionWithName => {
      const transition = transitionWithName[1];
      const lifecycleTransitionResolved: NoncurrentVersionTransition = {
        storageClass: new StorageClass(transition.storageClass),
        transitionAfter: Duration.days(transition.days),
        noncurrentVersionsToRetain: transition.newerNoncurrentVersions ? transition.newerNoncurrentVersions : undefined,
      };
      return lifecycleTransitionResolved;
    });
  }

  private resolveLifecycleConfigurationRules(
    lifecycleConfigurationRulesWithName: LifecycleConfigurationRuleProps[],
  ): LifecycleRule[] {
    return Object.entries(lifecycleConfigurationRulesWithName).map(lifecycleConfigurationRuleWithName => {
      const lifecycleConfigurationRule = lifecycleConfigurationRuleWithName[1];
      const lifecycleConfigurationRuleResolved: LifecycleRule = {
        ...lifecycleConfigurationRule,
        ...{
          enabled: lifecycleConfigurationRule.status.toLowerCase() === 'enabled',
          abortIncompleteMultipartUploadAfter: lifecycleConfigurationRule.abortIncompleteMultipartUploadAfter
            ? Duration.days(lifecycleConfigurationRule.abortIncompleteMultipartUploadAfter)
            : undefined,
          transitions: lifecycleConfigurationRule.transitions
            ? this.resolveTransitions(lifecycleConfigurationRule.transitions)
            : undefined,
          expiration: lifecycleConfigurationRule.expirationdays
            ? Duration.days(lifecycleConfigurationRule.expirationdays)
            : undefined,
          noncurrentVersionTransitions: lifecycleConfigurationRule.noncurrentVersionTransitions
            ? this.resolveNoncurrentVersionTransitions(lifecycleConfigurationRule.noncurrentVersionTransitions)
            : undefined,
          noncurrentVersionExpiration: lifecycleConfigurationRule.noncurrentVersionExpirationDays
            ? Duration.days(lifecycleConfigurationRule.noncurrentVersionExpirationDays)
            : undefined,
        },
      };
      return lifecycleConfigurationRuleResolved;
    });
  }

  private createBucket(
    bucketDefinition: BucketDefinition,
    encryptionKey: IMdaaKmsKey,
    naming: IMdaaResourceNaming,
    glueUtilDatabase: Database,
    dataLakeFolderFunctionRole: IRole,
    dataLakeFolderProvider: Provider,
    lakeFormationRole: MdaaRole,
  ): IBucket {
    const bucket = new MdaaBucket(this.scope, `bucket-${bucketDefinition.bucketZone}`, {
      encryptionKey: encryptionKey,
      bucketName: bucketDefinition.bucketZone,
      naming: naming,
    });

    this.createBucketInventories(bucketDefinition, bucket, glueUtilDatabase);
    this.createLakeFormationLocations(bucketDefinition, bucket, lakeFormationRole);

    // Iterate over the accessPolicies and add to the bucket
    const bucketAllowIds: string[] = [lakeFormationRole.roleId];

    const folderCreatePrefixes: string[] = [];
    bucketDefinition.accessPolicies
      .map(ap => this.resolveAccessPolicy(ap))
      .forEach(accessPolicy => {
        const s3Prefix = accessPolicy.s3Prefix;

        //Apply bucket policy restrictions for Object prefixes
        const prefixRestrictPolicies = new RestrictObjectPrefixToRoles({
          s3Bucket: bucket,
          s3Prefix: s3Prefix,
          readRoleIds: accessPolicy.readRoleIds,
          readWriteRoleIds: accessPolicy.readWriteRoleIds,
          readWriteSuperRoleIds: accessPolicy.readWriteSuperRoleIds,
        });
        prefixRestrictPolicies.statements().forEach(statement => bucket.addToResourcePolicy(statement));

        // Add the ARNs from this loop to bucketAllowArns
        bucketAllowIds.push(
          ...[...accessPolicy.readRoleIds, ...accessPolicy.readWriteRoleIds, ...accessPolicy.readWriteSuperRoleIds],
        );
        folderCreatePrefixes.push(
          ...this.createFolderPrefix(s3Prefix, bucketDefinition, accessPolicy, dataLakeFolderProvider, bucket),
        );
      });

    this.createFolderPrefixes(folderCreatePrefixes, bucket, dataLakeFolderFunctionRole);

    this.addBucketRestrictPolicy(bucketDefinition, bucket, bucketAllowIds, dataLakeFolderFunctionRole);

    this.addBucketLifecyclePolicy(bucketDefinition, bucket);

    this.addBucketEventBridgeNotification(bucketDefinition, bucket);

    return bucket;
  }

  private addBucketEventBridgeNotification(bucketDefinition: BucketDefinition, bucket: Bucket) {
    //Enable EventBridge notifications
    if (bucketDefinition.enableEventBridgeNotifications && bucketDefinition.enableEventBridgeNotifications.valueOf()) {
      const cfnBucket = bucket.node.defaultChild as CfnBucket;
      cfnBucket.addPropertyOverride('NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled', true);
    }
  }

  private addBucketLifecyclePolicy(bucketDefinition: BucketDefinition, bucket: Bucket) {
    // Add S3 Lifecycle Policy
    if (bucketDefinition.lifecycleConfiguration) {
      this.resolveLifecycleConfigurationRules(bucketDefinition.lifecycleConfiguration).forEach(lifecycleRule => {
        bucket.addLifecycleRule(lifecycleRule);
      });
    }
  }

  private createFolderPrefixes(folderCreatePrefixes: string[], bucket: Bucket, dataLakeFolderFunctionRole: IRole) {
    if (folderCreatePrefixes.length > 0) {
      //Allow folder custom resource provider role to create folders in the bucket
      const resources = folderCreatePrefixes.map(s3Prefix => {
        let rawPrefix = s3Prefix;
        // Removes trailing slashes
        rawPrefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
        // Removes leading slashes
        rawPrefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
        return `${bucket.bucketArn}/${rawPrefix}/`;
      });
      const createFolderPolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: resources,
        actions: ['s3:PutObject'],
      });
      createFolderPolicyStatement.addArnPrincipal(dataLakeFolderFunctionRole.roleArn);
      bucket.addToResourcePolicy(createFolderPolicyStatement);
    }
  }

  private createFolderPrefix(
    s3Prefix: string,
    bucketDefinition: BucketDefinition,
    accessPolicy: AccessPolicyResolved,
    dataLakeFolderProvider: Provider,
    bucket: Bucket,
  ): string[] {
    if (
      s3Prefix != '/' &&
      (bucketDefinition.createFolderSkeleton == undefined || bucketDefinition.createFolderSkeleton.valueOf())
    ) {
      const folderResource = new CustomResource(
        this.scope,
        `datalake-folder-${bucketDefinition.bucketZone}-${accessPolicy.name}`,
        {
          serviceToken: dataLakeFolderProvider.serviceToken,
          properties: {
            bucket_name: bucket.bucketName,
            folder_name: s3Prefix,
          },
        },
      );
      folderResource.node.addDependency(bucket.node.findChild('Policy'));
      return [s3Prefix];
    }
    return [];
  }

  private addBucketRestrictPolicy(
    bucketDefinition: BucketDefinition,
    bucket: MdaaBucket,
    bucketAllowIds: string[],
    dataLakeFolderFunctionRole: IRole,
  ) {
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: bucket,
      // De-duplicate our list of Arns.
      roleExcludeIds: [...new Set(bucketAllowIds)],
      principalExcludes: [dataLakeFolderFunctionRole.roleArn],
      prefixExcludes: ['inventory/'],
    });

    bucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);
    if (!('defaultDeny' in bucketDefinition) || bucketDefinition.defaultDeny) {
      bucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    }
  }

  private createLakeFormationLocations(bucketDefinition: BucketDefinition, bucket: IBucket, lakeFormationRole: IRole) {
    //Add Lake Formation locations
    if (bucketDefinition.lakeFormationLocations) {
      Object.keys(bucketDefinition.lakeFormationLocations).forEach(locationName => {
        const locationProps = (bucketDefinition.lakeFormationLocations || {})[locationName];
        this.createLakeFormationLocation(
          locationName,
          locationProps,
          bucketDefinition.bucketZone,
          bucket,
          lakeFormationRole,
        );
      });
    }
  }

  private createBucketInventories(bucketDefinition: BucketDefinition, bucket: Bucket, glueUtilDatabase: Database) {
    if (bucketDefinition.inventories) {
      const bucketInventories: BucketInventory[] = [];
      Object.keys(bucketDefinition.inventories).forEach(invName => {
        const inventoryDefinition = (bucketDefinition.inventories || {})[invName];
        const inventory = this.createInventory(
          invName,
          inventoryDefinition,
          bucketDefinition.bucketZone,
          bucketInventories,
        );
        bucket.addInventory(inventory);
      });
      if (bucketInventories.length > 0) {
        InventoryHelper.createGlueInvTable(
          this.scope,
          this.account,
          bucketDefinition.bucketZone,
          glueUtilDatabase,
          this.props.naming.resourceName(bucketDefinition.bucketZone),
          bucketInventories,
          'inventory/',
        );
      }
      const allowInventoryStatement = InventoryHelper.createInventoryBucketPolicyStatement(
        bucket.bucketArn,
        this.account,
        bucket.bucketArn,
        'inventory/',
      );
      bucket.addToResourcePolicy(allowInventoryStatement);
    }
  }

  private createLakeFormationLocation(
    locationName: string,
    locationProps: LakeFormationLocation,
    bucketZone: string,
    bucket: IBucket,
    lakeFormationRole: IRole,
  ) {
    new CfnResource(this.scope, `lf-resource-${bucketZone}-${locationName}`, {
      resourceArn: `${bucket.bucketArn}/${MdaaBucket.formatS3Prefix(locationProps.prefix)}`,
      useServiceLinkedRole: false,
      roleArn: lakeFormationRole.roleArn,
    });

    const permissions = locationProps.write?.valueOf
      ? {
          readWritePrincipals: [lakeFormationRole],
        }
      : {
          readPrincipals: [lakeFormationRole],
        };

    //Add Access for the LF Role to the Prefix
    const lfPrefixRestrictPolicies = new RestrictObjectPrefixToRoles({
      s3Bucket: bucket,
      s3Prefix: locationProps.prefix,
      ...permissions,
    });

    lfPrefixRestrictPolicies.statements().forEach(statement => bucket.addToResourcePolicy(statement));
  }

  private createInventory(
    invName: string,
    inventoryDefinition: InventoryDefinition,
    bucketZone: string,
    bucketInventories: BucketInventory[],
  ) {
    let destinationBucketName: string;
    let destinationPrefix: string;

    if (inventoryDefinition.destinationBucket) {
      //Remote destination bucket
      destinationBucketName = inventoryDefinition.destinationBucket;
      destinationPrefix = inventoryDefinition.destinationPrefix ? inventoryDefinition.destinationPrefix : 'inventory/';
    } else {
      //Write inventory to this bucket
      if (inventoryDefinition.destinationPrefix) {
        throw new Error('destinationPrefix should be set only if destinationBucket is set');
      }
      destinationBucketName = this.props.naming.resourceName(bucketZone);
      destinationPrefix = 'inventory/';
      bucketInventories.push({ bucketName: destinationBucketName, inventoryName: invName });
    }
    const destinationBucket: IBucket = MdaaBucket.fromBucketName(
      this,
      `InvDestinationBucket${bucketZone}${invName}`,
      destinationBucketName,
    );
    return InventoryHelper.createInvConfig(
      destinationBucket,
      invName,
      inventoryDefinition.prefix,
      destinationPrefix,
      inventoryDefinition.destinationAccount,
    );
  }

  private getDataLakeFolderCrProvider(folderCrFunctionRole: MdaaLambdaRole): Provider {
    if (this.dataLakeFolderProvider) {
      return this.dataLakeFolderProvider;
    }
    const sourceDir = `${__dirname}/../src/python/datalake_folder`;
    // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
    const datalakeFolderLambda = new MdaaLambdaFunction(this.scope, 'folder-cr-function', {
      functionName: 'folder-cr',
      code: Code.fromAsset(sourceDir),
      handler: 'datalake_folder.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(120),
      role: folderCrFunctionRole,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      environment: {
        LOG_LEVEL: 'INFO',
      },
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      datalakeFolderLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );

    const folderCrProviderFunctionName = this.props.naming.resourceName('folder-cr-prov', 64);
    const folderCrProviderRole = new MdaaLambdaRole(this.scope, 'folder-provider-role', {
      description: 'CR Role',
      roleName: 'folder-provider-role',
      naming: this.props.naming,
      logGroupNames: [folderCrProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });

    const datalakeFolderProvider = new Provider(this.scope, 'datalake-folder-cr-provider', {
      providerFunctionName: folderCrProviderFunctionName,
      onEventHandler: datalakeFolderLambda,
      frameworkOnEventRole: folderCrProviderRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      folderCrProviderRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      datalakeFolderProvider,
      [
        { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    this.dataLakeFolderProvider = datalakeFolderProvider;
    return datalakeFolderProvider;
  }

  private createDataLakeKmsKey(keyUserRoles: string[]): MdaaKmsKey {
    //This statement allows S3 to write inventory data to the encrypted data lake buckets
    const S3ServiceEncryptPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: ['*'],
      actions: ENCRYPT_ACTIONS,
    });
    S3ServiceEncryptPolicy.addServicePrincipal('s3.amazonaws.com');

    const kmsKey = new MdaaKmsKey(this.scope, 'cmk', {
      naming: this.props.naming,
      keyUserRoleIds: keyUserRoles,
    });
    kmsKey.addToResourcePolicy(S3ServiceEncryptPolicy);
    return kmsKey;
  }
}
