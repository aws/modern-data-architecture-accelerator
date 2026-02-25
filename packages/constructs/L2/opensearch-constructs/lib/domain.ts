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
  SAMLOptionsProperty,
} from 'aws-cdk-lib/aws-opensearchservice';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';

export interface MdaaOpensearchDomainProps extends MdaaConstructProps {
  readonly masterUserRoleArn: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required OpenSearch engine version for the domain deployment controlling available features and compatibility. Determines the OpenSearch/Elasticsearch version and affects feature availability, performance characteristics, and upgrade paths.
   *
   * Use cases: Feature compatibility; Performance optimization; Upgrade path planning
   *
   * AWS: Amazon OpenSearch domain engine version for feature and compatibility control
   *
   * Validation: Must be valid EngineVersion; required; determines available features and capabilities
   **/
  readonly version: EngineVersion;

  /**
   * Q-ENHANCED-PROPERTY
   * Required functional name for the OpenSearch domain that will be processed through MDAA naming conventions. Provides predictable domain naming for cross-service integration and operational management.
   *
   * Use cases: Predictable domain naming; Cross-service integration; Operational management
   *
   * AWS: Amazon OpenSearch domain name for resource identification and endpoint access
   *
   * Validation: Must be valid OpenSearch domain name; required; processed through MDAA naming conventions
   **/
  readonly opensearchDomainName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required flag enabling automatic version upgrades for security patches and feature updates. Controls whether the domain automatically receives minor version updates and security patches for improved security posture.
   *
   * Use cases: Security patch automation; Version maintenance; Automated updates
   *
   * AWS: Amazon OpenSearch domain automatic version upgrade configuration
   *
   * Validation: Boolean value; required; enables automatic minor version updates when true
   **/
  readonly enableVersionUpgrade: boolean;

  readonly encryptionKey: IMdaaKmsKey;

  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for OpenSearch domain deployment providing network isolation and security controls. Ensures domain is not publicly accessible and enables secure integration with other VPC resources for security architecture.
   *
   * Use cases: Network isolation; Secure domain access; VPC resource integration
   *
   * AWS: Amazon VPC for OpenSearch domain network isolation and security controls
   *
   * Validation: Must be valid IVpc instance; required; provides network security and isolation
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;

  readonly vpcSubnets: SubnetSelection[];

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of security groups for domain network access control defining inbound and outbound traffic rules. Provides network-level security controls for OpenSearch domain access and integration with other services.
   *
   * Use cases: Network access control; Traffic filtering; Service integration security
   *
   * AWS: Amazon VPC security groups for OpenSearch domain network access control
   *
   * Validation: Must be array of valid ISecurityGroup instances; required; defines network access rules
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
  readonly securityGroups: ISecurityGroup[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional zone awareness configuration for multi-availability zone deployment improving fault tolerance and availability. Enables distribution of domain nodes across multiple AZs for enhanced resilience and disaster recovery capabilities.
   *
   * Use cases: High availability; Fault tolerance; Disaster recovery
   *
   * AWS: Amazon OpenSearch domain zone awareness for multi-AZ deployment and resilience
   *
   * Validation: Must be valid ZoneAwarenessConfig if provided; enables multi-AZ deployment when specified
   **/
  readonly zoneAwareness?: ZoneAwarenessConfig;

  /**
   * Q-ENHANCED-PROPERTY
   * Required capacity configuration defining cluster size, instance types, and scaling characteristics. Controls compute resources, performance capabilities, and cost characteristics of the OpenSearch domain deployment.
   *
   * Use cases: Performance optimization; Cost management; Scaling configuration
   *
   * AWS: Amazon OpenSearch domain capacity configuration for compute resources and performance
   *
   * Validation: Must be valid CapacityConfig; required; defines cluster compute resources and scaling
   **/
  readonly capacity: CapacityConfig;

  /**
   * Q-ENHANCED-PROPERTY
   * Required EBS storage configuration defining volume types, sizes, and performance characteristics. Controls storage capacity, performance, and cost for OpenSearch domain data storage requirements.
   *
   * Use cases: Storage optimization; Performance tuning; Cost management
   *
   * AWS: Amazon EBS storage configuration for OpenSearch domain data storage
   *
   * Validation: Must be valid EbsOptions; required; defines storage capacity and performance characteristics
   *   **/
  readonly ebs: EbsOptions;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom endpoint configuration for domain access using organization-specific FQDNs. Enables branded domain access and integration with existing DNS infrastructure for improved user experience and security.
   *
   * Use cases: Branded domain access; DNS integration; Custom endpoint management
   *
   * AWS: Amazon OpenSearch domain custom endpoint for branded access and DNS integration
   *
   * Validation: Must be valid CustomEndpointOptions if provided; requires valid FQDN and certificate
   *   **/
  readonly customEndpoint?: CustomEndpointOptions;

  /**
   * Q-ENHANCED-PROPERTY
   * Required hour (0-23) for automated snapshot start time ensuring regular backup operations. Controls when daily automated snapshots are taken for data protection and recovery capabilities with minimal performance impact.
   *
   * Use cases: Data backup automation; Recovery point management; Performance impact control
   *
   * AWS: Amazon OpenSearch domain automated snapshot configuration for data protection
   *
   * Validation: Must be integer between 0 and 23; required; defines daily snapshot timing
   **/
  readonly automatedSnapshotStartHour: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM policy statements for domain access control beyond VPC security. Enables fine-grained access control through IAM policies for specific users, roles, and operations on the OpenSearch domain.
   *
   * Use cases: Fine-grained access control; IAM-based permissions; Operation-specific access
   *
   * AWS: Amazon OpenSearch domain access policies for IAM-based access control
   *
   * Validation: Must be array of valid PolicyStatement objects if provided; defines IAM access rules
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.PolicyStatement.html
   **/
  readonly accessPolicies?: PolicyStatement[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional SAML authentication configuration for SSO integration enabling centralized identity management. When specified, configures SAML-based authentication for OpenSearch Dashboard access through corporate identity providers.
   *
   * Use cases: Single Sign-On; Centralized user management; Corporate identity integration; SAML 2.0 authentication
   *
   * AWS: Amazon OpenSearch domain SAML authentication for SSO integration and centralized identity management
   *
   * Validation: Must be valid SAMLOptionsProperty if specified; requires idpEntityId and idpMetadataContent
   **/
  readonly samlOptions?: SAMLOptionsProperty;

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
    const fineGrainedAccessControl = props.samlOptions
      ? {
          masterUserArn: props.masterUserRoleArn,
          samlAuthenticationEnabled: true,
          samlAuthenticationOptions: props.samlOptions,
        }
      : {
          masterUserArn: props.masterUserRoleArn,
        };
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
      fineGrainedAccessControl: fineGrainedAccessControl,
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
