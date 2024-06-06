/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataZoneL3Construct, DataZoneL3ConstructProps } from "../lib/datazone-l3-construct";
import { MdaaRoleHelper } from "@aws-mdaa/iam-role-helper";

describe( 'MDAA Compliance Stack Tests', () => {
    const testApp = new MdaaTestApp()
    const stack = testApp.testStack

    const constructProps: DataZoneL3ConstructProps = {
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        domains: {
            "test-domain": {
                description: "Description of DZ Test Domain",
                singleSignOnType: "DISABLED",
                userAssignment: "MANUAL",
                environmentBlueprints: {
                    dataLake: {
                        enabledRegions: ["ca-central-1"]
                    },
                    dataWarehouse: {
                        enabledRegions: ["ca-central-1"]
                    }

                }
            }
        }
    }

    new DataZoneL3Construct(stack, "teststack", constructProps)
    testApp.checkCdkNagCompliance( testApp.testStack )

    const template = Template.fromStack(testApp.testStack)

    console.log(JSON.stringify(template.toJSON(), null, '\t'));

    test ('Validate if Domain is created', () => {
        template.resourceCountIs("AWS::DataZone::Domain", 1)
    })

    test ('Validate if the DefaultDataLake Blueprint environment is enabled', () => {
        template.hasResourceProperties(
            "AWS::DataZone::EnvironmentBlueprintConfiguration",
            Match.objectEquals({
                "DomainIdentifier": {
                        "Fn::GetAtt": [
                                "testdomaindomain",
                                "Id"
                        ]
                },
                "EnabledRegions": [
                        "ca-central-1"
                ],
                "EnvironmentBlueprintIdentifier": "DefaultDataLake",
                "ManageAccessRoleArn": {
                        "Fn::GetAtt": [
                                "testdomaindatalakemanageroleBA199AAB",
                                "Arn"
                        ]
                },
                "ProvisioningRoleArn": {
                        "Fn::GetAtt": [
                                "testdomainprovisioningrole650A9E99",
                                "Arn"
                        ]
                }
            })
        )
    })

    test ('Validate if the DefaultDataWarehouse Blueprint environment is enabled', () => {
        template.hasResourceProperties(
            "AWS::DataZone::EnvironmentBlueprintConfiguration",
            Match.objectEquals({
                    "DomainIdentifier": {
                            "Fn::GetAtt": [
                                    "testdomaindomain",
                                    "Id"
                            ]
                    },
                    "EnabledRegions": [
                            "ca-central-1"
                    ],
                    "EnvironmentBlueprintIdentifier": "DefaultDataWarehouse",
                    "ManageAccessRoleArn": {
                            "Fn::GetAtt": [
                                    "testdomaindatawarehousemanagerole92592C34",
                                    "Arn"
                            ]
                    },
                    "ProvisioningRoleArn": {
                            "Fn::GetAtt": [
                                    "testdomainprovisioningrole650A9E99",
                                    "Arn"
                            ]
                    }
            })
        )
    })

    test( 'Validate if KMS is created and used for the domain', () => {
        template.hasResourceProperties( "AWS::DataZone::Domain", {
            "KmsKeyIdentifier": {
                "Fn::GetAtt": [ "testdomaincmkBD41EC2D", "Arn" ]
            },
        } )
    } );
} )
