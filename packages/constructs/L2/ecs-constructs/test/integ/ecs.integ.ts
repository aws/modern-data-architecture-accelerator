/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaECSCluster, MdaaECSFargateService, and MdaaECSContainerDefinition.
 *
 * Uses fixture resources (VPC, private subnets, KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaECSCluster creates a cluster with container insights and exec command logging
 *   - MdaaECSContainerDefinition enforces awsLogs logging driver
 *   - MdaaECSFargateService creates a service with no public IP and latest platform version
 *   - MDAA naming convention is applied to all resources
 *   - KMS encryption is used for exec command logging
 */

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaECSCluster, MdaaECSContainerDefinition, MdaaECSFargateService } from '../../lib';
import { ForceDestroy, getFixtureResources, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage, FargateTaskDefinition, PropagatedTagSource } from 'aws-cdk-lib/aws-ecs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegEcsStack', { env });

const fixture = getFixtureResources(stack);
const naming = getIntegNaming(app, 'ecs');

// Log group for ECS cluster exec command logging
const logGroup = new MdaaLogGroup(stack, 'LogGroup', {
  naming,
  encryptionKey: fixture.kmsKey,
  logGroupNamePathPrefix: '/mdaa/integ',
  logGroupName: 'ecs-logs',
  retention: RetentionDays.ONE_DAY,
});

// ECS cluster with container insights and exec command config
const cluster = new MdaaECSCluster(stack, 'Cluster', {
  naming,
  clusterName: 'integ-ecs',
  vpc: fixture.vpc,
  kmsKey: fixture.kmsKey,
  logGroup,
  enableFargateCapacityProviders: true,
});

// Fargate task definition (CDK native, not MDAA-wrapped)
const taskDefinition = new FargateTaskDefinition(stack, 'TaskDef', {
  memoryLimitMiB: 512,
  cpu: 256,
});

// Container definition with public ECR image
new MdaaECSContainerDefinition(stack, 'Container', {
  naming,
  taskDefinition,
  image: ContainerImage.fromRegistry('public.ecr.aws/amazonlinux/amazonlinux:minimal'),
  containerName: 'integ-container',
  logGroup,
  streamPrefix: 'ecs',
  essential: true,
  memoryLimitMiB: 512,
});

// Security group for the Fargate service
const serviceSg = new SecurityGroup(stack, 'ServiceSG', {
  vpc: fixture.vpc,
  description: 'ECS Fargate service integ test SG',
  allowAllOutbound: false,
});

// Fargate service with desiredCount: 0 to avoid running tasks
new MdaaECSFargateService(stack, 'Service', {
  naming,
  serviceName: 'integ-svc',
  cluster,
  taskDefinition,
  subnets: fixture.privateSubnets,
  securityGroups: [serviceSg],
  desiredCount: 0,
  propagateTags: PropagatedTagSource.SERVICE,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
