import { Construct } from 'constructs';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IUserPool, IUserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { createGenericUi } from '../utils/utils';

export interface ClientUiProps {
  /** ACM certificate ARN for custom domain. If undefined, the default cloudfront certificate will be used. */
  readonly acmCertArn?: string;
  /** Route53 hosted zone ID for domain setup. If defined, the domainName will be configured in Route53 using the hostedZoneId. */
  readonly hostedZoneId?: string;
  /** Custom domain name for the admin interface */
  readonly domainName?: string;
  /** Authentication provider identifier to use for autologin. (i.e. : EntraID-OIDC). If defined, the frontend application should autologin using this configuration. */
  readonly authProvider?: string;
  /** CloudFront price class for distribution. If undefined, PriceClass.PRICE_CLASS_100 will be used */
  readonly cloudFrontPriceClass?: PriceClass;
}

export interface ClientUiConstructProps extends ClientUiProps, MdaaL3ConstructProps {
  /** Secret for X-Origin verification header */
  readonly xOriginVerifySecret: ISecret;
  /** Cognito User Pool for authentication */
  readonly userPool: IUserPool;
  /** Cognito User Pool Domain for OAuth flows */
  readonly userPoolDomain: IUserPoolDomain;
  /** User Pool Client ID for authentication */
  readonly userPoolClientId: string;
  /** OAuth callback URLs for authentication flow */
  readonly oAuthCallbackUrls?: string[];
  /** OAuth logout URLs for authentication flow */
  readonly oAuthLogoutUrls?: string[];
  /** REST API Gateway ID for backend integration */
  readonly restApiId?: string;
  /** WebSocket HTTP DNS endpoint for real-time chat */
  readonly websocketHttpDns?: string;
  /** WAF Web ACL ID for security protection */
  readonly webACLId?: string;
  /** KMS encryption key used for all resources that require encryption */
  readonly encryptionKey: MdaaKmsKey;
}

/**
 * GAIA Client UI construct that creates a CloudFront-distributed web interface
 * for end-user chat interactions. This provides the main user-facing interface
 * for the GenAI application with real-time chat capabilities.
 */
export class ClientUi extends MdaaL3Construct {
  /** CloudFront distribution serving the client interface */
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: ClientUiConstructProps) {
    super(scope, id, props);

    // Create the client UI using the generic UI utility function
    // This sets up CloudFront distribution, S3 bucket, domain configuration,
    // and integrates with WebSocket for real-time chat functionality
    this.distribution = createGenericUi({
      scope: this,
      props,
      bucketName: 'website',
      logBucketName: props.naming.resourceName('website-log', 63),
      logFilePrefix: 'genai-client-website-cloudfront-logs/',
      interfaceDomainNameId: 'UserInterfaceDomainName',
      websocketHttpDns: props.websocketHttpDns, // WebSocket endpoint for real-time chat
    });
  }
}
