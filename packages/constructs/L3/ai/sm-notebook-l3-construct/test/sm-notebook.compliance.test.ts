/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  NamedLifecycleConfigProps,
  NotebookProps,
  SagemakerNotebookL3Construct,
  SagemakerNotebookL3ConstructProps,
} from '../lib/sm-notebook-l3-construct';

describe('MDAA Notebook Tests', () => {
  const testRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/test-role',
    id: 'test-id',
    name: 'test-role',
  };

  const ingress: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '10.0.0.0/28',
        port: 443,
        protocol: 'tcp',
      },
    ],
  };
  const egress: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '10.1.1.1/28',
        port: 443,
        protocol: 'tcp',
      },
    ],
  };
  const lifecycleConfigs: NamedLifecycleConfigProps = {
    test_config: {
      onCreate: {
        assets: {
          test_asset: {
            sourcePath: './test/test_assets',
          },
        },
        cmds: ["echo 'testing'"],
      },
    },
  };
  const notebook: NotebookProps = {
    vpcId: 'test-vpc-id',
    subnetId: 'test-sub-id',
    instanceType: 'test-instance',
    securityGroupIngress: ingress,
    securityGroupEgress: egress,
    acceleratorTypes: ['test-type'],
    additionalCodeRepositories: ['test-repo-1'],
    defaultCodeRepository: 'default-repo',
    instanceMetadataServiceConfiguration: {
      minimumInstanceMetadataServiceVersion: 'test',
    },
    platformIdentifier: 'test',
    volumeSizeInGb: 5,
    notebookRole: testRoleRef,
    lifecycleConfigName: 'test_config',
    rootAccess: true,
  };

  describe('w/Auto Generated Key', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SagemakerNotebookL3ConstructProps = {
      assetDeployment: {
        assetBucketName: 'test-bucket',
        assetDeploymentRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
      },
      lifecycleConfigs: lifecycleConfigs,
      notebooks: { 'test-notebook': notebook },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerNotebookL3Construct(stack, 'notebooks', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
    test('Validate if notebook instance is created', () => {
      template.resourceCountIs('AWS::SageMaker::NotebookInstance', 1);
    });
    test('UsesGeneratedKMSKey', () => {
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        KmsKeyId: {
          'Fn::GetAtt': ['notebookskmskeynotebooks39E79F2A', 'Arn'],
        },
      });
    });
    test('KMSUsageAccess', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: [
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:ReEncryptFrom',
                'kms:ReEncryptTo',
                'kms:GenerateDataKey',
                'kms:GenerateDataKeyWithoutPlaintext',
                'kms:GenerateDataKeyPair',
                'kms:GenerateDataKeyPairWithoutPlaintext',
                'kms:CreateGrant',
                'kms:DescribeKey',
                'kms:ListAliases',
              ],
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:test-partition:iam::test-account:role/test-role',
              },
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('SecurityGroup Egress Testing', () => {
      template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 1);
      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        CidrIp: '10.1.1.1/28',
        Description: 'to 10.1.1.1/28:tcp PORT 443',
        FromPort: 443,
        IpProtocol: 'tcp',
        ToPort: 443,
      });
    });
    test('SecurityGroup Ingress Testing', () => {
      template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        CidrIp: '10.0.0.0/28',
        Description: 'from 10.0.0.0/28:tcp PORT 443',
        FromPort: 443,
        IpProtocol: 'tcp',
        ToPort: 443,
      });
    });
    test('Root Access', () => {
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        RootAccess: 'Enabled',
      });
    });
  });
  describe('w/Existing Key and SG, no Lifecycle, no Root Access, no custom Egress', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const notebook2 = {
      ...notebook,
      securityGroupId: 'sg-test-existing-sg',
      lifecycleConfig: undefined,
      rootAccess: false,
      securityGroupEgress: undefined,
    };

    const constructProps: SagemakerNotebookL3ConstructProps = {
      assetDeployment: {
        assetBucketName: 'test-bucket',
        assetDeploymentRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
      },
      lifecycleConfigs: lifecycleConfigs,
      kmsKeyArn: 'arn:test-partition:kms::test-account:key/test-key-arn',
      notebooks: {
        'test-notebook': notebook2,
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };
    new SagemakerNotebookL3Construct(stack, 'notebooks', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

    test('Validate if notebook instance is created', () => {
      template.resourceCountIs('AWS::SageMaker::NotebookInstance', 1);
    });
    test('UsesExistingKMSKey', () => {
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        KmsKeyId: 'arn:test-partition:kms::test-account:key/test-key-arn',
      });
    });
    test('UsesExistingSG', () => {
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        SecurityGroupIds: ['sg-test-existing-sg'],
      });
    });
    test('No Root Access', () => {
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        RootAccess: 'Disabled',
      });
    });
  });
});

describe('Multiple Notebooks Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testRoleRef1: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/role-one',
    id: 'role-id-one',
    name: 'role-one',
  };

  const testRoleRef2: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/role-two',
    id: 'role-id-two',
    name: 'role-two',
  };

  const notebook1: NotebookProps = {
    vpcId: 'test-vpc-id',
    subnetId: 'test-sub-id-1',
    instanceType: 'ml.t3.medium',
    notebookRole: testRoleRef1,
  };

  const notebook2: NotebookProps = {
    vpcId: 'test-vpc-id',
    subnetId: 'test-sub-id-2',
    instanceType: 'ml.t3.large',
    notebookRole: testRoleRef2,
  };

  const constructProps: SagemakerNotebookL3ConstructProps = {
    notebooks: {
      'notebook-one': notebook1,
      'notebook-two': notebook2,
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new SagemakerNotebookL3Construct(stack, 'multi-notebooks', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Notebook Instance Resource Count', () => {
    template.resourceCountIs('AWS::SageMaker::NotebookInstance', 2);
  });

  test('Notebook One Properties', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      InstanceType: 'ml.t3.medium',
      SubnetId: 'test-sub-id-1',
    });
  });

  test('Notebook Two Properties', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      InstanceType: 'ml.t3.large',
      SubnetId: 'test-sub-id-2',
    });
  });

  test('Multiple Security Groups for Notebooks', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });
});
