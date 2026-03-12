/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaEventBus, MdaaEventBusProps } from '@aws-mdaa/eventbridge-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { ArnPrincipal, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Principal authorized to publish events to a custom EventBridge event bus.
 * Specify exactly one of arn or service — not both.
 *
 * Use cases: Cross-account event publishing via ARN; AWS service integration via service principal
 *
 * AWS: EventBridge event bus resource policy principal
 *
 * Validation: Exactly one of arn or service must be specified
 */
export interface EventBusPrincipalProps {
  /**
   * IAM principal ARN for cross-account event publishing access.
   * Mutually exclusive with service.
   *
   * Use cases: Cross-account event bus access; Specific IAM role/user event publishing
   *
   * AWS: IAM principal ARN for EventBridge resource policy
   *
   * Validation: Optional; must be valid IAM principal ARN; mutually exclusive with service
   */
  readonly arn?: string;
  /**
   * AWS service principal name for service-based event publishing access
   * (e.g. some-service.amazonaws.com). Mutually exclusive with arn.
   *
   * Use cases: AWS service event integration; Service-to-bus event routing
   *
   * AWS: AWS service principal for EventBridge resource policy
   *
   * Validation: Optional; must be valid AWS service principal; mutually exclusive with arn
   */
  readonly service?: string;
}
/**
 * Custom EventBridge event bus configuration with access control and archive retention.
 * Principals are granted PutEvent access via resource policy.
 * An event archive is automatically created for each bus.
 *
 * Use cases: Custom event bus with cross-account publishing; Event archival for replay and debugging
 *
 * AWS: EventBridge custom event bus with resource policy and event archive
 *
 * Validation: All properties optional; archiveRetention must be positive integer (days)
 */
export interface EventBusProps {
  /**
   * Principals authorized to publish events to this bus via resource policy.
   * Each entry must specify exactly one of arn or service.
   *
   * Use cases: Cross-account event publishing; AWS service event integration
   *
   * AWS: EventBridge event bus resource policy principals (PutEvent access)
   *
   * Validation: Optional; array of valid EventBusPrincipalProps
   */
  readonly principals?: EventBusPrincipalProps[];
  /**
   * Number of days to retain events in the automatically created archive.
   * Enables event replay for debugging and recovery.
   *
   * Use cases: Event replay; Historical event analysis; Compliance retention
   *
   * AWS: EventBridge event archive retention period
   *
   * Validation: Optional; positive integer representing days
   */
  readonly archiveRetention?: number;
}

/**
 * Map of event bus names to EventBusProps configurations.
 *
 * Use cases: Defining multiple named event buses in a single configuration
 *
 * AWS: EventBridge custom event bus name-to-config mapping
 *
 * Validation: Keys must be unique event bus names; values must be valid EventBusProps
 */
export interface NamedEventBusProps {
  /** @jsii ignore */
  readonly [name: string]: EventBusProps;
}
export interface EventBridgeL3ConstructProps extends MdaaL3ConstructProps {
  /** Named event bus configurations for custom event routing. */
  readonly eventBuses?: NamedEventBusProps;
}

export class EventBridgeL3Construct extends MdaaL3Construct {
  protected readonly props: EventBridgeL3ConstructProps;

  constructor(scope: Construct, id: string, props: EventBridgeL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    Object.entries(this.props.eventBuses || {}).forEach(entry => {
      const eventBusName = entry[0];
      const eventBusProps = entry[1];

      const principals = eventBusProps.principals?.map(x => this.createPrincipalFromProps(x));

      const eventBusL2Props: MdaaEventBusProps = {
        eventBusName: eventBusName,
        naming: this.props.naming,
        archiveRetention: eventBusProps.archiveRetention,
        principals: principals,
      };
      new MdaaEventBus(this, `${eventBusName}-bus`, eventBusL2Props);
    });
  }
  private createPrincipalFromProps(principalProps: EventBusPrincipalProps): ArnPrincipal | ServicePrincipal {
    if (principalProps.arn && !principalProps.service) {
      return new ArnPrincipal(principalProps.arn);
    } else if (principalProps.service && !principalProps.arn) {
      return new ServicePrincipal(principalProps.service);
    } else {
      throw new Error('Principal must have exactly one of arn or service defined.');
    }
  }
}
