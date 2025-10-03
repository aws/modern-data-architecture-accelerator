/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Duration, Stack } from 'aws-cdk-lib';
import { EventBus, EventBusProps, IEventBus } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement, PrincipalBase } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface MdaaEventBusProps extends MdaaConstructProps {
  readonly eventBusName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional event archive retention period in days for event replay and audit capabilities enabling event history management and compliance. Provides event archival for replay scenarios, audit requirements, and event history analysis with configurable retention periods.
   *
   * Use cases: Event replay; Audit compliance; Event history; Disaster recovery; Event analysis
   *
   * AWS: EventBridge event archive retention for event replay capabilities and audit compliance
   *
   * Validation: Must be positive integer if provided; defines event retention period for archival and replay
   **/
  readonly archiveRetention?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of principals for PutEvent access control enabling cross-account and service integration with secure event publishing. Provides IAM principals that will be granted permission to publish events to the event bus through resource-based policies.
   *
   * Use cases: Cross-account access; Service integration; Event publishing permissions; Secure event access
   *
   * AWS: IAM principals for EventBridge event bus PutEvent permissions and cross-account access control
   *
   * Validation: Must be array of valid PrincipalBase objects if provided; enables secure event publishing access
   *   **/
  readonly principals?: PrincipalBase[];
}

/**
 * Interface for IMdaaEventBus.
 */
export type IMdaaEventBus = IEventBus;

/**
 * Construct for a compliant CloudWatch Log Group
 */
export class MdaaEventBus extends EventBus implements IMdaaEventBus {
  private static setProps(props: MdaaEventBusProps): EventBusProps {
    const overrideProps = {
      eventBusName: props.naming.resourceName(props.eventBusName, 48),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaEventBusProps) {
    super(scope, id, MdaaEventBus.setProps(props));

    if (props.archiveRetention) {
      this.archive(`archive`, {
        archiveName: props.naming.resourceName(`${props.eventBusName}-archive`, 48),
        description: `Archive for ${this.eventBusName}`,
        eventPattern: {
          account: [Stack.of(this).account],
        },
        retention: Duration.days(props.archiveRetention),
      });
    }

    if (props.principals && props.principals.length > 0) {
      const policyStatement = new PolicyStatement({
        sid: `${props.eventBusName}-put-events`.substring(0, 60),
        principals: props.principals,
        actions: ['events:PutEvents'],
        effect: Effect.ALLOW,
        resources: [this.eventBusArn],
      });

      this.addToResourcePolicy(policyStatement);
    }
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'eventbus',
          resourceId: props.eventBusName,
          name: 'name',
          value: this.eventBusName,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'eventbus',
          resourceId: props.eventBusName,
          name: 'arn',
          value: this.eventBusArn,
        },
        ...props,
      },
      scope,
    );
  }
}
