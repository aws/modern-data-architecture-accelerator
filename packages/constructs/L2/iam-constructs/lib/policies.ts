/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Arn, Stack } from 'aws-cdk-lib';
import {
  IGroup,
  IManagedPolicy,
  IRole,
  IUser,
  ManagedPolicy,
  ManagedPolicyProps,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface MdaaManagedPolicyProps extends MdaaConstructProps {
  readonly managedPolicyName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the managed policy explaining its purpose and permissions for documentation and management clarity. Provides human-readable description of the policy's purpose and the permissions it grants for operational understanding and compliance documentation.
   *
   * Use cases: Policy documentation; Management clarity; Compliance documentation; Operational understanding
   *
   * AWS: AWS IAM managed policy description for documentation and management
   *
   * Validation: Must be descriptive text if provided; immutable after creation; recommended for policy documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM path for managed policy organization and management enabling hierarchical policy structure. Specifies the IAM path for the managed policy providing organizational structure and access control grouping for policy management.
   *
   * Use cases: Policy organization; Hierarchical structure; Access control grouping; IAM management
   *
   * AWS: AWS IAM policy path for managed policy organization and management
   *
   * Validation: Must be valid IAM path string if provided; defaults to root path '/' for policy organization
   **/
  readonly path?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM users for policy attachment enabling individual user permissions to AWS services and resources. Defines IAM users that will receive the policy permissions enabling direct user access to data lake resources, analytics tools, and data processing capabilities.
   *
   * Use cases: Individual user access; Data analyst permissions; Developer access; Direct user authorization
   *
   * AWS: AWS IAM policy attachment to users for individual access permissions and resource authorization
   *
   * Validation: Must be valid IUser array if provided; enables individual user access when specified
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IUser.html
   **/
  readonly users?: IUser[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM roles for policy attachment enabling service permissions and cross-service access in data analytics environments. Defines IAM roles that will receive the policy permissions enabling secure access to data lake resources, analytics services, and cross-service integrations.
   *
   * Use cases: Service permissions; Cross-service access; Data lake security; Analytics authorization; Resource access control
   *
   * AWS: AWS IAM policy attachment to roles for service and resource access permissions
   *
   * Validation: Must be valid IRole array if provided; enables service access when specified
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IRole.html
   **/
  readonly roles?: IRole[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM groups for policy attachment enabling group-based permissions management and organizational access control. Defines IAM groups that will receive the policy permissions enabling organized access to data analytics resources and services.
   *
   * Use cases: Group-based permissions; Organizational access; Team permissions; Structured access control
   *
   * AWS: AWS IAM policy attachment to groups for group-based access permissions
   *
   * Validation: Must be valid IGroup array if provided; enables group-based access when specified
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IGroup.html
   **/
  readonly groups?: IGroup[];
  readonly statements?: PolicyStatement[];
  readonly document?: PolicyDocument;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag for verbatim policy naming bypassing naming module for cross-account portability and SSO integration. Enables direct policy name specification for scenarios requiring portable policy names across accounts such as SSO permission set integration.
   *
   * Use cases: Cross-account portability; SSO integration; Portable naming; Direct name specification
   *
   * AWS: AWS IAM policy naming for cross-account portability and SSO integration
   *
   * Validation: Must be boolean if provided; enables verbatim naming when true for cross-account scenarios
   **/
  readonly verbatimPolicyName?: boolean;
}

/**
 * Interface representing a compliant ManagedPolicy
 */
export type IMdaaManagedPolicy = IManagedPolicy;

/**
 * Construct for creating compliant IAM ManagedPolicys
 */
export class MdaaManagedPolicy extends ManagedPolicy {
  private static setProps(props: MdaaManagedPolicyProps): ManagedPolicyProps {
    const overrideProps = {
      managedPolicyName: props.verbatimPolicyName
        ? props.managedPolicyName
        : props.naming.resourceName(props.managedPolicyName, 64),
    };
    return { ...props, ...overrideProps };
  }
  private props: MdaaManagedPolicyProps;
  constructor(scope: Construct, id: string, props: MdaaManagedPolicyProps) {
    super(scope, id, MdaaManagedPolicy.setProps(props));
    this.props = props;
    this.checkPolicyLength();
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'managed-policy',
          resourceId: props.managedPolicyName,
          name: 'arn',
          value: this.managedPolicyArn,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'managed-policy',
          resourceId: props.managedPolicyName,
          name: 'name',
          value: this.managedPolicyName,
        },
        ...props,
      },
      scope,
    );
  }

  public addStatements(...statement: PolicyStatement[]): void {
    super.addStatements(...statement);
    this.checkPolicyLength();
  }

  public checkPolicyLength(alwaysLog = false) {
    const policyDocLength = this.computePolicyLength();
    if (policyDocLength > 5500 || alwaysLog) {
      console.warn(
        `${this.props.managedPolicyName} policy length ~${policyDocLength} chars of maximum 6144. Note that the character length may increase after processing by CFN.`,
      );
    }
  }

  public computePolicyLength(): number {
    const policyDoc = this.document.toJSON();
    if (policyDoc) {
      const policyDocLength = JSON.stringify(policyDoc).replace(/\s*/i, '').replace(/\n*/i, '').length;
      return policyDocLength;
    }
    return 0;
  }
  /**
   * Re-implemented from cdk ManagedPolicy.fromAwsManagedPolicyName
   * in order to allow partition name literals
   */
  public static fromAwsManagedPolicyNameWithPartition(scope: Construct, managedPolicyName: string): IManagedPolicy {
    const constructId = managedPolicyName.replace(/[/-]/g, '--');

    const existing = scope.node.tryFindChild(constructId);
    if (existing) {
      return existing as IManagedPolicy;
    }

    const arn = Arn.format({
      partition: Stack.of(scope).partition,
      service: 'iam',
      region: '', // no region for managed policy
      account: 'aws', // the account for a managed policy is 'aws'
      resource: 'policy',
      resourceName: managedPolicyName,
    });

    return ManagedPolicy.fromManagedPolicyArn(scope, constructId, arn);
  }
}
