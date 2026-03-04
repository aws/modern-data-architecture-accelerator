/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaSecurityGroup and MdaaEC2Volume.
 *
 * Uses fixture resources (VPC + KMS) via environment variables.
 *
 * Verifies that:
 *   - MdaaSecurityGroup creates a SG with allowAllOutbound=false by default
 *   - CIDR ingress/egress rules and self-reference rule are applied
 *   - MdaaEC2Volume creates an encrypted EBS volume with KMS CMK
 *   - MDAA naming convention is applied to all resources
 */

import { MdaaSecurityGroup, MdaaEC2Volume } from '../../lib';
import { ForceDestroy, getFixtureResources, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Size, Stack } from 'aws-cdk-lib';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegEc2ExtrasStack', { env });

const fixture = getFixtureResources(stack);
const naming = getIntegNaming(app, 'ec2x');

// Security group with CIDR ingress/egress and self-reference rule
new MdaaSecurityGroup(stack, 'SecurityGroup', {
  naming,
  securityGroupName: 'integ-sg',
  vpc: fixture.vpc,
  description: 'EC2 extras integ test SG',
  ingressRules: {
    ipv4: [{ cidr: '10.0.0.0/16', port: 443, protocol: 'tcp', description: 'HTTPS from VPC' }],
  },
  egressRules: {
    ipv4: [{ cidr: '0.0.0.0/0', port: 443, protocol: 'tcp', description: 'HTTPS outbound' }],
  },
  addSelfReferenceRule: true,
});

// EBS volume with KMS encryption, gp3, 8 GiB, first AZ
new MdaaEC2Volume(stack, 'Volume', {
  naming,
  volumeName: 'integ-vol',
  availabilityZone: fixture.availabilityZones[0],
  encryptionKey: fixture.kmsKey,
  volumeType: EbsDeviceVolumeType.GP3,
  size: Size.gibibytes(8),
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();
