/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import {
  AddCapacityOptions,
  CloudMapNamespaceOptions,
  Cluster,
  ClusterProps,
  ExecuteCommandLogging,
} from 'aws-cdk-lib/aws-ecs';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Properties for creating a Compliance ECS cluster
 */
export interface MdaaECSClusterProps extends MdaaConstructProps {
  readonly clusterName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for ECS cluster deployment providing network isolation and security controls for containerized applications. Defines the network environment where ECS instances and ENIs will be deployed for secure container networking and connectivity.
   *
   * Use cases: Network isolation; VPC integration; Secure networking; Container connectivity
   *
   * AWS: Amazon VPC for ECS cluster network isolation and secure container deployment
   *
   * Validation: Must be valid IVpc interface; required for ECS cluster network deployment and security
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  readonly defaultCloudMapNamespace?: CloudMapNamespaceOptions;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EC2 capacity configuration for ECS cluster compute resources enabling container hosting and scaling capabilities. Provides EC2-based compute capacity for container workloads with auto-scaling and resource management capabilities.
   *
   * Use cases: EC2 capacity; Container hosting; Compute scaling; Resource management
   *
   * AWS: Amazon EC2 capacity for ECS cluster compute resources and container hosting
   *
   * Validation: Must be valid AddCapacityOptions if provided; enables EC2-based container compute capacity
   *   **/
  readonly capacity?: AddCapacityOptions;
  readonly enableFargateCapacityProviders?: boolean;
  readonly kmsKey: IKey;
  readonly logGroup: ILogGroup;
}

/**
 * A construct for creating a compliant ECS cluster resource.
 */
export class MdaaECSCluster extends Cluster {
  private static setProps(props: MdaaECSClusterProps): ClusterProps {
    const overrideProps = {
      clusterName: props.naming.resourceName(props.clusterName, 255),
      containerInsights: true,
      executeCommandConfiguration: {
        kmsKey: props.kmsKey,
        logConfiguration: {
          cloudWatchEncryptionEnabled: true,
          cloudWatchLogGroup: props.logGroup,
        },
        logging: ExecuteCommandLogging.OVERRIDE,
      },
    };
    const allProps: ClusterProps = {
      ...props,
      ...overrideProps,
    };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaECSClusterProps) {
    super(scope, id, MdaaECSCluster.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterName,
          name: 'arn',
          value: this.clusterArn,
        },
        ...props,
      },
      scope,
    );
  }
}
