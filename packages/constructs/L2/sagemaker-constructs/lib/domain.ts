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
  /** Primary security group ID for all Studio app network interfaces providing baseline network access control */
  readonly securityGroupId: string;
  readonly securityGroupIds?: string[];
  /** Authentication mode controlling how users access the SageMaker Studio domain */
  readonly authMode: string;
  /** Default user settings configuration defining permissions, execution roles, and environment */
  readonly defaultUserSettings: CfnDomain.UserSettingsProperty;
  /** Name for the SageMaker Studio domain that will be processed through MDAA naming conventions */
  readonly domainName?: string;
  /** Array of VPC subnet IDs for Studio communication and resource placement */
  readonly subnetIds: string[];
  /** VPC ID for SageMaker Studio domain deployment providing network isolation and security controls */
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
    // Only pass immutable (create-only) properties to the CfnDomain resource.
    // All mutable settings (defaultUserSettings, domainSettings) are handled
    // by the custom resource via the SageMaker UpdateDomain API.
    // This prevents CloudFormation from triggering resource replacement when
    // mutable properties change, which would fail with "already exists" due
    // to the fixed DomainName.
    return {
      domainName: props.naming.resourceName(props.domainName, 63),
      authMode: props.authMode,
      appNetworkAccessType: 'VpcOnly',
      vpcId: props.vpcId,
      subnetIds: props.subnetIds,
      kmsKeyId: props.kmsKeyId,
      defaultUserSettings: {
        executionRole: props.defaultUserSettings.executionRole,
        securityGroups: [props.securityGroupId, ...(props.securityGroupIds || [])],
      },
    };
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
