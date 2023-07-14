/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { PortfolioPropsWithAccess, ServiceCatalogL3Construct, ServiceCatalogL3ConstructProps } from "../lib";


describe( 'CAEF Compliance Stack Tests', () => {
    const testApp = new CaefTestApp()

    const portfolio: PortfolioPropsWithAccess = {
        displayName: "testing",
        providerName: "testProvider",
        access: [ { refId: "testingRef", arn: "testing" } ]
    }

    const constructProps: ServiceCatalogL3ConstructProps = {
        portfolios: [ portfolio ],
        naming: testApp.naming,

        roleHelper: new CaefRoleHelper( testApp.testStack, testApp.naming )
    }

    new ServiceCatalogL3Construct( testApp.testStack, 'test-stack', constructProps )
    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )
    //console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
    test( 'Portfolio', () => {
        template.hasResourceProperties( "AWS::ServiceCatalog::Portfolio", {
            "DisplayName": "testing",
            "ProviderName": "testProvider"
        } )
    } );

    test( 'Principal Association', () => {
        template.hasResourceProperties( "AWS::ServiceCatalog::PortfolioPrincipalAssociation", {
            "PortfolioId": {
                "Ref": "teststacktestingportfolio85BB8A72"
            },
            "PrincipalARN": "testing",
            "PrincipalType": "IAM"
        } )
    } );

} )
