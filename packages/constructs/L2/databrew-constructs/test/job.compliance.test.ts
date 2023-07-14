/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefDataBrewJob, CaefDataBrewJobProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
  const testApp = new CaefTestApp()


  const testContstructProps: CaefDataBrewJobProps = {
    naming: testApp.naming,
    name: "test-job",
    roleArn: "test-arn",
    type: "RECIPE",
    projectName: "test-project",
    encryptionKeyArn: "arn:test-partition:kms:test-region:test-account:key/5643d995-1a93-4eb9-aa99-7dae58360b72",
    outputs: [ {
      location: {
        bucket: 'bucket',

        // the properties below are optional
        bucketOwner: 'bucketOwner',
        key: 'key',
      },

      // the properties below are optional
      compressionFormat: 'compressionFormat',
      format: 'format',
      formatOptions: {
        csv: {
          delimiter: 'delimiter',
        },
      },
      maxOutputFiles: 123,
      overwrite: false,
      partitionColumns: [ 'partitionColumns' ],
    } ]
  }

  new CaefDataBrewJob( testApp.testStack, "test-construct", testContstructProps )

  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  test( 'TestJobName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Job", {
      "Name": testApp.naming.resourceName( "test-job" )
    } )
  } )

  test( 'TestKmsMasterKey', () => {
    template.hasResourceProperties( "AWS::DataBrew::Job", {
      "EncryptionKeyArn": "arn:test-partition:kms:test-region:test-account:key/5643d995-1a93-4eb9-aa99-7dae58360b72"
    } )
  } )

  test( 'TestRoleUsed', () => {
    template.hasResourceProperties( "AWS::DataBrew::Job", {
      "RoleArn": "test-arn"
    } )
  } )

  test( 'TestJobInput', () => {
    template.hasResourceProperties( "AWS::DataBrew::Job", {
      "Name": "test-org-test-env-test-domain-test-module-test-job",
      "Type": "RECIPE",
      "ProjectName": "test-project",
      "Outputs": [
        {
          "CompressionFormat": "compressionFormat",
          "Format": "format",
          "FormatOptions": {
            "Csv": {
              "Delimiter": "delimiter"
            }
          },
          "Location": {
            "Bucket": "bucket",
            "BucketOwner": "bucketOwner",
            "Key": "key"
          },
          "MaxOutputFiles": 123,
          "Overwrite": false,
          "PartitionColumns": [
            "partitionColumns"
          ]
        }
      ]
    } )
  } )
} )
