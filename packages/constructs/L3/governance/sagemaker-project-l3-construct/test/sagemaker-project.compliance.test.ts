/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { SagemakerProjectL3Construct, SagemakerProjectL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('SagemakerProject', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: SagemakerProjectL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      domainConfigSSMParam: '/test-param',
      projectProfiles: {
        'compliance-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'compliance-project': {
          profileName: 'compliance-profile',
          glossaries: {
            CustomerGlossary: {
              description: 'Standard business terms',
              terms: {
                Segment: { description: 'Customer segment classification' },
                ChurnRisk: { description: 'Likelihood a customer churns', relatesTo: ['Segment'] },
              },
            },
          },
          metadataForms: {
            CustomerForm: {
              description: 'Customer metadata',
              fields: {
                customerName: { type: 'String', required: true, searchable: ['TECHNICAL'] },
                customerSegment: { type: 'String', glossaryId: 'CustomerGlossary.Segment' },
              },
            },
          },
          dataSourceDefaults: {
            publishOnImport: true,
            enableSetting: 'ENABLED',
            schedule: { schedule: 'cron(0 6 * * ? *)', timezone: 'UTC' },
            recommendation: { enableBusinessNameGeneration: true },
          },
          dataSources: {
            'compliance-glue-source': {
              databaseName: 'compliance_db',
              filterExpressions: [{ type: 'INCLUDE', expression: 'dim_*' }],
              metadataForms: {
                CustomerForm: { content: '{"customerName":"unknown"}' },
              },
            },
            'compliance-s3-source': {
              s3: {
                bucketName: 'compliance-test-bucket',
                prefix: 'raw/',
                registerS3AccessGrantLocation: true,
                s3AccessGrantLocationId: 'compliance-access-grant-location-id',
              },
            },
          },
        },
      },
    };

    new SagemakerProjectL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    console.log(JSON.stringify(template.toJSON(), null, '\t'));
  });
});
