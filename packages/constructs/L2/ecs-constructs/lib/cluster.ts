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
  /** VPC for ECS cluster deployment providing network isolation and security controls for */
  readonly vpc: IVpc;
  readonly defaultCloudMapNamespace?: CloudMapNamespaceOptions;
  /** EC2 capacity configuration for ECS cluster compute resources enabling container hosting and */
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
