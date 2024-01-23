/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from "@aws-caef/construct";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { AddCapacityOptions, CloudMapNamespaceOptions, Cluster, ClusterProps, ExecuteCommandLogging } from "aws-cdk-lib/aws-ecs";
import { IKey } from "aws-cdk-lib/aws-kms";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";


/**
 * Properties for creating a Compliance ECS cluster
 */

export interface CaefECSClusterProps extends CaefConstructProps {
    /**
     * The name for the cluster.
     */
    readonly clusterName?: string;
    /**
     * The VPC where your ECS instances will be running or your ENIs will be deployed
     */
    readonly vpc: IVpc;
    /**
     * The service discovery namespace created in this cluster
     *
     * @default - no service discovery namespace created, you can use `addDefaultCloudMapNamespace` to add a
     * default service discovery namespace later.
     */
    readonly defaultCloudMapNamespace?: CloudMapNamespaceOptions;
    /**
     * The ec2 capacity to add to the cluster
     *
     * @default - no EC2 capacity will be added, you can use `addCapacity` to add capacity later.
     */
    readonly capacity?: AddCapacityOptions;
    /**
     * Whether to enable Fargate Capacity Providers
     *
     * @default false
     */
    readonly enableFargateCapacityProviders?: boolean;
    /**
     * The KMS Key to be used to encrypt resources related to the cluster
     */
    readonly kmsKey: IKey
    /**
     * The Log Group to be used for cluster logging.
     */
    readonly logGroup: ILogGroup
}

/**
 * A construct for creating a compliant ECS cluster resource.
 */
export class CaefECSCluster extends Cluster {

    private static setProps ( props: CaefECSClusterProps ): ClusterProps {
        const overrideProps = {
            clusterName: props.naming.resourceName( props.clusterName, 255 ),
            containerInsights: true,
            executeCommandConfiguration: {
                kmsKey: props.kmsKey,
                logConfiguration: {
                    cloudWatchEncryptionEnabled: true,
                    cloudWatchLogGroup: props.logGroup
                },
                logging: ExecuteCommandLogging.OVERRIDE
            }
        }
        const allProps: ClusterProps = {
            ...props, ...overrideProps
        }
        return allProps
    }

    constructor( scope: Construct, id: string, props: CaefECSClusterProps ) {
        super( scope, id, CaefECSCluster.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "cluster",
                resourceId: props.clusterName,
                name: "arn",
                value: this.clusterArn
            }, ...props
        },scope )
    }
}
