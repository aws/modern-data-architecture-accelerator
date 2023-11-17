/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from "@aws-caef/construct"
import { CaefCustomResource, CaefCustomResourceProps } from "@aws-caef/custom-constructs"
import { CaefBoto3LayerVersion } from "@aws-caef/lambda-constructs"
import { Duration } from "aws-cdk-lib"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Code, Runtime } from "aws-cdk-lib/aws-lambda"
import { CfnDomain, CfnDomainProps } from "aws-cdk-lib/aws-sagemaker"
import { Construct } from "constructs"
// nosemgrep
const _ = require( 'lodash' );

/**
 * Properties for creating a Compliance SageMaker Studio Domain
 */
export interface CaefStudioDomainProps extends CaefConstructProps {
    /**
     * The security group id which will be configured on all interfaces for Studio Apps which are connected to the VPC 
     */
    readonly securityGroupId: string
    /**
     * Additional security group ids which may be configured on all interfaces for Studio Apps which are connected to the VPC 
     */
    readonly securityGroupIds?: string[]
    /**
     * The mode of authentication that members use to access the Domain.
     *
     * *Valid Values* : `SSO | IAM`
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-authmode
     */
    readonly authMode: string;
    /**
     * The default user settings.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-defaultusersettings
     */
    readonly defaultUserSettings: CfnDomain.UserSettingsProperty
    /**
     * The domain name.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-domainname
     */
    readonly domainName?: string;
    /**
     * The VPC subnets that Studio uses for communication.
     *
     * *Length Constraints* : Maximum length of 32.
     *
     * *Array members* : Minimum number of 1 item. Maximum number of 16 items.
     *
     * *Pattern* : `[-0-9a-zA-Z]+`
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-subnetids
     */
    readonly subnetIds: string[];
    /**
     * The ID of the Amazon Virtual Private Cloud (Amazon VPC) that Studio uses for communication.
     *
     * *Length Constraints* : Maximum length of 32.
     *
     * *Pattern* : `[-0-9a-zA-Z]+`
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-vpcid
     */
    readonly vpcId: string;
    /**
     * SageMaker uses AWS KMS to encrypt the EFS volume attached to the Domain with an AWS managed customer master key (CMK) by default. For more control, specify a customer managed CMK.
     *
     * *Length Constraints* : Maximum length of 2048.
     *
     * *Pattern* : `.*`
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-domain.html#cfn-sagemaker-domain-kmskeyid
     */
    readonly kmsKeyId: string;

}

/**
 * A construct for creating a compliant Studio Domain resource.
 * Specifically, the construct ensures that the Studio Domain
 * EFS volume is encrypted, that the Domain is VPC bound,
 * and that Domain App traffic is controlled via Security Groups.
 * Additionally, a custom resource is used to ensure that the domain
 * ExecutionRoleIdentityConfig is set to USER_PROFILE_NAME.
 */
export class CaefStudioDomain extends CfnDomain {

    private static defaultUserSettings = {
        jupyterServerAppSettings: {
            defaultResourceSpec: {
                instanceType: 'system'
            },
            lifecycleConfigArns: []
        },
        kernelGatewayAppSettings: {
            defaultResourceSpec: {
                instanceType: 'system'
            },
            lifecycleConfigArns: []
        }
    }

    private static setProps ( props: CaefStudioDomainProps ): CfnDomainProps {

        const overrideProps = {
            domainName: props.naming.resourceName( props.domainName ),
            appNetworkAccessType: "VpcOnly",
            //default user settings from props will be set by custom resource
            //because the CFN resource does not support all required parameters
            defaultUserSettings: {
                executionRole: props.defaultUserSettings.executionRole,
                securityGroups: [ props.securityGroupId, ...props.securityGroupIds || [] ]
            }
        }
        const allProps = { ...props, ...overrideProps }
        return allProps
    }
    constructor( scope: Construct, id: string, props: CaefStudioDomainProps ) {
        super( scope, id, CaefStudioDomain.setProps( props ) )

        function mergeCustomizer ( objValue: any, srcValue: any ): any {
            if ( _.isArray( objValue ) ) {
                return objValue.concat( srcValue );
            }
        }

        //Merge user setting default values with user settings from props, and override with specific compliance-related values
        const overrideDefaultUserSettings = _.mergeWith( _.mergeWith( CaefCustomResource.pascalCase( CaefStudioDomain.defaultUserSettings ), CaefCustomResource.pascalCase( props.defaultUserSettings ), mergeCustomizer ), {
            securityGroups: [ props.securityGroupId, ...props.securityGroupIds || [] ]
        }, mergeCustomizer )

        const updateDomainStatements = [ new PolicyStatement( {
            resources: [ this.attrDomainArn ],
            actions: [
                "sagemaker:UpdateDomain",
                "sagemaker:DescribeDomain"
            ],
        } ),
        new PolicyStatement( {
            resources: [ props.defaultUserSettings.executionRole ],
            actions: [
                "iam:PassRole"
            ],
        } ) ]

        const crProps: CaefCustomResourceProps = {
            resourceType: "StudioDomainUpdate",
            code: Code.fromAsset( `${ __dirname }/../src/lambda/update_domain` ),
            runtime: Runtime.PYTHON_3_11,
            handler: "update_domain.lambda_handler",
            handlerRolePolicyStatements: updateDomainStatements,
            handlerProps: {
                DomainId: this.attrDomainId,
                DefaultUserSettings: overrideDefaultUserSettings,
                DomainSettingsForUpdate: {
                    'ExecutionRoleIdentityConfig': 'USER_PROFILE_NAME'
                }
            },
            naming: props.naming,
            pascalCaseProperties: true,
            handlerLayers: [ new CaefBoto3LayerVersion( this, 'boto3-layer', { naming: props.naming } ) ],
            handlerTimeout: Duration.seconds( 120 )
        }

        new CaefCustomResource( this, 'update-domain-cr', crProps )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "domain",
                name: "id",
                value: this.ref
            }, ...props
        } )
        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "domain",
                name: "vpc-id",
                value: props.vpcId
            }, ...props
        } )
        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "domain",
                name: "subnet-ids",
                value: props.subnetIds.join( "," )
            }, ...props
        } )
    }



}

