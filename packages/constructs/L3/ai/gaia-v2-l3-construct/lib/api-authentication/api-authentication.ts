import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cdk from 'aws-cdk-lib';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';

export interface ApiAuthenticationProps extends MdaaL3ConstructProps {
  /** KMS encryption key for securing the authentication secret */
  readonly encryptionKey: MdaaKmsKey;
}

/**
 * API Authentication construct that creates and manages the X-Origin verification secret.
 * This secret is used to validate that API requests are coming through CloudFront
 * rather than directly to the API Gateway, providing an additional security layer.
 */
export class ApiAuthentication extends MdaaL3Construct {
  /** Secret containing the X-Origin verification header value */
  readonly xOriginVerifySecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: ApiAuthenticationProps) {
    super(scope, id, props);

    // Create the X-Origin verification secret used by CloudFront and API Gateway
    // This secret ensures requests flow through the proper CloudFront distribution
    //
    // The generateSecretString configuration creates a JSON secret like: {"headerValue": "<random-string>"}
    // - secretStringTemplate: Base JSON structure to populate (empty object here)
    // - generateStringKey: JSON key where the auto-generated random string is stored
    // See: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-secretsmanager-secret-generatesecretstring.html
    this.xOriginVerifySecret = new secretsmanager.Secret(this, 'X-Origin-Verify-Secret', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryptionKey: props.encryptionKey,
      generateSecretString: {
        excludePunctuation: true, // Avoid special characters that could cause issues in HTTP headers
        generateStringKey: 'headerValue',
        secretStringTemplate: '{}',
      },
    });

    // Nag suppression
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.xOriginVerifySecret,
      [
        {
          id: 'AwsSolutions-SMG4',
          reason:
            "Secret rotation is not supported for CloudFront and API Gateway integrations. The secret validates that API requests come through CloudFront rather than directly to the API Gateway. This limitation doesn't create security risks because both CloudFront and API Gateway are protected by a Web Application Firewall (WAF).",
        },
        {
          id: 'NIST.800.53.R5-SecretsManagerRotationEnabled',
          reason:
            "Secret rotation is not supported for CloudFront and API Gateway integrations. The secret validates that API requests come through CloudFront rather than directly to the API Gateway. This limitation doesn't create security risks because both CloudFront and API Gateway are protected by a Web Application Firewall (WAF).",
        },
        {
          id: 'HIPAA.Security-SecretsManagerRotationEnabled',
          reason:
            "Secret rotation is not supported for CloudFront and API Gateway integrations. The secret validates that API requests come through CloudFront rather than directly to the API Gateway. This limitation doesn't create security risks because both CloudFront and API Gateway are protected by a Web Application Firewall (WAF).",
        },
      ],
      true,
    );

    // Store secret ARN in SSM for programmatic access by users/integrations
    new ssm.StringParameter(this, 'XOriginVerifySecretArnSSMParam', {
      parameterName: props.naming.ssmPath('origin/verify/secret/arn'),
      stringValue: this.xOriginVerifySecret.secretArn,
    });
  }
}
