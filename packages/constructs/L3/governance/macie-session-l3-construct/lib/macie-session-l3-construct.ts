/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnSession } from 'aws-cdk-lib/aws-macie';
import { Construct } from 'constructs';

/**
 * Macie session configuration controlling finding publication and session lifecycle.
 */
export interface MacieSessionProps {
  /**
   * How often Macie publishes findings about sensitive data discovery.
   *
   * Use cases: Near-real-time alerting (FIFTEEN_MINUTES); Balanced reporting (ONE_HOUR); Low-frequency summaries (SIX_HOURS)
   *
   * AWS: Amazon Macie session findingPublishingFrequency
   *
   * Validation: Required; FIFTEEN_MINUTES | ONE_HOUR | SIX_HOURS
   */
  readonly findingPublishingFrequency: SessionFindingPublishingFrequencyEnum;
  /**
   * Whether the Macie session is actively monitoring or paused.
   *
   * Use cases: Pause monitoring during maintenance; Resume after onboarding
   *
   * AWS: Amazon Macie session status
   *
   * Validation: Optional; ENABLED | PAUSED
   * @default ENABLED
   */
  readonly status?: SessionStatusEnum;
}
/** Internal props for the Macie Session L3 construct. */
export interface MacieSessionL3ConstructProps extends MdaaL3ConstructProps {
  /** Macie session configuration. */
  readonly session: MacieSessionProps;
}

export enum SessionStatusEnum {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
}

export enum SessionFindingPublishingFrequencyEnum {
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  ONE_HOUR = 'ONE_HOUR',
  SIX_HOURS = 'SIX_HOURS',
}

export class MacieSessionL3Construct extends MdaaL3Construct {
  protected readonly props: MacieSessionL3ConstructProps;

  constructor(scope: Construct, id: string, props: MacieSessionL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.createSession('macie-session', this.props.session);
  }

  private createSession(resourceName: string, sessionProps: MacieSessionProps): CfnSession {
    console.log(`Creating Macie Session`);
    const session = new CfnSession(this, resourceName, {
      findingPublishingFrequency: sessionProps.findingPublishingFrequency,
      status: sessionProps.status == undefined ? SessionStatusEnum.ENABLED : sessionProps.status,
    });

    return session;
  }
}
