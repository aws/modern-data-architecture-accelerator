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
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnets for Fargate service network placement enabling VPC connectivity and network isolation. Defines the network subnets where Fargate tasks will be deployed for secure networking and connectivity within the VPC environment.
   *
   * Use cases: Network placement; VPC connectivity; Subnet distribution; Network isolation
   *
   * AWS: VPC subnets for ECS Fargate service network placement and connectivity
   *
   * Validation: Must be array of valid ISubnet interfaces; required for Fargate service network placement
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISubnet.html
   **/
  readonly subnets: ISubnet[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of security groups for Fargate service network access control defining inbound and outbound traffic rules. Provides network-level security controls for Fargate tasks ensuring secure communication and access control within the VPC.
   *
   * Use cases: Network security; Access control; Traffic filtering; Security group management
   *
   * AWS: VPC security groups for ECS Fargate service network security and access control
   *
   * Validation: Must be array of valid ISecurityGroup interfaces; required for network security and access control
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
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
