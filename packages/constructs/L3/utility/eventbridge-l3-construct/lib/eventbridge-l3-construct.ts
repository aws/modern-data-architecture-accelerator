/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaEventBus, MdaaEventBusProps } from '@aws-mdaa/eventbridge-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { ArnPrincipal, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * EventBridge principal configuration for cross-account and cross-service event bus access control. Defines IAM principals that can publish events to custom EventBridge event buses, supporting both AWS service principals and cross-account ARN-based access for event-driven architectures.
 *
 * Use cases: Cross-account event publishing; AWS service event integration; Multi-account event-driven architectures
 *
 * AWS: EventBridge event bus resource policy principals for controlling event publishing permissions and cross-account access
 *
 * Validation: Either arn (valid IAM principal ARN) or service (valid AWS service name) must be specified, but not both
 */
export interface EventBusPrincipalProps {
  readonly arn?: string;
  readonly service?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for EventBridge custom event bus properties defining access control and retention settings. Configures event bus permissions and archive retention for secure, compliant event-driven architectures with cross-account access capabilities.
 *
 * Use cases: Custom event bus configuration; Cross-account event publishing; Event archive retention management
 *
 * AWS: Configures AWS EventBridge custom event bus with resource policies and archive settings
 *
 * Validation: principals array is optional; archiveRetention must be positive integer for days
 */
export interface EventBusProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM principals authorized to publish events to the custom EventBridge event bus enabling cross-account and cross-service event publishing. Defines specific AWS service principals or cross-account ARNs that can publish events to the event bus for event-driven architecture integration.
   *
   * Use cases: Cross-account event publishing; AWS service integration; Multi-account event architectures; Event publishing permissions
   *
   * AWS: EventBridge event bus resource policy principals for event publishing access control and permissions
   *
   * Validation: Must be array of valid EventBusPrincipalProps if provided; each principal must specify either arn or service but not both
   **/
  readonly principals?: EventBusPrincipalProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional event archive retention period in days for EventBridge event replay and historical event access. Defines how long events are retained in the event archive enabling event replay capabilities and historical event analysis for debugging and recovery scenarios.
   *
   * Use cases: Event replay; Historical analysis; Debugging support; Event recovery; Compliance retention; Event archiving
   *
   * AWS: Amazon EventBridge event archive retention configuration for event replay and historical access
   *
   * Validation: Must be positive integer if provided; represents retention period in days; enables event archive when specified
   **/
  readonly archiveRetention?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named event bus configuration interface for EventBridge with systematic event bus organization and management capabilities. Defines named event bus mappings for organized event-driven architectures including bus sets and systematic event bus administration.
 *
 * Use cases: Named event bus sets; Event bus organization; Systematic event bus administration; Multi-bus event architectures
 *
 * AWS: Amazon EventBridge named event bus configuration with systematic organization and management
 *
 * Validation: String keys must be unique event bus names; values must be valid EventBusProps configurations
 */
export interface NamedEventBusProps {
  /** @jsii ignore */
  readonly [name: string]: EventBusProps;
}
export interface EventBridgeL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of event bus names to event bus configurations for custom event routing and messaging infrastructure enabling event-driven architecture and application integration. Provides event bus configurations with access controls, archival settings, and principal permissions for event management and routing.
   *
   * Use cases: Custom event routing; Event-driven architecture; Application integration; Event management
   *
   * AWS: EventBridge custom event buses for event routing and application integration
   *
   * Validation: Must be valid NamedEventBusProps if provided; enables custom event bus deployment and event-driven architecture
   **/
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
