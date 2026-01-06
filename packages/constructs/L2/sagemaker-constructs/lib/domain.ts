/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnDomain, CfnDomainProps } from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';

// nosemgrep
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _ = require('lodash');

export interface MdaaStudioDomainProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required primary security group ID for all Studio app network interfaces providing baseline network access control. Defines the primary network security rules for all SageMaker Studio applications and notebooks within the VPC environment.
   *
   * Use cases: Primary network security; Studio app access control; VPC network isolation
   *
   * AWS: Amazon SageMaker Studio domain security group for network access control
   *
   * Validation: Must be valid security group ID; required; applied to all Studio app interfaces
   **/
  readonly securityGroupId: string;
  readonly securityGroupIds?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required authentication mode controlling how users access the SageMaker Studio domain. Determines whether users authenticate through AWS SSO or IAM for centralized identity management and access control.
   *
   * Use cases: User authentication control; Identity management integration; Access method specification
   *
   * AWS: Amazon SageMaker Studio domain authentication mode for user access control
   *
   * Validation: Must be 'SSO' or 'IAM'; required; determines user authentication method
   **/
  readonly authMode: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required default user settings configuration defining permissions, execution roles, and environment settings for all domain users. Provides baseline configuration for user workspaces including compute resources, security settings, and access permissions.
   *
   * Use cases: User workspace configuration; Default permissions; Environment standardization
   *
   * AWS: Amazon SageMaker Studio domain default user settings for workspace configuration
   *
   * Validation: Must be valid CfnDomain.UserSettingsProperty; required; defines default user environment
   *   **/
  readonly defaultUserSettings: CfnDomain.UserSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional name for the SageMaker Studio domain that will be processed through MDAA naming conventions. If not specified, a name will be generated automatically following organizational naming standards.
   *
   * Use cases: Predictable domain naming; Cross-service integration; Operational management
   *
   * AWS: Amazon SageMaker Studio domain name for resource identification and management
   *
   * Validation: Must be valid SageMaker domain name if provided; processed through MDAA naming conventions
   **/
  readonly domainName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of VPC subnet IDs for Studio communication and resource placement. Defines the network subnets where SageMaker Studio applications and notebooks will be deployed for secure VPC connectivity.
   *
   * Use cases: VPC network placement; Subnet-specific deployment; Network isolation control
   *
   * AWS: Amazon SageMaker Studio domain subnet configuration for VPC resource placement
   *
   * Validation: Must be array of 1-16 valid subnet IDs; required; subnets must exist in specified VPC
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for SageMaker Studio domain deployment providing network isolation and security controls. Ensures Studio domain operates within the specified VPC for secure networking and integration with other VPC resources.
   *
   * Use cases: VPC network isolation; Secure networking; VPC resource integration
   *
   * AWS: Amazon VPC for SageMaker Studio domain network isolation and security
   *
   * Validation: Must be valid VPC ID; required; VPC must exist and be accessible
   **/
  readonly vpcId: string;
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
export class MdaaStudioDomain extends CfnDomain {
  private static defaultUserSettings = {
    jupyterServerAppSettings: {
      defaultResourceSpec: {
        instanceType: 'system',
      },
      lifecycleConfigArns: [],
    },
    jupyterLabAppSettings: {
      // Note: JupyterLab does not support 'system' instance type
      // defaultResourceSpec is optional for JupyterLab
      lifecycleConfigArns: [],
    },
    kernelGatewayAppSettings: {
      defaultResourceSpec: {
        instanceType: 'system',
      },
      lifecycleConfigArns: [],
    },
  };

  private static setProps(props: MdaaStudioDomainProps): CfnDomainProps {
    const overrideProps = {
      domainName: props.naming.resourceName(props.domainName),
      appNetworkAccessType: 'VpcOnly',
      //default user settings from props will be set by custom resource
      //because the CFN resource does not support all required parameters
      defaultUserSettings: {
        executionRole: props.defaultUserSettings.executionRole,
        securityGroups: [props.securityGroupId, ...(props.securityGroupIds || [])],
      },
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaStudioDomainProps) {
    super(scope, id, MdaaStudioDomain.setProps(props));

    function mergeCustomizer(objValue: unknown[], srcValue: unknown): void | unknown[] {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }

    //Merge user setting default values with user settings from props, and override with specific compliance-related values
    const overrideDefaultUserSettings = _.mergeWith(
      _.mergeWith(
        MdaaCustomResource.pascalCase(MdaaStudioDomain.defaultUserSettings),
        MdaaCustomResource.pascalCase(props.defaultUserSettings),
        mergeCustomizer,
      ),
      {
        securityGroups: [props.securityGroupId, ...(props.securityGroupIds || [])],
      },
      mergeCustomizer,
    );

    const updateDomainStatements = [
      new PolicyStatement({
        resources: [this.attrDomainArn],
        actions: ['sagemaker:UpdateDomain', 'sagemaker:DescribeDomain'],
      }),
      new PolicyStatement({
        resources: [props.defaultUserSettings.executionRole],
        actions: ['iam:PassRole'],
      }),
      new PolicyStatement({
        resources: ['*'],
        actions: ['elasticfilesystem:CreateFileSystem'],
        conditions: { Bool: { 'elasticfilesystem:Encrypted': 'true' } },
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'StudioDomainUpdate',
      code: Code.fromAsset(`${__dirname}/../src/lambda/update_domain`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'update_domain.lambda_handler',
      handlerRolePolicyStatements: updateDomainStatements,
      handlerProps: {
        DomainId: this.attrDomainId,
        DefaultUserSettings: overrideDefaultUserSettings,
        DomainSettingsForUpdate: {
          ExecutionRoleIdentityConfig: 'USER_PROFILE_NAME',
        },
      },
      naming: props.naming,
      pascalCaseProperties: true,
      handlerLayers: [new MdaaBoto3LayerVersion(this, 'boto3-layer', { naming: props.naming })],
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    new MdaaCustomResource(this, 'update-domain-cr', crProps);

    // Suppress CDK Nag warnings for EFS CreateFileSystem permission requiring wildcard resource
    // The EFS CreateFileSystem action requires wildcard resource as the file system ARN is not known before creation
    // The permission is scoped with a condition requiring encryption for security
    // Find and suppress the handler policy created by MdaaCustomResource at the stack level
    const stack = Stack.of(this);
    const handlerPolicy = stack.node.tryFindChild('custom-StudioDomainUpdate-handler-policy');
    if (handlerPolicy) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        handlerPolicy,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'EFS CreateFileSystem action requires wildcard resource as file system ARN is not known before creation. Permission is scoped with condition requiring encryption.',
            appliesTo: ['Resource::*'],
          },
        ],
        true,
      );
    }

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'domain',
          name: 'id',
          value: this.ref,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'domain',
          name: 'vpc-id',
          value: props.vpcId,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'domain',
          name: 'subnet-ids',
          value: props.subnetIds.join(','),
        },
        ...props,
      },
      scope,
    );
  }
}
