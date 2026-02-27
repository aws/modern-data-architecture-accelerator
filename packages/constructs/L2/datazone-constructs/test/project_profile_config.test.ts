/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { ProjectProfilesConfig, ProjectProfilesConfigProps } from '../lib/project_profile_config';

describe('ProjectProfilesConfig Tests', () => {
  let testApp: MdaaTestApp;
  let testStack: Stack;

  beforeEach(() => {
    testApp = new MdaaTestApp({ '@aws-mdaa/skipCreateParams': 'false' });
    testStack = testApp.testStack;
  });

  describe('Constructor Tests', () => {
    test('should create ProjectProfilesConfig with required properties', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {
          'profile-1': 'pp-123456',
          'profile-2': 'pp-789012',
        },
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfig', props);

      expect(config.ssmParamBase).toBe('/test/datazone');
      expect(config.projectProfileIds).toEqual({
        'profile-1': 'pp-123456',
        'profile-2': 'pp-789012',
      });
    });

    test('should create ProjectProfilesConfig with empty projectProfileIds', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigEmpty', props);

      expect(config.ssmParamBase).toBe('/test/datazone');
      expect(config.projectProfileIds).toEqual({});
    });
  });

  describe('getProjectProfileId Tests', () => {
    test('should return profile ID from projectProfileIds when available', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {
          'analytics-profile': 'pp-analytics-123',
          'ml-profile': 'pp-ml-456',
        },
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigGet', props);

      expect(config.getProjectProfileId('analytics-profile')).toBe('pp-analytics-123');
      expect(config.getProjectProfileId('ml-profile')).toBe('pp-ml-456');
    });

    test('should retrieve profile ID from SSM when not in projectProfileIds', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigSSM', props);

      const profileId = config.getProjectProfileId('unknown-profile');
      expect(typeof profileId).toBe('string');
    });

    test('should reuse existing SSM parameter reference for same profile', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigReuse', props);

      const profileId1 = config.getProjectProfileId('shared-profile');
      const profileId2 = config.getProjectProfileId('shared-profile');

      expect(profileId1).toBe(profileId2);
    });

    test('should handle SSM parameter path without leading slash', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: 'test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigNoSlash', props);

      const profileId = config.getProjectProfileId('no-slash-profile');
      expect(typeof profileId).toBe('string');
    });
  });

  describe('createProjectProfileParams Tests', () => {
    test('should create SSM parameters for all project profiles', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {
          'profile-a': 'pp-aaa111',
          'profile-b': 'pp-bbb222',
        },
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigParams', props);
      const paramArns = config.createProjectProfileParams();

      expect(paramArns).toHaveLength(2);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Tier: 'Advanced',
      });
    });

    test('should return empty array when no project profiles exist', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigNoParams', props);
      const paramArns = config.createProjectProfileParams();

      expect(paramArns).toHaveLength(0);
    });

    test('should create parameters with correct naming convention', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/my/custom/path',
        projectProfileIds: {
          'test-profile': 'pp-test123',
        },
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigNaming', props);
      config.createProjectProfileParams();

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/my/custom/path/project_profile/test-profile/id',
        Value: 'pp-test123',
      });
    });
  });

  describe('createProjectProfileParam Tests', () => {
    test('should create single SSM parameter for a profile', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/test/datazone',
        projectProfileIds: {},
      };

      const config = new ProjectProfilesConfig(testStack, 'TestConfigSingle', props);
      const paramArn = config.createProjectProfileParam('single-profile', 'pp-single123');

      expect(typeof paramArn).toBe('string');

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/datazone/project_profile/single-profile/id',
        Value: 'pp-single123',
      });
    });
  });

  describe('Static Properties Tests', () => {
    test('should have correct SSM_PARAM_PROJECT_PROFILE constant', () => {
      expect(ProjectProfilesConfig.SSM_PARAM_PROJECT_PROFILE).toBe('project_profile');
    });
  });

  describe('Integration Tests', () => {
    test('should work with real-world scenario', () => {
      const props: ProjectProfilesConfigProps = {
        ssmParamBase: '/production/datazone/domain',
        projectProfileIds: {
          'data-engineering': 'pp-de-001',
          'data-science': 'pp-ds-002',
          analytics: 'pp-an-003',
        },
      };

      const config = new ProjectProfilesConfig(testStack, 'ProductionConfig', props);

      // Test getting existing profiles
      expect(config.getProjectProfileId('data-engineering')).toBe('pp-de-001');
      expect(config.getProjectProfileId('data-science')).toBe('pp-ds-002');
      expect(config.getProjectProfileId('analytics')).toBe('pp-an-003');

      // Test getting non-existing profile (should create SSM reference)
      const newProfileId = config.getProjectProfileId('new-profile');
      expect(typeof newProfileId).toBe('string');

      // Test creating all params
      const paramArns = config.createProjectProfileParams();
      expect(paramArns).toHaveLength(3);

      const template = Template.fromStack(testStack);
      const ssmParameters = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParameters).length).toBeGreaterThanOrEqual(3);
    });
  });
});
