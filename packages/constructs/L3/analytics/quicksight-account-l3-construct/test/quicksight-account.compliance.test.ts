/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import { QuickSightAccountL3Construct, QuickSightAccountL3ConstructProps } from '../lib';

describe('QS Account Mandatory Tests', () => {
  const testApp = new MdaaTestApp();
  const testQSSecurityGroup: MdaaSecurityGroupRuleProps = {
    sg: [
      {
        sgId: 'sg-1234abcd',
        port: 1111,
        protocol: Protocol.TCP,
      },
    ],
    ipv4: [
      {
        cidr: '10.0.0.0/32',
        port: 1000,
        toPort: 2000,
        protocol: Protocol.TCP,
      },
    ],
    prefixList: [
      {
        prefixList: 'pl-abc123',
        port: 1000,
        toPort: 2000,
        protocol: Protocol.TCP,
      },
    ],
  };

  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      securityGroupAccess: testQSSecurityGroup,
      edition: 'ENTERPRISE_AND_Q',
      authenticationMethod: 'IAM_AND_QUICKSIGHT',
      notificationEmail: 'test@example.com',
      firstName: 'testFirstName',
      lastName: 'testLastName',
      emailAddress: 'test@example.com',
      contactNumber: '1234546879',
      vpcId: 'vpc-abcd1234',
      subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
      glueResourceAccess: ['database/some-database-name*'],
      ipRestrictions: [
        {
          cidr: '1.1.1.1/1',
          description: 'testing1',
        },
        {
          cidr: '2.2.2.2/2',
        },
      ],
      groups: ['readers', 'authors'],
    },
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('QS Account With Sample Config', () => {
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      accountDetail: Match.objectLike({
        edition: 'ENTERPRISE_AND_Q',
        authenticationMethod: 'IAM_AND_QUICKSIGHT',
        notificationEmail: 'test@example.com',
        accountName: 'test-org-test-env-test-domain-test-module',
      }),
    });
  });

  test('IP Restrictions', () => {
    template.hasResourceProperties('Custom::ip-restrictions', {
      accountId: 'test-account',
      ipRestrictionsMap: {
        '1.1.1.1/1': 'testing1',
        '2.2.2.2/2': 'Restriction for 2.2.2.2/2',
      },
    });
  });

  test('QuickSight Groups', () => {
    template.hasResourceProperties('Custom::qs-groups', {
      accountId: 'test-account',
      groups: ['readers', 'authors'],
    });
  });

  test('Security Group Ingress', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      CidrIp: '10.0.0.0/32',
      Description: 'from 10.0.0.0/32:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      ToPort: 65535,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      Description: 'from sg-1234abcd:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      SourceSecurityGroupId: 'sg-1234abcd',
      ToPort: 65535,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      Description: 'from pl-abc123:tcp RANGE 1-65535',
      FromPort: 1,
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      SourcePrefixListId: 'pl-abc123',
      ToPort: 65535,
    });
  });

  test('Security Group Egress', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      CidrIp: '10.0.0.0/32',
      Description: 'to 10.0.0.0/32:tcp RANGE 1000-2000',
      FromPort: 1000,
      ToPort: 2000,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      Description: 'to sg-1234abcd:tcp PORT 1111',
      DestinationSecurityGroupId: 'sg-1234abcd',
      FromPort: 1111,
      ToPort: 1111,
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackquicksightsgB57FA8A2', 'GroupId'],
      },
      IpProtocol: 'tcp',
      Description: 'to pl-abc123:tcp RANGE 1000-2000',
      DestinationPrefixListId: 'pl-abc123',
      FromPort: 1000,
      ToPort: 2000,
    });
  });

  test('VPC Connection name and ID use QUICKSIGHT_VPC_CONNECTION resource type', () => {
    template.hasResourceProperties('AWS::QuickSight::VPCConnection', {
      Name: testApp.naming
        .withResourceType(MdaaResourceType.QUICKSIGHT_VPC_CONNECTION)
        .resourceName('vpc-connection', 128),
      VPCConnectionId: testApp.naming
        .withResourceType(MdaaResourceType.QUICKSIGHT_VPC_CONNECTION)
        .resourceName('vpc-', 128),
    });
  });

  test('CR ManagedPolicies use IAM_POLICY resource type', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('qsAccount-cr-lambda'),
    });
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('quicksight-service-access'),
    });
  });

  test('CR provider Lambda function uses LAMBDA_FUNCTION resource type', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: testApp.naming
        .withResourceType(MdaaResourceType.LAMBDA_FUNCTION)
        .resourceName('qsAccount-cr-prov', 64),
    });
  });
});
describe('QS Account Name Validity Tests', () => {
  function constructProps(testApp: MdaaTestApp): QuickSightAccountL3ConstructProps {
    return {
      qsAccount: {
        edition: 'ENTERPRISE_AND_Q',
        authenticationMethod: 'IAM_AND_QUICKSIGHT',
        notificationEmail: 'test@example.com',
        vpcId: 'vpc-abcd1234',
        subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
      },
      naming: testApp.naming,

      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    };
  }

  test('QS Account With invalid name gets sanitized', () => {
    const testApp = new MdaaTestApp({
      org: 'D-test-not-allowed',
    });

    new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps(testApp));
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      accountDetail: Match.objectLike({
        edition: 'ENTERPRISE_AND_Q',
        authenticationMethod: 'IAM_AND_QUICKSIGHT',
        notificationEmail: 'test@example.com',
        accountName: 'test-not-allowed-test-env-test-domain-test-module',
      }),
    });
  });
  test('QS Account With long name', () => {
    const testApp = new MdaaTestApp({
      org: 'test-very-very-very-long-org',
    });

    new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps(testApp));
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      accountDetail: Match.objectLike({
        edition: 'ENTERPRISE_AND_Q',
        authenticationMethod: 'IAM_AND_QUICKSIGHT',
        notificationEmail: 'test@example.com',
        accountName: 'test-very-very-very-long-org-test-env-test-do-5d64fc24',
      }),
    });
  });
});

describe('QS Default Resource Access Role Tests', () => {
  const testApp = new MdaaTestApp();
  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      edition: 'ENTERPRISE',
      authenticationMethod: 'IAM_AND_QUICKSIGHT',
      notificationEmail: 'test@example.com',
      vpcId: 'vpc-abcd1234',
      subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates verbatim aws-quicksight-service-role-v0 with QuickSight trust and no data policies', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'aws-quicksight-service-role-v0',
      Path: '/service-role/',
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'quicksight.amazonaws.com' },
          }),
        ]),
      },
    });
  });

  test('Resource-access role carries no managed or inline data-access policies', () => {
    const roles = template.findResources('AWS::IAM::Role', {
      Properties: { RoleName: 'aws-quicksight-service-role-v0' },
    });
    const [role] = Object.values(roles);
    expect(role.Properties.ManagedPolicyArns).toBeUndefined();
    expect(role.Properties.Policies).toBeUndefined();
  });
});

describe('QS Resource Access Role Managed-Policy-Only Tests', () => {
  const testApp = new MdaaTestApp();
  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      edition: 'ENTERPRISE',
      authenticationMethod: 'IAM_AND_QUICKSIGHT',
      notificationEmail: 'test@example.com',
      vpcId: 'vpc-abcd1234',
      subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
      resourceAccessRolePermissions: {
        awsManagedPolicies: ['service-role/AWSQuicksightAthenaAccess'],
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Attaches the configured AWS-managed policy ARNs to the resource-access role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'aws-quicksight-service-role-v0',
      ManagedPolicyArns: Match.arrayWith(['arn:test-partition:iam::aws:policy/service-role/AWSQuicksightAthenaAccess']),
    });
  });

  test('Does not create a data-access managed policy (S3/KMS grants are attached by the project module)', () => {
    const policies = template.findResources('AWS::IAM::ManagedPolicy', {
      Properties: {
        ManagedPolicyName: testApp.naming
          .withResourceType(MdaaResourceType.IAM_POLICY)
          .resourceName('qs-resource-access'),
      },
    });
    expect(Object.keys(policies)).toHaveLength(0);
  });

  test('Attaches only the AWS-managed ARN when customerManagedPolicies is unset (no customer-managed ARN)', () => {
    const roles = template.findResources('AWS::IAM::Role', {
      Properties: { RoleName: 'aws-quicksight-service-role-v0' },
    });
    const [role] = Object.values(roles);
    expect(role.Properties.ManagedPolicyArns).toEqual([
      'arn:test-partition:iam::aws:policy/service-role/AWSQuicksightAthenaAccess',
    ]);
  });
});

describe('QS Resource Access Role Customer-Managed-Policy Tests', () => {
  const testApp = new MdaaTestApp();
  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      edition: 'ENTERPRISE',
      authenticationMethod: 'IAM_AND_QUICKSIGHT',
      notificationEmail: 'test@example.com',
      vpcId: 'vpc-abcd1234',
      subnetIds: ['test-subnet-id1', 'test-subnet-id2'],
      resourceAccessRolePermissions: {
        awsManagedPolicies: ['service-role/AWSQuicksightAthenaAccess'],
        customerManagedPolicies: ['my-scoped-athena-metadata-policy', 'my-second-scoped-policy'],
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };

  new QuickSightAccountL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Attaches the AWS-managed and all customer-managed policy ARNs to the resource-access role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'aws-quicksight-service-role-v0',
      ManagedPolicyArns: Match.arrayWith([
        'arn:test-partition:iam::aws:policy/service-role/AWSQuicksightAthenaAccess',
        'arn:test-partition:iam::test-account:policy/my-scoped-athena-metadata-policy',
        'arn:test-partition:iam::test-account:policy/my-second-scoped-policy',
      ]),
    });
  });

  // Pins the deliberate design choice in attachResourceAccessRolePermissions: each customer-managed
  // policy is imported with the policy name (not the array index) as its construct ID. Attaching two
  // policies must therefore import two distinct references and produce two distinct ARNs, so
  // reordering the config array never changes the CloudFormation logical IDs.
  test('Attaches one ARN per configured customer-managed policy name', () => {
    const roles = template.findResources('AWS::IAM::Role', {
      Properties: { RoleName: 'aws-quicksight-service-role-v0' },
    });
    const [role] = Object.values(roles);
    const arns = role.Properties.ManagedPolicyArns as string[];
    expect(arns).toContain('arn:test-partition:iam::test-account:policy/my-scoped-athena-metadata-policy');
    expect(arns).toContain('arn:test-partition:iam::test-account:policy/my-second-scoped-policy');
    // AWS-managed + two customer-managed = three attachments, no dedup/collision on construct IDs.
    expect(arns).toHaveLength(3);
  });
});
