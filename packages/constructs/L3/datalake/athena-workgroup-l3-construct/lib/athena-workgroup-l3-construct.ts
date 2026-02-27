/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAthenaWorkgroup } from '@aws-mdaa/athena-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { IMdaaBucket, MdaaBucket } from '@aws-mdaa/s3-constructs';

import { CfnWorkGroup } from 'aws-cdk-lib/aws-athena';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AthenaWorkgroupL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of data admin role references for Athena workgroup administration enabling administrative access and resource management. Provides IAM roles that will be granted administrator access to workgroup resources for configuration, monitoring, and administrative operations.
   *
   * Use cases: Administrative access; Workgroup management; Resource administration; Configuration control
   *
   * AWS: IAM role references for Athena workgroup administrative access and resource management
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required for workgroup administration and management
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Athena user role references for workgroup access enabling query execution and data analysis capabilities. Provides IAM roles that will be granted access to workgroup resources for executing queries and performing data analysis operations.
   *
   * Use cases: Query execution; Data analysis; User access; Analytics operations
   *
   * AWS: IAM role references for Athena workgroup user access and query execution capabilities
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required for workgroup user access and query execution
   **/
  readonly athenaUserRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional workgroup configuration for Athena query management enabling performance optimization and cost control. Provides workgroup settings including query limits, result encryption, and performance configurations for optimized query execution and cost management.
   *
   * Use cases: Query optimization; Cost control; Performance tuning; Workgroup configuration
   *
   * AWS: Athena workgroup configuration for query optimization and performance management
   *
   * Validation: Must be valid MdaaAthenaWorkgroupConfigurationProps if provided; enables workgroup optimization and control
   **/
  readonly workgroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  readonly workgroupBucketName?: string;
  readonly workgroupKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional verbatim policy name prefix for portable policy naming enabling cross-account policy consistency and SSO integration. When specified, creates policy names using this prefix instead of naming module for portable policies across accounts and SSO permission set integration.
   *
   * Use cases: Portable policies; Cross-account consistency; SSO integration; Policy naming control
   *
   * AWS: Policy name prefix for portable Athena workgroup policies and cross-account consistency
   *
   * Validation: Must be valid policy name prefix if provided; enables portable policy naming and SSO integration
   **/
  readonly verbatimPolicyNamePrefix?: string;
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Maximum bytes per query scan limit for cost control and query optimization enabling data scan restrictions and cost management. Sets the upper limit for data scanning per query execution, preventing runaway queries and controlling costs while maintaining query performance for efficient data lake analytics.
   *
   * Use cases: Cost control; Query optimization; Data scan limits; Runaway query prevention; Analytics cost management
   *
   * AWS: AWS Athena workgroup bytesScannedCutoffPerQuery for query cost control and scan limit enforcement
   *
   * Validation: Must be positive integer if specified; no default value defined; controls maximum data scan per query execution
   **/
  readonly bytesScannedCutoffPerQuery?: number;
}

//This stack creates all of the resources required for a Data Science workgroup
//to use SageMaker Studio on top of a Data Lake
export class AthenaWorkgroupL3Construct extends MdaaL3Construct {
  protected readonly props: AthenaWorkgroupL3ConstructProps;

  private dataAdminRoleIds: string[];
  private athenaUserRoleIds: string[];
  private athenaUserRoleArns: string[];
  private resultsBucketOnlyRoleIds: string[];
  public workgroup: CfnWorkGroup;

  constructor(scope: Construct, id: string, props: AthenaWorkgroupL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.dataAdminRoleIds = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.dataAdminRoles, 'DataAdmin')
      .map(x => x.id());
    const athenaUserResolveds = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.athenaUserRoles,
      'AthenaUser',
    );
    this.athenaUserRoleIds = athenaUserResolveds.filter(x => !x.immutable()).map(x => x.id());
    this.athenaUserRoleArns = athenaUserResolveds.filter(x => !x.immutable()).map(x => x.arn());
    this.resultsBucketOnlyRoleIds = athenaUserResolveds.filter(x => x.immutable()).map(x => x.id());

    const allRoleIds = [
      ...new Set([...this.dataAdminRoleIds, ...this.athenaUserRoleIds, ...this.resultsBucketOnlyRoleIds]),
    ];

    //Use some private helper functions to create the workgroup resources
    const workgroupKmsKey = props.workgroupKmsKeyArn
      ? MdaaKmsKey.fromKeyArn(this, 'kmsKey', props.workgroupKmsKeyArn)
      : this.createWorkgroupKMSKey(allRoleIds);

    const workgroupBucket = props.workgroupBucketName
      ? MdaaBucket.fromBucketName(this, 'resultsBucket', props.workgroupBucketName)
      : this.createWorkgroupBucket(workgroupKmsKey, this.dataAdminRoleIds, [
          ...this.athenaUserRoleIds,
          ...this.resultsBucketOnlyRoleIds,
        ]);

    this.workgroup = this.createAthenaWorkgroup(workgroupKmsKey, workgroupBucket);

    let i = 0;
    const athenaUserRoles = this.athenaUserRoleArns.map(x => {
      return MdaaRole.fromRoleArn(this.scope, `resolve-role-${i++}`, x);
    });

    this.grantAccessToRoles(athenaUserRoles);
  }

  private grantAccessToRoles(roles: IRole[]) {
    //Allow to access the workgroup
    const athenaWgPolicy = new MdaaManagedPolicy(this.scope, 'wg-usage-policy', {
      managedPolicyName: this.props.verbatimPolicyNamePrefix
        ? this.props.verbatimPolicyNamePrefix + '-' + 'wg-usage'
        : 'wg-usage',
      roles: roles,
      verbatimPolicyName: this.props.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });
    const accessWorkgroupStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'athena:BatchGetQueryExecution',
        'athena:ListDataCatalogs',
        'athena:ListDatabases',
        'athena:ListEngineVersions',
        'athena:ListNamedQueries',
        'athena:ListPreparedStatements',
        'athena:ListQueryExecutions',
        'athena:ListTableMetadata',
        'athena:ListTagsForResource',
        'athena:ListWorkGroups',
        'athena:GetDataCatalog',
        'athena:GetDatabase',
        'athena:GetNamedQuery',
        'athena:GetPreparedStatement',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'athena:GetQueryResultsStream',
        'athena:GetTableMetadata',
        'athena:GetWorkGroup',
        'athena:BatchGetNamedQuery',
        'athena:BatchGetQueryExecution',
        'athena:StartQueryExecution',
        'athena:StopQueryExecution',
      ],
      resources: [
        `arn:${this.partition}:athena:${this.region}:${this.account}:workgroup/${this.props.naming.resourceName()}`,
      ],
    });
    athenaWgPolicy.addStatements(accessWorkgroupStatement);
  }

  private createWorkgroupKMSKey(allRoleIds: string[]): MdaaKmsKey {
    //This statement allows S3 to write inventory data to the encrypted data lake buckets
    const S3ServiceEncryptPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: ['*'],
      actions: ENCRYPT_ACTIONS,
    });
    S3ServiceEncryptPolicy.addServicePrincipal('s3.amazonaws.com');
    const workgroupKmsKey = new MdaaKmsKey(this.scope, 'CaefWorkgroupKey', {
      alias: 'key',
      naming: this.props.naming,
      keyAdminRoleIds: this.dataAdminRoleIds,
      keyUserRoleIds: [...allRoleIds],
    });
    workgroupKmsKey.addToResourcePolicy(S3ServiceEncryptPolicy);
    return workgroupKmsKey;
  }

  private createWorkgroupBucket(
    workgroupKmsKey: IMdaaKmsKey,
    dataAdminRoles: string[],
    athenaUserRoles: string[],
  ): MdaaBucket {
    //This workgroup bucket will be used for all workgroup projects and workgroup-specific data
    const workgroupBucket = new MdaaBucket(this.scope, `Bucketworkgroup`, {
      encryptionKey: workgroupKmsKey,
      naming: this.props.naming,
    });

    //Allow data admins to manage the bucket
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: workgroupBucket,
      s3Prefix: '/',
      readWriteSuperRoleIds: dataAdminRoles,
    });
    rootPolicy.statements().forEach(statement => workgroupBucket.addToResourcePolicy(statement));

    //Allow athena users to use the bucket
    const resultsPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: workgroupBucket,
      s3Prefix: '/athena-results',
      readWriteRoleIds: athenaUserRoles,
    });
    resultsPolicy.statements().forEach(statement => workgroupBucket.addToResourcePolicy(statement));
    //Default Deny Policy
    //Any role not specified in config is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: workgroupBucket,
      roleExcludeIds: [...dataAdminRoles, ...athenaUserRoles],
    });
    workgroupBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    workgroupBucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);
    return workgroupBucket;
  }

  //Creates an Athena workgroup
  private createAthenaWorkgroup(kmsKey: IMdaaKmsKey, bucket: IMdaaBucket): CfnWorkGroup {
    const workgroup = new MdaaAthenaWorkgroup(this.scope, 'athena-workgroup', {
      naming: this.props.naming,
      bucket: bucket,
      resultsPrefix: 'athena-results/',
      kmsKey: kmsKey,
      workGroupConfiguration: this.props.workgroupConfiguration,
    });

    return workgroup;
  }
}
