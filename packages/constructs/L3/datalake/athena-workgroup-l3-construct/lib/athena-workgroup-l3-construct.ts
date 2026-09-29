/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAthenaWorkgroup } from '@aws-mdaa/athena-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import {
  LifecycleConfigurationRuleProps,
  LifecycleHelper,
  RestrictBucketToRoles,
  RestrictObjectPrefixToRoles,
} from '@aws-mdaa/s3-helpers';
import { IMdaaBucket, MdaaBucket } from '@aws-mdaa/s3-constructs';

import { CfnWorkGroup } from 'aws-cdk-lib/aws-athena';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AthenaWorkgroupL3ConstructProps extends MdaaL3ConstructProps {
  // Admin roles with full workgroup, bucket, and KMS key access
  readonly dataAdminRoles: MdaaRoleRef[];
  // User roles with query execution and results bucket access
  readonly athenaUserRoles: MdaaRoleRef[];
  // Workgroup configuration for query cost controls
  readonly workgroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  readonly workgroupBucketName?: string;
  readonly workgroupKmsKeyArn?: string;
  // Verbatim policy name prefix for cross-account portability
  readonly verbatimPolicyNamePrefix?: string;
  /**
   * S3 lifecycle rules applied to the workgroup results bucket. Rules without a prefix
   * are automatically scoped to the results location (athena-results/). Rules with an
   * explicit prefix are applied as-is.
   *
   * Validation: Optional; array of LifecycleConfigurationRuleProps
   */
  readonly lifecycleConfiguration?: LifecycleConfigurationRuleProps[];
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  // Maximum bytes scanned per query for cost control
  readonly bytesScannedCutoffPerQuery?: number;
}

//This stack creates all of the resources required for a Data Science workgroup
//to use SageMaker Studio on top of a Data Lake
export class AthenaWorkgroupL3Construct extends MdaaL3Construct {
  protected readonly props: AthenaWorkgroupL3ConstructProps;

  private readonly dataAdminRoles: MdaaResolvableRole[];
  private readonly athenaUserRoles: MdaaResolvableRole[];
  private readonly athenaUserRoleArns: string[];
  private readonly resultsBucketOnlyRoles: MdaaResolvableRole[];
  public workgroup: CfnWorkGroup;

  constructor(scope: Construct, id: string, props: AthenaWorkgroupL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.dataAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.dataAdminRoles, 'DataAdmin');
    const athenaUserResolveds = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.athenaUserRoles,
      'AthenaUser',
    );
    this.athenaUserRoles = athenaUserResolveds.filter(x => !x.immutable());
    this.athenaUserRoleArns = this.athenaUserRoles.map(x => x.arn());
    this.resultsBucketOnlyRoles = athenaUserResolveds.filter(x => x.immutable());

    // De-duplicate so a role named in both dataAdminRoles and athenaUserRoles is not repeated in
    // the key policy's aws:userId condition. The role helper returns one object per anchor, so
    // identity is enough.
    const allRoles = [...new Set([...this.dataAdminRoles, ...this.athenaUserRoles, ...this.resultsBucketOnlyRoles])];

    //Use some private helper functions to create the workgroup resources
    const workgroupKmsKey = props.workgroupKmsKeyArn
      ? MdaaKmsKey.fromKeyArn(this, 'kmsKey', props.workgroupKmsKeyArn)
      : this.createWorkgroupKMSKey(allRoles);

    const workgroupBucket = props.workgroupBucketName
      ? MdaaBucket.fromBucketName(this, 'resultsBucket', props.workgroupBucketName)
      : this.createWorkgroupBucket(workgroupKmsKey, this.dataAdminRoles, [
          ...this.athenaUserRoles,
          ...this.resultsBucketOnlyRoles,
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
        `arn:${this.partition}:athena:${this.region}:${this.account}:workgroup/${this.props.naming
          .withResourceType(MdaaResourceType.ATHENA_WORKGROUP)
          .resourceName()}`,
      ],
    });
    athenaWgPolicy.addStatements(accessWorkgroupStatement);
  }

  private createWorkgroupKMSKey(allRoles: MdaaResolvableRole[]): MdaaKmsKey {
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
      keyAdminRoles: this.dataAdminRoles,
      keyUserRoles: [...allRoles],
    });
    workgroupKmsKey.addToResourcePolicy(S3ServiceEncryptPolicy);
    return workgroupKmsKey;
  }

  private createWorkgroupBucket(
    workgroupKmsKey: IMdaaKmsKey,
    dataAdminRoles: MdaaResolvableRole[],
    athenaUserRoles: MdaaResolvableRole[],
  ): MdaaBucket {
    // Auto-prefix lifecycle rules: rules without a prefix target the results location
    const resolvedLifecycleRules = this.props.lifecycleConfiguration
      ? LifecycleHelper.resolveLifecycleRules(
          this.props.lifecycleConfiguration.map(rule => ({
            ...rule,
            prefix: rule.prefix ?? 'athena-results/',
          })),
        )
      : undefined;

    //This workgroup bucket will be used for all workgroup projects and workgroup-specific data
    const workgroupBucket = new MdaaBucket(this.scope, `Bucketworkgroup`, {
      encryptionKey: workgroupKmsKey,
      naming: this.props.naming,
      lifecycleRules: resolvedLifecycleRules,
    });

    //Allow data admins to manage the bucket
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: workgroupBucket,
      s3Prefix: '/',
      readWriteSuperRoles: dataAdminRoles,
    });
    rootPolicy.statements().forEach(statement => workgroupBucket.addToResourcePolicy(statement));

    //Allow athena users to use the bucket
    const resultsPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: workgroupBucket,
      s3Prefix: '/athena-results',
      readWriteRoles: athenaUserRoles,
    });
    resultsPolicy.statements().forEach(statement => workgroupBucket.addToResourcePolicy(statement));
    //Default Deny Policy
    //Any role not specified in config is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: workgroupBucket,
      roleExcludes: [...dataAdminRoles, ...athenaUserRoles],
    });
    workgroupBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    bucketRestrictPolicy.allowStatements().forEach(statement => workgroupBucket.addToResourcePolicy(statement));
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
