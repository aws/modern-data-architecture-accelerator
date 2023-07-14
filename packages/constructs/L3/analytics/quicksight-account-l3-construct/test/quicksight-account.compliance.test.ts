/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroupRuleProps } from "@aws-caef/ec2-constructs";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Protocol } from "aws-cdk-lib/aws-ec2";
import { QuickSightAccountL3Construct, QuickSightAccountL3ConstructProps } from "../lib";

describe( 'CAEF Compliance Stack Tests', () => {
  const testApp = new CaefTestApp()
  const testQSSecurityGroup: CaefSecurityGroupRuleProps = {
    sg: [
      {
        sgId: "sg-1234abcd",
        port: 1111,
        protocol: Protocol.TCP
      },
      {
        sgId: "sg-1234abcd",
        port: 1000,
        toPort: 2000,
        protocol: Protocol.TCP
      }
    ]
  };

  const constructProps: QuickSightAccountL3ConstructProps = {
    qsAccount: {
      securityGroupAccess: testQSSecurityGroup,
      edition: "ENTERPRISE_AND_Q",
      authenticationMethod: "IAM_AND_QUICKSIGHT",
      notificationEmail: "test@example.com",
      firstName: "testFirstName",
      lastName: "testLastName",
      emailAddress: "test@example.com",
      contactNumber: "1234546879",
      vpcId: "vpc-abcd1234",
      glueResourceAccess: [ "database/some-database-name*" ]
    },
    naming: testApp.naming,

    roleHelper: new CaefRoleHelper( testApp.testStack, testApp.naming )
  };

  new QuickSightAccountL3Construct( testApp.testStack, 'test-stack', constructProps )
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )
  test( 'Validate if the 2 Lambda functions[CR and QSAccount] are created', () => {
    template.resourceCountIs( "AWS::Lambda::Function", 2 );
  } );
  // Verify Properties for QS Folders like folderpermissions, folderName, etc.
  test( 'Test QS Account With Sample Config', () => {
    template.hasResourceProperties( "AWS::CloudFormation::CustomResource", {
      "accountDetail": Match.objectLike( {
        edition: "ENTERPRISE_AND_Q",
        authenticationMethod: "IAM_AND_QUICKSIGHT",
        notificationEmail: "test@example.com",
        accountName: "test-org-test-env-test-domain-test-module"
      } ),
    } )
  } );
} );