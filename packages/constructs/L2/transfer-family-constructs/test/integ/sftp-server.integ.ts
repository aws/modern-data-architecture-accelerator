/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaSFTPServer.
 *
 * Uses fixture resources (VPC + private subnets) via environment variables.
 *
 * Verifies that:
 *   - MdaaSFTPServer creates a Transfer Family SFTP server with VPC endpoint
 *   - FIPS 2020-06 security policy is enforced
 *   - SFTP protocol only
 *   - Logging role is attached
 *   - MDAA naming convention is applied
 */

import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { ForceDestroy, getFixtureResources, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { MdaaSFTPServer } from '../../lib';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegSftpServerStack', { env });

const fixture = getFixtureResources(stack);
const naming = getIntegNaming(app, 'sftp');

// Logging role for Transfer Family
const loggingRole = new MdaaRole(stack, 'LoggingRole', {
  naming,
  roleName: 'sftp-logging',
  assumedBy: new ServicePrincipal('transfer.amazonaws.com'),
});

// Security group for SFTP port
const sftpSg = new SecurityGroup(stack, 'SftpSG', {
  vpc: fixture.vpc,
  description: 'SFTP server integ test SG',
  allowAllOutbound: false,
});

// SFTP server with VPC endpoint
new MdaaSFTPServer(stack, 'SftpServer', {
  naming,
  vpcId: fixture.vpc.vpcId,
  subnetIds: fixture.privateSubnets.map(s => s.subnetId),
  securityGroupId: sftpSg.securityGroupId,
  loggingRole,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
