/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaRole } from '@aws-mdaa/iam-constructs';
import { CfnTag, IResolvable } from 'aws-cdk-lib';
import { CfnServer, CfnServerProps } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';

export interface MdaaSFTPServerProps extends MdaaConstructProps {
  /** VPC ID for SFTP server deployment providing network isolation and security controls */
  readonly vpcId: string;
  /** Array of subnet IDs for SFTP server endpoint placement within the VPC */
  readonly subnetIds: string[];
  /** Primary security group ID for SFTP server network access control defining inbound and outbound traffic rules */
  readonly securityGroupId: string;
  readonly addressAllocationIds?: string[];
  readonly additionalSecurityGroupIds?: string[];
  readonly publicAddress?: boolean;
  /** Storage domain specification for file transfer operations controlling the underlying storage system */
  readonly domain?: string;
  readonly identityProviderDetails?: CfnServer.IdentityProviderDetailsProperty | IResolvable;
  readonly identityProviderType?: string;
  readonly loggingRole: IMdaaRole;
  readonly preAuthenticationLoginBanner?: string;
  readonly tags?: CfnTag[];
  readonly workflowDetails?: CfnServer.WorkflowDetailsProperty | IResolvable;
  /**
   * Optional Transfer Family security policy name controlling cryptographic algorithms for SFTP connections.
   * Defaults to 'TransferSecurityPolicy-FIPS-2020-06' for backwards compatibility.
   * Use a non-FIPS policy (e.g. 'TransferSecurityPolicy-2024-01') in regions that do not support FIPS.
   */
  readonly securityPolicyName?: string;
}

/**
 * Reusable CDK construct for a compliant Transfer Family SFTP Server.
 * Specifically, enforces VPC configuration, logging, and security policy
 */
export class MdaaSFTPServer extends CfnServer {
  private static SECURITY_POLICY_NAME = 'TransferSecurityPolicy-FIPS-2020-06';

  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaSFTPServerProps): CfnServerProps {
    const overrideProps = {
      endpointType: 'VPC',
      endpointDetails: {
        addressAllocationIds: props.addressAllocationIds,
        vpcId: props.vpcId,
        securityGroupIds: [props.securityGroupId, ...(props.additionalSecurityGroupIds || [])],
        subnetIds: props.subnetIds,
      },
      protocols: ['SFTP'],
      securityPolicyName: props.securityPolicyName ?? MdaaSFTPServer.SECURITY_POLICY_NAME,
      loggingRole: props.loggingRole.roleArn,
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaSFTPServerProps) {
    super(scope, id, MdaaSFTPServer.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'server',
        name: 'arn',
        value: this.attrArn,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'server',
        name: 'id',
        value: this.attrServerId,
      },
      scope,
    );
  }
}
