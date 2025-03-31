/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import {
  Domain,
  EngineVersion,
  TLSSecurityPolicy,
  ZoneAwarenessConfig,
  CapacityConfig,
  EbsOptions,
  CustomEndpointOptions,
  DomainProps,
} from 'aws-cdk-lib/aws-opensearchservice';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';

/**
 * Properties for creating a compliant Opensearch Domain
 */
export interface MdaaOpensearchDomainProps extends MdaaConstructProps {
  /** Data Admin role. For Opensearch Dashboard Master User */
  readonly masterUserRoleArn: string;

  /** Opensearch Engine version to be deployed. */
  readonly version: EngineVersion;

  /** The functional name of Opensearch domain. */
  readonly opensearchDomainName: string;

  /** Enable automatic version upgrade. */
  readonly enableVersionUpgrade: boolean;

  /**
   * The KMS key to use for encryption of data at rest.
   *
   * @default - AWS-managed key, if encryption at rest is enabled
   */
  readonly encryptionKey: IMdaaKmsKey;

  /** The VPC to place the cluster in. */
  readonly vpc: IVpc;

  /** Where to place the instances within the VPC */
  readonly vpcSubnets: SubnetSelection[];

  /** Security groups. */
  readonly securityGroups: ISecurityGroup[];

  /** Zone Awareness Configuration */
  readonly zoneAwareness?: ZoneAwarenessConfig;

  /** Opensearch Domain capacity configuration */
  readonly capacity: CapacityConfig;

  /** EBS Storage configuration */
  readonly ebs: EbsOptions;

  /** Custom endpoint FQDN */
  readonly customEndpoint?: CustomEndpointOptions;

  /** Automated snapshot start hour */
  readonly automatedSnapshotStartHour: number;

  /** Domain Access Policies */
  readonly accessPolicies?: PolicyStatement[];

  /** Cloudwatch log group */
  readonly logGroup: MdaaLogGroup;
}

/**
 * A construct for the creation of a compliant Opensearch Domain
 * Specifically, the construct ensures the following:
 * * The domain is encrypted at rest using KMS CMK.
 * * SSL must be utilized to connect to the domain.
 * * The domain is VPC connected and not publicly accessible.
 */
export class MdaaOpensearchDomain extends Domain {
  private static setProps(props: MdaaOpensearchDomainProps): DomainProps {
    const overrideProps = {
      domainName: props.naming.resourceName(props.opensearchDomainName, 28),
      useUnsignedBasicAuth: false,
      tlsSecurityPolicy: TLSSecurityPolicy.TLS_1_2,
      removalPolicy: RemovalPolicy.RETAIN,
      enforceHttps: true,
      nodeToNodeEncryption: true,
      logging: {
        appLogEnabled: true,
        appLogGroup: props.logGroup,
        auditLogEnabled: true,
        auditLogGroup: props.logGroup,
        slowSearchLogEnabled: true,
        slowSearchLogGroup: props.logGroup,
        slowIndexLogEnabled: true,
        slowIndexLogGroup: props.logGroup,
      },
      encryptionAtRest: {
        enabled: true,
        kmsKey: props.encryptionKey,
      },
      fineGrainedAccessControl: {
        masterUserArn: props.masterUserRoleArn,
      },
    };
    const allProps = { ...props, ...overrideProps };

    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaOpensearchDomainProps) {
    super(scope, id, MdaaOpensearchDomain.setProps(props));

    this.node.children.forEach(child => {
      if (child.node.id.includes('ESLogGroupPolicy')) {
        child.node.children.forEach(child2 => {
          if (child2.node.id.includes('CustomResourcePolicy')) {
            MdaaNagSuppressions.addCodeResourceSuppressions(child2, [
              {
                id: 'AwsSolutions-IAM5',
                reason:
                  'Role is for Custom Resource Provider. https://docs.aws.amazon.com/opensearch-service/latest/developerguide/encryption-at-rest.html',
              },
              {
                id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'HIPAA.Security-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'PCI.DSS.321-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
            ]);
          }
        });
      }

      if (child.node.id.startsWith('Resource')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(child, [
          {
            id: 'AwsSolutions-OS3',
            reason:
              'The Opensearch domain is deployed within VPC. IP based access policies cannot be applied to domains that reside within VPC because security groups already enforce IP-based access policy. https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html#vpc-security',
          },
          {
            id: 'AwsSolutions-OS5',
            reason:
              'CDK Construct applies Domain Access Policy immedietely after the domain is created. Zero Trust is still applied, not as part of domain properties in CDK generated cloudformation template, but immediately after domain deployment via custom resource',
          },
        ]);
      }

      if (child.node.id.startsWith('AccessPolicy')) {
        child.node.children.forEach(child2 => {
          if (child2.node.id.includes('CustomResourcePolicy')) {
            MdaaNagSuppressions.addCodeResourceSuppressions(child2, [
              {
                id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'HIPAA.Security-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
              {
                id: 'PCI.DSS.321-IAMNoInlinePolicy',
                reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
              },
            ]);
          }
        });
      }
    });

    this.stack.node.children.forEach(child => {
      if (child.node.id.startsWith('AWS')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(child, [
          { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
          {
            id: 'NIST.800.53.R5-LambdaDLQ',
            reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
          },
          {
            id: 'NIST.800.53.R5-LambdaInsideVPC',
            reason: 'Function is for custom resource and will interact only with IAM.',
          },
          {
            id: 'NIST.800.53.R5-LambdaConcurrency',
            reason:
              'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
          },
          {
            id: 'HIPAA.Security-LambdaDLQ',
            reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
          },
          {
            id: 'PCI.DSS.321-LambdaDLQ',
            reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
          },
          {
            id: 'HIPAA.Security-LambdaInsideVPC',
            reason: 'Function is for custom resource and will interact only with IAM.',
          },
          {
            id: 'PCI.DSS.321-LambdaInsideVPC',
            reason: 'Function is for custom resource and will interact only with IAM.',
          },
          {
            id: 'HIPAA.Security-LambdaConcurrency',
            reason:
              'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
          },
          {
            id: 'PCI.DSS.321-LambdaConcurrency',
            reason:
              'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
          },
        ]);
        child.node.children.forEach(child2 => {
          if (child2.node.id.includes('ServiceRole')) {
            MdaaNagSuppressions.addCodeResourceSuppressions(child2, [
              {
                id: 'AwsSolutions-IAM4',
                reason:
                  'Role is for Custom Resource Provider Lambda Function. AWS Managed policy AWSLambdaBasicExecutionRole provides least privilege permissions.',
              },
            ]);
          }
          child2.node.children.forEach(child3 => {
            if (child3.node.id.includes('DefaultPolicy')) {
              MdaaNagSuppressions.addCodeResourceSuppressions(child3, [
                {
                  id: 'AwsSolutions-IAM5',
                  reason: 'Role is for Custom Resource Provider Lambda Function. KMS policy added is least privilege.',
                },
                {
                  id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                  reason:
                    'Role is for Custom Resource Provider Lambda Function executed only at the time of infra deployment. Least privilege KMS policies automatically added.',
                },
                {
                  id: 'HIPAA.Security-IAMNoInlinePolicy',
                  reason:
                    'Role is for Custom Resource Provider Lambda Function executed only at the time of infra deployment. Least privilege KMS policies automatically added.',
                },
                {
                  id: 'PCI.DSS.321-IAMNoInlinePolicy',
                  reason:
                    'Role is for Custom Resource Provider Lambda Function executed only at the time of infra deployment. Least privilege KMS policies automatically added.',
                },
              ]);
            }
          });
        });
      }
    });
  }
}
