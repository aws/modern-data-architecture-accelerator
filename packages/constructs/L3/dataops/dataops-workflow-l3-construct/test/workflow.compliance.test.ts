/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Match } from "aws-cdk-lib/assertions";
import { GlueWorkflowL3Construct, GlueWorkflowL3ConstructProps, WorkflowProps } from "../lib";
import { Template } from "aws-cdk-lib/assertions";
describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack

  const workflowDefinition: WorkflowProps = {
    eventBridge: {
      retryAttempts: 2,
      maxEventAgeSeconds: 3600,
      s3EventBridgeRules: {
        "test-rule": {
          buckets: [ "test-bucket" ]
        }
      },
      eventBridgeRules: {
        "test-rule": {
          eventPattern: {
            source: [ 'test-source' ]
          }
        }
      }
    },
    rawWorkflowDef: {
      "Workflow": {
        "Name": "schedule-based-wf",
        "DefaultRunProperties": {},
        "Graph": {
          "Nodes": [
            {
              "Type": "TRIGGER",
              "Name": "Start_wf-with-schedule",
              "TriggerDetails": {
                "Trigger": {
                  "Name": "Start_wf-with-schedule",
                  "WorkflowName": "schedule-based-wf",
                  "Type": "SCHEDULED",
                  "Schedule": "cron(5 12 * * ? *)",
                  "State": "CREATED",
                  "Actions": [
                    {
                      "CrawlerName": "project:crawler/name/test-crawler"
                    }
                  ]
                }
              }
            },
            {
              "Type": "TRIGGER",
              "Name": "Start_wf-with-schedule2",
              "TriggerDetails": {
                "Trigger": {
                  "Name": "if_crawler_successed",
                  "WorkflowName": "event-based-wf",
                  "Type": "CONDITIONAL",
                  "State": "ACTIVATED",
                  "Actions": [
                    {
                      "JobName": "project:job/name/JobOne",
                      "NotificationProperty": {
                        "NotifyDelayAfter": 200
                      },
                      "Timeout": 120
                    }
                  ],
                  "Predicate": {
                    "Logical": "ANY",
                    "Conditions": [
                      {
                        "LogicalOperator": "EQUALS",
                        "CrawlerName": "project:crawler/name/test-crawler",
                        "CrawlState": "SUCCEEDED"
                      }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    }
  }

  const constructProps: GlueWorkflowL3ConstructProps = {
    kmsArn: "arn:test-partition:kms:test-region:test-account:key/testing-key-id",
    workflowDefinitions: [ workflowDefinition ],
    projectName: "test-project",
    securityConfigurationName: "testing-config",

    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming
  };

  new GlueWorkflowL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )
  
  test( 'Validate resource counts', () => {
    template.resourceCountIs( "AWS::Glue::Workflow", 1 );
    template.resourceCountIs( "AWS::Glue::Trigger", 2 );
    template.resourceCountIs( "AWS::SQS::Queue", 1 );
  } );
  test( 'Workflow Properties', () => {
    template.hasResourceProperties( "AWS::Glue::Workflow", {
      "DefaultRunProperties": {},
      "Name": "test-org-test-env-test-domain-test-module-schedule-based-wf"
    } )
  } )

  test( 'Scheduled trigger', () => {
    template.hasResourceProperties( "AWS::Glue::Trigger", {
      "Actions": [
        {
          "CrawlerName": "project:crawler/name/test-crawler",
          "SecurityConfiguration": "testing-config",
        }
      ],
      "Type": "SCHEDULED",
      "Name": "test-org-test-env-test-domain-test-module-schedule-based-wf-start_wf-with-schedule",
      "Schedule": "cron(5 12 * * ? *)",
      "WorkflowName": "test-org-test-env-test-domain-test-module-schedule-based-wf"
    } )
  } )

  test( 'Conditional trigger', () => {
    template.hasResourceProperties( "AWS::Glue::Trigger", {
      "Actions": [
        {
          "JobName": "project:job/name/JobOne",
          "NotificationProperty": {
            "NotifyDelayAfter": 200
          },
          "SecurityConfiguration": "testing-config",
          "Timeout": 120
        }
      ],
      "Type": "CONDITIONAL",
      "Name": "test-org-test-env-test-domain-test-module-schedule-based-wf-if_crawler_successed",
      "Predicate": {
        "Conditions": [
          {
            "CrawlState": "SUCCEEDED",
            "CrawlerName": "project:crawler/name/test-crawler",
            "LogicalOperator": "EQUALS"
          }
        ],
        "Logical": "ANY"
      },
      "StartOnCreation": true,
      "WorkflowName": "test-org-test-env-test-domain-test-module-schedule-based-wf"
    } )
  } )

  test( 'EventBridge Trigger Policy', () => {
    template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
      "PolicyDocument": {
        "Statement": [
          {
            "Action": "glue:notifyEvent",
            "Effect": "Allow",
            "Resource": "arn:test-partition:glue:test-region:test-account:workflow/test-org-test-env-test-domain-test-module-schedule-based-wf"
          }
        ]
      }
    } )
  } )

  test( 'EventBridge Rule', () => {
    template.hasResourceProperties( "AWS::Events::Rule", {
      "Description": "Event Rule for triggering schedule-based-wf-test-rule with S3 events",
      "EventPattern": {
        "source": [
          "aws.s3"
        ],
        "detail": {
          "bucket": {
            "name": [
              "test-bucket"
            ]
          }
        },
        "detail-type": [
          "Object Created"
        ]
      },
      "Name": "test-org-test-env-test-domain-test-module-test-rule",
      "State": "ENABLED",
      "Targets": [
        {
          "Arn": "arn:test-partition:glue:test-region:test-account:workflow/test-org-test-env-test-domain-test-module-schedule-based-wf",
          "DeadLetterConfig": {
            "Arn": {
              "Fn::GetAtt": [
                "dlqschedulebasedwfeventsDB46C53A",
                "Arn"
              ]
            }
          },
          "Id": "Target0",
          "RoleArn": {
            "Fn::GetAtt": [
              "eventbridgeroleCE0AAA81",
              "Arn"
            ]
          }
        }
      ]
    } )
  } )

  test( 'Queue Write Policy', () => {
    template.hasResourceProperties( "AWS::SQS::QueuePolicy", {
      "PolicyDocument": {
        "Statement": Match.arrayWith( [
          {
            "Action": "sqs:SendMessage",
            "Effect": "Allow",
            "Principal": {
              "AWS": {
                "Fn::GetAtt": [
                  "eventbridgeroleCE0AAA81",
                  "Arn"
                ]
              }
            },
            "Resource": "*",
            "Sid": "SendMessage"
          }
        ] )
      }
    } )
  } )

} )