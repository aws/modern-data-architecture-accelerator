/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaResolvableRole } from '@aws-mdaa/iam-role-helper';
import { IPrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';

/**
 * Partitions resolved roles into same-account role IDs and cross-account principals/ARNs.
 */
function partitionRoles(roles: MdaaResolvableRole[]): {
  roleIds: string[];
  principals: IPrincipal[];
  principalArns: string[];
} {
  const roleIds: string[] = [];
  const principals: IPrincipal[] = [];
  const principalArns: string[] = [];
  for (const role of roles) {
    if (role.isCrossAccount()) {
      principals.push(role.arnPrincipal());
      principalArns.push(role.arn());
    } else {
      roleIds.push(role.id());
    }
  }
  return { roleIds, principals, principalArns };
}

export interface IRestrictObjectPrefixToRoles {
  readonly s3Bucket: IBucket;
  readonly s3Prefix: string;
  readonly readRoleIds?: string[];
  readonly readWriteRoleIds?: string[];
  readonly readWriteSuperRoleIds?: string[];
  readonly readPrincipals?: IPrincipal[];
  readonly readWritePrincipals?: IPrincipal[];
  readonly readWriteSuperPrincipals?: IPrincipal[];

  /**
   * Resolved roles granted read access. Cross-account roles are automatically
   * handled as principals; same-account roles use the aws:userId condition.
   */
  readonly readRoles?: MdaaResolvableRole[];
  /**
   * Resolved roles granted read/write access. Cross-account roles are automatically
   * handled as principals; same-account roles use the aws:userId condition.
   */
  readonly readWriteRoles?: MdaaResolvableRole[];
  /**
   * Resolved roles granted read/write/super access. Cross-account roles are automatically
   * handled as principals; same-account roles use the aws:userId condition.
   */
  readonly readWriteSuperRoles?: MdaaResolvableRole[];
}

export interface IRestrictBucketToRoles {
  readonly s3Bucket: IBucket;
  /**
   * Raw role IDs to exclude from the bucket deny statement, for callers which do not hold a
   * resolved role. Callers which pass all of their excludes as `roleExcludes` can omit this.
   */
  readonly roleExcludeIds?: string[];
  readonly principalExcludes?: string[];
  readonly prefixExcludes?: string[];
  readonly prefixIncludes?: string[];

  /**
   * Resolved roles to exclude from the bucket deny statement. Cross-account roles
   * are added to principalExcludes; same-account roles are added to roleExcludeIds.
   */
  readonly roleExcludes?: MdaaResolvableRole[];
}

/** Helper class for generating S3 bucket policy statements which grant access to specific object prefixes */
export class RestrictObjectPrefixToRoles {
  static readonly READ_ACTIONS = ['s3:GetObject*'];
  static readonly READ_WRITE_ACTIONS = [
    ...RestrictObjectPrefixToRoles.READ_ACTIONS,
    's3:PutObject',
    's3:PutObjectTagging',
    's3:DeleteObject',
  ];
  static readonly READ_WRITE_SUPER_ACTIONS = [
    ...RestrictObjectPrefixToRoles.READ_WRITE_ACTIONS,
    's3:DeleteObjectVersion',
  ];
  static readonly BUCKET_ALLOW_ACTIONS = ['s3:List*', 's3:GetBucket*'];
  static readonly BUCKET_DENY_ACTIONS = ['s3:PutObject*', 's3:GetObject*', 's3:DeleteObject*'];

  private _readStatements: PolicyStatement[] = [];
  private _readWriteStatements: PolicyStatement[] = [];
  private _readWriteSuperStatements: PolicyStatement[] = [];
  private _formattedPrefix: string;

  constructor(props: IRestrictObjectPrefixToRoles) {
    this._formattedPrefix = '/' + this.formatS3Prefix(props.s3Prefix) + '/*';
    // Covers our case where two / get resolved because our prefix is actually /
    this._formattedPrefix = this._formattedPrefix.replace(/\/\//, '/');

    // Partition resolved roles if provided
    const readPartition = props.readRoles ? partitionRoles(props.readRoles) : undefined;
    const readWritePartition = props.readWriteRoles ? partitionRoles(props.readWriteRoles) : undefined;
    const readWriteSuperPartition = props.readWriteSuperRoles ? partitionRoles(props.readWriteSuperRoles) : undefined;

    // Merge partitioned role IDs with explicitly provided role IDs
    const effectiveReadRoleIds = [...(props.readRoleIds || []), ...(readPartition?.roleIds || [])];
    const effectiveReadWriteRoleIds = [...(props.readWriteRoleIds || []), ...(readWritePartition?.roleIds || [])];
    const effectiveReadWriteSuperRoleIds = [
      ...(props.readWriteSuperRoleIds || []),
      ...(readWriteSuperPartition?.roleIds || []),
    ];

    // Merge partitioned principals with explicitly provided principals
    const effectiveReadPrincipals = [...(props.readPrincipals || []), ...(readPartition?.principals || [])];
    const effectiveReadWritePrincipals = [
      ...(props.readWritePrincipals || []),
      ...(readWritePartition?.principals || []),
    ];
    const effectiveReadWriteSuperPrincipals = [
      ...(props.readWriteSuperPrincipals || []),
      ...(readWriteSuperPartition?.principals || []),
    ];

    // FEDERATED / READ
    if (effectiveReadRoleIds.length > 0) {
      // Construct our User:Id roles for read
      const statement = this._readStatementScaffold(props);
      statement.addCondition('StringLike', { 'aws:userId': effectiveReadRoleIds.map(x => `${x}:*`) });
      statement.addAnyPrincipal();
      this._readStatements.push(statement);
    }
    // FEDERATED / READWRITE
    if (effectiveReadWriteRoleIds.length > 0) {
      const statement = this._readWriteStatementScaffold(props);
      statement.addCondition('StringLike', { 'aws:userId': effectiveReadWriteRoleIds.map(x => `${x}:*`) });
      statement.addAnyPrincipal();
      this._readWriteStatements.push(statement);
    }

    // FEDERATED / READWRITESUPER
    if (effectiveReadWriteSuperRoleIds.length > 0) {
      const statement = this._readWriteSuperStatementScaffold(props);
      statement.addCondition('StringLike', { 'aws:userId': effectiveReadWriteSuperRoleIds.map(x => `${x}:*`) });
      statement.addAnyPrincipal();
      this._readWriteSuperStatements.push(statement);
    }

    // NONFEDERATED / READ
    if (effectiveReadPrincipals.length > 0) {
      const statement = this._readStatementScaffold(props);
      effectiveReadPrincipals.forEach(principal => {
        statement.addPrincipals(principal);
      });
      this._readStatements.push(statement);
    }
    // NONFEDERATED / READWRITE
    if (effectiveReadWritePrincipals.length > 0) {
      const statement = this._readWriteStatementScaffold(props);
      effectiveReadWritePrincipals.forEach(principal => {
        statement.addPrincipals(principal);
      });
      this._readWriteStatements.push(statement);
    }
    // NONFEDERATED / READWRITESUPER
    if (effectiveReadWriteSuperPrincipals.length > 0) {
      const statement = this._readWriteSuperStatementScaffold(props);
      effectiveReadWriteSuperPrincipals.forEach(principal => {
        statement.addPrincipals(principal);
      });
      this._readWriteSuperStatements.push(statement);
    }
  }

  private _readStatementScaffold(props: IRestrictObjectPrefixToRoles): PolicyStatement {
    return new PolicyStatement({
      sid: `${props.s3Prefix.replace(/\\W/g, '')}_Read`,
      effect: Effect.ALLOW,
      resources: [props.s3Bucket.bucketArn + this._formattedPrefix],
      actions: RestrictObjectPrefixToRoles.READ_ACTIONS,
    });
  }

  private _readWriteStatementScaffold(props: IRestrictObjectPrefixToRoles): PolicyStatement {
    return new PolicyStatement({
      sid: `${props.s3Prefix.replace(/\\W/g, '')}_ReadWrite`,
      effect: Effect.ALLOW,
      resources: [props.s3Bucket.bucketArn + this._formattedPrefix],
      actions: RestrictObjectPrefixToRoles.READ_WRITE_ACTIONS,
    });
  }

  private _readWriteSuperStatementScaffold(props: IRestrictObjectPrefixToRoles): PolicyStatement {
    return new PolicyStatement({
      sid: `${props.s3Prefix.replace(/\\W/g, '')}_ReadWriteSuper`,
      effect: Effect.ALLOW,
      resources: [props.s3Bucket.bucketArn + this._formattedPrefix],
      actions: RestrictObjectPrefixToRoles.READ_WRITE_SUPER_ACTIONS,
    });
  }

  public readStatements(): PolicyStatement[] {
    return this._readStatements;
  }

  public readWriteStatements(): PolicyStatement[] {
    return this._readWriteStatements;
  }

  public readWriteSuperStatements(): PolicyStatement[] {
    return this._readWriteSuperStatements;
  }

  public statements(): PolicyStatement[] {
    return [...this._readStatements, ...this._readWriteStatements, ...this._readWriteSuperStatements];
  }

  public formatS3Prefix(prefix: string): string {
    let rawPrefix = prefix;

    // Removes trailing slashes
    rawPrefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
    // Removes leading slashes
    rawPrefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
    return rawPrefix;
  }
}

/** Helper class for generating bucket policy statements
 * which allow or deny access to an entire bucket. Used to
 * create bucket-level default deny statements to block accesses
 * not granted in the bucket policy. */
export class RestrictBucketToRoles {
  public readonly denyStatement: PolicyStatement;
  public readonly allowStatement: PolicyStatement;
  /**
   * Bucket-level grant for cross-account roles. These cannot be matched by the `aws:userId`
   * condition on {@link allowStatement} because their role IDs are not resolvable from the
   * deploying account, so they are granted by ARN principal instead. Undefined when no
   * cross-account role was supplied.
   */
  public readonly crossAccountAllowStatement?: PolicyStatement;
  private resource: string[] = [];
  private notResource: string[] = [];
  /**
   * Whether any same-account role id was excluded. When none were, {@link allowStatement}'s
   * `aws:userId` condition can never match, so the statement grants nothing.
   */
  private readonly hasSameAccountExcludes: boolean;
  private denyConditionalNotEquals: {
    'aws:userId'?: string[];
    'aws:PrincipalArn'?: string[];
  } = {};

  constructor(props: IRestrictBucketToRoles) {
    // Partition resolved roles if provided
    const roleExcludesPartition = props.roleExcludes ? partitionRoles(props.roleExcludes) : undefined;

    // Merge partitioned values with explicitly provided values
    const effectiveRoleExcludeIds = [...(props.roleExcludeIds || []), ...(roleExcludesPartition?.roleIds || [])];
    const effectivePrincipalExcludes = [
      ...(props.principalExcludes || []),
      ...(roleExcludesPartition?.principalArns || []),
    ];
    this.hasSameAccountExcludes = effectiveRoleExcludeIds.length > 0;

    // Statement allowing access to the bucket for the AROAs
    this.allowStatement = new PolicyStatement({
      sid: `BucketAllow`,
      effect: Effect.ALLOW,
      resources: [props.s3Bucket.bucketArn + '/*', props.s3Bucket.bucketArn],
      actions: RestrictObjectPrefixToRoles.BUCKET_ALLOW_ACTIONS,
    });
    this.allowStatement.addAnyPrincipal();
    this.allowStatement.addCondition('StringLike', { 'aws:userId': effectiveRoleExcludeIds.map(x => `${x}:*`) });

    // Cross-account roles cannot satisfy the aws:userId condition above, since their role IDs
    // cannot be resolved from the deploying account. Without a companion ARN-principal statement
    // they would be excluded from the bucket-level deny but never granted s3:List*/s3:GetBucket*,
    // so listing the bucket would fail even though object access through the prefix statements works.
    if (roleExcludesPartition && roleExcludesPartition.principals.length > 0) {
      this.crossAccountAllowStatement = new PolicyStatement({
        sid: `BucketAllowCrossAccount`,
        effect: Effect.ALLOW,
        resources: [props.s3Bucket.bucketArn + '/*', props.s3Bucket.bucketArn],
        actions: RestrictObjectPrefixToRoles.BUCKET_ALLOW_ACTIONS,
        principals: roleExcludesPartition.principals,
      });
    }

    // Constuct our deny statement.
    // prefixIncludes denotes we want to include a prefix in our deny meaning Resource
    if (props.prefixIncludes) {
      this.resource = props.prefixIncludes.map(prefix => {
        return `${props.s3Bucket.bucketArn}/${this.formatS3Prefix(prefix)}`;
      });
    } else {
      this.resource = [props.s3Bucket.bucketArn + '/*'];
    }
    // prefixExcludes denote we want to exclude a prefix in our deny meaning notResource
    if (props.prefixExcludes) {
      this.notResource = props.prefixExcludes.map(prefix => {
        return `${props.s3Bucket.bucketArn}/${this.formatS3Prefix(prefix)}`;
      });
    }

    if (this.notResource.length > 0) {
      this.denyStatement = new PolicyStatement({
        sid: `BucketDeny`,
        effect: Effect.DENY,
        notResources: this.notResource,
        actions: RestrictObjectPrefixToRoles.BUCKET_DENY_ACTIONS,
      });
    } else {
      this.denyStatement = new PolicyStatement({
        sid: `BucketDeny`,
        effect: Effect.DENY,
        resources: this.resource,
        actions: RestrictObjectPrefixToRoles.BUCKET_DENY_ACTIONS,
      });
    }
    this.denyStatement.addAnyPrincipal();

    // Build our conditionals.
    // An empty aws:userId list can never be matched, and the keys within a single condition operator
    // are ANDed, so leaving the key in alongside aws:PrincipalArn would make the whole deny
    // unsatisfiable and silently drop the bucket-level default deny.
    if (effectiveRoleExcludeIds.length > 0 || effectivePrincipalExcludes.length === 0) {
      this.denyConditionalNotEquals['aws:userId'] = effectiveRoleExcludeIds.map(x => `${x}:*`);
    }
    if (effectivePrincipalExcludes.length > 0) {
      this.denyConditionalNotEquals['aws:PrincipalArn'] = [...new Set(effectivePrincipalExcludes)].sort((a, b) =>
        a.localeCompare(b),
      );
    }

    // Construct our conditional for our deny
    if (Object.keys(this.denyConditionalNotEquals).length == 1) {
      this.denyStatement.addCondition('StringNotLike', this.denyConditionalNotEquals);
    } else {
      this.denyStatement.addCondition('ForAnyValue:StringNotLike', this.denyConditionalNotEquals);
    }
  }

  /**
   * All bucket-level allow statements which should be added to the bucket policy. Prefer this over
   * reading {@link allowStatement} directly, so that the cross-account grant is not dropped.
   */
  public allowStatements(): PolicyStatement[] {
    // Without a same-account exclude the aws:userId condition on allowStatement matches nothing, so
    // emitting it would only add noise to the bucket policy.
    const sameAccountStatements = this.hasSameAccountExcludes ? [this.allowStatement] : [];
    return this.crossAccountAllowStatement
      ? [...sameAccountStatements, this.crossAccountAllowStatement]
      : sameAccountStatements;
  }

  private formatS3Prefix(prefix: string): string {
    let rawPrefix = prefix;

    // Removes trailing slashes
    rawPrefix = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
    // Removes leading slashes
    rawPrefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
    return `${rawPrefix}/*`;
  }
}
