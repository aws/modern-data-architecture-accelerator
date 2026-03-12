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
  /** Description of the managed policy explaining its purpose and permissions for documentation */
  readonly description?: string;
  /** IAM path for managed policy organization and management enabling hierarchical policy structure */
  readonly path?: string;
  /** Array of IAM users for policy attachment enabling individual user permissions to AWS services and resources */
  readonly users?: IUser[];
  /** Array of IAM roles for policy attachment enabling service permissions and cross-service */
  readonly roles?: IRole[];
  /** Array of IAM groups for policy attachment enabling group-based permissions management and */
  readonly groups?: IGroup[];
  readonly statements?: PolicyStatement[];
  readonly document?: PolicyDocument;
  /** Flag for verbatim policy naming bypassing naming module for cross-account portability and SSO integration */
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
