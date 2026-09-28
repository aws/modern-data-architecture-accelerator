/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaResourceType } from '@aws-mdaa/naming';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnNetworkInterface, CfnNetworkInterfaceProps } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Properties for creating a compliant elastic network interface.
 */
export interface MdaaNetworkInterfaceProps extends MdaaConstructProps {
  /** Name used to generate the interface's MDAA-conventional Name tag and SSM parameter paths */
  readonly networkInterfaceName: string;
  /** Subnet in which the interface is created. Determines the interface's availability zone */
  readonly subnetId: string;
  /** Description surfaced in the EC2 console to help operators identify the interface */
  readonly description?: string;
  /** Fixed primary private IPv4 address. Must fall inside the subnet CIDR. AWS assigns one when omitted */
  readonly privateIpAddress?: string;
  /**
   * Security groups governing traffic on this interface, independent of the instance's own groups.
   * At least one is required: EC2 places an interface created with no group in the VPC default
   * security group, which permits all traffic between its members and all outbound traffic. That
   * association is made by EC2 rather than CloudFormation, so it is invisible to both the template
   * and CDK Nag -- an empty group set is rejected here instead. To use the VPC default group
   * deliberately, pass its id explicitly.
   */
  readonly securityGroupIds: string[];
  /** Set false to allow the interface to forward traffic it is neither the source nor destination of */
  readonly sourceDestCheck?: boolean;
}

/**
 * A construct for creating a compliant elastic network interface (ENI).
 *
 * The interface is named/tagged per MDAA convention and retained, so that its private IP and MAC
 * outlive the stack that declared it. Attachment to an instance is not performed here; see
 * `CfnNetworkInterfaceAttachment`, which must remain a separate resource so that an
 * instance-replacing update can detach before re-attaching.
 *
 * Retention covers stack deletion and replacing updates but not a rolled-back create, which would
 * otherwise leave an interface holding a pinned `privateIpAddress` that every retry then fails to
 * claim. A retained interface does hold its address against a later redeploy under a new logical
 * ID -- after the interface is renamed, or the stack is deleted and deployed again -- so that
 * address is claimable only once the retained interface is deleted out of band.
 */
export class MdaaNetworkInterface extends CfnNetworkInterface {
  private static networkInterfaceName(props: MdaaNetworkInterfaceProps): string {
    return props.naming
      .withResourceType(MdaaResourceType.EC2_NETWORK_INTERFACE)
      .resourceName(props.networkInterfaceName);
  }

  private static setProps(props: MdaaNetworkInterfaceProps): CfnNetworkInterfaceProps {
    return {
      subnetId: props.subnetId,
      description: props.description,
      privateIpAddress: props.privateIpAddress,
      groupSet: props.securityGroupIds,
      sourceDestCheck: props.sourceDestCheck,
      tags: [{ key: 'Name', value: MdaaNetworkInterface.networkInterfaceName(props) }],
    };
  }

  constructor(scope: Construct, id: string, props: MdaaNetworkInterfaceProps) {
    super(scope, id, MdaaNetworkInterface.setProps(props));

    if (props.securityGroupIds.length === 0) {
      throw new Error(
        `Network Interface ${props.networkInterfaceName} securityGroupIds is empty. At least one security group is required, because EC2 places an interface with no group in the permissive VPC default security group.`,
      );
    }

    this.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE);

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'network-interface',
        resourceId: props.networkInterfaceName,
        name: 'id',
        value: this.attrId,
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'network-interface',
        resourceId: props.networkInterfaceName,
        name: 'private-ip',
        value: this.attrPrimaryPrivateIpAddress,
        ...props,
      },
      scope,
    );
  }
}
