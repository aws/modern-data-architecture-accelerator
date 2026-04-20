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
  CfnStorageLens,
  CorsRule,
  IBucket,
  LifecycleRule,
  NoncurrentVersionTransition,
  StorageClass,
  Transition,
} from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * S3 inventory configuration for a specific prefix within a data lake bucket.
 * Generates automated inventory reports for governance, cost analysis, and compliance.
 *
 * Use cases: Prefix-scoped inventory; Cross-bucket inventory delivery; Compliance auditing
 *
 * AWS: S3 inventory configuration
 *
 * Validation: prefix required; destination fields optional
 */
export interface InventoryDefinition {
  /**
   * S3 prefix to include in the inventory report.
   *
   * Use cases: Targeted inventory on specific data paths
   *
   * AWS: S3 inventory prefix filter
   *
   * Validation: Required; valid S3 prefix
   */
  readonly prefix: string;
  /**
   * Destination bucket for inventory reports. Defaults to the source bucket
   * under the /inventory prefix if not specified.
   *
   * Use cases: Centralized inventory collection; Cross-bucket reporting
   *
   * AWS: S3 inventory destination bucket
   *
   * Validation: Optional; valid S3 bucket name
   */
  readonly destinationBucket?: string;
  /**
   * S3 prefix within the destination bucket for inventory report storage.
   *
   * Use cases: Organized inventory report storage; Conflict prevention
   *
   * AWS: S3 inventory destination prefix
   *
   * Validation: Optional; valid S3 prefix
   */
  readonly destinationPrefix?: string;
  /**
   * AWS account ID owning the destination bucket for cross-account inventory delivery.
   *
   * Use cases: Cross-account inventory; Bucket ownership validation
   *
   * AWS: S3 inventory destination account
   *
   * Validation: Optional; 12-digit AWS account ID
   */
  readonly destinationAccount?: string;
}

export interface LakeFormationLocation {
  /** S3 prefix to register as a LakeFormation location. */
  readonly prefix: string;
  /** Grant write access to the LakeFormation role for this location. */
  readonly write?: boolean;
}

export interface BucketDefinition {
  readonly bucketZone: string;
  /** Access policies defining role-based permissions per S3 prefix. */
  readonly accessPolicies: AccessPolicyProps[];
  /** S3 lifecycle rules for automated storage class transitions and expiration. */
  readonly lifecycleConfiguration?: LifecycleConfigurationRuleProps[];
  /** S3 inventory configurations keyed by name. */
  readonly inventories?: { [key: string]: InventoryDefinition };
  /** Enable EventBridge notifications for bucket data events. */
  readonly enableEventBridgeNotifications?: boolean;
  /** LakeFormation location registrations keyed by name. */
  readonly lakeFormationLocations?: { [key: string]: LakeFormationLocation };
  /** Create folder placeholder objects for access policy prefixes. */
  readonly createFolderSkeleton?: boolean;
  /** Deny access to roles not listed in access policies. */
  readonly defaultDeny?: boolean;
  /** Cross-origin resource sharing rules for the bucket. */
  readonly corsRules?: CorsRule[];
}

export interface AccessPolicyProps {
  /**
   * Name of the access policy
   */
  readonly name: string;
  /** S3 prefix path where this access policy applies (e.g., '/', '/data'). */
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
  /** Bucket definitions forming the data lake structure. */
  readonly buckets: BucketDefinition[];
  /** Enable S3 Storage Lens for the data lake buckets. */
  readonly storageLensEnabled?: boolean;
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

    // Deduplicate role IDs to avoid duplicate entries in KMS key policy
    const uniqueRoleIds = [...new Set([dataLakeFolderFunctionRole.roleId, lakeFormationRole.roleId, ...allRoleIds])];

    this.kmsKey = this.createDataLakeKmsKey(uniqueRoleIds);

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

    this.createStorageLens();
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

  private createStorageLens() {
    if (!this.props.storageLensEnabled) {
      return;
    }

    const configId = this.props.naming.resourceName('storage-lens', 64);
    const bucketArns = Object.values(this.buckets).map(bucket => bucket.bucketArn);

    const storageLens = new CfnStorageLens(this.scope, 'storage-lens', {
      storageLensConfiguration: {
        id: configId,
        isEnabled: true,
        accountLevel: {
          bucketLevel: {},
        },
        include: {
          buckets: bucketArns,
        },
      },
    });

    new MdaaParamAndOutput(
      storageLens,
      {
        resourceType: 'storage-lens',
        name: 'arn',
        value: storageLens.attrStorageLensConfigurationStorageLensArn,
        naming: this.props.naming,
      },
      this.scope,
    );
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
      corsRules: bucketDefinition.corsRules,
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
