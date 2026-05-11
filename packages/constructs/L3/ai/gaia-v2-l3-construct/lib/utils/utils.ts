import { MdaaL3Construct } from '@aws-mdaa/l3-construct';
import { AdminUiConstructProps } from '../admin-ui/admin-ui';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function as CfFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  HttpVersion,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  SSLMethod,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { Duration } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, IBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Aws, CfnOutput } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import * as path from 'node:path';
import { ClientUiConstructProps } from '../client-ui/client-ui';

/**
 * AWS Amplify configuration filename.
 * @see https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/
 */
const AMPLIFY_CONFIG_FILENAME = 'aws-exports.json';

/**
 * Configuration options for creating a generic UI infrastructure.
 */
export interface GenericUiConfig {
  readonly scope: MdaaL3Construct;
  readonly props: AdminUiConstructProps | ClientUiConstructProps;
  readonly bucketName: string;
  readonly logBucketName: string;
  readonly logFilePrefix: string;
  readonly interfaceDomainNameId: string;
  readonly websocketHttpDns?: string;
}

type UiProps = AdminUiConstructProps | ClientUiConstructProps;

/** Creates the S3 bucket for hosting the SPA static assets. */
function createWebsiteBucket(scope: MdaaL3Construct, props: UiProps, bucketName: string): MdaaBucket {
  return new MdaaBucket(scope, bucketName + '-bucket', {
    encryptionKey: props.encryptionKey,
    naming: props.naming,
    bucketName: bucketName,
    createParams: false,
    createOutputs: false,
  });
}

/** Creates the CloudFront logging bucket and grants KMS permissions for log delivery. */
function createLoggingBucket(scope: MdaaL3Construct, props: UiProps, logBucketName: string): Bucket {
  // Note: logBucketName should already be truncated to 63 chars via props.naming.resourceName(suffix, 63)
  // at the call site. We use raw Bucket instead of MdaaBucket because CloudFront standard logging (legacy)
  // requires ACLs enabled (ObjectOwnership.OBJECT_WRITER), which MdaaBucket doesn't support.
  // MdaaBucket uses the S3 default of BUCKET_OWNER_ENFORCED which disables ACLs.
  // @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html
  const logBucket = new Bucket(scope, 'LoggingBucket', {
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    bucketName: logBucketName,
    enforceSSL: true,
    versioned: true,
    objectOwnership: ObjectOwnership.OBJECT_WRITER,
    encryption: BucketEncryption.KMS,
    encryptionKey: props.encryptionKey,
  });

  // Grant CloudFront service permission to use KMS key for log encryption.
  // Note: 'resources: ["*"]' is required per AWS documentation for KMS key policies.
  // In KMS key policies, Resource: * is self-referential (refers to the key the policy
  // is attached to), not a wildcard across all KMS keys.
  // @see https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-overview.html
  props.encryptionKey.addToResourcePolicy(
    new PolicyStatement({
      sid: 'Allow CloudFront to use the key to deliver logs',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('delivery.logs.amazonaws.com')],
      actions: ['kms:GenerateDataKey*'],
      resources: ['*'],
    }),
  );

  return logBucket;
}

/** Creates the CloudFront Function for SPA routing (rewrites requests to index.html). */
function createSpaRoutingFunction(scope: MdaaL3Construct): CfFunction {
  return new CfFunction(scope, 'rewriteIndexHtmlCfFunction', {
    code: FunctionCode.fromFile({
      filePath: path.join(__dirname, '../function/rewrite-index-html.js'),
    }),
    runtime: FunctionRuntime.JS_2_0,
  });
}

interface DistributionConfig {
  scope: MdaaL3Construct;
  props: UiProps;
  websiteBucket: MdaaBucket;
  logBucket: Bucket;
  logFilePrefix: string;
  rewriteFunction: CfFunction;
  certificate?: ICertificate;
}

/** Creates the CloudFront distribution with S3 origin and optional API Gateway behavior. */
function createDistribution(config: DistributionConfig): Distribution {
  const { scope, props, websiteBucket, logBucket, logFilePrefix, rewriteFunction, certificate } = config;

  // Security response headers policy
  // Implements X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security
  // at the CDN layer. Cache-Control and Content-Security-Policy are intentionally omitted
  // as they must be tailored by the customer's frontend deployment.
  const securityHeadersPolicy = new ResponseHeadersPolicy(scope, 'SecurityHeadersPolicy', {
    securityHeadersBehavior: {
      frameOptions: {
        frameOption: HeadersFrameOption.DENY,
        override: true,
      },
      contentTypeOptions: {
        override: true,
      },
      strictTransportSecurity: {
        accessControlMaxAge: Duration.seconds(47304000),
        includeSubdomains: true,
        override: true,
      },
      referrerPolicy: {
        referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        override: true,
      },
    },
  });

  const distribution = new Distribution(scope, 'Distribution', {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessControl(websiteBucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy: securityHeadersPolicy,
      functionAssociations: [
        {
          function: rewriteFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ],
    },
    minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    defaultRootObject: 'index.html',
    priceClass: props.cloudFrontPriceClass ?? PriceClass.PRICE_CLASS_100,
    httpVersion: HttpVersion.HTTP2_AND_3,
    webAclId: props.webACLId ? props.webACLId : undefined,
    domainNames: props.domainName ? [props.domainName] : undefined,
    sslSupportMethod: SSLMethod.SNI,
    ...(certificate && { certificate }),
    logBucket: logBucket,
    logFilePrefix: logFilePrefix,
    logIncludesCookies: false,
  });

  // Add API Gateway behavior if REST API is configured
  if (props.restApiId) {
    // Use CloudFormation dynamic reference to resolve the secret at deploy time.
    // This keeps the secret value out of the synthesized CloudFormation template.
    // CloudFormation resolves the reference when creating/updating the stack.
    // @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html
    const xOriginVerifyHeaderValue = `{{resolve:secretsmanager:${props.xOriginVerifySecret.secretArn}:SecretString:headerValue}}`;

    distribution.addBehavior(
      '/api/*',
      new HttpOrigin(`${props.restApiId}.execute-api.${Aws.REGION}.${Aws.URL_SUFFIX}`, {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        customHeaders: {
          'X-Origin-Verify': xOriginVerifyHeaderValue,
        },
      }),
      {
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeadersPolicy,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    );
  }

  return distribution;
}

/** Generates and deploys the AWS Amplify configuration file to the website bucket. */
function deployAmplifyConfig(
  scope: MdaaL3Construct,
  props: UiProps,
  websiteBucket: IBucket,
  distribution: Distribution,
  websocketHttpDns?: string,
): void {
  const exportsAsset = Source.jsonData(AMPLIFY_CONFIG_FILENAME, {
    Auth: {
      ...(props.authProvider && { AuthProvider: props.authProvider }),
      Cognito: {
        userPoolId: props.userPool.userPoolId,
        userPoolClientId: props.userPoolClientId,
        loginWith: {
          oauth: {
            domain: `${props.userPoolDomain.domainName}.auth.${Aws.REGION}.amazoncognito.com`,
            scopes: ['aws.cognito.signin.user.admin', 'openid', 'profile', 'email'],
            redirectSignIn: [
              `https://${props?.domainName || distribution.distributionDomainName}`,
              ...(props.oAuthCallbackUrls ?? []),
            ],
            redirectSignOut: [
              `https://${props?.domainName || distribution.distributionDomainName}`,
              ...(props.oAuthLogoutUrls ?? []),
            ],
            responseType: 'code',
          },
        },
      },
    },
    ...(websocketHttpDns && {
      API: {
        Events: {
          endpoint: `https://${websocketHttpDns}/event`,
          region: Aws.REGION,
          defaultAuthMode: 'userPool',
        },
      },
    }),
  });

  new BucketDeployment(scope, 'UserInterfaceDeployment', {
    sources: [exportsAsset],
    destinationBucket: websiteBucket,
    distribution,
    prune: false,
  });
}

/** Configures Route53 DNS records for custom domain and outputs the domain URL. */
function configureCustomDomain(
  scope: MdaaL3Construct,
  props: UiProps,
  distribution: Distribution,
  interfaceDomainNameId: string,
): void {
  if (props?.hostedZoneId && props?.domainName) {
    const subDomainName = props.domainName.split('.')[0];
    const hostedZoneName = props.domainName.replace(`${subDomainName}.`, '');

    const hostedZone = HostedZone.fromHostedZoneAttributes(scope, 'hostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: hostedZoneName,
    });

    const dnsRecord = new ARecord(scope, 'ARecord', {
      zone: hostedZone,
      recordName: subDomainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new CfnOutput(scope, interfaceDomainNameId, {
      value: `https://${dnsRecord.domainName}`,
    });
  } else {
    new CfnOutput(scope, interfaceDomainNameId, {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}

/** Applies CDK Nag suppressions for security compliance. */
function applyNagSuppressions(
  props: UiProps,
  distribution: Distribution,
  logBucket: Bucket,
  websiteBucket: MdaaBucket,
): void {
  // Suppress SSL certificate warning for development environments
  if (!props.domainName || !props.acmCertArn) {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      distribution,
      [
        {
          id: 'AwsSolutions-CFR4',
          reason:
            'When no custom domain or ACM certificate is configured, CloudFront uses the default *.cloudfront.net certificate. ' +
            'The distribution still enforces TLS 1.2 minimum via SecurityPolicyProtocol.TLS_V1_2_2021 set on the viewer ' +
            'certificate, so in-transit encryption is not weakened. Custom domain with ACM certificate is recommended for ' +
            'production deployments; configure via the domainName and acmCertArn properties on AdminUiProps / ClientUiProps.',
        },
      ],
      true,
    );
  }

  // Suppress logging requirements for the log bucket
  MdaaNagSuppressions.addCodeResourceSuppressions(
    logBucket,
    [
      {
        id: 'AwsSolutions-S1',
        reason: 'Logging bucket exempt from access logging to prevent infinite loop of logs.',
      },
      {
        id: 'NIST.800.53.R5-S3BucketLoggingEnabled',
        reason: 'Logging bucket exempt from access logging to prevent infinite loop of logs.',
      },
      {
        id: 'HIPAA.Security-S3BucketLoggingEnabled',
        reason: 'Logging bucket exempt from access logging to prevent infinite loop of logs.',
      },
      {
        id: 'PCI.DSS.321-S3BucketLoggingEnabled',
        reason: 'Logging bucket exempt from access logging to prevent infinite loop of logs.',
      },
      {
        id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
        reason: 'Bucket is a log bucket. S3 bucket Replication not required.',
      },
      {
        id: 'HIPAA.Security-S3BucketReplicationEnabled',
        reason: 'Bucket is a log bucket. S3 bucket Replication not required.',
      },
      {
        id: 'PCI.DSS.321-S3BucketReplicationEnabled',
        reason: 'Bucket is a log bucket. S3 bucket Replication not required.',
      },
    ],
    true,
  );

  // Suppress replication requirements for website assets bucket
  MdaaNagSuppressions.addCodeResourceSuppressions(
    websiteBucket,
    [
      {
        id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
        reason:
          'Bucket is contains website assets that are generated from a build server. S3 bucket Replication not required.',
      },
      {
        id: 'HIPAA.Security-S3BucketReplicationEnabled',
        reason:
          'Bucket is contains website assets that are generated from a build server. S3 bucket Replication not required.',
      },
      {
        id: 'PCI.DSS.321-S3BucketReplicationEnabled',
        reason:
          'Bucket is contains website assets that are generated from a build server. S3 bucket Replication not required.',
      },
    ],
    true,
  );
}

/**
 * Creates a generic UI infrastructure for GAIA web interfaces (client or admin).
 *
 * This utility function sets up:
 * - S3 bucket for hosting static website assets
 * - CloudFront distribution with custom domain support
 * - SSL certificate integration
 * - API Gateway integration with X-Origin verification
 * - Cognito authentication configuration
 * - Route53 DNS records for custom domains
 * - Logging and security configurations
 *
 * @param config - Configuration options for the UI infrastructure
 * @returns CloudFront Distribution instance
 */
export function createGenericUi(config: GenericUiConfig): Distribution {
  const { scope, props, bucketName, logBucketName, logFilePrefix, interfaceDomainNameId, websocketHttpDns } = config;

  // Create infrastructure components
  const websiteBucket = createWebsiteBucket(scope, props, bucketName);
  const logBucket = createLoggingBucket(scope, props, logBucketName);
  const rewriteFunction = createSpaRoutingFunction(scope);

  // Import SSL certificate if custom domain is configured
  const certificate =
    props.domainName && props.acmCertArn
      ? Certificate.fromCertificateArn(scope, 'Certificate', props.acmCertArn)
      : undefined;

  // Create CloudFront distribution
  const distribution = createDistribution({
    scope,
    props,
    websiteBucket,
    logBucket,
    logFilePrefix,
    rewriteFunction,
    certificate,
  });

  // Deploy Amplify configuration and configure DNS
  deployAmplifyConfig(scope, props, websiteBucket, distribution, websocketHttpDns);
  configureCustomDomain(scope, props, distribution, interfaceDomainNameId);

  // Apply security compliance suppressions
  applyNagSuppressions(props, distribution, logBucket, websiteBucket);

  return distribution;
}
