/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnDelivery, CfnDeliveryDestination, CfnDeliverySource, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { MdaaLogGroup } from './loggroup';

/**
 * Props for {@link createMdaaVendedLogDelivery}.
 *
 * CloudWatch Logs "vended log delivery" is how logs are captured for AWS resources that do not write
 * to a log group directly (e.g. a Bedrock Knowledge Base or an AgentCore Gateway): a delivery
 * **source** bound to the resource ARN → a delivery **destination** on a log group → a **delivery**
 * linking them, writing into a CMK-encrypted destination log group. This wraps that fixed wiring so
 * it is defined once instead of reimplemented per L3.
 *
 * This helper adds **no KMS key-policy grants** — the CloudWatch Logs at-rest grant and the
 * `delivery.logs.amazonaws.com` vended-delivery grant are the responsibility of whoever provisions
 * the key (the orchestrating construct), consistent with how the key is granted for the resource's
 * other uses. The caller passes an already-granted key.
 */
export interface MdaaVendedLogDeliveryProps {
  /**
   * The KMS key the destination log group is encrypted with. The key's policy must already grant
   * CloudWatch Logs (`logs.{region}.amazonaws.com`) and vended delivery (`delivery.logs.amazonaws.com`)
   * use of the key, scoped to the destination log-group ARN — this helper does not add those grants.
   */
  readonly encryptionKey: IKey;
  /**
   * Path prefix for the destination log group name (MdaaLogGroup appends the MDAA-named segment),
   * e.g. `/aws/vendedlogs/bedrock/knowledge-base/`.
   */
  readonly logGroupNamePathPrefix: string;
  /**
   * The MDAA-named segment passed to MdaaLogGroup as `logGroupName` and used as the delivery
   * source/destination resource-name seed (typically the resource / instance name).
   */
  readonly resourceName: string;
  /**
   * The ARN of the resource whose logs are delivered (the delivery source's `resourceArn`).
   */
  readonly resourceArn: string;
  /**
   * CloudWatch Logs delivery log type for the source, e.g. `APPLICATION_LOGS`. Must be a log type
   * the source resource supports (an unsupported value fails at deploy).
   */
  readonly logType: string;
  /**
   * Retention for the destination log group.
   * @default RetentionDays.INFINITE (audit-by-default: never silently drop audit logs)
   */
  readonly retention?: RetentionDays;
  /**
   * MDAA naming used for the log group and the delivery source/destination names.
   */
  readonly naming: IMdaaResourceNaming;
  /**
   * Construct-id prefix for the child resources, so each caller keeps stable, non-colliding ids
   * (and existing baselines do not move). Children are created with ids
   * `${idPrefix}loggroup${idSuffix}`, `${idPrefix}logsource${idSuffix}`,
   * `${idPrefix}logdestination${idSuffix}`, `${idPrefix}logdelivery${idSuffix}`.
   */
  readonly idPrefix: string;
  /**
   * Construct-id suffix for the child resources (see {@link idPrefix}). Use for per-instance callers
   * that must disambiguate ids (e.g. `-${kbName}`); omit for a singleton caller.
   * @default '' (empty)
   */
  readonly idSuffix?: string;
}

/**
 * The resources created by {@link createMdaaVendedLogDelivery}, exposed so callers can add explicit
 * dependencies or read the destination log group.
 */
export interface MdaaVendedLogDelivery {
  readonly logGroup: MdaaLogGroup;
  readonly deliverySource: CfnDeliverySource;
  readonly deliveryDestination: CfnDeliveryDestination;
  readonly delivery: CfnDelivery;
}

/**
 * Provisions a CMK-encrypted CloudWatch Logs vended log-delivery pipeline for a resource: a
 * {@link MdaaLogGroup} (CMK-encrypted, retention per {@link MdaaVendedLogDeliveryProps.retention})
 * plus a {@link CfnDeliverySource} on the resource ARN → a {@link CfnDeliveryDestination} → a
 * {@link CfnDelivery}. Adds **no** KMS grants (see {@link MdaaVendedLogDeliveryProps}).
 *
 * Children are created in `scope` (not in a wrapper construct) so callers keep their existing
 * construct-id tree and CloudFormation logical ids — reusable across L3s (e.g. the Bedrock Knowledge
 * Base and AgentCore Gateway constructs) without moving released baselines.
 */
export function createMdaaVendedLogDelivery(
  scope: Construct,
  props: MdaaVendedLogDeliveryProps,
): MdaaVendedLogDelivery {
  const idSuffix = props.idSuffix ?? '';

  const logGroup = new MdaaLogGroup(scope, `${props.idPrefix}loggroup${idSuffix}`, {
    encryptionKey: props.encryptionKey,
    logGroupNamePathPrefix: props.logGroupNamePathPrefix,
    logGroupName: props.resourceName,
    retention: props.retention ?? RetentionDays.INFINITE,
    naming: props.naming,
  });

  const deliverySource = new CfnDeliverySource(scope, `${props.idPrefix}logsource${idSuffix}`, {
    name: props.naming.withResourceType(MdaaResourceType.LOGS_DELIVERY_SOURCE).resourceName(props.resourceName, 60),
    logType: props.logType,
    resourceArn: props.resourceArn,
  });

  const deliveryDestination = new CfnDeliveryDestination(scope, `${props.idPrefix}logdestination${idSuffix}`, {
    name: props.naming
      .withResourceType(MdaaResourceType.LOGS_DELIVERY_DESTINATION)
      .resourceName(props.resourceName, 60),
    destinationResourceArn: logGroup.logGroupArn,
  });

  const delivery = new CfnDelivery(scope, `${props.idPrefix}logdelivery${idSuffix}`, {
    deliveryDestinationArn: deliveryDestination.attrArn,
    deliverySourceName: deliverySource.name,
  });
  // The delivery references the source by name (a string), not by resource — order it explicitly.
  delivery.addDependency(deliverySource);

  return { logGroup, deliverySource, deliveryDestination, delivery };
}
