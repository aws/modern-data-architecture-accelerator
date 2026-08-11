/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnNamespace } from 'aws-cdk-lib/aws-s3tables';
import { Construct } from 'constructs';

/**
 * Props for the MdaaNamespace construct.
 */
export interface MdaaNamespaceProps extends MdaaConstructProps {
  /** ARN of the parent Table Bucket. */
  readonly tableBucketArn: string;
  /** Namespace name (lowercase, digits, underscores, hyphens; max 255 chars). */
  readonly namespaceName: string;
}

/**
 * L2 construct wrapping AWS::S3Tables::Namespace.
 */
export class MdaaNamespace extends Construct {
  /** The namespace name as set on the resource. */
  public readonly namespaceName: string;

  constructor(scope: Construct, id: string, props: MdaaNamespaceProps) {
    super(scope, id);

    const cfnNamespace = new CfnNamespace(this, 'Resource', {
      tableBucketArn: props.tableBucketArn,
      namespace: props.namespaceName,
    });

    // Retain the namespace on stack deletion, for consistency with the RETAIN policy on the parent
    // table bucket and the tables it groups. A namespace is a logical grouping, but deleting it
    // removes the tables within it, so retaining it aligns with the module's data-protection posture.
    cfnNamespace.applyRemovalPolicy(RemovalPolicy.RETAIN);

    this.namespaceName = props.namespaceName;
  }
}
