/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {MdaaRoleHelper} from "@aws-mdaa/iam-role-helper";
import {MdaaTestApp} from "@aws-mdaa/testing";
import {Template} from "aws-cdk-lib/assertions";
import {
    GAIAL3Construct,
    GAIAL3ConstructProps,
    SupportedAuthTypes,
    SupportedRegion,
    SupportedSageMakerModels
} from "../lib";
import * as fs from 'fs';

describe( 'MDAA Compliance Stack Tests', () => {

    const testApp = new MdaaTestApp()


    const roleHelper = new MdaaRoleHelper( testApp.testStack, testApp.naming )

    const constructProps: GAIAL3ConstructProps = {

        gaia: {
            dataAdminRoles: [{
                name: "test-admin"
            }],
            prefix: "test",
            llms: {
                sagemaker: [
                    {
                        model: SupportedSageMakerModels.FALCON_LITE
                    },
                    {
                        model: SupportedSageMakerModels.MISTRAL7B_INSTRUCT2
                    },
                    {
                        model: SupportedSageMakerModels.LLAMA2_13B_CHAT
                    }
                ],
            },
            skipApiGatewayDefaultWaf: false,
            setApiGateWayAccountCloudwatchRole: true,
            api:{
                restApiDomainName: "rest-api-domain",
                hostedZoneName: "test",
                socketApiDomainName: "socket-api-domain"
            },
            bedrock: {
                roleArn: 'arn:bedrockRole',
                enabled: true,
                region: SupportedRegion.US_EAST_1
            },
            rag: {
                engines: {
                    aurora: {
                        minCapacity: 0.5,
                        maxCapacity: 4
                    },
                    kendra: {
                        createIndex: true,
                        external: [
                            {
                                kendraId: "index-id",
                                name: "index-name",
                                roleArn: "arn:role-arn",
                            },
                            {
                                kendraId: "index-id",
                                name: "index-name",
                                region: SupportedRegion.CA_CENTRAL_1,
                            }
                        ]
                    },
                    knowledgeBase: {
                        external: [
                            {
                                kbId: "kb-id",
                                name: "kb-test",
                                roleArn: "arn:role-arn",
                            },
                                                        {
                                kbId: "kb-id-2",
                                name: "kb-test-2",
                                region: SupportedRegion.CA_CENTRAL_1,
                            }
                        ]
                    }
                },
                embeddingsModels: [
                    {
                        provider: "bedrock",
                        name: "amazon.titan-embed-text-v1",
                        dimensions: 1536,
                        isDefault: true,
                    },
                    {
                        "provider": "openai",
                        "name": "text-embedding-ada-002",
                        "dimensions": 1536
                    }
                ],
                crossEncoderModels: []
            },
            concurrency:  {
                restApiConcurrentLambdas: 2,
                modelInterfaceConcurrentLambdas: 2,
                websocketConcurrentLambdas: 2
            },
            vpc: {
                vpcId: "XXXXXXXX",
                appSubnets: [
                    "subnet1",
                ],
                appSecurityGroupId: 'sg-someappid123154',
                dataSubnets: [
                    "subnet2",
                ],
                dataSecurityGroupId: 'sg-somedataid1231354',
            },
            auth: {
                authType: SupportedAuthTypes.ACTIVE_DIRECTORY,
                cognitoDomain: 'some-unique-pool-domain-name',
                idpSamlMetadataUrlOrFileParamPath: "/some/path",
                idpSamlEmailClaimParamPath: "/some/other/path",
                oAuthRedirectUrl: 'example.com'
            }
        },
        roleHelper: roleHelper,
        naming: testApp.naming,
    };

    new GAIAL3Construct( testApp.testStack, "teststack", constructProps );
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack );

    fs.writeFileSync( './test/test-template.json', ( JSON.stringify( template, undefined, 2 ) ))
} )
