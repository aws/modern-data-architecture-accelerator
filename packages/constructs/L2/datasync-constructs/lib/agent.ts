/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { CfnAgent, CfnAgentProps } from 'aws-cdk-lib/aws-datasync';
import { Construct } from 'constructs';

export interface MdaaDataSyncAgentProps extends MdaaConstructProps {
  /** Agent activation key obtained from DataSync console or HTTP GET request enabling agent */
  readonly activationKey: string;
  readonly agentName?: string;
  readonly securityGroupArns: string[];
  readonly subnetArns: string[];
  /** VPC endpoint ID for private DataSync agent access through AWS PrivateLink enabling secure */
  readonly vpcEndpointId: string;
}

/**
 * Reusable CDK construct for a compliant DataSync service.
 * Specifically, enforces VPC configuration, logging, and security policy
 */
export class MdaaDataSyncAgent extends CfnAgent {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaDataSyncAgentProps): CfnAgentProps {
    const overrideProps = {
      agentName: props.naming.resourceName(props.agentName, 256),
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaDataSyncAgentProps) {
    super(scope, id, MdaaDataSyncAgent.setProps(props));

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'agent',
        resourceId: props.agentName,
        name: 'arn',
        value: this.attrAgentArn,
      },
      ...props,
    });
  }
}
