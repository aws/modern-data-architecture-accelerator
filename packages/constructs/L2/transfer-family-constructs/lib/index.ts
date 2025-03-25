/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { IMdaaRole } from '@aws-mdaa/iam-constructs';
import { CfnTag, IResolvable } from 'aws-cdk-lib';
import { CfnServer, CfnServerProps } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';

/**
 * Props for creating a MDAA Athena Workgroup.
 */
export interface MdaaSFTPServerProps extends MdaaConstructProps {
  /**
   * Specifies the VPC id on which the server will be placed
   */
  readonly vpcId: string;
  /**
   * Specifies the subnets on which the server will be placed
   */
  readonly subnetIds: string[];
  /**
   * Security group which will be bound to the server.
   */
  readonly securityGroupId: string;
  /**
   * If specified, the SFTP server will be allocated a public IP address.
   */
  readonly addressAllocationIds?: string[];
  /**
   * Additional security group which will be bound to the server
   */
  readonly additionalSecurityGroupIds?: string[];
  /**
   * If true, SFTP server will be publicly accessible via Elastic IP/VPC
   */
  readonly publicAddress?: boolean;
  /**
   * Specifies the domain of the storage system that is used for file transfers.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-domain
   */
  readonly domain?: string;
  /**
   * Required when `IdentityProviderType` is set to `AWS_DIRECTORY_SERVICE` or `API_GATEWAY` . Accepts an array containing all of the information required to use a directory in `AWS_DIRECTORY_SERVICE` or invoke a customer-supplied authentication API, including the API Gateway URL. Not required when `IdentityProviderType` is set to `SERVICE_MANAGED` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-identityproviderdetails
   */
  readonly identityProviderDetails?: CfnServer.IdentityProviderDetailsProperty | IResolvable;
  /**
   * Specifies the mode of authentication for a server. The default value is `SERVICE_MANAGED` , which allows you to store and access user credentials within the AWS Transfer Family service.
   *
   * Use `AWS_DIRECTORY_SERVICE` to provide access to Active Directory groups in AWS Managed Active Directory or Microsoft Active Directory in your on-premises environment or in AWS using AD Connectors. This option also requires you to provide a Directory ID using the `IdentityProviderDetails` parameter.
   *
   * Use the `API_GATEWAY` value to integrate with an identity provider of your choosing. The `API_GATEWAY` setting requires you to provide an API Gateway endpoint URL to call for authentication using the `IdentityProviderDetails` parameter.
   *
   * Use the `AWS_LAMBDA` value to directly use a Lambda function as your identity provider. If you choose this value, you must specify the ARN for the lambda function in the `Function` parameter for the `IdentityProviderDetails` data type.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-identityprovidertype
   */
  readonly identityProviderType?: string;
  /**
   * Specifies the Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that allows a server to turn on Amazon CloudWatch logging for Amazon S3 or Amazon EFS events. When set, user activity can be viewed in your CloudWatch logs.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-loggingrole
   */
  readonly loggingRole: IMdaaRole;
  /**
   * Specify a string to display when users connect to a server. This string is displayed before the user authenticates. For example, the following banner displays details about using the system.
   *
   * `This system is for the use of authorized users only. Individuals using this computer system without authority, or in excess of their authority, are subject to having all of their activities on this system monitored and recorded by system personnel.`
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-preauthenticationloginbanner
   */
  readonly preAuthenticationLoginBanner?: string;
  /**
   * Key-value pairs that can be used to group and search for servers.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-tags
   */
  readonly tags?: CfnTag[];
  /**
   * Specifies the workflow ID for the workflow to assign and the execution role used for executing the workflow.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-transfer-server.html#cfn-transfer-server-workflowdetails
   */
  readonly workflowDetails?: CfnServer.WorkflowDetailsProperty | IResolvable;
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
      securityPolicyName: MdaaSFTPServer.SECURITY_POLICY_NAME,
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
