/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import {
  BucketInventory,
  InventoryHelper,
  LifecycleConfigurationRuleProps,
  LifecycleHelper,
  RestrictBucketToRoles,
  RestrictObjectPrefixToRoles,
} from '@aws-mdaa/s3-helpers';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Arn, ArnComponents, ArnFormat, CustomResource, Duration, Stack, Token } from 'aws-cdk-lib';
import { Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { CfnResource } from 'aws-cdk-lib/aws-lakeformation';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare } from 'aws-cdk-lib/aws-ram';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { Bucket, CfnBucket, CfnStorageLens, CorsRule, IBucket, ReplicationRule } from 'aws-cdk-lib/aws-s3';
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

/**
 * Cross-account S3 replication for a data lake bucket. The sending side (`outbound`) and
 * the receiving side (`inbound`) are independent and both default off, so an MDAA bucket
 * can send, receive, or do both. Set only the side(s) MDAA manages; when the bucket at the
 * other end is not managed by MDAA, wiring that end up remains the user's responsibility.
 *
 * Use cases: Cross-account DR copies; Sharing curated data with a consumer account; Data residency; Multi-account aggregation
 *
 * AWS: S3 ReplicationConfiguration, S3 bucket policy, IAM replication role, KMS key policy
 *
 * Validation: Optional; set outbound, inbound, or both
 */
export interface BucketReplicationDefinition {
  /**
   * Sending side. MDAA creates the replication rules and an MDAA-managed replication role
   * on this bucket, so matching objects written here are copied to a bucket in another account.
   *
   * Use cases: Replicating a data lake zone into a DR account; Publishing curated data to a consumer account
   *
   * AWS: S3 ReplicationConfiguration and an IAM replication role
   *
   * Validation: Optional; when set, destinationBucketArn, destinationAccount, destinationRegion and destinationKmsKeyArn are all required
   */
  readonly outbound?: OutboundReplicationDefinition;
  /**
   * Receiving side. MDAA grants an externally-owned replication role permission to replicate
   * into this bucket. No replication rules and no replication role are created here, because
   * replication rules always live on the sending bucket.
   *
   * Use cases: Receiving replicas from a non-MDAA source bucket; Completing the receiving end of an MDAA-to-MDAA pair
   *
   * AWS: S3 bucket policy statements and a KMS key policy grant
   *
   * Validation: Optional; sourceReplicationRoleArn required when set
   */
  readonly inbound?: InboundReplicationDefinition;
}

/**
 * Sending-side replication settings. Every field except prefixFilters is required: an S3
 * bucket ARN carries neither account nor region, and because MDAA buckets always encrypt
 * with a CMK, S3 replicates nothing unless a destination replica key is supplied.
 *
 * Use cases: Cross-account DR; Cross-region DR; Publishing data to a consumer account
 *
 * AWS: S3 ReplicationConfiguration rules and an IAM replication role
 *
 * Validation: destinationBucketArn, destinationAccount, destinationRegion and destinationKmsKeyArn required; destinationKmsKeyArn must be a customer managed key in destinationRegion
 */
export interface OutboundReplicationDefinition {
  /**
   * ARN of the destination bucket receiving the replicas. The bucket must exist and have
   * versioning enabled; MDAA does not create it.
   *
   * Use cases: Targeting a DR bucket; Targeting a partner account's bucket
   *
   * AWS: S3 ReplicationRule Destination.Bucket
   *
   * Validation: Required; S3 bucket ARN, e.g. arn:aws:s3:::my-dr-bucket
   */
  readonly destinationBucketArn: string;
  /**
   * AWS account ID owning the destination bucket. Required because S3 bucket ARNs contain
   * no account ID, and S3 needs it to confirm destination ownership.
   *
   * Use cases: Cross-account replication; Destination ownership verification
   *
   * AWS: S3 ReplicationRule Destination.Account
   *
   * Validation: Required; 12-digit AWS account ID
   */
  readonly destinationAccount: string;
  /**
   * Region of the destination bucket. Used to scope the replication role's KMS grants to
   * S3 in that region, and to check destinationKmsKeyArn is a key in the same region.
   *
   * Use cases: Cross-region DR; Data residency
   *
   * AWS: kms:ViaService condition on the replication role's destination key grant
   *
   * Validation: Required; AWS region name, e.g. us-west-2
   */
  readonly destinationRegion: string;
  /**
   * Customer managed KMS key encrypting the replicas, in the destination account and region.
   * Required, not optional: S3 does not replicate SSE-KMS encrypted objects unless the rule
   * names a replica key, and MDAA source buckets always encrypt with a CMK. AWS managed keys
   * cannot be used, as they do not permit cross-account use.
   *
   * Use cases: Re-encrypting replicas under a destination-owned key
   *
   * AWS: S3 ReplicationRule Destination.EncryptionConfiguration.ReplicaKmsKeyID
   *
   * Validation: Required; KMS key ARN whose region matches destinationRegion
   */
  readonly destinationKmsKeyArn: string;
  /**
   * S3 prefixes to replicate, one replication rule per entry. Omit to replicate the whole
   * bucket, which is usually what a DR copy wants.
   *
   * Use cases: Replicating only /data while leaving scratch prefixes local; Whole-bucket DR
   *
   * AWS: S3 ReplicationRule Filter.Prefix
   *
   * Validation: Optional; array of S3 prefixes
   * @default - the whole bucket is replicated
   */
  readonly prefixFilters?: string[];
  /**
   * Existing role S3 assumes to replicate out of this bucket, instead of MDAA creating one. Needed
   * when the destination is another data lake in the same MDAA config: the destination names this
   * role in its policies and deploys first, so it cannot be a role this stack creates. Must be in
   * this bucket's account and assumable by s3.amazonaws.com; MDAA attaches the replication
   * permissions as a managed policy.
   *
   * Use cases: Replicating between two MDAA deployments in one config; Reusing a centrally managed replication role
   *
   * AWS: S3 ReplicationConfiguration Role
   *
   * Validation: Optional; must resolve to a role ARN in this account
   * @default - MDAA creates a replication role for this bucket
   */
  readonly replicationRole?: MdaaRoleRef;
  /**
   * Replicate delete markers, so a delete here also hides the object at the destination. Off by
   * default, leaving the replica in place so the destination survives a delete at the source.
   *
   * Use cases: Mirroring deletions to a consumer account; Keeping a DR copy that survives a source delete
   *
   * AWS: S3 ReplicationRule DeleteMarkerReplication
   *
   * Validation: Optional; when true the replication role is also granted s3:ReplicateDelete
   * @default false - delete markers are not replicated
   */
  readonly deleteMarkerReplication?: boolean;
}

/**
 * Receiving-side replication settings, granting an externally-owned replication role the
 * access it needs to write replicas into this bucket.
 *
 * Use cases: Receiving replicas from a non-MDAA bucket; Completing the receiving end of an MDAA-to-MDAA pair
 *
 * AWS: S3 bucket policy statements and a KMS key policy grant
 *
 * Validation: sourceReplicationRoleArn and sourceAccount required
 */
export interface InboundReplicationDefinition {
  /**
   * ARN of the replication role used by the sending bucket. This role is owned by the
   * sending account, so it is granted by ARN rather than through MDAA's access policies,
   * which resolve role names to IDs in the deploying account only.
   *
   * Use cases: Granting a partner account's replication role; Granting an MDAA source bucket's replication role
   *
   * AWS: Principal on the bucket policy and KMS key policy grants
   *
   * Validation: Required; IAM role ARN
   */
  readonly sourceReplicationRoleArn: string;
  /**
   * AWS account ID owning the sending bucket, checked at synth time against the account in
   * sourceReplicationRoleArn so the two cannot silently disagree. Required, and deliberately
   * redundant with the role ARN: stating the trusted account separately is what turns a mistyped
   * ARN into a synth failure rather than a grant to an unintended account.
   *
   * Use cases: Guarding against a mistyped replication role ARN
   *
   * AWS: No emitted resource; synth-time validation only
   *
   * Validation: Required; 12-digit AWS account ID; must match the account in sourceReplicationRoleArn
   */
  readonly sourceAccount: string;
  /**
   * S3 prefixes the sending role may replicate into, which also bound what it may list. Worth
   * setting whenever the sending side writes under known prefixes, and especially when that side
   * is not MDAA-managed: omitting it lets the external role write anywhere in the bucket and
   * enumerate every key in it. Must cover the prefixes configured on the sending side or those
   * objects fail to replicate.
   *
   * Use cases: Confining incoming replicas to /data; Limiting what a non-MDAA sender can enumerate
   *
   * AWS: Resource ARNs on the bucket policy replication grant
   *
   * Validation: Optional; array of S3 prefixes
   * @default - replication is permitted anywhere in the bucket
   */
  readonly prefixFilters?: string[];
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
  /** Cross-account replication into and/or out of this bucket. Both sides default off. */
  readonly replication?: BucketReplicationDefinition;
  /**
   * KMS key ARNs, besides this bucket's own key, permitted to encrypt objects written here.
   * Unioned with the module-level additionalBucketKmsKeyArns.
   */
  readonly additionalKmsKeyArns?: string[];
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

export interface DataLakeL3ConstructProps extends MdaaL3ConstructProps {
  /** Bucket definitions forming the data lake structure. */
  readonly buckets: BucketDefinition[];
  /** Enable S3 Storage Lens for the data lake buckets. */
  readonly storageLensEnabled?: boolean;
  /**
   * AWS accounts allowed to read the SSM parameters published by this data lake's KMS key and
   * buckets. A RAM share always names its principals, so only these accounts can read them.
   *
   * The accounts must be in the same AWS Organization and region as the account this module
   * deploys into, and the shared parameters move to the billed Advanced tier that RAM requires.
   * The datalake module README explains why each holds.
   *
   * @default - no parameters are shared and all parameters stay in the Standard tier
   */
  readonly shareParametersWithAccounts?: string[];
  /**
   * KMS key ARNs, besides each bucket's own key, permitted to encrypt objects written to any
   * bucket in this module. Unioned with each bucket's own additionalKmsKeyArns.
   */
  readonly additionalBucketKmsKeyArns?: string[];
}

/**
 * The role S3 assumes to replicate out of a bucket, resolved to the two things the bucket needs:
 * the role itself for the replication configuration, and its AROA id for the bucket's
 * default-deny statement, which matches on aws:userId rather than on an ARN.
 */
interface ResolvedReplicationRole {
  readonly role: IRole;
  readonly roleId: string;
}

/**
 * Enumerated rather than s3:Replicate*, so neither side widens as AWS adds actions. Delete is
 * separate: a sender gets it only when replicating delete markers, a receiver always does.
 */
const REPLICATE_OBJECT_ACTIONS = ['s3:ReplicateObject', 's3:ReplicateTags'];
const REPLICATE_DELETE_ACTION = 's3:ReplicateDelete';

/**
 * Replica-key actions, narrower than USER_ACTIONS: Encrypt to write the replica, Decrypt for the
 * S3 Bucket Key integrity check. https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
 */
const REPLICA_KEY_ACTIONS = ['kms:Encrypt', 'kms:Decrypt'];

/**
 * Synth-time guards for replication settings that AWS would otherwise accept and then fail on,
 * or accept and silently not replicate. Skipped for ARNs that are still unresolved tokens.
 */
class DataLakeReplicationValidator {
  /**
   * The replica key must live in the destination bucket's account and region, or replication
   * fails at runtime.
   */
  public static validateOutbound(bucketZone: string, outbound: OutboundReplicationDefinition) {
    const key = DataLakeReplicationValidator.arnComponents(outbound.destinationKmsKeyArn);
    const keyRegion = key?.region;
    const destinationRegion = DataLakeReplicationValidator.literal(outbound.destinationRegion);
    if (keyRegion && destinationRegion && keyRegion != destinationRegion) {
      throw new Error(
        `Bucket '${bucketZone}': replication.outbound.destinationKmsKeyArn is a key in '${keyRegion}', but destinationRegion is '${destinationRegion}'. The replica key must be in the same region as the destination bucket.`,
      );
    }
    const keyAccount = key?.account;
    const destinationAccount = DataLakeReplicationValidator.literal(outbound.destinationAccount);
    if (keyAccount && destinationAccount && keyAccount != destinationAccount) {
      throw new Error(
        `Bucket '${bucketZone}': replication.outbound.destinationKmsKeyArn is a key in account '${keyAccount}', but destinationAccount is '${destinationAccount}'. The replica key must be owned by the destination bucket's account, since an AWS managed key cannot be used across accounts.`,
      );
    }
  }

  /**
   * S3 assumes the replication role as the source bucket owner, so a referenced role has to
   * belong to this bucket's account. Skipped when either side is an unresolved token, which is
   * the case for a role resolved from an SSM parameter.
   */
  public static validateReplicationRoleAccount(bucketZone: string, roleArn: string, account: string) {
    const roleAccount = DataLakeReplicationValidator.arnComponents(roleArn)?.account;
    if (roleAccount && !Token.isUnresolved(account) && roleAccount != account) {
      throw new Error(
        `Bucket '${bucketZone}': replication.outbound.replicationRole resolves to a role in account '${roleAccount}', but this bucket is deployed to account '${account}'. S3 assumes the replication role as the source bucket owner, so it must be in the same account as the bucket.`,
      );
    }
  }

  public static validateInbound(bucketZone: string, inbound: InboundReplicationDefinition) {
    const roleAccount = DataLakeReplicationValidator.arnComponents(inbound.sourceReplicationRoleArn)?.account;
    const sourceAccount = DataLakeReplicationValidator.literal(inbound.sourceAccount);
    if (sourceAccount && roleAccount && roleAccount != sourceAccount) {
      throw new Error(
        `Bucket '${bucketZone}': replication.inbound.sourceAccount is '${sourceAccount}', but sourceReplicationRoleArn belongs to account '${roleAccount}'.`,
      );
    }
  }

  /**
   * Rule ids are derived from the configured prefixes, so a repeated prefix - or two prefixes
   * that differ only in characters the id strips - would collide and be rejected by S3.
   */
  /** S3 caps a replication rule id at 255 characters, so a long zone plus a long prefix fails. */
  public static validateRuleIdLengths(bucketZone: string, rules: ReplicationRule[]) {
    const tooLong = rules.map(rule => rule.id).filter(id => id != undefined && id.length > 255);
    if (tooLong.length > 0) {
      throw new Error(
        `Bucket '${bucketZone}': replication rule id '${tooLong[0]}' is ${tooLong[0]?.length} characters, over the 255 S3 allows. Shorten the bucket zone or the prefix it is built from.`,
      );
    }
  }

  public static validateRuleIdsUnique(bucketZone: string, rules: ReplicationRule[]) {
    const ids = rules.map(rule => rule.id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) != index))];
    if (duplicates.length > 0) {
      throw new Error(
        `Bucket '${bucketZone}': replication.outbound.prefixFilters produce duplicate replication rule ids (${duplicates.join(', ')}). Each prefix must be distinct in its alphanumeric characters.`,
      );
    }
  }

  /**
   * Parsed ARN, or undefined for a token or unparseable value - nothing to compare, so validation
   * is skipped. Token check first: Arn.split splits a token via Fn.select instead of failing.
   */
  private static arnComponents(arn: string): ArnComponents | undefined {
    if (Token.isUnresolved(arn)) {
      return undefined;
    }
    try {
      return Arn.split(arn, ArnFormat.NO_RESOURCE_NAME);
    } catch {
      return undefined;
    }
  }

  /**
   * The value, or undefined when it is still a token. A config value sourced from an SSM
   * parameter resolves at deploy time, so comparing it at synth would reject a valid config.
   */
  private static literal(value: string): string | undefined {
    return Token.isUnresolved(value) ? undefined : value;
  }
}

/**
 * Synth-time guard on the keys a bucket is configured to trust for encryption, beyond its own.
 */
class DataLakeKmsKeyTrustValidator {
  /**
   * The ForceKMS statement denies s3:PutObject unless the encrypting key matches one of these
   * values, under StringNotLikeIfExists - an operator that honours `*` and `?` wildcards. A value
   * containing one therefore matches every key ARN and switches the guard off for the whole bucket,
   * so it is rejected rather than deployed.
   *
   * Only a wrong value this permissive is rejected. A merely malformed ARN fails closed: it matches
   * no key, so writes with the key it was meant to name stay denied.
   *
   * Skipped for unresolved tokens, which is what an SSM-sourced ARN still is at synth.
   * https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
   */
  public static validateNoWildcards(bucketZone: string, keyArns: string[]) {
    const wildcarded = keyArns.filter(arn => !Token.isUnresolved(arn) && /[*?]/.test(arn));
    if (wildcarded.length > 0) {
      throw new Error(
        `Bucket '${bucketZone}': additional KMS key ARN '${wildcarded[0]}' contains a wildcard. The bucket policy matches these values with StringNotLikeIfExists, so a wildcard would permit every key and disable encryption enforcement on this bucket. List each trusted key ARN in full.`,
      );
    }
  }
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
      databaseName: props.naming
        .withResourceType(MdaaResourceType.GLUE_DATABASE)
        .resourceName('util')
        .replace(/-/gi, '_'),
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
    this.shareParameters();
  }

  /**
   * Shares the parameters published by this data lake's KMS key and buckets with the configured
   * accounts, so a deployment there can resolve values it cannot know in advance.
   *
   * The set shared is every parameter those two constructs publish, which is also exactly the set
   * moved to the Advanced tier - RAM cannot share a Standard-tier parameter, and a parameter in
   * the Advanced tier is billed, so tiering one without sharing it would be waste. ARNs are built
   * from the same naming call that published the parameters rather than by searching the construct
   * tree, so the set stays correct regardless of which scope the parameters were created in.
   */
  private shareParameters() {
    const accounts = this.props.shareParametersWithAccounts;
    if (!accounts || accounts.length == 0) {
      return;
    }
    const sharedPaths = [
      'kms/arn',
      'kms/id',
      ...this.props.buckets.flatMap(bucketDefinition =>
        ['arn', 'name'].map(name => `bucket/${bucketDefinition.bucketZone}/${name}`),
      ),
    ];
    const share = new CfnResourceShare(this.scope, 'parameter-share', {
      name: this.props.naming.withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE).resourceName('datalake-parameters'),
      resourceArns: sharedPaths.map(path => this.parameterArn(path)),
      principals: accounts,
      // RAM defaults this to true, which lets the share reach accounts outside the organization.
      allowExternalPrincipals: false,
    });

    // RAM rejects a share naming a resource that does not exist yet, and an ARN built from a string
    // creates no dependency for CloudFormation to order on - unlike one built from a parameter's own
    // Ref. Depend on the parameters themselves, located by name: which construct they hang off is
    // not fixed, since @aws-mdaa/legacyParamScope moves them from the bucket and key up to this
    // scope, and depending on the presumed parent would then order nothing.
    const sharedNames = new Set(sharedPaths.map(path => this.props.naming.ssmPath(path)));
    // Matched on MdaaParamAndOutput.paramName, which holds the literal path. The parameter's own
    // parameterName is a token, and instanceof is unreliable here because the workspace resolves
    // more than one copy of aws-cdk-lib. `param` is undefined when the parameter was not created,
    // which is what @aws-mdaa/skipCreateParams does - the construct still exists and still knows
    // its name, so the name alone would not reveal it.
    const sharedParameters = this.scope.node
      .findAll()
      .map(construct => construct as Partial<MdaaParamAndOutput>)
      .filter(construct => typeof construct.paramName == 'string' && sharedNames.has(construct.paramName))
      .map(construct => construct.param)
      .filter(parameter => parameter != undefined);
    // Otherwise the share names an ARN that never gets created and RAM rejects it at deploy.
    if (sharedParameters.length != sharedNames.size) {
      throw new Error(
        `shareParametersWithAccounts needs the ${sharedNames.size} parameters it shares to exist, but ${sharedParameters.length} were created. Parameter creation cannot be disabled on a data lake that shares its parameters.`,
      );
    }
    sharedParameters.forEach(parameter => share.node.addDependency(parameter));
  }

  /** ARN of a parameter this module publishes, from the path the naming implementation gives it. */
  private parameterArn(ssmPath: string): string {
    return `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter${this.props.naming.ssmPath(ssmPath)}`;
  }

  /** Advanced tier is what RAM requires to share a parameter, so it follows the sharing config. */
  private get parameterTier(): ParameterTier | undefined {
    return this.props.shareParametersWithAccounts?.length ? ParameterTier.ADVANCED : undefined;
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

    const configId = this.props.naming
      .withResourceType(MdaaResourceType.S3_STORAGE_LENS)
      .resourceName('storage-lens', 64);
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

  private createBucket(
    bucketDefinition: BucketDefinition,
    encryptionKey: IMdaaKmsKey,
    naming: IMdaaResourceNaming,
    glueUtilDatabase: Database,
    dataLakeFolderFunctionRole: IRole,
    dataLakeFolderProvider: Provider,
    lakeFormationRole: MdaaRole,
  ): IBucket {
    const replication = bucketDefinition.replication;
    if (replication && !replication.outbound && !replication.inbound) {
      throw new Error(
        `Bucket '${bucketDefinition.bucketZone}': replication is set but neither outbound nor inbound is, so nothing would be configured. Remove the block or set a side.`,
      );
    }
    const outbound = bucketDefinition.replication?.outbound;
    const replicationRole = outbound ? this.resolveReplicationRole(bucketDefinition.bucketZone, outbound) : undefined;

    const bucket = new MdaaBucket(this.scope, `bucket-${bucketDefinition.bucketZone}`, {
      encryptionKey: encryptionKey,
      bucketName: bucketDefinition.bucketZone,
      naming: naming,
      corsRules: bucketDefinition.corsRules,
      replicationRole: replicationRole?.role,
      replicationRules: outbound ? this.createReplicationRules(bucketDefinition.bucketZone, outbound) : undefined,
      additionalKmsKeyArns: this.resolveAdditionalKmsKeyArns(bucketDefinition),
      tier: this.parameterTier,
    });

    this.createBucketInventories(bucketDefinition, bucket, glueUtilDatabase);
    this.createLakeFormationLocations(bucketDefinition, bucket, lakeFormationRole);

    // Iterate over the accessPolicies and add to the bucket
    const bucketAllowIds: string[] = [lakeFormationRole.roleId];

    if (outbound && replicationRole) {
      this.grantOutboundReplication(bucketDefinition.bucketZone, bucket, outbound, replicationRole.role, encryptionKey);
      // Source objects are read with s3:GetObjectVersion* actions, which match the
      // s3:GetObject* pattern in the bucket-level default-deny statement.
      bucketAllowIds.push(replicationRole.roleId);
    }

    if (bucketDefinition.replication?.inbound) {
      this.grantInboundReplication(
        bucketDefinition.bucketZone,
        bucket,
        bucketDefinition.replication.inbound,
        encryptionKey,
      );
    }

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
          ...accessPolicy.readRoleIds,
          ...accessPolicy.readWriteRoleIds,
          ...accessPolicy.readWriteSuperRoleIds,
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

  /**
   * Keys, besides the bucket's own, that may encrypt objects written to it: the module-level list
   * followed by this bucket's own, deduplicated on first occurrence. Order follows the config, so
   * reordering two keys there reorders the rendered condition - a template diff only, since IAM
   * treats the condition's values as a set and order never changes how it evaluates.
   *
   * Undefined for an empty union rather than an empty array: MdaaBucket takes its multi-key branch
   * on any defined value, so an empty array would render ForAllValues:StringNotLikeIfExists on a
   * bucket that trusts only its own key - a template diff for no gain.
   */
  private resolveAdditionalKmsKeyArns(bucketDefinition: BucketDefinition): string[] | undefined {
    const keyArns = [
      ...new Set([...(this.props.additionalBucketKmsKeyArns ?? []), ...(bucketDefinition.additionalKmsKeyArns ?? [])]),
    ];
    DataLakeKmsKeyTrustValidator.validateNoWildcards(bucketDefinition.bucketZone, keyArns);
    return keyArns.length > 0 ? keyArns : undefined;
  }

  /**
   * The role S3 assumes to replicate out of this bucket, together with its AROA id - the id is
   * needed to exempt the role from the bucket's default-deny statement, which matches on
   * aws:userId.
   *
   * MDAA creates the role unless the config references an existing one. A reference is what makes
   * an MDAA-to-MDAA pair deployable in one pass: the receiving data lake names this role in its
   * bucket and key policies, and AWS rejects a policy naming a principal that does not resolve,
   * so the role has to exist before the receiver - which rules out the role this stack would
   * create, since this stack deploys after it.
   */
  private resolveReplicationRole(bucketZone: string, outbound: OutboundReplicationDefinition): ResolvedReplicationRole {
    if (!outbound.replicationRole) {
      const role = this.createReplicationRole(bucketZone);
      return { role: role, roleId: role.roleId };
    }
    const resolved = this.props.roleHelper.resolveRoleRefWithRefId(
      outbound.replicationRole,
      `replication-${bucketZone}`,
    );
    DataLakeReplicationValidator.validateReplicationRoleAccount(bucketZone, resolved.arn(), this.account);
    // Resolving the id may create the role-resolver custom resource, which reads IAM in the
    // deploying account. That is consistent with the role having to be in this account anyway.
    return { role: resolved.role(`replication-role-ref-${bucketZone}`), roleId: resolved.id() };
  }

  /**
   * Role assumed by S3 to replicate objects out of this bucket. CDK grants an explicitly
   * supplied replication role nothing, so grantOutboundReplication attaches every permission.
   */
  private createReplicationRole(bucketZone: string): MdaaRole {
    return new MdaaRole(this.scope, `replication-role-${bucketZone}`, {
      naming: this.props.naming,
      roleName: `${bucketZone}-replication`,
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      description: `Role assumed by S3 to replicate objects out of the ${bucketZone} data lake bucket.`,
    });
  }

  /**
   * One replication rule per configured prefix, or a single whole-bucket rule when no
   * prefixes are configured. sseKmsEncryptedObjects is always enabled because MDAA buckets
   * always encrypt with a CMK and S3 otherwise skips SSE-KMS objects entirely.
   */
  private createReplicationRules(bucketZone: string, outbound: OutboundReplicationDefinition): ReplicationRule[] {
    DataLakeReplicationValidator.validateOutbound(bucketZone, outbound);

    // fromBucketAttributes rather than fromBucketArn/fromBucketName: only this form conveys
    // the account, which S3 requires to confirm cross-account destination ownership.
    const destinationBucket = Bucket.fromBucketAttributes(this.scope, `replication-dest-${bucketZone}`, {
      bucketArn: outbound.destinationBucketArn,
      account: outbound.destinationAccount,
      region: outbound.destinationRegion,
    });
    const destinationKey = Key.fromKeyArn(
      this.scope,
      `replication-dest-key-${bucketZone}`,
      outbound.destinationKmsKeyArn,
    );

    const rules = this.replicationPrefixes(outbound.prefixFilters).map((prefix, index) => ({
      id: `replication-${bucketZone}-${prefix ? prefix.replace(/[^a-zA-Z0-9]/g, '-') : 'all'}`,
      priority: index + 1,
      destination: destinationBucket,
      // Trailing slash keeps the rule scope identical to the role's object-level grant;
      // a bare prefix would also match sibling keys the role is not permitted to read.
      filter: prefix ? { prefix: `${prefix}/` } : undefined,
      kmsKey: destinationKey,
      sseKmsEncryptedObjects: true,
      deleteMarkerReplication: outbound.deleteMarkerReplication ?? false,
    }));
    DataLakeReplicationValidator.validateRuleIdsUnique(bucketZone, rules);
    DataLakeReplicationValidator.validateRuleIdLengths(bucketZone, rules);
    return rules;
  }

  /**
   * Permissions an S3 replication role needs, per
   * https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
   */
  private grantOutboundReplication(
    bucketZone: string,
    bucket: MdaaBucket,
    outbound: OutboundReplicationDefinition,
    replicationRole: IRole,
    sourceKey: IMdaaKmsKey,
  ) {
    const sourcePrefixes = this.replicationPrefixes(outbound.prefixFilters);
    // Built from naming rather than bucket.bucketArn: a Fn::GetAtt here would make the policy
    // depend on the bucket, and the bucket has to depend on the policy (see addDependency below).
    const sourceBucketArn = this.namedBucketArn(bucket);
    const viaServices = [...new Set([this.s3ViaService(this.region), this.s3ViaService(outbound.destinationRegion)])];
    const replicaKeyViaService = viaServices.length == 1 ? viaServices[0] : viaServices;

    const statements = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [sourceBucketArn],
        actions: ['s3:GetReplicationConfiguration', 's3:ListBucket'],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: this.replicationObjectResources(sourceBucketArn, sourcePrefixes),
        actions: ['s3:GetObjectVersionForReplication', 's3:GetObjectVersionAcl', 's3:GetObjectVersionTagging'],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: this.replicationObjectResources(outbound.destinationBucketArn, sourcePrefixes),
        actions: outbound.deleteMarkerReplication
          ? [...REPLICATE_OBJECT_ACTIONS, REPLICATE_DELETE_ACTION]
          : REPLICATE_OBJECT_ACTIONS,
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [sourceKey.keyArn],
        actions: DECRYPT_ACTIONS,
        conditions: {
          StringEquals: { 'kms:ViaService': this.s3ViaService(this.region) },
          StringLike: {
            'kms:EncryptionContext:aws:s3:arn': this.replicationEncryptionContext(sourceBucketArn, sourcePrefixes),
          },
        },
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [outbound.destinationKmsKeyArn],
        actions: REPLICA_KEY_ACTIONS,
        conditions: {
          // Which regional S3 endpoint appears on the Encrypt call to the replica key is not
          // documented - every AWS example is same-region - so accept either end's. Pinning one
          // with StringEquals fails closed, and the failure is a cross-region replication that
          // copies nothing rather than an error. Same-region collapses back to a single value.
          StringEquals: { 'kms:ViaService': replicaKeyViaService },
          StringLike: {
            'kms:EncryptionContext:aws:s3:arn': this.replicationEncryptionContext(
              outbound.destinationBucketArn,
              sourcePrefixes,
            ),
          },
        },
      }),
    ];

    // A managed policy naming the role, rather than statements added to the role, because the role
    // may be one this module does not own: Role.fromRoleArn returns an immutable role when it can
    // tell the ARN belongs to another account, and additions to an immutable role are dropped.
    // Attaching by `roles` works for a created and a referenced role alike, and being a managed
    // policy it raises no inline-policy findings.
    const replicationPolicy = new MdaaManagedPolicy(this.scope, `replication-policy-${bucketZone}`, {
      naming: this.props.naming,
      managedPolicyName: `${bucketZone}-replication`,
      description: `Permissions for S3 to replicate objects out of the ${bucketZone} data lake bucket.`,
      roles: [replicationRole],
      statements: statements,
    });

    // Without this the bucket - and so replication - becomes active before the policy attaches,
    // and objects written in that window replicate as FAILED and are not retried. Depending on the
    // policy resource rather than the construct keeps its SSM parameters out of the ordering, since
    // those do not gate replication.
    const replicationPolicyResource = replicationPolicy.node.defaultChild;
    if (replicationPolicyResource) {
      bucket.node.addDependency(replicationPolicyResource);
    }

    MdaaNagSuppressions.addCodeResourceSuppressions(
      replicationPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Source reads (s3:GetObjectVersionForReplication, s3:GetObjectVersionAcl, s3:GetObjectVersionTagging) wildcard the object key within the configured prefixes on this bucket. Destination writes (s3:ReplicateObject, s3:ReplicateDelete, s3:ReplicateTags) wildcard the object key within the same prefixes on the destination bucket. Both are object-key wildcards inherent to replicating every object under a prefix, not actions lacking resource-level support. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html',
        },
      ],
      true,
    );
  }

  /**
   * Grants an externally-owned replication role the access needed to write replicas into this
   * bucket. No replication rules or role are created here - those belong to the sending bucket.
   */
  private grantInboundReplication(
    bucketZone: string,
    bucket: MdaaBucket,
    inbound: InboundReplicationDefinition,
    encryptionKey: IMdaaKmsKey,
  ) {
    DataLakeReplicationValidator.validateInbound(bucketZone, inbound);

    const prefixes = this.replicationPrefixes(inbound.prefixFilters);
    const listPrefixes = prefixes
      .filter((prefix): prefix is string => prefix != undefined)
      .map(prefix => `${prefix}/*`);

    // Enumerated rather than s3:Replicate*, so a future s3:Replicate action is not granted
    // implicitly. These three are what AWS's cross-account destination policy calls for.
    const objectStatement = new PolicyStatement({
      sid: 'InboundReplicationObjects',
      effect: Effect.ALLOW,
      resources: this.replicationObjectResources(bucket.bucketArn, prefixes),
      actions: [...REPLICATE_OBJECT_ACTIONS, REPLICATE_DELETE_ACTION],
    });
    objectStatement.addArnPrincipal(inbound.sourceReplicationRoleArn);
    bucket.addToResourcePolicy(objectStatement);

    // Bucket-scoped, so not narrowable to a prefix. No s3:PutBucketVersioning, which AWS's example
    // grants: MDAA buckets are always versioned, so it would only let the external account suspend.
    const bucketStatement = new PolicyStatement({
      sid: 'InboundReplicationBucket',
      effect: Effect.ALLOW,
      resources: [bucket.bucketArn],
      actions: ['s3:GetBucketVersioning', 's3:ListBucket'],
      // s3:prefix bounds what the sender may enumerate to the prefixes it may write. Without it
      // prefixFilters would scope writes but leave the whole bucket listable, and data lake key
      // names routinely carry table names and partition values.
      conditions: listPrefixes.length > 0 ? { StringLike: { 's3:prefix': listPrefixes } } : undefined,
    });
    bucketStatement.addArnPrincipal(inbound.sourceReplicationRoleArn);
    bucket.addToResourcePolicy(bucketStatement);

    // MdaaKmsKeyProps grants by role ID via aws:userId, which resolves in-account only, so an
    // external role has to be granted by ARN directly on the key policy.
    const keyStatement = new PolicyStatement({
      sid: `inbound-replication-${bucketZone}`,
      effect: Effect.ALLOW,
      // In a KMS key policy, '*' means this key - not every key in the account.
      resources: ['*'],
      // kms:GenerateDataKey beyond what the outbound grant needs, deliberately: the sending
      // bucket here is not MDAA-managed, so it may hold unencrypted objects, and S3 has to
      // generate a data key to encrypt those replicas under this key. Without it they are
      // configured for replication and then never arrive. An MDAA source cannot hit that path,
      // since its own buckets always encrypt with a CMK.
      actions: [...REPLICA_KEY_ACTIONS, 'kms:GenerateDataKey'],
      conditions: {
        StringEquals: { 'kms:ViaService': this.s3ViaService(this.region) },
        StringLike: {
          'kms:EncryptionContext:aws:s3:arn': this.replicationEncryptionContext(this.namedBucketArn(bucket), prefixes),
        },
      },
    });
    keyStatement.addArnPrincipal(inbound.sourceReplicationRoleArn);
    encryptionKey.addToResourcePolicy(keyStatement);
  }

  /**
   * S3's KMS ViaService value for a region, built from the stack's URL suffix rather than a
   * literal - the suffix is amazonaws.com.cn in aws-cn, and a hardcoded commercial suffix would
   * match nothing there, denying every KMS call and silently replicating no objects.
   */
  private s3ViaService(region: string): string {
    return `s3.${region}.${Stack.of(this).urlSuffix}`;
  }

  /** Configured prefixes, stripped of surrounding slashes, or [undefined] for whole-bucket scope. */
  private replicationPrefixes(prefixFilters?: string[]): (string | undefined)[] {
    if (!prefixFilters || prefixFilters.length == 0) {
      return [undefined];
    }
    return prefixFilters.map(prefix => MdaaBucket.formatS3Prefix(prefix));
  }

  /** Object-level ARNs covering the given prefixes, or the whole bucket when unscoped. */
  private replicationObjectResources(bucketArn: string, prefixes: (string | undefined)[]): string[] {
    return prefixes.map(prefix => (prefix ? `${bucketArn}/${prefix}/*` : `${bucketArn}/*`));
  }

  /**
   * Bucket ARN built from the name the bucket was created with, rather than from its Arn attribute.
   * A policy on the key that encrypts this bucket cannot reference the bucket resource without a
   * CloudFormation dependency cycle, and this form references no resource at all.
   */
  private namedBucketArn(bucket: MdaaBucket): string {
    const bucketName = (bucket.node.defaultChild as CfnBucket).bucketName;
    if (!bucketName) {
      throw new Error(`Bucket '${bucket.node.id}' has no configured name, which MDAA buckets always set.`);
    }
    return `arn:${this.partition}:s3:::${bucketName}`;
  }

  /**
   * Encryption context S3 sets: the bucket ARN with S3 Bucket Keys enabled, the object ARN without.
   * Both are allowed, since the bucket at the far end may not enable them.
   */
  private replicationEncryptionContext(bucketArn: string, prefixes: (string | undefined)[]): string[] {
    return [bucketArn, ...this.replicationObjectResources(bucketArn, prefixes)];
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
      LifecycleHelper.resolveLifecycleRules(bucketDefinition.lifecycleConfiguration).forEach(lifecycleRule => {
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
      Object.entries(bucketDefinition.lakeFormationLocations).forEach(([locationName, locationProps]) => {
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
      Object.entries(bucketDefinition.inventories).forEach(([invName, inventoryDefinition]) => {
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
          this.props.naming.withResourceType(MdaaResourceType.S3_BUCKET).resourceName(bucketDefinition.bucketZone),
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
      destinationBucketName = this.props.naming.withResourceType(MdaaResourceType.S3_BUCKET).resourceName(bucketZone);
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
      runtime: Runtime.PYTHON_3_14,
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

    const folderCrProviderFunctionName = this.props.naming
      .withResourceType(MdaaResourceType.LAMBDA_FUNCTION)
      .resourceName('folder-cr-prov', 64);
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
      tier: this.parameterTier,
    });
    kmsKey.addToResourcePolicy(S3ServiceEncryptPolicy);
    return kmsKey;
  }
}
