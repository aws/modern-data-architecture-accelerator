/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CfnCrawler } from 'aws-cdk-lib/aws-glue';
import { Template } from "aws-cdk-lib/assertions";
import { GlueCrawlerL3ConstructProps, GlueCrawlerL3Construct } from "../lib";
import { CrawlerDefinition, CrawlerTargets } from '../lib/dataops-crawler-l3-construct';

describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const s3Target: CfnCrawler.S3TargetProperty = {
    connectionName: "test-connection",
  }

  const jdbcTarget: CfnCrawler.JdbcTargetProperty = {
    connectionName: "test-connection",
  }

  const catalogTarget: CfnCrawler.CatalogTargetProperty = {
    databaseName: "test-database",
    tables: [ "test-table" ],
  }

  const dynamoDbTarget: CfnCrawler.DynamoDBTargetProperty = {
    path: "/test-path"
  }

  const crawlerTargets: CrawlerTargets = {
    s3Targets: [ s3Target ],
    jdbcTargets: [ jdbcTarget ],
    catalogTargets: [ catalogTarget ],
    dynamoDbTargets: [ dynamoDbTarget ]
  }

  const scheduleProperty: CfnCrawler.ScheduleProperty = {
    scheduleExpression: "cron(15 12 * * ? *)"
  }

  const schemaChangePolicyProperty: CfnCrawler.SchemaChangePolicyProperty = {
    deleteBehavior: "LOG",
    updateBehavior: "LOG"

  }

  const crawlerDefinition: CrawlerDefinition = {
    executionRoleArn: "arn:test-partition:iam::test-account:role/test",
    databaseName: "test-database",
    description: "this is a test",
    targets: crawlerTargets,
    extraConfiguration: { "key": "value" },
    schedule: scheduleProperty,
    classifiers: [ "test-classifier" ],
    schemaChangePolicy: schemaChangePolicyProperty,
    tablePrefix: "test-table"

  }

  const constructProps: GlueCrawlerL3ConstructProps = {
    crawlerConfigs: { "key1": crawlerDefinition },
    securityConfigurationName: "test-security-configuration",
    projectName: "test-project",
    notificationTopicArn: "arn:test-partition:sns:test-region:test-account:MyTopic",

    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming
  };

  new GlueCrawlerL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )


  // console.log(JSON.stringify(template, undefined, 2))

  test( 'Validate resource counts', () => {
    template.resourceCountIs( "AWS::Glue::Crawler", 1 );
  } );

  test( 'Test crawler properties', () => {
    template.hasResourceProperties( "AWS::Glue::Crawler", {
      "Role": "arn:test-partition:iam::test-account:role/test",
      "Targets": {
        "CatalogTargets": [
          {
            "DatabaseName": "test-database",
            "Tables": [
              "test-table"
            ]
          }
        ],
        "DynamoDBTargets": [
          {
            "Path": "/test-path"
          }
        ],
        "JdbcTargets": [
          {
            "ConnectionName": "test-connection"
          }
        ],
        "S3Targets": [
          {
            "ConnectionName": "test-connection"
          }
        ]
      },
      "Classifiers": [
        "test-classifier"
      ],
      "Configuration": "{\"key\":\"value\"}",
      "CrawlerSecurityConfiguration": "test-security-configuration",
      "DatabaseName": "test-database",
      "Description": "this is a test",
      "Name": "test-org-test-env-test-domain-test-module-key1",
      "Schedule": {
        "ScheduleExpression": "cron(15 12 * * ? *)"
      },
      "SchemaChangePolicy": {
        "DeleteBehavior": "LOG",
        "UpdateBehavior": "LOG"
      },
      "TablePrefix": "test-table"
    } )
  } );
  test( 'Glue Crawler Rule', () => {
    template.hasResourceProperties( "AWS::Events::Rule", {
      "Description": "Workflow Crawler failure events",
      "EventPattern": {
        "source": [
          "aws.glue"
        ],
        "detail": {
          "crawlerName": [
            "test-org-test-env-test-domain-test-module-key1"
          ],
          "state": [
            "Failed"
          ]
        }
      },
      "Name": "test-org-test-env-test-domain-test-module-key1-monitor",
      "State": "ENABLED"
    } )
  } )
} )