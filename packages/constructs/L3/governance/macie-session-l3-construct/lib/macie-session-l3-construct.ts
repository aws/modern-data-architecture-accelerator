/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnSession } from 'aws-cdk-lib/aws-macie';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * Amazon Macie session configuration interface for data security monitoring with finding publication frequency and session status management. Defines Macie session properties for automated sensitive data discovery and classification including configurable finding publication intervals and session activation control for data privacy compliance.
 *
 * Use cases: Sensitive data discovery; Data privacy compliance; Security monitoring; Data classification automation; PII detection; Compliance reporting
 *
 * AWS: Amazon Macie session with configurable finding publication frequency for automated sensitive data discovery and privacy monitoring
 *
 * Validation: findingPublishingFrequency must be valid SessionFindingPublishingFrequencyEnum value; status must be valid SessionStatusEnum value if specified
 */
export interface MacieSessionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required finding publication frequency for Amazon Macie session controlling how often security findings are published and reported. Defines the frequency at which Macie will publish findings about sensitive data discovery and security issues for compliance monitoring and security response.
   *
   * Use cases: Finding publication control; Security reporting frequency; Compliance monitoring; Alert frequency management
   *
   * AWS: Amazon Macie session finding publication frequency for security finding reporting and compliance monitoring
   *
   * Validation: Must be valid SessionFindingPublishingFrequencyEnum value; required for finding publication configuration
   **/
  readonly findingPublishingFrequency: SessionFindingPublishingFrequencyEnum;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional session status for Amazon Macie session controlling whether data security monitoring is active or paused. Defines the operational status of the Macie session enabling control over when sensitive data discovery and classification activities are performed.
   *
   * Use cases: Session activation control; Monitoring pause/resume; Operational status management; Cost control
   *
   * AWS: Amazon Macie session status for controlling data security monitoring activation and operational state
   *
   * Validation: Must be valid SessionStatusEnum value if provided; optional for session status control
   **/
  readonly status?: SessionStatusEnum;
}
export interface MacieSessionL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required Macie session configuration defining data security monitoring setup including finding publication frequency and session status. Provides session configuration for automated data discovery, classification, and security monitoring with configurable finding publication and session management.
   *
   * Use cases: Data security monitoring; Session configuration; Finding publication; Security automation
   *
   * AWS: Macie session configuration for automated data security monitoring and classification
   *
   * Validation: Must be valid MacieSessionProps; required for Macie session deployment and data security monitoring
   **/
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
