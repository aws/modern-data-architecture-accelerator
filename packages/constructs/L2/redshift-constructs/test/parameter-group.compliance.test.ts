/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefTestApp } from "@aws-caef/testing";
import { Template } from "aws-cdk-lib/assertions";
import { Match } from "aws-cdk-lib/assertions";
import { CaefRedshiftClusterParameterGroup, CaefRedshiftClusterParameterGroupProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const testApp = new CaefTestApp()


    const testContstructProps: CaefRedshiftClusterParameterGroupProps = {
        naming: testApp.naming,
        description: "test-param-group",
        parameters: {

        }
    }

    new CaefRedshiftClusterParameterGroup( testApp.testStack, "test-construct", testContstructProps )

    testApp.checkCdkNagCompliance( testApp.testStack )
    const template = Template.fromStack( testApp.testStack )

    test( 'Description', () => {
        template.hasResourceProperties( "AWS::Redshift::ClusterParameterGroup", {
            "Description": testApp.naming.resourceName( "test-param-group" )
        } )
    } )

    test( 'require_SSL', () => {
        template.hasResourceProperties( "AWS::Redshift::ClusterParameterGroup", {
            "Parameters": Match.arrayWith( [
                {
                    "ParameterName": "require_SSL",
                    "ParameterValue": "true"
                }
            ] )
        } )
    } )

    test( 'use_fips_ssl', () => {
        template.hasResourceProperties( "AWS::Redshift::ClusterParameterGroup", {
            "Parameters": Match.arrayWith( [
                {
                    "ParameterName": "use_fips_ssl",
                    "ParameterValue": "true"
                }
            ] )
        } )
    } )

    test( 'enable_user_activity_logging', () => {
        template.hasResourceProperties( "AWS::Redshift::ClusterParameterGroup", {
            "Parameters": Match.arrayWith( [
                {
                    "ParameterName": "enable_user_activity_logging",
                    "ParameterValue": "true"
                }
            ] )
        } )
    } )
} )
