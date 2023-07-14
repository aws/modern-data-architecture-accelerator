/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { QuickSightNamespaceL3ConstructProps, QuickSightNamespaceL3Construct, FederationProps, FederationRoleProps } from "../lib";

describe( 'CAEF Compliance Stack Tests', () => {

  const testApp = new CaefTestApp()
  const stack = testApp.testStack
  const federationRoleProps1: FederationRoleProps = {
    qsGroups: [ "TestREADERS", "TestAUTHORS" ],
    qsUserType: "READER"
  }
  const federationRoleProps2: FederationRoleProps = {
    qsGroups: [ "TestREADERS", "TestAUTHORS" ],
    qsUserType: "AUTHOR"
  }
  const federationProps1: FederationProps = {
    url: "test-url",
    providerArn: "arn:test-partition:iam::test-account:role/test",
    roles: { "testRole1": federationRoleProps1 }
  }
  const federationProps2: FederationProps = {
    url: "test-url",
    providerArn: "arn:test-partition:iam::test-account:role/test",
    roles: { "testRole2": federationRoleProps2 }
  }
  //{ "key1": federationProps }
  const constructProps: QuickSightNamespaceL3ConstructProps = {
    federations: [ { federationName: "testFederation1", ...federationProps1 }, { federationName: "testFederation2", ...federationProps2 } ],

    roleHelper: new CaefRoleHelper( stack, testApp.naming ),
    naming: testApp.naming,
    glueResourceAccess: [ "test-glue-resource", "*" ]
  };

  new QuickSightNamespaceL3Construct( stack, "teststack", constructProps );
  const template = Template.fromStack( stack );
  testApp.checkCdkNagCompliance( stack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test( 'Validate resource counts', () => {
    template.resourceCountIs( "AWS::CloudFormation::CustomResource", 1 );
  } );

  test( 'Check qsUserType Reader', () => {
    template.hasResourceProperties( "AWS::Lambda::Function", {
      "Environment":
        Match.objectLike(
          {
            "Variables": {
              "ACCOUNT_ID": "test-account",
              "NAMESPACE": "test-org-test-env-test-domain-test-module",
              "QUICKSIGHT_ROLE": "READER",
              "QUICKSIGHT_GROUPS": "test-org-test-env-test-domain-test-module-TestREADERS,test-org-test-env-test-domain-test-module-TestAUTHORS"
            }
          }
        )
    } );
  } );
  test( 'Check qsUserType Author', () => {
    template.hasResourceProperties( "AWS::Lambda::Function", {
      "Environment":
        Match.objectLike(
          {
            "Variables": {
              "ACCOUNT_ID": "test-account",
              "NAMESPACE": "test-org-test-env-test-domain-test-module",
              "QUICKSIGHT_ROLE": "AUTHOR",
              "QUICKSIGHT_GROUPS": "test-org-test-env-test-domain-test-module-TestREADERS,test-org-test-env-test-domain-test-module-TestAUTHORS"
            }
          }
        )
    } );
  } );
  test( 'Test stack reader IAM policy', () => {
    template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
      "PolicyDocument": {
        "Statement": Match.arrayWith( [
          Match.objectLike(
            {
              "Action": "quicksight:CreateReader",
              "Effect": "Allow",
              "Resource": "arn:test-partition:quicksight::test-account:user/${aws:userid}",
              "Sid": "CreateReader"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:DescribeAnalysis",
                "quicksight:DescribeDashboard",
                "quicksight:DescribeDataset",
                "quicksight:DescribeDataSource",
                "quicksight:DescribeFolder",
                "quicksight:DescribeGroup",
                "quicksight:DescribeIngestion",
                "quicksight:DescribeTemplate",
                "quicksight:DescribeTheme",
                "quicksight:DescribeUser"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Describe"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:ListAnalyses",
                "quicksight:ListCustomPermissions",
                "quicksight:ListDashboards",
                "quicksight:ListDashboardVersions",
                "quicksight:ListDataSets",
                "quicksight:ListDataSources",
                "quicksight:ListFolders",
                "quicksight:ListFolderMembers",
                "quicksight:ListGroups",
                "quicksight:ListGroupMemberships",
                "quicksight:ListIngestions",
                "quicksight:ListTagsForResource",
                "quicksight:ListTemplates",
                "quicksight:ListTemplateAliases",
                "quicksight:ListTemplateVersions",
                "quicksight:ListThemes",
                "quicksight:ListThemeAliases",
                "quicksight:ListThemeVersions",
                "quicksight:ListUsers",
                "quicksight:ListUserGroups"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "List"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:SearchAnalyses",
                "quicksight:SearchDashboards",
                "quicksight:SearchFolders"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Search"
            }
          ),
          Match.objectLike(
            {
              "Action": "lakeformation:GetDataAccess",
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "LakeFormationAccess"
            }
          )
        ] )
      }
    } )
  } );

  test( 'Test stack glue access IAM policy', () => {
    template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
      "PolicyDocument": {
        "Statement": Match.arrayWith( [
          Match.objectLike(
            {
              "Action": [
                "glue:GetDatabase",
                "glue:GetDatabases",
                "glue:GetTable",
                "glue:GetTables",
                "glue:GetPartition",
                "glue:GetPartitions",
                "glue:SearchTables"
              ],
              "Effect": "Allow",
              "Resource": [
                "arn:test-partition:glue:test-region:test-account:test-glue-resource",
                "arn:test-partition:glue:test-region:test-account:*",
                "arn:test-partition:glue:test-region:test-account:catalog",
                "arn:test-partition:glue:test-region:test-account:database/default"
              ]
            } )
        ] )
      }
    } )
  } );

  test( 'Test stack author IAM policy', () => {
    template.hasResourceProperties( "AWS::IAM::ManagedPolicy", {
      "PolicyDocument": {
        "Statement": Match.arrayWith( [
          Match.objectLike(
            {
              "Action": "redshift:DescribeClusters",
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "RedShiftDescribe"
            }
          ),
          Match.objectLike(
            {
              "Action": "quicksight:CancelIngestion",
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "CancelIngestion"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:CreateDashboard",
                "quicksight:CreateFolder",
                "quicksight:CreateFolderMembership",
                "quicksight:CreateIngestion"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Create"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:DeleteAnalysis",
                "quicksight:DeleteDashboard",
                "quicksight:DeleteFolder",
                "quicksight:DeleteFolderMembership"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Delete"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:GenerateEmbedUrlForRegisteredUser",
                "quicksight:GetDashboardEmbedUrl"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "GenerateEmbedUrl"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:PassDataSet",
                "quicksight:PassDataSource"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "PassData"
            }
          ),
          Match.objectLike(
            {
              "Action": "quicksight:RestoreAnalysis",
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "RestoreAnalysis"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:TagResource",
                "quicksight:UnTagResource"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Tags"
            }
          ),
          Match.objectLike(
            {
              "Action": [
                "quicksight:UpdateAnalysis",
                "quicksight:UpdateAnalysisPermissions",
                "quicksight:UpdateDashboard",
                "quicksight:UpdateDashboardPermissions",
                "quicksight:UpdateDashboardPublishedVersion",
                "quicksight:UpdateFolder",
                "quicksight:UpdateFolderPermissions"
              ],
              "Effect": "Allow",
              "Resource": "*",
              "Sid": "Update"
            }
          ),
          Match.objectLike(
            {
              "Action": "quicksight:CreateUser",
              "Effect": "Allow",
              "Resource": "arn:test-partition:quicksight::test-account:user/${aws:userid}",
              "Sid": "CreateUser"
            }
          )
        ] )
      }
    } )
  } );

} )