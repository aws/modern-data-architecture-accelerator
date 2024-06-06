/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Match } from "aws-cdk-lib/assertions";
import { Template } from "aws-cdk-lib/assertions";
import { DataWarehouseL3Construct, DataWarehouseL3ConstructProps, FederationProps, SecurityGroupIngressProps } from "../lib";
import { DatabaseUsersProps, ScheduledActionProps } from '../lib/datawarehouse-l3-construct';


describe( 'MDAA Compliance Stack Tests', () => {

  const testApp = new MdaaTestApp()
  const stack = testApp.testStack

  const securityGroupIngresProps: SecurityGroupIngressProps = {
    ipv4: [ "127.0.0.1/24" ],
    sg: [ "sg-be41a7c3" ]
  }

  const dataAdminRoleRef: MdaaRoleRef = {
    id: "testdataAdminRole",
    arn: "arn:test-partition:iam::test-account:role/TestAccess"
  }

  const warehouseBucketUserRoleRef: MdaaRoleRef = {
    id: "testwarehouseBucketUserRoleRefs",
    arn: "arn:test-partition:iam::test-account:role/Test"
  }

  const executionRoleTeamA: MdaaRoleRef = {
    id: "executionRoleTeamA",
    arn: "arn:test-partition:iam::test-account:role/ex-role-team-a"
  }
  const executionRoleTeamB: MdaaRoleRef = {
    name: "executionRoleTeamB"
  }

  const federationProps: FederationProps = {
    federationName: "test-federation",
    providerArn: "arn:test-partition:iam::test-account:role/test"
  }

  const scheduledAction: ScheduledActionProps = {
    name: "test-name",
    enable: true,
    targetAction: "resumeCluster",
    schedule: "2008-12-04 16:10:43",
    startTime: "2008-12-04 16:10:43",
    endTime: "2008-12-04 16:10:43"
  }

  const databaseUsers: DatabaseUsersProps = {
    userName: "test-userName",
    dbName: "test-dbName",
    secretAccessRoles: [ { name: "test-role" } ],
    secretRotationDays: 1
  }

  const constructProps: DataWarehouseL3ConstructProps = {
    adminUsername: "admin",
    adminPasswordRotationDays: 10,
    dataAdminRoleRefs: [ dataAdminRoleRef ],
    vpcId: "vpcId",
    subnetIds: [ "test1" ],
    securityGroupIngress: securityGroupIngresProps,
    nodeType: "dc2.large",
    numberOfNodes: 4,
    enableAuditLoggingToS3: true,
    clusterPort: 54390,
    preferredMaintenanceWindow: "ddd:hh24:mi-ddd:hh24:mi",

    roleHelper: new MdaaRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    federations: [ federationProps ],
    warehouseBucketUserRoleRefs: [ warehouseBucketUserRoleRef ],
    executionRoleRefs: [ executionRoleTeamA, executionRoleTeamB ],
    multiNode: true,
    parameterGroupParams: { "key1": "value1" },
    workloadManagement: [ { "key1": "value1" } ],
    additionalBucketKmsKeyArns: [ "arn:test-partition:kms:us-east-1:test-account:key/e4bfacbf-06c4-431e-b3ca-9a4d86eb94b4" ],
    scheduledActions: [ scheduledAction ],
    databaseUsers: [ databaseUsers ],
    createWarehouseBucket: true,
    automatedSnapshotRetentionDays: 10,
    eventNotifications: {
      email: [ "test@example.com" ],
      severity: "INFO",
      eventCategories: [ "management", "security" ]
    }
  };

  new DataWarehouseL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test( 'Validate resource counts', () => {
    template.resourceCountIs( "AWS::Redshift::Cluster", 1 );
    template.resourceCountIs( "AWS::S3::Bucket", 2 );
    template.resourceCountIs( "AWS::Redshift::EventSubscription", 2 );
  } );

  test( 'Redshift cluster properties', () => {
    template.hasResourceProperties( "AWS::Redshift::Cluster", {
      "ClusterType": "multi-node",
      "DBName": "default_db",
      "MasterUsername": {
        "Fn::Join": [
          "",
          [
            "{{resolve:secretsmanager:",
            {
              "Ref": "clusterSecretE349B730"
            },
            ":SecretString:username::}}"
          ]
        ]
      },
      "MasterUserPassword": {
        "Fn::Join": [
          "",
          [
            "{{resolve:secretsmanager:",
            {
              "Ref": "clusterSecretE349B730"
            },
            ":SecretString:password::}}"
          ]
        ]
      },
      "NodeType": "dc2.large",
      "AllowVersionUpgrade": true,
      "AutomatedSnapshotRetentionPeriod": 10,
      "ClusterIdentifier": "test-org-test-env-test-domain-test-module",
      "ClusterParameterGroupName": {
        "Ref": "clusterparamgroup14144A79"
      },
      "ClusterSubnetGroupName": {
        "Ref": "subnetgroup"
      },
      "Encrypted": true,
      "EnhancedVpcRouting": true,
      "IamRoles": [
        "arn:test-partition:iam::test-account:role/ex-role-team-a",
        {
          "Fn::GetAtt": [
            "RoleResExecutionRoleArns1",
            "arn"
          ]
        }
      ],
      "KmsKeyId": {
        "Ref": "warehousekey618891EF"
      },
      "LoggingProperties": {
        "BucketName": {
          "Ref": "testorgtestenvtestdomaintestmoduleloggingF7553636"
        },
        "S3KeyPrefix": "logging/"
      },
      "NumberOfNodes": 4,
      "Port": 54390,
      "PreferredMaintenanceWindow": "ddd:hh24:mi-ddd:hh24:mi",
      "PubliclyAccessible": false,
      "VpcSecurityGroupIds": [
        {
          "Fn::GetAtt": [
            "warehousesg47CB2460",
            "GroupId"
          ]
        }
      ]
    } )
  } );

  test( 'SecurityGroup Egress', () => {
    template.hasResourceProperties( "AWS::EC2::SecurityGroup", {
      "SecurityGroupEgress": Match.arrayWith( [ {
        "CidrIp": "0.0.0.0/0",
        "Description": "Allow all outbound traffic by default",
        "IpProtocol": "-1"
      } ] )
    } )
  } )

  test( 'SecurityGroup Ingress CIDR', () => {
    template.hasResourceProperties( "AWS::EC2::SecurityGroupIngress", {
      "CidrIp": "127.0.0.1/24",
      "Description": "Redshift Ingress for IPV4 CIDR 127.0.0.1/24",
      "FromPort": 54390,
      "IpProtocol": "tcp",
      "ToPort": 54390
    } )
  } )

  test( 'SecurityGroup Ingress CIDR', () => {
    template.hasResourceProperties( "AWS::EC2::SecurityGroupIngress", {
      "Description": "Redshift Ingress for SG sg-be41a7c3",
      "FromPort": 54390,
      "IpProtocol": "tcp",
      "SourceSecurityGroupId": "sg-be41a7c3",
      "ToPort": 54390
    } )
  } )

  test( 'SecurityGroup VpcId', () => {
    template.hasResourceProperties( "AWS::EC2::SecurityGroup", {
      "VpcId": "vpcId"
    } )
  } );

  test( 'Test secret manager resource policy', () => {
    template.hasResourceProperties( "AWS::SecretsManager::ResourcePolicy", {
      "ResourcePolicy": {
        "Statement": Match.arrayWith( [
          Match.objectLike(
            {
              "Action": "secretsmanager:GetSecretValue",
              "Effect": "Allow",
              "Principal": {
                "AWS": [
                  {
                    "Fn::GetAtt": [
                      "RoleResSecretAccessRole0",
                      "arn"
                    ]
                  },
                  "arn:test-partition:iam::test-account:role/TestAccess"
                ]
              },
              "Resource": "*",
              "Sid": "AllowSecretUsageForRoles"
            }
          )
        ] )
      }
    } )
  } );

  test( 'Test KMS resource policy for roles', () => {
    template.hasResourceProperties( "AWS::KMS::Key", {
      "KeyPolicy": {
        "Statement": Match.arrayWith( [
          Match.objectLike(
            {
              "Action": "kms:Decrypt",
              "Effect": "Allow",
              "Principal": {
                "AWS": [
                  {
                    "Fn::GetAtt": [
                      "RoleResSecretAccessRole0",
                      "arn"
                    ]
                  },
                  "arn:test-partition:iam::test-account:role/TestAccess"
                ]
              },
              "Resource": "*",
              "Sid": "AllowKMSUsageForSecretRoles"
            }
          )
        ] )
      }
    } )
  } );
  test( 'Test Cluster Event Notifications', () => {
    template.hasResourceProperties( "AWS::Redshift::EventSubscription", {
      "SubscriptionName": {
        "Ref": "cluster611F8AFF"
      },
      "EventCategories": [
        "management",
        "security"
      ],
      "Severity": "INFO",
      "SourceIds": [
        {
          "Ref": "cluster611F8AFF"
        }
      ],
      "SourceType": "cluster"
    } )
  } );
  test( 'Test Scheduled Action Event Notifications', () => {
    template.hasResourceProperties( "AWS::Redshift::EventSubscription", {
      "SubscriptionName": {
        "Fn::Join": [
          "",
          [
            {
              "Ref": "cluster611F8AFF"
            },
            "-scheduled-actions"
          ]
        ]
      },
      "EventCategories": [
        "management",
        "security"
      ],
      "Severity": "INFO",
      "SourceIds": [
        "test-org-test-env-test-domain-test-module-test-name"
      ],
      "SourceType": "scheduled-action"
    } )
  } );
} )
