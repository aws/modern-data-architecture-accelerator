/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Duration } from 'aws-cdk-lib';
import { ISecurityGroup, ISubnet } from 'aws-cdk-lib/aws-ec2';
import {
  CapacityProviderStrategy,
  CloudMapOptions,
  DeploymentCircuitBreaker,
  DeploymentController,
  FargatePlatformVersion,
  FargateService,
  FargateServiceProps,
  ICluster,
  PropagatedTagSource,
  ServiceConnectProps,
  TaskDefinition,
} from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

/**
 * Properties for creating a Compliance ECS fargateservice
 */
export interface MdaaECSFargateServiceProps extends MdaaConstructProps {
  readonly taskDefinition: TaskDefinition;
  /** Array of subnets for Fargate service network placement enabling VPC connectivity and network isolation */
  readonly subnets: ISubnet[];
  /** Array of security groups for Fargate service network access control defining inbound and */
  readonly securityGroups: ISecurityGroup[];
  readonly cluster: ICluster;
  readonly desiredCount?: number;
  readonly serviceName?: string;
  readonly maxHealthyPercent?: number;
  readonly minHealthyPercent?: number;
  readonly healthCheckGracePeriod?: Duration;
  readonly cloudMapOptions?: CloudMapOptions;
  readonly propagateTags: PropagatedTagSource.TASK_DEFINITION | PropagatedTagSource.SERVICE;
  readonly enableECSManagedTags?: boolean;
  readonly deploymentController?: DeploymentController;
  readonly circuitBreaker?: DeploymentCircuitBreaker;
  readonly capacityProviderStrategies?: CapacityProviderStrategy[];
  /**
   * Whether to enable the ability to execute into a container
   *  @default - undefined
   */
  readonly enableExecuteCommand?: boolean;
  /**
   * Configuration for Service Connect.
   * @default No ports are advertised via Service Connect on this service, and the service
   * cannot make requests to other services via Service Connect.
   */
  readonly serviceConnectConfiguration?: ServiceConnectProps;
}

/**
 * A construct for creating a compliant ECS fargateservice resource.
 */
export class MdaaECSFargateService extends FargateService {
  private static setProps(props: MdaaECSFargateServiceProps): FargateServiceProps {
    const overrideProps = {
      serviceName: props.naming.resourceName(props.serviceName, 255),
      assignPublicIp: false,
      platformVersion: FargatePlatformVersion.LATEST,
      vpcSubnets: {
        subnets: props.subnets,
      },
    };
    const allProps: FargateServiceProps = {
      ...props,
      ...overrideProps,
    };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaECSFargateServiceProps) {
    super(scope, id, MdaaECSFargateService.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'fargateservice',
          resourceId: props.serviceName,
          name: 'arn',
          value: this.serviceArn,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'fargateservice',
          resourceId: props.serviceName,
          name: 'name',
          value: this.serviceName,
        },
        ...props,
      },
      scope,
    );
  }
}
