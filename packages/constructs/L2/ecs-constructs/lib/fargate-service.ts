/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from "@aws-caef/construct";
import { Duration } from "aws-cdk-lib";
import { ISecurityGroup, ISubnet } from "aws-cdk-lib/aws-ec2";
import { CapacityProviderStrategy, CloudMapOptions, DeploymentCircuitBreaker, DeploymentController, FargatePlatformVersion, FargateService, FargateServiceProps, ICluster, PropagatedTagSource, ServiceConnectProps, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";


/**
 * Properties for creating a Compliance ECS fargateservice
 */

export interface CaefECSFargateServiceProps extends CaefConstructProps {
    /**
     * The task definition to use for tasks in the service.
     */
    readonly taskDefinition: TaskDefinition;
    /**
     * The subnets to associate with the service.
     *
     */
    readonly subnets: ISubnet[];
    /**
     * The security groups to associate with the service.
     */
    readonly securityGroups: ISecurityGroup[];
    /**
     * The name of the cluster that hosts the service.
     */
    readonly cluster: ICluster;
    /**
     * The desired number of instantiations of the task definition to keep running on the service.
     *
     * @default - When creating the service, default is 1; when updating the service, default uses
     * the current task number.
     */
    readonly desiredCount?: number;
    /**
     * The name of the service.
     *
     * @default - CloudFormation-generated name.
     */
    readonly serviceName?: string;
    /**
     * The maximum number of tasks, specified as a percentage of the Amazon ECS
     * service's DesiredCount value, that can run in a service during a
     * deployment.
     *
     * @default - 100 if daemon, otherwise 200
     */
    readonly maxHealthyPercent?: number;
    /**
     * The minimum number of tasks, specified as a percentage of
     * the Amazon ECS service's DesiredCount value, that must
     * continue to run and remain healthy during a deployment.
     *
     * @default - 0 if daemon, otherwise 50
     */
    readonly minHealthyPercent?: number;
    /**
     * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy
     * Elastic Load Balancing target health checks after a task has first started.
     *
     * @default - defaults to 60 seconds if at least one load balancer is in-use and it is not already set
     */
    readonly healthCheckGracePeriod?: Duration;
    /**
     * The options for configuring an Amazon ECS service to use service discovery.
     *
     * @default - AWS Cloud Map service discovery is not enabled.
     */
    readonly cloudMapOptions?: CloudMapOptions;
    /**
     * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service
     *
     * Valid values are: PropagatedTagSource.SERVICE, PropagatedTagSource.TASK_DEFINITION
     */
    readonly propagateTags: PropagatedTagSource.TASK_DEFINITION | PropagatedTagSource.SERVICE;
    /**
     * Specifies whether to enable Amazon ECS managed tags for the tasks within the service. For more information, see
     * [Tagging Your Amazon ECS Resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)
     *
     * @default false
     */
    readonly enableECSManagedTags?: boolean;
    /**
     * Specifies which deployment controller to use for the service. For more information, see
     * [Amazon ECS Deployment Types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html)
     *
     * @default - Rolling update (ECS)
     */
    readonly deploymentController?: DeploymentController;
    /**
     * Whether to enable the deployment circuit breaker. If this property is defined, circuit breaker will be implicitly
     * enabled.
     * @default - disabled
     */
    readonly circuitBreaker?: DeploymentCircuitBreaker;
    /**
     * A list of Capacity Provider strategies used to place a service.
     *
     * @default - undefined
     *
     */
    readonly capacityProviderStrategies?: CapacityProviderStrategy[];
    /**
     * Whether to enable the ability to execute into a container
     *
     *  @default - undefined
     */
    readonly enableExecuteCommand?: boolean;
    /**
     * Configuration for Service Connect.
     *
     * @default No ports are advertised via Service Connect on this service, and the service
     * cannot make requests to other services via Service Connect.
     */
    readonly serviceConnectConfiguration?: ServiceConnectProps;
}

/**
 * A construct for creating a compliant ECS fargateservice resource.
 */
export class CaefECSFargateService extends FargateService {

    private static setProps ( props: CaefECSFargateServiceProps ): FargateServiceProps {
        const overrideProps = {
            serviceName: props.naming.resourceName( props.serviceName, 255 ),
            assignPublicIp: false,
            platformVersion: FargatePlatformVersion.LATEST,
            vpcSubnets: {
                subnets: props.subnets
            }
        }
        const allProps: FargateServiceProps = {
            ...props, ...overrideProps
        }
        return allProps
    }

    constructor( scope: Construct, id: string, props: CaefECSFargateServiceProps ) {
        super( scope, id, CaefECSFargateService.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "fargateservice",
                resourceId: props.serviceName,
                name: "arn",
                value: this.serviceArn
            }, ...props
        },scope )
        new CaefParamAndOutput( this, {
            ...{
                resourceType: "fargateservice",
                resourceId: props.serviceName,
                name: "name",
                value: this.serviceName
            }, ...props
        },scope )
    }
}
