/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { AuditDataEventReadWriteType, AuditHelper } from '@aws-mdaa/s3-helpers';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Annotations } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Scoped S3 event selector targeting a specific bucket and optional key prefix.
 * Narrows CloudTrail data event capture to only the specified S3 locations
 * rather than logging all S3 data events account-wide.
 *
 * Use cases: Cost-effective auditing of specific data buckets; Targeted compliance monitoring; Reduced log volume
 *
 * AWS: CloudTrail S3 data event selector (DataResource with S3 ARN)
 *
 * Validation: bucketName required; objectPrefix optional
 */
export interface EventSelectorConfig {
  /**
   * S3 bucket name to scope CloudTrail data event capture to.
   * Accepts bucket names or SSM parameter references.
   *
   * Use cases: Target specific data buckets for audit; Scope trail to sensitive data stores
   *
   * AWS: CloudTrail S3 data event selector bucket target
   *
   * Validation: Required; must be existing S3 bucket name or SSM parameter path
   */
  readonly bucketName: string;
  /**
   * Optional S3 key prefix to further narrow event capture within the bucket.
   * Only data events for objects under this prefix will be logged.
   *
   * Use cases: Audit only a specific dataset prefix; Reduce log volume for large buckets
   *
   * AWS: CloudTrail S3 data event selector object prefix filter
   *
   * Validation: Optional; valid S3 key prefix string
   */
  readonly objectPrefix?: string;
}

/**
 * Data event selector for any CloudTrail-supported resource type, rendered as an advanced
 * event selector. Where `eventSelectors` covers S3 only, this covers any `resources.type`
 * CloudTrail supports -- Lambda, DynamoDB, Bedrock AgentCore, and so on.
 *
 * Mutually exclusive with `eventSelectors` on the same trail: CloudTrail accepts either
 * basic or advanced event selectors, never both.
 *
 * Use cases: AgentCore runtime invocation auditing; Lambda or DynamoDB data events; EventBridge detection of invocation-level auth failures
 *
 * AWS: CloudTrail advanced event selector (eventCategory Data with resources.type)
 *
 * Validation: resourceType required; resourceArns and readWriteType optional
 */
export interface DataEventSelectorConfig {
  /**
   * The CloudTrail `resources.type` whose data events will be captured, such as
   * `AWS::BedrockAgentCore::Runtime` or `AWS::Lambda::Function`. See the CloudTrail
   * "Data events" documentation for the supported values.
   *
   * CloudTrail accepts exactly one resource type per selector, so capturing several
   * types means several entries in `dataEventSelectors`.
   *
   * Use cases: Capturing AgentCore runtime invocations; Auditing Lambda invocations
   *
   * AWS: CloudTrail advanced event selector resources.type field
   *
   * Validation: Required; must be a resource type CloudTrail supports for data events, otherwise the deploy is rejected
   */
  readonly resourceType: string;
  /**
   * Resource ARNs to scope the selector to, matched as prefixes. If omitted, data events
   * for every resource of the type are captured, which can be costly on busy resources.
   *
   * Use cases: Scoping capture to one runtime; Controlling data event costs
   *
   * AWS: CloudTrail advanced event selector resources.ARN field (StartsWith)
   *
   * Validation: Optional; ARNs or SSM parameter references
   */
  readonly resourceArns?: string[];
  /**
   * Whether to capture read events, write events, or both. Omit for both.
   *
   * Use cases: Capturing only mutating calls; Reducing data event volume
   *
   * AWS: CloudTrail advanced event selector readOnly field
   *
   * Validation: Optional; one of 'All', 'ReadOnly', 'WriteOnly'
   */
  readonly readWriteType?: AuditDataEventReadWriteType;
}

/**
 * CloudTrail audit trail configuration for data event logging with KMS encryption.
 * Logs are written to the specified S3 bucket encrypted with the specified KMS key.
 * Optionally includes management/control plane events.
 *
 * Use cases: Compliance auditing; S3 data access logging; Security monitoring; Regulatory compliance
 *
 * AWS: CloudTrail trail with data events, KMS encryption, and optional management events
 *
 * Validation: cloudTrailAuditBucketName and cloudTrailAuditKmsKeyArn required
 */
export interface AuditTrailProps {
  /**
   * S3 bucket name where CloudTrail audit logs are stored.
   * Accepts bucket names or SSM parameter references.
   *
   * Use cases: Centralized audit log collection; Compliance log storage
   *
   * AWS: CloudTrail S3 destination bucket
   *
   * Validation: Required; must be existing S3 bucket name or SSM parameter path
   */
  readonly cloudTrailAuditBucketName: string;
  /**
   * KMS key ARN for encrypting CloudTrail logs written to S3.
   * Accepts key ARNs or SSM parameter references.
   *
   * Use cases: Audit log encryption; Data protection compliance
   *
   * AWS: KMS key for CloudTrail log encryption
   *
   * Validation: Required; must be valid KMS key ARN or SSM parameter path
   */
  readonly cloudTrailAuditKmsKeyArn: string;
  /**
   * If true, management/control plane events will be included in trail.
   * Otherwise, only Data Events will be included.
   *
   * This matters most alongside `dataEventSelectors`: advanced event selectors replace a
   * trail's default selectors outright, so without this flag such a trail captures no
   * control plane events at all.
   */
  readonly includeManagementEvents?: boolean;
  /**
   * Optional list of S3 event selectors to scope CloudTrail data event capture
   * to specific buckets and prefixes. If omitted, the trail captures all S3 data
   * events in the account.
   *
   * Mutually exclusive with `dataEventSelectors`.
   *
   * Use cases: Audit specific data lake buckets; Reduce CloudTrail costs; Targeted compliance logging
   *
   * AWS: CloudTrail S3 data event selectors (DataResources on the trail)
   *
   * Validation: Optional; array of EventSelectorConfig objects with required bucketName
   */
  readonly eventSelectors?: EventSelectorConfig[];
  /**
   * Optional list of data event selectors for any CloudTrail-supported resource type,
   * rendered as advanced event selectors. Use this for non-S3 data events, such as
   * `AWS::BedrockAgentCore::Runtime` invocations.
   *
   * Mutually exclusive with `eventSelectors`: CloudTrail accepts either basic or advanced
   * event selectors on a trail, never both. Setting both fails at synth.
   *
   * Data events are billed per event and can be high volume, so scope with `resourceArns`
   * where practical.
   *
   * Use cases: AgentCore invocation auditing; EventBridge alerting on invocation auth failures; Lambda or DynamoDB data events
   *
   * AWS: CloudTrail advanced event selectors (AdvancedEventSelectors on the trail)
   *
   * Validation: Optional; keys become the CloudTrail selector names; values must be valid DataEventSelectorConfig
   */
  readonly dataEventSelectors?: { readonly [name: string]: DataEventSelectorConfig };
}
export interface AuditTrailL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * CloudTrail audit trail configuration (single trail, backward-compatible).
   * @deprecated Use `trails` with a key of `'s3-audit'` for equivalent behavior.
   */
  readonly trail?: AuditTrailProps;
  /**
   * Named CloudTrail audit trail configurations for deploying multiple trails.
   * Each key becomes part of the trail's resource name and construct ID.
   * Can be used alongside or instead of the single `trail` property.
   *
   * Use cases: Separate trails per data domain; Different retention/encryption per trail; Team-scoped auditing
   *
   * AWS: Multiple CloudTrail trails with independent S3 destinations and event selectors
   *
   * Validation: Optional; keys must be valid resource name segments; values must be valid AuditTrailProps
   */
  readonly trails?: { readonly [name: string]: AuditTrailProps };
}

export class AuditTrailL3Construct extends MdaaL3Construct {
  protected readonly props: AuditTrailL3ConstructProps;

  constructor(scope: Construct, id: string, props: AuditTrailL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // prettier-ignore
    if (!this.props.trail && !this.props.trails) { // NOSONAR
      throw new Error("At least one of 'trail' or 'trails' must be provided.");
    }

    // prettier-ignore
    if (this.props.trail) { // NOSONAR
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/audit-trail-l3-construct:trailDeprecated',
        "The 'trail' property is deprecated and will be removed in a future major version. " +
          "Migrate to 'trails' with a key of 's3-audit' for equivalent behavior.",
      );
      // prettier-ignore
      this.createTrail('s3-audit', this.props.trail); // NOSONAR
    }

    if (this.props.trails) {
      Object.entries(this.props.trails).forEach(([trailName, trailProps]) => {
        this.createTrail(trailName, trailProps);
      });
    }
  }

  private createTrail(trailName: string, trailConfig: AuditTrailProps) {
    // prettier-ignore
    if (trailConfig.eventSelectors && trailConfig.dataEventSelectors) { // NOSONAR
      throw new Error(
        `Trail '${trailName}' sets both 'eventSelectors' and 'dataEventSelectors'. CloudTrail accepts either ` +
          'basic event selectors or advanced event selectors on a trail, but not both. Use ' +
          "'dataEventSelectors' with a resourceType of 'AWS::S3::Object' to express S3 data events alongside " +
          'other resource types, or split the two selector styles across separate trails.',
      );
    }

    // Warned rather than defaulted on: omitting the flag means "off" on the basic-selector
    // path too, and defaulting it per-path would silently add management event cost.
    // prettier-ignore
    if (trailConfig.dataEventSelectors && !trailConfig.includeManagementEvents) { // NOSONAR
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/audit-trail-l3-construct:dataEventSelectorsWithoutManagementEvents',
        `Trail '${trailName}' sets 'dataEventSelectors' without 'includeManagementEvents'. CloudTrail advanced ` +
          'event selectors replace the trail\'s default selectors, so this trail will capture NO management ' +
          '(control plane) events -- API calls such as UpdateAgentRuntime or DeleteAgentRuntime will not be ' +
          "logged. Set 'includeManagementEvents: true' on this trail, or ensure another trail in the account " +
          'and region covers management events.',
      );
    }

    const auditBucket = MdaaBucket.fromBucketName(
      this,
      `${trailName}-audit-bucket`,
      trailConfig.cloudTrailAuditBucketName,
    );
    const auditKmsKey = MdaaKmsKey.fromKeyArn(this, `${trailName}-audit-kms-key`, trailConfig.cloudTrailAuditKmsKeyArn);

    const auditTrail = trailConfig.dataEventSelectors
      ? AuditHelper.createDataEventCloudTrail(
          this,
          auditBucket,
          auditKmsKey,
          this.props.naming,
          trailName,
          Object.entries(trailConfig.dataEventSelectors).map(([name, selector]) => ({ name, ...selector })),
          trailConfig.includeManagementEvents,
        )
      : AuditHelper.createCloudTrail(
          this,
          auditBucket,
          auditKmsKey,
          this.props.naming,
          trailName,
          trailConfig.includeManagementEvents,
          trailConfig.eventSelectors?.map((selector, idx) => ({
            bucket: MdaaBucket.fromBucketName(this, `${trailName}-event-selector-bucket-${idx}`, selector.bucketName),
            objectPrefix: selector.objectPrefix,
          })),
        );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      auditTrail,
      [
        {
          id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
          reason: 'CloudTrail targeted at dedicated Audit Bucket.',
        },
        {
          id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
          reason: 'CloudTrail targeted at dedicated Audit Bucket.',
        },
        { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
      ],
      true,
    );
  }
}
