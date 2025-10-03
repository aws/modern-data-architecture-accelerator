/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { CfnAgent, CfnAgentProps } from 'aws-cdk-lib/aws-datasync';
import { Construct } from 'constructs';

export interface MdaaDataSyncAgentProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required agent activation key obtained from DataSync console or HTTP GET request enabling agent registration and authentication. Provides secure agent activation and registration with the DataSync service for authorized data transfer operations.
   *
   * Use cases: Agent activation; Service registration; Secure authentication; Agent authorization for data transfer
   *
   * AWS: AWS DataSync agent activation key for service registration and secure agent authentication
   *
   * Validation: Must be valid activation key string; required; obtained from DataSync console or agent IP address
   **/
  readonly activationKey: string;
  readonly agentName?: string;
  readonly securityGroupArns: string[];
  readonly subnetArns: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC endpoint ID for private DataSync agent access through AWS PrivateLink enabling secure data transfer without internet connectivity. Provides private network access to DataSync service through VPC endpoints for enhanced security and network isolation.
   *
   * Use cases: Private network data transfer; VPC-isolated operations; Enhanced security; PrivateLink connectivity
   *
   * AWS: AWS VPC endpoint ID for DataSync service access through PrivateLink for private network operations
   *
   * Validation: Must be valid VPC endpoint ID format (vpce-xxxxxxxxx); required for VPC-based agent operations
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-vpcendpointid
   */
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
