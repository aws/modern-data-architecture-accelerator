/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAthenaWorkgroup } from '@aws-mdaa/athena-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey, ENCRYPT_ACTIONS, IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket, IMdaaBucket } from '@aws-mdaa/s3-constructs';

import { CfnWorkGroup } from 'aws-cdk-lib/aws-athena';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface AthenaWorkgroupL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Ids of roles which will be provided administrator access to Workgroup resources
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Roles which will be granted access to all Workgroup resources
   */
  readonly athenaUserRoles: MdaaRoleRef[];
  /**
   * Workgroup Configuration
   */
  readonly workgroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  /**
   * If specified, will be used as WorkGroup Results Bucket.
   * Otherwise a new bucket will be created.
   */
  readonly workgroupBucketName?: string;
  /**
   * If specified, will be used as WorkGroup KMS Key.
   * Otherwise a key will be created.
   */
  readonly workgroupKmsKeyArn?: string;
  /**
   * If specified, policy names will be created using this prefix instead of using the naming module.
   * This is useful when policy names need to be portable across accounts (such as for integration with SSO permission sets)
   */
  readonly verbatimPolicyNamePrefix?: string;
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  /**
   * The upper limit (cutoff) for the amount of bytes a single query in a workgroup is allowed to scan. No default is defined.
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-athena-workgroup-workgroupconfiguration.html#cfn-athena-workgroup-workgroupconfiguration-bytesscannedcutoffperquery
   */
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
    NagSuppressions.addResourceSuppressions(
      workgroupBucket,
      [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
        { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
      ],
      true,
    );

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
