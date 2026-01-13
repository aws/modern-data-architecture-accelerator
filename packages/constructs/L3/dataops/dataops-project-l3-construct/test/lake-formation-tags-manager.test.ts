/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LFTagConfig } from '@aws-mdaa/lakeformation-tags-l3-construct';
import {
  createLakeFormationTags,
  processLakeFormationTagsPermissions,
  validateTagExpressionAgainstProjectLevel,
  validateTagsAgainstProjectLevel,
} from '../lib/lake-formation-tags-manager';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { LFTagExpression } from '@aws-mdaa/lakeformation-tagbased-permissions-l3-construct';
import { DataOpsProjectL3ConstructProps } from '../lib';
import { CfnDatabase } from 'aws-cdk-lib/aws-glue';

describe('Lake Formation Tags Manager', () => {
  const projectLfTags: LFTagConfig[] = [
    {
      tagKey: 'Environment',
      tagValues: ['dev', 'test', 'prod'],
    },
    {
      tagKey: 'DataClassification',
      tagValues: ['public', 'internal', 'confidential'],
    },
    {
      tagKey: 'Department',
      tagValues: ['engineering', 'finance', 'marketing'],
    },
  ];

  describe('validateTagsAgainstProjectLevel', () => {
    describe('valid scenarios', () => {
      it('should return no errors when all tags are valid', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['dev', 'test'],
          },
          {
            tagKey: 'DataClassification',
            tagValues: ['internal'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });

      it('should return no errors when validating empty array', () => {
        const errors = validateTagsAgainstProjectLevel([], 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });

      it('should return no errors when all tag values match project level', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['dev', 'test', 'prod'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });
    });

    describe('invalid tag keys', () => {
      it('should return error when tag key does not exist in project level', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'InvalidKey',
            tagValues: ['value1'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(
          tagsToValidate,
          'database "my-db" databaseTagValues',
          projectLfTags,
        );

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("Tag key 'InvalidKey'");
        expect(errors[0]).toContain('is not defined in project-level lfTags');
      });

      it('should return multiple errors for multiple invalid tag keys', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'InvalidKey1',
            tagValues: ['value1'],
          },
          {
            tagKey: 'InvalidKey2',
            tagValues: ['value2'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('InvalidKey1');
        expect(errors[1]).toContain('InvalidKey2');
      });
    });

    describe('invalid tag values', () => {
      it('should return error when tag value is not valid', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['invalid-env'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("Tag key 'Environment'");
        expect(errors[0]).toContain('has invalid values: invalid-env');
        expect(errors[0]).toContain('Valid values are: dev, test, prod');
      });

      it('should return error for multiple invalid values', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['dev', 'invalid1', 'invalid2'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('has invalid values: invalid1, invalid2');
      });

      it('should return error when all values are invalid', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'DataClassification',
            tagValues: ['invalid1', 'invalid2', 'invalid3'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('has invalid values: invalid1, invalid2, invalid3');
      });
    });

    describe('mixed valid and invalid scenarios', () => {
      it('should return errors only for invalid tags', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['dev'],
          },
          {
            tagKey: 'InvalidKey',
            tagValues: ['value1'],
          },
          {
            tagKey: 'DataClassification',
            tagValues: ['invalid-value'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', projectLfTags);

        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('InvalidKey');
        expect(errors[1]).toContain('DataClassification');
        expect(errors[1]).toContain('invalid-value');
      });
    });

    describe('empty project-level tags', () => {
      it('should return error when project-level tags are empty and tags to validate exist', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Environment',
            tagValues: ['dev'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', []);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('No project-level LF tags defined');
        expect(errors[0]).toContain('references tag keys: Environment');
      });

      it('should return no errors when both project-level and validation tags are empty', () => {
        const errors = validateTagsAgainstProjectLevel([], 'test context', []);

        expect(errors).toEqual([]);
      });

      it('should list all undefined tag keys when project-level tags are empty', () => {
        const tagsToValidate: LFTagConfig[] = [
          {
            tagKey: 'Key1',
            tagValues: ['value1'],
          },
          {
            tagKey: 'Key2',
            tagValues: ['value2'],
          },
        ];

        const errors = validateTagsAgainstProjectLevel(tagsToValidate, 'test context', []);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('Key1, Key2');
      });
    });
  });

  describe('validateTagExpressionAgainstProjectLevel', () => {
    describe('valid scenarios', () => {
      it('should return no errors when all tags in expression are valid', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: ['dev', 'test'],
          DataClassification: ['internal'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });

      it('should return no errors for empty expression', () => {
        const errors = validateTagExpressionAgainstProjectLevel({}, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });

      it('should handle string values in expression', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: 'dev',
          DataClassification: 'internal',
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });

      it('should handle mixed string and array values', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: 'dev',
          DataClassification: ['internal', 'public'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toEqual([]);
      });
    });

    describe('invalid tag keys', () => {
      it('should return error when tag key does not exist in project level', () => {
        const lfTagExpression: LFTagExpression = {
          InvalidKey: ['value1'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(
          lfTagExpression,
          'database "my-db" tagBasedGrants "grant-1"',
          projectLfTags,
        );

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("Tag key 'InvalidKey'");
        expect(errors[0]).toContain('is not defined in project-level lfTags');
      });

      it('should return multiple errors for multiple invalid tag keys', () => {
        const lfTagExpression: LFTagExpression = {
          InvalidKey1: ['value1'],
          InvalidKey2: ['value2'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('InvalidKey1');
        expect(errors[1]).toContain('InvalidKey2');
      });
    });

    describe('invalid tag values', () => {
      it('should return error when tag value is not valid (array)', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: ['invalid-env'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("Tag key 'Environment'");
        expect(errors[0]).toContain('has invalid values: invalid-env');
        expect(errors[0]).toContain('Valid values are: dev, test, prod');
      });

      it('should return error when tag value is not valid (string)', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: 'invalid-env',
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('has invalid values: invalid-env');
      });

      it('should return error for multiple invalid values', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: ['dev', 'invalid1', 'invalid2'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('has invalid values: invalid1, invalid2');
      });
    });

    describe('mixed valid and invalid scenarios', () => {
      it('should return errors only for invalid tags', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: ['dev'],
          InvalidKey: ['value1'],
          DataClassification: ['invalid-value'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', projectLfTags);

        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('InvalidKey');
        expect(errors[1]).toContain('DataClassification');
        expect(errors[1]).toContain('invalid-value');
      });
    });

    describe('empty or undefined project-level tags', () => {
      it('should return error when project-level tags are empty', () => {
        const lfTagExpression: LFTagExpression = {
          Environment: ['dev'],
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', []);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('No project-level LF tags defined');
        expect(errors[0]).toContain('references tag keys: Environment');
      });

      it('should return no errors when both are empty', () => {
        const errors = validateTagExpressionAgainstProjectLevel({}, 'test context', []);

        expect(errors).toEqual([]);
      });

      it('should list all undefined tag keys when project-level tags are empty', () => {
        const lfTagExpression: LFTagExpression = {
          Key1: ['value1'],
          Key2: 'value2',
        };

        const errors = validateTagExpressionAgainstProjectLevel(lfTagExpression, 'test context', []);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('Key1, Key2');
      });
    });
  });

  describe('createLakeFormationTags', () => {
    it('should return undefined when no lfTags are provided', () => {
      const testApp = new MdaaTestApp();
      const result = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(result).toBeUndefined();
    });

    it('should return undefined when lfTags array is empty', () => {
      const testApp = new MdaaTestApp();
      const result = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: [] },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(result).toBeUndefined();
    });

    it('should create LakeFormationTagsL3Construct when lfTags are provided', () => {
      const testApp = new MdaaTestApp();
      const result = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(result).toBeDefined();
    });
  });

  describe('processLakeFormationTagsPermissions', () => {
    it('should not throw when no databaseTagValues or tagBasedGrants are provided', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          /* eslint-disable @typescript-eslint/no-explicit-any */
          {
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl,
            otherProps: { naming: testApp.naming } as unknown as CfnDatabase,
          } as any,
          {},
        );
      }).not.toThrow();
    });

    it('should create tag association when databaseTagValues are provided', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;
      const tagsConstruct = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          {
            lakeFormationTagsConstruct: tagsConstruct,
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl,
            otherProps: { naming: testApp.naming, lakeFormation: { lfTags: projectLfTags } } as unknown as CfnDatabase,
            /* eslint-disable @typescript-eslint/no-explicit-any */
          } as any,
          {
            databaseTagValues: [
              {
                tagKey: 'Environment',
                tagValues: ['dev'],
              },
            ],
          },
        );
      }).not.toThrow();
    });

    it('should throw when databaseTagValues contain invalid tags', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;
      const tagsConstruct = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          {
            lakeFormationTagsConstruct: tagsConstruct,
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl,
            otherProps: { naming: testApp.naming, lakeFormation: { lfTags: projectLfTags } } as unknown as CfnDatabase,
            /* eslint-disable @typescript-eslint/no-explicit-any */
          } as any,
          {
            databaseTagValues: [
              {
                tagKey: 'InvalidKey',
                tagValues: ['value'],
              },
            ],
          },
        );
      }).toThrow(/Invalid Lake Formation tags/);
    });

    it('should create tag-based permissions when tagBasedGrants are provided', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;
      const tagsConstruct = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          {
            lakeFormationTagsConstruct: tagsConstruct,
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl,
            otherProps: { naming: testApp.naming, lakeFormation: { lfTags: projectLfTags } } as unknown as CfnDatabase,
            /* eslint-disable @typescript-eslint/no-explicit-any */
          } as any,
          {
            tagBasedGrants: {
              'test-grant': {
                lfTagExpression: {
                  Environment: ['dev'],
                },
                principalArns: {
                  'test-principal': 'arn:aws:iam::123456789012:role/test-role',
                },
                permissions: ['DESCRIBE', 'SELECT'],
              },
            },
          },
        );
      }).not.toThrow();
    });

    it('should throw when tagBasedGrants contain invalid tags', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;
      const tagsConstruct = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          {
            lakeFormationTagsConstruct: tagsConstruct,
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl,
            otherProps: { naming: testApp.naming, lakeFormation: { lfTags: projectLfTags } } as unknown as CfnDatabase,
            /* eslint-disable @typescript-eslint/no-explicit-any */
          } as any,
          {
            tagBasedGrants: {
              'test-grant': {
                lfTagExpression: {
                  InvalidKey: ['value'],
                },
                principalArns: {
                  'test-principal': 'arn:aws:iam::123456789012:role/test-role',
                },
                permissions: ['DESCRIBE', 'SELECT'],
              },
            },
          },
        );
      }).toThrow(/Invalid Lake Formation tags/);
    });

    it('should handle both databaseTagValues and tagBasedGrants together', () => {
      const testApp = new MdaaTestApp();
      const mockDatabase = { node: { addDependency: jest.fn() } } as unknown;
      const mockAccessControl = { node: { addDependency: jest.fn() } } as unknown;
      const tagsConstruct = createLakeFormationTags(testApp.testStack, {
        naming: testApp.naming,
        lakeFormation: { lfTags: projectLfTags },
      } as unknown as DataOpsProjectL3ConstructProps);

      expect(() => {
        processLakeFormationTagsPermissions(
          testApp.testStack,
          {
            lakeFormationTagsConstruct: tagsConstruct,
            databaseName: 'test-db',
            dbResourceName: 'test-db-resource',
            database: mockDatabase,
            lakeFormationAccessControl: mockAccessControl as CfnDatabase,
            otherProps: { naming: testApp.naming, lakeFormation: { lfTags: projectLfTags } } as any,
            /* eslint-disable @typescript-eslint/no-explicit-any */
          } as any,
          {
            databaseTagValues: [
              {
                tagKey: 'Environment',
                tagValues: ['dev'],
              },
            ],
            tagBasedGrants: {
              'test-grant': {
                lfTagExpression: {
                  DataClassification: ['internal'],
                },
                principalArns: {
                  'test-principal': 'arn:aws:iam::123456789012:role/test-role',
                },
                permissions: ['DESCRIBE', 'SELECT'],
              },
            },
          },
        );
      }).not.toThrow();
    });
  });
});
