/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { CaefCfnCrawler, CaefCfnCrawlerProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()

    const testContstructProps: CaefCfnCrawlerProps = {
        naming: testApp.naming,
        crawlerSecurityConfiguration: "test-security-config",
        name: "test-crawler",
        role: "test-role",
        targets: {},
        createOutputs: false,
        createParams: false
    }

    new CaefCfnCrawler( testApp.testStack, "test-construct", testContstructProps )


    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'Name', () => {
        template.hasResourceProperties( "AWS::Glue::Crawler", {
            "Name": testApp.naming.resourceName( "test-crawler" )
        } )
    } )

    test( 'Role', () => {
        template.hasResourceProperties( "AWS::Glue::Crawler", {
            "Role": "test-role"
        } )
    } );

    test( 'CrawlerSecurityConfiguration', () => {
        template.hasResourceProperties( "AWS::Glue::Crawler", {
            "CrawlerSecurityConfiguration": "test-security-config"
        } )
    } );
} )