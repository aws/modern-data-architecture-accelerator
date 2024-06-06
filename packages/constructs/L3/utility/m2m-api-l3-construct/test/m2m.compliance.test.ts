/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { M2MApiL3Construct, M2MApiL3ConstructProps, M2MApiProps } from '../lib/m2m-api-l3-construct';

describe( 'Mandatory Prop Tests', () => {

  const testApp = new MdaaTestApp()
  const stack = testApp.testStack

  const apiProps: M2MApiProps = {
    adminRoles: [ {
      id: 'test-role-id'
    } ],
    targetBucketName: "test-bkt-name",
    targetPrefix: "testing",
    allowedCidrs: [ "10.0.0.0/8" ],
    concurrencyLimit: 10,
    eventMetadataMappings: {
      "dest_path": "test.source.path"
    }
  };

  const constructProps: M2MApiL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper( stack, testApp.naming ),
    m2mApiProps: apiProps
  }

  new M2MApiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  describe( "KMS", () => {
    // Key Policy
    test( 'Key Policy', () => {
      template.hasResourceProperties( "AWS::KMS::Key", {
        "KeyPolicy": {
          "Statement": [
            {
              "Action": "kms:*",
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:test-partition:iam::test-account:root"
              },
              "Resource": "*"
            },
            {
              "Action": [
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*"
              ],
              "Condition": {
                "StringLike": {
                  "aws:userId": [
                    "test-role-id:*"
                  ]
                }
              },
              "Effect": "Allow",
              "Principal": {
                "AWS": "*"
              },
              "Resource": "*",
              "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
            },
            {
              "Action": [
                "kms:Create*",
                "kms:Describe*",
                "kms:Enable*",
                "kms:List*",
                "kms:Put*",
                "kms:Update*",
                "kms:Revoke*",
                "kms:Disable*",
                "kms:Get*",
                "kms:Delete*",
                "kms:TagResource",
                "kms:UntagResource",
                "kms:ScheduleKeyDeletion",
                "kms:CancelKeyDeletion"
              ],
              "Condition": {
                "StringLike": {
                  "aws:userId": [
                    "test-role-id:*"
                  ]
                }
              },
              "Effect": "Allow",
              "Principal": {
                "AWS": "*"
              },
              "Resource": "*",
              "Sid": "test-org-test-env-test-domain-test-module-usage-stmt"
            },
            {
              "Action": [
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*"
              ],
              "Condition": {
                "ArnEquals": {
                  "kms:EncryptionContext:aws:logs:arn": "arn:test-partition:logs:test-region:test-account:log-group:*"
                }
              },
              "Effect": "Allow",
              "Principal": {
                "Service": "logs.test-region.amazonaws.com"
              },
              "Resource": "*",
              "Sid": "CloudWatchLogsEncryption"
            }
          ],
          "Version": "2012-10-17"
        }
      } )
    } );
  } )
  describe( "Cognito", () => {
    // User Pool
    test( 'User Pool', () => {
      template.hasResourceProperties( "AWS::Cognito::UserPool", {
        "AccountRecoverySetting": {
          "RecoveryMechanisms": [
            {
              "Name": "admin_only",
              "Priority": 1
            }
          ]
        },
        "AdminCreateUserConfig": {
          "AllowAdminCreateUserOnly": true
        },
        "LambdaConfig": {
          "PostAuthentication": {
            "Fn::GetAtt": [
              "teststackpostAuthLogFnA9721CD4",
              "Arn"
            ]
          }
        },
        "UserPoolAddOns": {
          "AdvancedSecurityMode": "ENFORCED"
        },
        "UserPoolName": "test-org-test-env-test-domain-test-module",
      } )
    } );


    // User Pool Domain
    test( 'User Pool Domain', () => {
      template.hasResourceProperties( "AWS::Cognito::UserPoolDomain", {
        "Domain": "test-org-test-env-test-domain-test-module",
        "UserPoolId": {
          "Ref": "teststackuserpoolF532A2C6"
        }
      } )
    } );

    // User Pool Resource Server
    test( 'User Pool Resource Server', () => {
      template.hasResourceProperties( "AWS::Cognito::UserPoolResourceServer", {
        "Identifier": "m2m-api",
        "Name": "test-org-test-env-test-domain-test-module",
        "UserPoolId": {
          "Ref": "teststackuserpoolF532A2C6"
        },
        "Scopes": [
          {
            "ScopeDescription": "Generate URL Access",
            "ScopeName": "m2m-custom"
          }
        ]
      } )
    } );


    // Cognito Auth Lambda Role/Policy
    test( 'Cognito Auth Lambda Role', () => {
      template.hasResourceProperties( "AWS::IAM::Role", {
        "RoleName": "test-org-test-env-test-domain-test-module-cognito-auth"
      } )
    } );

    // Cognito Auth Lambda Role/Policy
    test( 'Cognito Auth Lambda Policy', () => {
      template.hasResourceProperties( "AWS::IAM::Policy", {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "logs:PutLogEvents",
                "logs:CreateLogStream"
              ],
              "Effect": "Allow",
              "Resource": "arn:test-partition:logs:*:*:log-group:/aws/lambda/test-org-test-env-test-domain-test-module-log-auth-event*"
            },
            {
              "Action": "logs:CreateLogGroup",
              "Effect": "Allow",
              "Resource": "arn:test-partition:logs:*:*:log-group:/aws/lambda/test-org-test-env-test-domain-test-module-log-auth-event*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "teststackcognitoauthlambdaroleDefaultPolicyDBE8C936",
        "Roles": [
          {
            "Ref": "teststackcognitoauthlambdarole72DD14EF"
          }
        ]
      } )
    } );

    // Cognito Auth Lambda Function
    test( 'Cognito Auth Lambda Function', () => {
      template.hasResourceProperties( "AWS::Lambda::Function", {
        "Code": {
          "ZipFile": "\n                const handler = async function(event) {\n                    console.log(\"Authentication successful\");\n                    console.log(\"Trigger function =\", event.triggerSource);\n                    console.log(\"User pool = \", event.userPoolId);\n                    console.log(\"App client ID = \", event.callerContext.clientId);\n                    console.log(\"User ID = \", event.userName);\n                    return event;\n                };\n                exports.handler = handler;\n                "
        },
        "Role": {
          "Fn::GetAtt": [
            "teststackcognitoauthlambdarole72DD14EF",
            "Arn"
          ]
        },
        "FunctionName": "test-org-test-env-test-domain-test-module-log-auth-event",
        "Handler": "index.handler",
        "Runtime": "nodejs20.x"
      } )
    } );
  } )

  describe( "API Gateway", () => {

    // API Gateway Access Log Group
    test( 'API Gateway Access Log Group', () => {
      template.hasResourceProperties( "AWS::Logs::LogGroup", {
        "KmsKeyId": {
          "Fn::GetAtt": [
            "teststackkmskey008BA6F3",
            "Arn"
          ]
        },
        "LogGroupName": "/test-org-test-env-test-domain-test-module-access-logs"
      } )
    } );

    // API Gateway Rest API
    test( 'API Gateway Rest API', () => {
      template.hasResourceProperties( "AWS::ApiGateway::RestApi", {
        "Name": "test-org-test-env-test-domain-test-module",
        "Policy": {
          "Statement": [
            {
              "Action": "execute-api:Invoke",
              "Effect": "Allow",
              "Principal": {
                "AWS": "*"
              },
              "Resource": "execute-api:/prod/GET/upload*"
            },
            {
              "Action": "execute-api:Invoke",
              "Condition": {
                "NotIpAddress": {
                  "aws:SourceIp": [
                    "10.0.0.0/8"
                  ]
                }
              },
              "Effect": "Deny",
              "Principal": {
                "AWS": "*"
              },
              "Resource": "execute-api:/prod/GET/upload*"
            }
          ],
          "Version": "2012-10-17"
        }
      } )
    } );
    // API Gateway Deployment
    test( 'API Gateway Deployment', () => {
      template.hasResourceProperties( "AWS::ApiGateway::Deployment", {
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        },
      } )
    } );
    // API Gateway Stage
    test( 'API Gateway Stage', () => {
      template.hasResourceProperties( "AWS::ApiGateway::Stage", {
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        },
        "AccessLogSetting": {
          "DestinationArn": {
            "Fn::GetAtt": [
              "teststackaccessloggroupABA0A65E",
              "Arn"
            ]
          },
          "Format": "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"user\":\"$context.identity.user\",\"caller\":\"$context.identity.caller\",\"requestTime\":\"$context.requestTime\",\"httpMethod\":\"$context.httpMethod\",\"resourcePath\":\"$context.resourcePath\",\"status\":\"$context.status\",\"protocol\":\"$context.protocol\",\"responseLength\":\"$context.responseLength\"}"
        },
        "MethodSettings": [
          {
            "CacheDataEncrypted": false,
            "CachingEnabled": false,
            "DataTraceEnabled": false,
            "HttpMethod": "*",
            "LoggingLevel": "INFO",
            "ResourcePath": "/*"
          }
        ],
        "StageName": "prod",
        "TracingEnabled": true
      } )
    } );

    // API Gateway Resource
    test( 'API Gateway Resource', () => {
      template.hasResourceProperties( "AWS::ApiGateway::Resource", {
        "ParentId": {
          "Fn::GetAtt": [
            "teststackrestapi97625338",
            "RootResourceId"
          ]
        },
        "PathPart": "upload",
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        }
      } )
    } );

    // API Gateway Method
    test( 'API Gateway Method', () => {
      template.hasResourceProperties( "AWS::ApiGateway::Method", {
        "HttpMethod": "GET",
        "ResourceId": {
          "Ref": "teststackrestapiuploadproxyEAD65B5A"
        },
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        },
        "AuthorizationScopes": [
          "m2m-api/m2m-custom"
        ],
        "AuthorizationType": "COGNITO_USER_POOLS",
        "AuthorizerId": {
          "Ref": "teststackcognitoauthorizer2A996C14"
        },
        "Integration": {
          "Credentials": {
            "Fn::GetAtt": [
              "teststackintegrationrole1C12CFEE",
              "Arn"
            ]
          },
          "IntegrationHttpMethod": "POST",
          "RequestParameters": {},
          "Type": "AWS_PROXY",
          "Uri": {
            "Fn::Join": [
              "",
              [
                "arn:test-partition:apigateway:test-region:lambda:path/2015-03-31/functions/",
                {
                  "Fn::GetAtt": [
                    "teststacks3urlgenlambda9F93D9BE",
                    "Arn"
                  ]
                },
                "/invocations"
              ]
            ]
          }
        },
        "RequestParameters": {},
        "RequestValidatorId": {
          "Ref": "teststackrestapivalidator303DC7DF"
        }
      } )
    } );

    // API Gateway Request Validator
    test( 'API Gateway Request Validator', () => {
      template.hasResourceProperties( "AWS::ApiGateway::RequestValidator", {
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        },
        "ValidateRequestBody": true,
        "ValidateRequestParameters": true
      } )
    } );

    // API Gateway Authorizer
    test( 'API Gateway Authorizer', () => {
      template.hasResourceProperties( "AWS::ApiGateway::Authorizer", {
        "Name": "test-org-test-env-test-domain-test-module",
        "RestApiId": {
          "Ref": "teststackrestapi97625338"
        },
        "Type": "COGNITO_USER_POOLS",
        "AuthorizerResultTtlInSeconds": 0,
        "IdentitySource": "method.request.header.Authorization",
        "ProviderARNs": [
          {
            "Fn::GetAtt": [
              "teststackuserpoolF532A2C6",
              "Arn"
            ]
          }
        ]
      } )
    } );

    // API Gateway Integration Role
    test( 'API Gateway Integration Role', () => {
      template.hasResourceProperties( "AWS::IAM::Role", {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "apigateway.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "RoleName": "test-org-test-env-test-domain-test-module-integration"
      } )
    } );

    // API Gateway Integration Policy
    test( 'API Gateway Integration Policy', () => {
      template.hasResourceProperties( "AWS::IAM::Policy", {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:InvokeFunction",
              "Effect": "Allow",
              "Resource": {
                "Fn::GetAtt": [
                  "teststacks3urlgenlambda9F93D9BE",
                  "Arn"
                ]
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "teststackintegrationroleDefaultPolicy64CD8B47",
        "Roles": [
          {
            "Ref": "teststackintegrationrole1C12CFEE"
          }
        ]
      } )
    } );
  } )

  describe( "API Implementation", () => {

    // Gen S3 URL Lambda Role/Policy
    test( 'Gen S3 URL Lambda Role', () => {
      template.hasResourceProperties( "AWS::IAM::Role", {
        "RoleName": "test-org-test-env-test-domain-test-module-url-gen-lambda-role"
      } )
    } );

    // Gen S3 URL Lambda Role/Policy
    test( 'Gen S3 URL Lambda Policy', () => {
      template.hasResourceProperties( "AWS::IAM::Policy", {
        "PolicyDocument": {
          "Statement": [

            {
              "Action": [
                "logs:PutLogEvents",
                "logs:CreateLogStream"
              ],
              "Effect": "Allow",
              "Resource": "arn:test-partition:logs:*:*:log-group:/aws/lambda/test-org-test-env-test-domain-test-module-signed-s3-url-gen*"
            },
            {
              "Action": "logs:CreateLogGroup",
              "Effect": "Allow",
              "Resource": "arn:test-partition:logs:*:*:log-group:/aws/lambda/test-org-test-env-test-domain-test-module-signed-s3-url-gen*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "teststackurlgenlambdaroleDefaultPolicy5B0987D1",
        "Roles": [
          {
            "Ref": "teststackurlgenlambdarole3B7279EF"
          }
        ]
      } )
    } );

    // Gen S3 URL Lambda Functions
    test( 'Gen S3 URL Lambda Function', () => {
      template.hasResourceProperties( "AWS::Lambda::Function", {
        "Role": {
          "Fn::GetAtt": [
            "teststackurlgenlambdarole3B7279EF",
            "Arn"
          ]
        },
        "Environment": {
          "Variables": {
            "EXPIRY_TIME_SECONDS": "600",
            "TARGET_BUCKET": "test-bkt-name",
            "TARGET_PREFIX": "testing",
            "METADATA_TARGET_PREFIX": "testing",
            "EVENT_METADATA_MAPPINGS": "{\"dest_path\":\"test.source.path\"}"
          }
        },
        "FunctionName": "test-org-test-env-test-domain-test-module-signed-s3-url-gen",
        "Handler": "s3_url.handler",
        "ReservedConcurrentExecutions": 10,
        "Runtime": "python3.12"
      } )
    } );
  } )

  describe( "WAF", () => {

    // WAF IP Set
    test( 'WAF IP Set', () => {
      template.hasResourceProperties( "AWS::WAFv2::IPSet", {
        "Addresses": [
          "10.0.0.0/8"
        ],
        "IPAddressVersion": "IPV4",
        "Scope": "REGIONAL",
        "Name": "test-org-test-env-test-domain-test-module-ip-allow-set"
      } )
    } );

    // WAF WebACL
    test( 'WAF WebACL', () => {
      template.hasResourceProperties( "AWS::WAFv2::WebACL", {
        "DefaultAction": {
          "Block": {}
        },
        "Scope": "REGIONAL",
        "VisibilityConfig": {
          "CloudWatchMetricsEnabled": true,
          "MetricName": "test-org-test-env-test-domain-test-module",
          "SampledRequestsEnabled": false
        },
        "Name": "test-org-test-env-test-domain-test-module-default-waf",
        "Rules": [
          {
            "Action": {
              "Allow": {}
            },
            "Name": "ipAllow",
            "Priority": 0,
            "Statement": {
              "IPSetReferenceStatement": {
                "Arn": {
                  "Fn::GetAtt": [
                    "teststackipallowsetBC45A890",
                    "Arn"
                  ]
                }
              }
            },
            "VisibilityConfig": {
              "CloudWatchMetricsEnabled": false,
              "MetricName": "test-org-test-env-test-domain-test-module-ip-allow",
              "SampledRequestsEnabled": false
            }
          }
        ]
      } )
    } );

    // WAF LogGroup
    test( 'WAF LogGroup', () => {
      template.hasResourceProperties( "AWS::Logs::LogGroup", {
        "KmsKeyId": {
          "Fn::GetAtt": [
            "teststackkmskey008BA6F3",
            "Arn"
          ]
        },
        "LogGroupName": "aws-waf-logs-/test-org-test-env-test-domain-test-module-default-waf"
      } )
    } );

    // WAF Logging Configuration
    test( 'WAF Logging Configuration', () => {
      template.hasResourceProperties( "AWS::WAFv2::LoggingConfiguration", {
        "LogDestinationConfigs": [
          {
            "Fn::GetAtt": [
              "teststackdefaultwafloggroup371BF610",
              "Arn"
            ]
          }
        ],
        "ResourceArn": {
          "Fn::GetAtt": [
            "teststackdefaultwaf4F859742",
            "Arn"
          ]
        }
      } )
    } );

    // WAF ACL Association to API Gateway
    test( 'WAF ACL Association to API Gateway', () => {
      template.hasResourceProperties( "AWS::WAFv2::WebACLAssociation", {
        "ResourceArn": {
          "Fn::Join": [
            "",
            [
              "arn:test-partition:apigateway:test-region::/restapis/",
              {
                "Ref": "teststackrestapi97625338"
              },
              "/stages/",
              {
                "Ref": "teststackrestapiDeploymentStageprodDC4656A8"
              }
            ]
          ]
        },
        "WebACLArn": {
          "Fn::GetAtt": [
            "teststackdefaultwaf4F859742",
            "Arn"
          ]
        }
      } )
    } );
  } )
} )

describe( 'Optional Prop Tests', () => {

  const testApp = new MdaaTestApp()
  const stack = testApp.testStack

  const apiProps: M2MApiProps = {
    adminRoles: [ {
      id: 'test-role-id'
    } ],
    targetBucketName: "test-bkt-name",
    targetPrefix: "testing",
    metadataTargetPrefix: "metadata-testing",
    allowedCidrs: [ "10.0.0.0/8" ],
    concurrencyLimit: 10,
    kmsKeyArn: "arn:test-partition:kms:test-region:test-account:key/test-key-id",
    integrationLambdaRoleArn: "arn:test-partition:iam:test-region:test-account:role/test-role-id",
    requestParameters: {
      "test_required_param": true,
      "test_opt_param": false
    },
    wafArns: {
      "test-waf": "arn:test-partition:wafv2:test-region:test-account:regional/webacl/test-name"
    },
    appClients: {
      "testing": {},
      "testing2": {
        idTokenValidityMinutes: 20,
        accessTokenValidityMinutes: 20,
        refreshTokenValidityHours: 12
      }
    },
    setAccountCloudWatchRole: true,
    stageName: "Prod"
  };

  const constructProps: M2MApiL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper( stack, testApp.naming ),
    m2mApiProps: apiProps
  }

  new M2MApiL3Construct( stack, "teststack", constructProps );
  testApp.checkCdkNagCompliance( testApp.testStack )
  const template = Template.fromStack( testApp.testStack )

  // console.log( JSON.stringify( template, undefined, 2 ) )

  // User Pool Client Defaults
  test( 'User Pool Client 1', () => {
    template.hasResourceProperties( "AWS::Cognito::UserPoolClient", {
      "UserPoolId": {
        "Ref": "teststackuserpoolF532A2C6"
      },
      "AllowedOAuthFlows": [
        "client_credentials"
      ],
      "AllowedOAuthFlowsUserPoolClient": true,
      "AllowedOAuthScopes": [
        {
          "Fn::Join": [
            "",
            [
              {
                "Ref": "teststackuserpoolresourceserver73AAA34F"
              },
              "/m2m-custom"
            ]
          ]
        }
      ],
      "ClientName": "test-org-test-env-test-domain-test-module-testing",
      "EnableTokenRevocation": true,
      "ExplicitAuthFlows": [
        "ALLOW_CUSTOM_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH"
      ],
      "GenerateSecret": true,
      "PreventUserExistenceErrors": "ENABLED",
      "SupportedIdentityProviders": [
        "COGNITO"
      ]

    } )
  } );

  // User Pool Client Non Defaults
  test( 'User Pool Client Non Defaults', () => {
    template.hasResourceProperties( "AWS::Cognito::UserPoolClient", {
      "UserPoolId": {
        "Ref": "teststackuserpoolF532A2C6"
      },
      "AccessTokenValidity": 20,
      "AllowedOAuthFlows": [
        "client_credentials"
      ],
      "AllowedOAuthFlowsUserPoolClient": true,
      "AllowedOAuthScopes": [
        {
          "Fn::Join": [
            "",
            [
              {
                "Ref": "teststackuserpoolresourceserver73AAA34F"
              },
              "/m2m-custom"
            ]
          ]
        }
      ],
      "ClientName": "test-org-test-env-test-domain-test-module-testing2",
      "EnableTokenRevocation": true,
      "ExplicitAuthFlows": [
        "ALLOW_CUSTOM_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH"
      ],
      "GenerateSecret": true,
      "IdTokenValidity": 20,
      "PreventUserExistenceErrors": "ENABLED",
      "RefreshTokenValidity": 720,
      "SupportedIdentityProviders": [
        "COGNITO"
      ],
      "TokenValidityUnits": {
        "AccessToken": "minutes",
        "IdToken": "minutes",
        "RefreshToken": "minutes"
      }
    } )
  } );

  // API Gateway CloudWatch Role
  test( 'API Gateway CloudWatch Role', () => {
    template.hasResourceProperties( "AWS::IAM::Role", {
      "AssumeRolePolicyDocument": {
        "Statement": [
          {
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
              "Service": "apigateway.amazonaws.com"
            }
          }
        ],
        "Version": "2012-10-17"
      },
      "ManagedPolicyArns": [
        "arn:test-partition:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
      ],
      "RoleName": "test-org-test-env-test-domain-test-module-cloudwatch"
    } )
  } );

  // API Gateway Account/CloudWatch Config
  test( 'API Gateway Account/CloudWatch Config', () => {
    template.hasResourceProperties( "AWS::ApiGateway::Account", {
      "CloudWatchRoleArn": {
        "Fn::GetAtt": [
          "teststackcloudwatchroleE9EF2C2E",
          "Arn"
        ]
      }
    } )
  } );
  // Gen S3 URL Lambda Functions
  test( 'Gen S3 URL Lambda Function', () => {
    template.hasResourceProperties( "AWS::Lambda::Function", {
      "Role": "arn:test-partition:iam:test-region:test-account:role/test-role-id",
      "Environment": {
        "Variables": {
          "EXPIRY_TIME_SECONDS": "600",
          "TARGET_BUCKET": "test-bkt-name",
          "TARGET_PREFIX": "testing",
          "METADATA_TARGET_PREFIX": "metadata-testing",
          "EVENT_METADATA_MAPPINGS": "{}"
        }
      },
      "FunctionName": "test-org-test-env-test-domain-test-module-signed-s3-url-gen",
      "Handler": "s3_url.handler",
      "ReservedConcurrentExecutions": 10,
      "Runtime": "python3.12"
    } )
  } );
} )