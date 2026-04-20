/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DomainProps } from '@aws-mdaa/sm-studio-domain-l3-construct';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataScienceTeamL3Construct, DataScienceTeamL3ConstructProps } from '../lib';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const teamExecutionRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/team-execution-role',
  name: 'team-execution-role',
};

const dataAdminRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/test-role',
  name: 'test-role',
};

const dataScientistRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/data-scientist-role',
  name: 'data-scientist-role',
};

const studioDomainPropsWithUsers: DomainProps = {
  authMode: 'SSO',
  vpcId: 'test-vpc',
  subnetIds: ['test-subnet'],
  defaultUserSettings: {},
  notebookSharingPrefix: '',
  defaultExecutionRole: { name: 'test-role' },
  assetDeploymentMemoryLimitMB: 256,
  userProfiles: {
    'lead-ds': {},
    'ds-user-1': {},
  },
};

// ─── MLflow Tests ─────────────────────────────────────────────────────────────

describe('MLflow Tracking Server', () => {
  describe('MLflow enabled', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        teamUserRoles: [dataScientistRoleRef],
        studioDomainConfig: studioDomainPropsWithUsers,
        mlflow: {
          enabled: true,
          serverSize: 'Small',
          artifactStorePrefix: 'mlflow-artifacts/',
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-test', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Creates MLflow tracking server resource', () => {
      template.hasResourceProperties('AWS::SageMaker::MlflowTrackingServer', {
        TrackingServerSize: 'Small',
        AutomaticModelRegistration: false,
      });
    });

    test('MLflow tracking server has correct artifact store URI prefix', () => {
      template.hasResourceProperties('AWS::SageMaker::MlflowTrackingServer', {
        ArtifactStoreUri: Match.anyValue(),
      });
      // Verify the artifact store URI references the team bucket
      const servers = template.findResources('AWS::SageMaker::MlflowTrackingServer');
      const serverKey = Object.keys(servers)[0];
      const uri = JSON.stringify(servers[serverKey].Properties.ArtifactStoreUri);
      expect(uri).toContain('mlflow-artifacts');
    });

    test('Creates MLflow IAM role with SageMaker trust', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'sagemaker.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });

    test('MLflow role has S3 artifact store permissions', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'MlflowS3Access',
              Effect: 'Allow',
              Action: Match.arrayWith([
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
                's3:GetBucketLocation',
              ]),
            }),
          ]),
        },
      });
    });

    test('MLflow role has KMS permissions', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'MlflowKmsAccess',
              Effect: 'Allow',
              Action: Match.arrayWith(['kms:Decrypt', 'kms:DescribeKey', 'kms:Encrypt', 'kms:GenerateDataKey']),
            }),
          ]),
        },
      });
    });

    test('Team execution role gets MLflow tracking access', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'MlflowTrackingAccess',
              Effect: 'Allow',
              Action: Match.arrayWith([
                'sagemaker:CreatePresignedMlflowTrackingServerUrl',
                'sagemaker:DescribeMlflowTrackingServer',
                'sagemaker:StartMlflowTrackingServer',
                'sagemaker:StopMlflowTrackingServer',
              ]),
            }),
          ]),
        },
      });
    });

    test('Publishes SSM parameters for tracking server', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*mlflow.*tracking-server.*name'),
      });
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*mlflow.*tracking-server.*arn'),
      });
    });
  });

  describe('MLflow with custom server name and version', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        mlflow: {
          enabled: true,
          serverName: 'custom-mlflow-server',
          serverVersion: '2.16.2',
          serverSize: 'Medium',
          artifactStorePrefix: 'custom-prefix/',
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-custom-test', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Uses custom server name', () => {
      template.hasResourceProperties('AWS::SageMaker::MlflowTrackingServer', {
        TrackingServerName: 'custom-mlflow-server',
        MlflowVersion: '2.16.2',
        TrackingServerSize: 'Medium',
      });
    });

    test('Uses custom artifact prefix in S3 permissions', () => {
      // Verify the S3 policy references the custom prefix
      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const policyJson = JSON.stringify(policies);
      expect(policyJson).toContain('custom-prefix/*');
      expect(policyJson).toContain('MlflowS3Access');
    });

    test('MLflow tracking access scoped to custom server name', () => {
      // Verify the MLflow tracking access statement references the custom server name
      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const policyJson = JSON.stringify(policies);
      expect(policyJson).toContain('custom-mlflow-server');
      expect(policyJson).toContain('MlflowTrackingAccess');
    });
  });

  describe('MLflow disabled (default)', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        // mlflow not specified — should not create any MLflow resources
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-disabled-test', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('No MLflow tracking server created when mlflow is omitted', () => {
      const servers = template.findResources('AWS::SageMaker::MlflowTrackingServer');
      expect(Object.keys(servers).length).toBe(0);
    });
  });

  describe('MLflow explicitly disabled', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        mlflow: {
          enabled: false,
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-explicit-off', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('No MLflow tracking server created when enabled=false', () => {
      const servers = template.findResources('AWS::SageMaker::MlflowTrackingServer');
      expect(Object.keys(servers).length).toBe(0);
    });
  });

  describe('MLflow validation errors', () => {
    test('Throws on invalid server name', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(() => {
        new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-bad-name', {
          team: {
            teamExecutionRole: teamExecutionRoleRef,
            dataAdminRoles: [dataAdminRoleRef],
            mlflow: {
              enabled: true,
              serverName: '!!!invalid',
            },
          },
          roleHelper,
          naming: testApp.naming,
        });
      }).toThrow(/Invalid MLflow server name/);
    });

    test('Throws on empty artifact prefix', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(() => {
        new DataScienceTeamL3Construct(testApp.testStack, 'mlflow-empty-prefix', {
          team: {
            teamExecutionRole: teamExecutionRoleRef,
            dataAdminRoles: [dataAdminRoleRef],
            mlflow: {
              enabled: true,
              artifactStorePrefix: '',
            },
          },
          roleHelper,
          naming: testApp.naming,
        });
      }).toThrow(/artifactStorePrefix cannot be empty/);
    });
  });
});

// ─── JupyterLab Spaces Tests ─────────────────────────────────────────────────

describe('JupyterLab Spaces', () => {
  describe('JupyterLab enabled with user profiles', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        studioDomainConfig: studioDomainPropsWithUsers,
        jupyterLab: {
          enabled: true,
          defaultInstanceType: 'ml.t3.medium',
          defaultSharingType: 'Private',
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-test', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Creates one CfnSpace per user profile', () => {
      const spaces = template.findResources('AWS::SageMaker::Space');
      expect(Object.keys(spaces).length).toBe(2); // lead-ds + ds-user-1
    });

    test('Space has correct app type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSettings: Match.objectLike({
          AppType: 'JupyterLab',
        }),
      });
    });

    test('Space has correct instance type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSettings: Match.objectLike({
          JupyterLabAppSettings: {
            DefaultResourceSpec: {
              InstanceType: 'ml.t3.medium',
            },
          },
        }),
      });
    });

    test('Space has Private sharing type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSharingSettings: {
          SharingType: 'Private',
        },
      });
    });

    test('Space has correct ownership settings', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceName: 'lead-ds-JupyterLab-space',
        OwnershipSettings: {
          OwnerUserProfileName: 'lead-ds',
        },
      });
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceName: 'ds-user-1-JupyterLab-space',
        OwnershipSettings: {
          OwnerUserProfileName: 'ds-user-1',
        },
      });
    });

    test('Space display name matches space name', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceName: 'lead-ds-JupyterLab-space',
        SpaceDisplayName: 'lead-ds-JupyterLab-space',
      });
    });
  });

  describe('JupyterLab with Shared mode and no instance type', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        studioDomainConfig: {
          ...studioDomainPropsWithUsers,
          userProfiles: {
            'single-user': {},
          },
        },
        jupyterLab: {
          enabled: true,
          defaultSharingType: 'Shared',
          // no defaultInstanceType — should omit JupyterLabAppSettings
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-shared-test', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Creates one space for single user', () => {
      const spaces = template.findResources('AWS::SageMaker::Space');
      expect(Object.keys(spaces).length).toBe(1);
    });

    test('Space has Shared sharing type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSharingSettings: {
          SharingType: 'Shared',
        },
      });
    });

    test('Space omits JupyterLabAppSettings when no instance type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSettings: {
          AppType: 'JupyterLab',
          // JupyterLabAppSettings should not be present
        },
      });
      // Verify no DefaultResourceSpec is set
      const spaces = template.findResources('AWS::SageMaker::Space');
      const spaceKey = Object.keys(spaces)[0];
      const spaceProps = spaces[spaceKey].Properties;
      expect(spaceProps.SpaceSettings.JupyterLabAppSettings).toBeUndefined();
    });
  });

  describe('JupyterLab defaults (sharing type not specified)', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        studioDomainConfig: {
          ...studioDomainPropsWithUsers,
          userProfiles: { 'test-user': {} },
        },
        jupyterLab: {
          enabled: true,
          // no defaultSharingType — should default to Private
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-defaults-test', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Defaults to Private sharing type', () => {
      template.hasResourceProperties('AWS::SageMaker::Space', {
        SpaceSharingSettings: {
          SharingType: 'Private',
        },
      });
    });
  });

  describe('JupyterLab disabled (default)', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        studioDomainConfig: studioDomainPropsWithUsers,
        // jupyterLab not specified
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-disabled-test', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('No spaces created when jupyterLab is omitted', () => {
      const spaces = template.findResources('AWS::SageMaker::Space');
      expect(Object.keys(spaces).length).toBe(0);
    });
  });

  describe('JupyterLab enabled but no user profiles', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        studioDomainConfig: {
          ...studioDomainPropsWithUsers,
          userProfiles: undefined, // no user profiles
        },
        jupyterLab: {
          enabled: true,
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-no-users-test', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('No spaces created when no user profiles exist', () => {
      const spaces = template.findResources('AWS::SageMaker::Space');
      expect(Object.keys(spaces).length).toBe(0);
    });
  });

  describe('JupyterLab enabled but no studio domain', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const constructProps: DataScienceTeamL3ConstructProps = {
      team: {
        teamExecutionRole: teamExecutionRoleRef,
        dataAdminRoles: [dataAdminRoleRef],
        // no studioDomainConfig
        jupyterLab: {
          enabled: true,
        },
      },
      roleHelper,
      naming: testApp.naming,
    };

    new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-no-domain-test', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('No spaces created when no studio domain is configured', () => {
      const spaces = template.findResources('AWS::SageMaker::Space');
      expect(Object.keys(spaces).length).toBe(0);
    });
  });

  describe('JupyterLab validation errors', () => {
    test('Throws on invalid instance type', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(() => {
        new DataScienceTeamL3Construct(testApp.testStack, 'jupyterlab-bad-instance', {
          team: {
            teamExecutionRole: teamExecutionRoleRef,
            dataAdminRoles: [dataAdminRoleRef],
            studioDomainConfig: studioDomainPropsWithUsers,
            jupyterLab: {
              enabled: true,
              defaultInstanceType: 't3.medium', // missing ml. prefix
            },
          },
          roleHelper,
          naming: testApp.naming,
        });
      }).toThrow(/Invalid JupyterLab instance type/);
    });
  });
});

// ─── Combined MLflow + JupyterLab Tests ───────────────────────────────────────

describe('MLflow + JupyterLab combined', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: DataScienceTeamL3ConstructProps = {
    team: {
      teamExecutionRole: teamExecutionRoleRef,
      dataAdminRoles: [dataAdminRoleRef],
      teamUserRoles: [dataScientistRoleRef],
      studioDomainConfig: studioDomainPropsWithUsers,
      mlflow: {
        enabled: true,
        serverSize: 'Small',
      },
      jupyterLab: {
        enabled: true,
        defaultInstanceType: 'ml.t3.medium',
      },
    },
    roleHelper,
    naming: testApp.naming,
  };

  new DataScienceTeamL3Construct(testApp.testStack, 'combined-test', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Both MLflow and JupyterLab resources created', () => {
    const servers = template.findResources('AWS::SageMaker::MlflowTrackingServer');
    expect(Object.keys(servers).length).toBe(1);
    const spaces = template.findResources('AWS::SageMaker::Space');
    expect(Object.keys(spaces).length).toBe(2);
  });

  test('Core resources unaffected by new features', () => {
    // S3 bucket still created
    template.resourceCountIs('AWS::S3::Bucket', 1);
    // KMS key still created
    template.resourceCountIs('AWS::KMS::Key', 1);
    // Athena workgroup still created
    template.resourceCountIs('AWS::Athena::WorkGroup', 1);
    // Studio domain still created
    template.resourceCountIs('AWS::SageMaker::Domain', 1);
  });
});
