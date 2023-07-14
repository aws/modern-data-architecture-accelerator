/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { CaefDataBrewDataset, CaefDataBrewDatasetProps } from "../lib";
import { Template } from "aws-cdk-lib/assertions";
describe( 'CAEF Construct Compliance Tests', () => {
  const testApp = new CaefTestApp()


  const testContstructProps: CaefDataBrewDatasetProps = {
    naming: testApp.naming,
    name: "test-dataset",
    input: {
      databaseInputDefinition: {
        glueConnectionName: 'glueConnectionName',

        // the properties below are optional
        databaseTableName: 'databaseTableName',
        queryString: 'queryString',
        tempDirectory: {
          bucket: 'bucket',
          // the properties below are optional
          key: 'key',
        },
      },
      dataCatalogInputDefinition: {
        catalogId: 'catalogId',
        databaseName: 'databaseName',
        tableName: 'tableName',
        tempDirectory: {
          bucket: 'bucket',
          // the properties below are optional
          key: 'key',
        },
      },
      metadata: {
        sourceArn: 'sourceArn',
      },
      s3InputDefinition: {
        bucket: 'bucket',
        // the properties below are optional
        key: 'key',
      },
    },
    format: 'format',
    formatOptions: {
      csv: {
        delimiter: 'delimiter',
        headerRow: false,
      },
      excel: {
        headerRow: false,
        sheetIndexes: [ 123 ],
        sheetNames: [ 'sheetNames' ],
      },
      json: {
        multiLine: false,
      },
    },
    pathOptions: {
      filesLimit: {
        maxFiles: 123,
        // the properties below are optional
        order: 'order',
        orderedBy: 'orderedBy',
      },
      lastModifiedDateCondition: {
        expression: 'expression',
        valuesMap: [ {
          value: 'value',
          valueReference: 'valueReference',
        } ],
      },
      parameters: [ {
        datasetParameter: {
          name: 'name',
          type: 'type',
          // the properties below are optional
          createColumn: false,
          datetimeOptions: {
            format: 'format',
            // the properties below are optional
            localeCode: 'localeCode',
            timezoneOffset: 'timezoneOffset',
          },
          filter: {
            expression: 'expression',
            valuesMap: [ {
              value: 'value',
              valueReference: 'valueReference',
            } ],
          },
        },
        pathParameterName: 'pathParameterName',
      } ],
    }
  }

  new CaefDataBrewDataset( testApp.testStack, "test-construct", testContstructProps )
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  test( 'TestDatasetName', () => {
    template.hasResourceProperties( "AWS::DataBrew::Dataset", {
      "Name": testApp.naming.resourceName( "test-dataset" )
    } )
  } )

  test( 'TestInput', () => {
    template.hasResourceProperties( "AWS::DataBrew::Dataset", {
      "Input": {
        "DataCatalogInputDefinition": {
          "CatalogId": "catalogId",
          "DatabaseName": "databaseName",
          "TableName": "tableName",
          "TempDirectory": {
            "Bucket": "bucket",
            "Key": "key"
          }
        },
        "DatabaseInputDefinition": {
          "DatabaseTableName": "databaseTableName",
          "GlueConnectionName": "glueConnectionName",
          "QueryString": "queryString",
          "TempDirectory": {
            "Bucket": "bucket",
            "Key": "key"
          }
        },
        "Metadata": {
          "SourceArn": "sourceArn"
        },
        "S3InputDefinition": {
          "Bucket": "bucket",
          "Key": "key"
        }
      },
      "Name": "test-org-test-env-test-domain-test-module-test-dataset",
      "Format": "format",
      "FormatOptions": {
        "Csv": {
          "Delimiter": "delimiter",
          "HeaderRow": false
        },
        "Excel": {
          "HeaderRow": false,
          "SheetIndexes": [
            123
          ],
          "SheetNames": [
            "sheetNames"
          ]
        },
        "Json": {
          "MultiLine": false
        }
      },
      "PathOptions": {
        "FilesLimit": {
          "MaxFiles": 123,
          "Order": "order",
          "OrderedBy": "orderedBy"
        },
        "LastModifiedDateCondition": {
          "Expression": "expression",
          "ValuesMap": [
            {
              "Value": "value",
              "ValueReference": "valueReference"
            }
          ]
        },
        "Parameters": [
          {
            "DatasetParameter": {
              "CreateColumn": false,
              "DatetimeOptions": {
                "Format": "format",
                "LocaleCode": "localeCode",
                "TimezoneOffset": "timezoneOffset"
              },
              "Filter": {
                "Expression": "expression",
                "ValuesMap": [
                  {
                    "Value": "value",
                    "ValueReference": "valueReference"
                  }
                ]
              },
              "Name": "name",
              "Type": "type"
            },
            "PathParameterName": "pathParameterName"
          }
        ]
      }
    } )
  } )
} )