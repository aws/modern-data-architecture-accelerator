/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import * as aoss from 'aws-cdk-lib/aws-opensearchserverless';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

type StandByReplicas = 'ENABLE' | 'DISABLE';
type CollectionType = 'SEARCH' | 'TIMESERIES' | 'VECTORSEARCH';

export interface MdaaOpensearchServerlessCollectionProps extends MdaaConstructProps {
  /** Functional Name of Opensearch Serverless Collection */
  readonly name: string;

  /** Indicates whether to use standby replicas for the collection.
   * Valid values: ENABLE | DISABLE.
   * Value can't be updated after collection is created.
   */
  readonly standByReplicas: StandByReplicas;

  /** The type of collection.
   * Possible values are SEARCH, TIMESERIES, and VECTORSEARCH.
   */
  readonly collectionType: CollectionType;
  /**
   * ARN of the KMS key to use for encryption of data at rest.
   */
  readonly encryptionKey: IMdaaKmsKey;

  /** The VPC to place the cluster in. */
  readonly vpc: IVpc;

  /** Where to place the instances within the VPC */
  readonly subnetIds: string[];

  /** Security groups to allow access to the collection. */
  readonly securityGroupIds: string[];

  /** Service principals to allow access to the collection.
   */
  readonly sourceServices: string[];

  /** IAM principals (role ARNs) to grant read only data access */
  readonly readOnlyArns?: string[];

  /** IAM principals (role ARNs) to grant read only data access */
  readonly readWriteArns?: string[];

  /** Domain Access Policies */
  readonly accessPolicies?: PolicyStatement[];
}

export class MdaaOpensearchServerlessCollection extends Construct {
  public readonly collection: aoss.CfnCollection;

  constructor(scope: Construct, id: string, props: MdaaOpensearchServerlessCollectionProps) {
    super(scope, id);
    // Opensearch Serverless collection names can be max 32 char long
    const collectionName = props.naming.resourceName(props.name, 32);

    // VPC Endpoint
    const vpcEndpoint = new aoss.CfnVpcEndpoint(this, 'opensearch-serverless-vpc-endpoint', {
      // Opensearch Serverless VPC interface endpoint names can be max 32 characters long.
      name: props.naming.resourceName(`${props.name}-endpoint`, 32),
      vpcId: props.vpc.vpcId,
      subnetIds: props.subnetIds,
      securityGroupIds: props.securityGroupIds,
    });

    // Encryption Policy
    const encryptionPolicy = new aoss.CfnSecurityPolicy(this, 'opensearch-serverless-encryption-policy', {
      name: props.naming.resourceName(`${props.name}-encryption-policy`, 32),
      type: 'encryption',
      description: 'Encryption policy for OpenSearch Serverless collection',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
          },
        ],
        AWSOwnedKey: false,
        KmsARN: props.encryptionKey.keyArn,
      }),
    });

    // Network Policy
    const networkPolicy = new aoss.CfnSecurityPolicy(this, 'opensearch-serverless-network-policy', {
      name: props.naming.resourceName(`${props.name}-network-policy`, 32),
      type: 'network',
      description: 'Network policy for OpenSearch Serverless collection',
      policy: JSON.stringify([
        {
          Rules: [
            { ResourceType: 'collection', Resource: [`collection/${collectionName}`] },
            { ResourceType: 'dashboard', Resource: [`collection/${collectionName}`] },
          ],
          AllowFromPublic: false,
          SourceVPCEs: [vpcEndpoint.attrId],
          SourceServices: props.sourceServices,
        },
      ]),
    });

    // Data Access Policy - grants permissions for API operations
    const policyRules = [];

    // Add readwrite policy if principals exist
    if (props.readWriteArns && props.readWriteArns.length > 0) {
      policyRules.push({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
            Permission: [
              'aoss:CreateCollectionItems',
              'aoss:DeleteCollectionItems',
              'aoss:UpdateCollectionItems',
              'aoss:DescribeCollectionItems',
            ],
          },
          {
            ResourceType: 'index',
            Resource: [`index/${collectionName}/*`],
            Permission: [
              'aoss:CreateIndex',
              'aoss:DeleteIndex',
              'aoss:UpdateIndex',
              'aoss:DescribeIndex',
              'aoss:ReadDocument',
              'aoss:WriteDocument',
            ],
          },
        ],
        Principal: props.readWriteArns,
      });
    }

    // Add readonly policy if principals exist
    if (props.readOnlyArns && props.readOnlyArns.length > 0) {
      policyRules.push({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
            Permission: ['aoss:DescribeCollectionItems'],
          },
          {
            ResourceType: 'index',
            Resource: [`index/${collectionName}/*`],
            Permission: ['aoss:DescribeIndex', 'aoss:ReadDocument'],
          },
        ],
        Principal: props.readOnlyArns,
      });
    }

    let dataAccessPolicy: aoss.CfnAccessPolicy | undefined;
    if (policyRules.length > 0) {
      dataAccessPolicy = new aoss.CfnAccessPolicy(this, 'opensearch-serverless-data-access-policy', {
        name: props.naming.resourceName(`${props.name}-data-access-policy`, 32),
        type: 'data',
        description: 'Data access policy for OpenSearch Serverless collection',
        policy: JSON.stringify(policyRules),
      });
    }

    // Collection
    this.collection = new aoss.CfnCollection(this, 'opensearch-serverless-collection', {
      name: collectionName,
      type: props.collectionType,
    });

    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);
    if (dataAccessPolicy) {
      this.collection.addDependency(dataAccessPolicy);
    }
  }
}
