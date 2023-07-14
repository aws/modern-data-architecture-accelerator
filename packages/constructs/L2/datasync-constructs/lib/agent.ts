/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefParamAndOutput, CaefConstructProps } from "@aws-caef/construct";
import { CfnAgent, CfnAgentProps } from "aws-cdk-lib/aws-datasync";
import { Construct } from "constructs";


export interface CaefDataSyncAgentProps extends CaefConstructProps {
    /**
     * Your agent activation key. You can get the activation key either by sending an HTTP GET request with redirects that enable you to get the agent IP address (port 80). Alternatively, you can get it from the DataSync console.
     *
     * The redirect URL returned in the response provides you the activation key for your agent in the query string parameter `activationKey` . It might also include other activation-related parameters; however, these are merely defaults. The arguments you pass to this API call determine the actual configuration of your agent.
     *
     * For more information, see [Creating and activating an agent](https://docs.aws.amazon.com/datasync/latest/userguide/activating-agent.html) in the *AWS DataSync User Guide.*
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-activationkey
     */
    readonly activationKey: string;
    /**
     * The name you configured for your agent. This value is a text reference that is used to identify the agent in the console.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-agentname
     */
    readonly agentName?: string;
    /**
     * The Amazon Resource Names (ARNs) of the security groups used to protect your data transfer task subnets. See [SecurityGroupArns](https://docs.aws.amazon.com/datasync/latest/userguide/API_Ec2Config.html#DataSync-Type-Ec2Config-SecurityGroupArns) .
     *
     * *Pattern* : `^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):ec2:[a-z\-0-9]*:[0-9]{12}:security-group/.*$`
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-securitygrouparns
     */
    readonly securityGroupArns: string[];
    /**
     * The Amazon Resource Names (ARNs) of the subnets in which DataSync will create elastic network interfaces for each data transfer task. The agent that runs a task must be private. When you start a task that is associated with an agent created in a VPC, or one that has access to an IP address in a VPC, then the task is also private. In this case, DataSync creates four network interfaces for each task in your subnet. For a data transfer to work, the agent must be able to route to all these four network interfaces.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-subnetarns
     */
    readonly subnetArns: string[];
    /**
     * The ID of the virtual private cloud (VPC) endpoint that the agent has access to. This is the client-side VPC endpoint, powered by AWS PrivateLink . If you don't have an AWS PrivateLink VPC endpoint, see [AWS PrivateLink and VPC endpoints](https://docs.aws.amazon.com//vpc/latest/userguide/endpoint-services-overview.html) in the *Amazon VPC User Guide* .
     *
     * For more information about activating your agent in a private network based on a VPC, see [Using AWS DataSync in a Virtual Private Cloud](https://docs.aws.amazon.com/datasync/latest/userguide/datasync-in-vpc.html) in the *AWS DataSync User Guide.*
     *
     * A VPC endpoint ID looks like this: `vpce-01234d5aff67890e1` .
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-vpcendpointid
     */
    readonly vpcEndpointId: string;
}

/**
 * Reusable CDK construct for a compliant DataSync service.
 * Specifically, enforces VPC configuration, logging, and security policy
 */
export class CaefDataSyncAgent extends CfnAgent {

    /** Overrides specific compliance-related properties. */
    private static setProps ( props: CaefDataSyncAgentProps ): CfnAgentProps {

        const overrideProps = {
            agentName: props.naming.resourceName( props.agentName, 256 )
        };
        const allProps = { ...props, ...overrideProps };
        return allProps;
    }

    constructor( scope: Construct, id: string, props: CaefDataSyncAgentProps ) {
        super( scope, id, CaefDataSyncAgent.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "agent",
                resourceId: props.agentName,
                name: "arn",
                value: this.attrAgentArn
            }, ...props
        } )

    }
}

