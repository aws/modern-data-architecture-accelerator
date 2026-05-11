import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import {
  CfnManagedLoginBranding,
  IUserPool,
  ManagedLoginVersion,
  StandardThreatProtectionMode,
  UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AttributeMapping } from 'aws-cdk-lib/aws-cognito/lib/user-pool-idps/base';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';

export interface EntraIdOIDCProps {
  /** ARN of the secret containing Entra ID configuration (clientId, clientSecret, tenantId). The secret should have the following format: {"clientId":"<ID>","clientSecret":"<SECRET>","tenantId":"<tenantId>"} */
  readonly entraIdConfigSecretArn: string;
  /** Mapping of Cognito attributes to Entra ID claims */
  readonly attributeMapping: { [key: string]: string };
}

/**
 * Authentication configuration for the GAIA v2 user pool and client. Selects the
 * identity provider (Cognito-native, external OIDC such as Entra ID, or both) and
 * controls OAuth callback/logout URLs, Cognito domain, attribute mapping, and
 * optional WAF and managed-login branding.
 */
export interface AuthenticationProps {
  /** Entra ID OIDC configuration for enterprise authentication */
  readonly entraIdOIDCConfiguration?: EntraIdOIDCProps;
  /** Cognito domain prefix for hosted UI */
  readonly cognitoDomain?: string;
  /** Whether to add Cognito as an identity provider alongside external providers */
  readonly cognitoAddAsIdentityProvider?: boolean;
  /** Cognito feature plan for advanced security features. Defaults to PLUS if not specified */
  readonly cognitoFeaturePlan?: cognito.FeaturePlan;
  /** Standard threat protection mode. Defaults to FULL_FUNCTION if not specified */
  readonly cognitoStandardThreatProtectionMode?: StandardThreatProtectionMode;
  /** WAF ARN to associatiate with cognito. */
  readonly wafArn?: string;
  /** OAuth callback URLs for authentication flow */
  readonly oAuthCallbackUrls?: string[];
  /** OAuth logout URLs for authentication flow */
  readonly oAuthLogoutUrls?: string[];
  /** Existing User Pool ID to use instead of creating new one */
  readonly existingPoolId?: string;
  /** Existing User Pool Client ID to use instead of creating new one */
  readonly existingPoolClientId?: string;
  /** Existing User Pool Domain to use instead of creating new one */
  readonly existingPoolDomain?: string;
  /**
   * Path to JSON file containing Cognito branding configuration. If undefined, default branding will be used.
   * You can configure the branding through the AWS console and then export it using AWS CLI using `aws cognito-idp describe-managed-login-branding`.
   * (i.e. : aws cognito-idp describe-managed-login-branding --managed-login-branding-id <ID> --user-pool-id <POOL_ID> > branding-config.json)
   * */
  readonly cognitoBrandingFileLocation?: string;
}

export interface AuthenticationConstructProps extends AuthenticationProps, MdaaL3ConstructProps {}

/**
 * Authentication construct that manages Cognito User Pool, Client, and Domain
 * for GAIA application authentication. Supports both native Cognito authentication
 * and external identity providers like Entra ID (Azure AD).
 */
export class Authentication extends MdaaL3Construct {
  /** Cognito User Pool for user management */
  public readonly userPool: cognito.IUserPool;
  /** Cognito User Pool Domain for hosted UI */
  public readonly userPoolDomain: cognito.IUserPoolDomain;
  /** Cognito User Pool Client for application integration */
  public readonly userPoolClient: cognito.IUserPoolClient;

  constructor(scope: Construct, id: string, props: AuthenticationConstructProps) {
    super(scope, id, props);

    // Create or reference existing User Pool
    const userPool = this.createUserPool(props);
    this.userPool = userPool;

    // Create or reference existing User Pool Client with identity providers
    const userPoolClient = this.createUserPoolClient(props, userPool);
    this.userPoolClient = userPoolClient;

    if (props.wafArn) {
      new CfnWebACLAssociation(this, 'CfnWebACLAssociation', {
        resourceArn: userPool.userPoolArn,
        webAclArn: props.wafArn,
      });
    }

    // Create or reference existing User Pool Domain for hosted UI
    const userPoolDomain = this.addUserPoolDomain(props, userPool);
    this.userPoolDomain = userPoolDomain;

    // Suppress CDK Nag warnings for default SMS role created by Cognito
    MdaaNagSuppressions.addCodeResourceSuppressions(
      userPool,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Cognito creates a default SMS role at User Pool creation time that grants sns:Publish for sending verification ' +
            'SMS messages. sns:Publish against phone-number targets does not support resource-level permissions because the ' +
            'phone numbers are provided in the request rather than represented as ARNs ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsns.html). This User Pool does ' +
            'not enable SMS MFA or SMS account recovery, so the default role is created by CloudFormation but never invoked.',
          appliesTo: ['Resource::*'],
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason:
            'Cognito attaches the default SMS role permissions as an inline policy on the auto-generated role. The role is ' +
            'service-specific to this User Pool and not reusable across constructs, which is the AWS best-practice case for ' +
            'inline policy attachment (https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason:
            'Cognito attaches the default SMS role permissions as an inline policy on the auto-generated role. The role is ' +
            'service-specific to this User Pool and not reusable across constructs, which is the AWS best-practice case for ' +
            'inline policy attachment (https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason:
            'Cognito attaches the default SMS role permissions as an inline policy on the auto-generated role. The role is ' +
            'service-specific to this User Pool and not reusable across constructs, which is the AWS best-practice case for ' +
            'inline policy attachment (https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html).',
        },
      ],
      true,
    );

    // Create CloudFormation outputs and SSM parameters for integration
    this.createOutputsAndParameters(props, userPool, userPoolClient, userPoolDomain);
  }

  /**
   * Creates CloudFormation outputs and SSM parameters for authentication resources
   */
  private createOutputsAndParameters(
    props: AuthenticationConstructProps,
    userPool: IUserPool,
    userPoolClient: cognito.IUserPoolClient,
    userPoolDomain: cognito.IUserPoolDomain,
  ) {
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new ssm.StringParameter(this, 'UserPoolIdSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/id'),
      stringValue: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolWebClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new ssm.StringParameter(this, 'UserPoolWebClientIdSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/client/id'),
      stringValue: userPoolClient.userPoolClientId,
    });

    new ssm.StringParameter(this, 'UserPoolDomainSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/domain'),
      stringValue: userPoolDomain.domainName,
    });

    new cdk.CfnOutput(this, 'UserPoolLink', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cognito/v2/idp/user-pools/${
        userPool.userPoolId
      }/users?region=${cdk.Stack.of(this).region}`,
    });
  }

  /**
   * Creates or references User Pool Domain for hosted UI
   */
  private addUserPoolDomain(props: AuthenticationConstructProps, userPool: IUserPool) {
    if (props?.existingPoolDomain) {
      // Use existing domain
      return cognito.UserPoolDomain.fromDomainName(
        this,
        'ExistingUserPoolDomain',
        `https://${props.existingPoolDomain}`,
      );
    }

    if (props?.cognitoDomain) {
      // Create new Cognito domain with managed login
      return userPool.addDomain('UserPoolDomain', {
        cognitoDomain: {
          domainPrefix: props.cognitoDomain,
        },
        managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN,
      });
    }

    throw new Error(
      'Cognito User Pool Domain is required. Provide either "cognitoDomain" to create a new domain or "existingPoolDomain" to use an existing one.',
    );
  }

  /**
   * Creates or references User Pool with security best practices
   */
  private createUserPool(props: AuthenticationConstructProps) {
    if (props?.existingPoolId === undefined) {
      // Create new User Pool with security configurations
      return new cognito.UserPool(this, 'UserPool', {
        userPoolName: props.naming.resourceName(),
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        selfSignUpEnabled: false, // Admin-controlled user creation
        autoVerify: { email: true, phone: true },
        signInAliases: {
          email: true, // Allow email-based sign-in
        },
        passwordPolicy: {
          // For AwsSolutions-COG1 (default value of Cognito)
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireDigits: true,
          requireSymbols: true,
        },
        featurePlan: props.cognitoFeaturePlan ?? cognito.FeaturePlan.PLUS, // Advanced security features
        standardThreatProtectionMode:
          props.cognitoStandardThreatProtectionMode ?? StandardThreatProtectionMode.FULL_FUNCTION, // Enable threat protection
      });
    } else {
      // Use existing User Pool
      return cognito.UserPool.fromUserPoolId(this, 'ExistingUserPool', props.existingPoolId);
    }
  }

  /**
   * Creates or references User Pool Client with identity provider configuration
   */
  private createUserPoolClient(props: AuthenticationConstructProps, userPool: IUserPool) {
    if (props?.existingPoolClientId) {
      return cognito.UserPoolClient.fromUserPoolClientId(this, 'ExistingUserPoolClient', props.existingPoolClientId);
    }

    return this.createNewUserPoolClient(props, userPool);
  }

  /**
   * Creates a new User Pool Client with OAuth configuration and identity providers
   */
  private createNewUserPoolClient(props: AuthenticationConstructProps, userPool: IUserPool) {
    const supportedIdentityProviders = this.configureIdentityProviders(props, userPool);

    const userPoolClient = userPool.addClient('UserPoolClient', {
      generateSecret: false, // Public client for web applications
      userPoolClientName: props.naming.resourceName('web-app'),
      authFlows: {
        userPassword: true,
        userSrp: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.COGNITO_ADMIN,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.oAuthCallbackUrls,
        logoutUrls: props.oAuthLogoutUrls,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders,
    });

    this.applyBranding(props, userPool, userPoolClient);

    return userPoolClient;
  }

  /**
   * Configures identity providers for the User Pool Client
   */
  private configureIdentityProviders(
    props: AuthenticationConstructProps,
    userPool: IUserPool,
  ): UserPoolClientIdentityProvider[] {
    const providers: UserPoolClientIdentityProvider[] = [];

    if (props.entraIdOIDCConfiguration) {
      const entraIdProvider = this.configureEntraIdProvider(props.entraIdOIDCConfiguration, userPool);
      userPool.registerIdentityProvider(entraIdProvider);
      providers.push(cognito.UserPoolClientIdentityProvider.custom(entraIdProvider.providerName));
    }

    if (props.cognitoAddAsIdentityProvider) {
      providers.push(cognito.UserPoolClientIdentityProvider.COGNITO);
    }

    return providers;
  }

  /**
   * Configures Entra ID (Azure AD) OIDC identity provider
   */
  private configureEntraIdProvider(config: EntraIdOIDCProps, userPool: IUserPool) {
    const secret = Secret.fromSecretCompleteArn(this, 'entra-id-oidc-secret-id', config.entraIdConfigSecretArn);

    // Transform user's attribute mapping config to Cognito's AttributeMapping format.
    // User config is { [key: string]: string } (e.g., { email: "email", fullname: "name" })
    // Cognito expects { [key]: { attributeName: string } } with specific known keys.
    // We use type assertion here because the user-provided keys are validated at runtime
    // by Cognito, and TypeScript's AttributeMapping type has a fixed set of keys that
    // doesn't support dynamic indexing.
    const attributeMapping = Object.entries(config.attributeMapping).reduce((acc, [key, value]) => {
      (acc as Record<string, { attributeName: string }>)[key] = { attributeName: value };
      return acc;
    }, {} as AttributeMapping);

    return new cognito.UserPoolIdentityProviderOidc(this, 'EntraIdIdentityProviderOidc', {
      name: 'EntraID-OIDC',
      userPool,
      clientId: secret.secretValueFromJson('clientId').toString(),
      clientSecret: secret.secretValueFromJson('clientSecret').toString(),
      issuerUrl: `https://login.microsoftonline.com/${secret.secretValueFromJson('tenantId').toString()}/v2.0`,
      attributeMapping,
      attributeRequestMethod: cognito.OidcAttributeRequestMethod.POST,
      scopes: ['openid', 'profile', 'email'],
    });
  }

  /**
   * Applies custom branding to the Cognito hosted UI
   */
  private applyBranding(
    props: AuthenticationConstructProps,
    userPool: IUserPool,
    userPoolClient: cognito.IUserPoolClient,
  ) {
    // Parse branding config if file location is provided
    const brandingConfig = props.cognitoBrandingFileLocation
      ? this.parseBrandingConfig(props.cognitoBrandingFileLocation)
      : undefined;

    // Apply branding configuration to managed login
    new CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      settings: brandingConfig?.settings,
      assets: brandingConfig?.assets,
      useCognitoProvidedValues: !props.cognitoBrandingFileLocation, // Use defaults if no custom branding
    });
  }

  /**
   * Parses branding configuration from a JSON file exported from AWS CLI.
   * Use: aws cognito-idp describe-managed-login-branding --managed-login-branding-id <ID> --user-pool-id <POOL_ID> > branding-config.json
   */
  private parseBrandingConfig(filePath: string) {
    const jsonFilePath = path.resolve(filePath);

    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`Cognito branding configuration file not found: ${jsonFilePath}`);
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const parsed: unknown = JSON.parse(jsonContent);

    // Validate the structure matches AWS CLI output format
    if (!this.isValidBrandingConfig(parsed)) {
      throw new Error(
        `Invalid Cognito branding configuration file format. Expected structure from 'aws cognito-idp describe-managed-login-branding' command. ` +
          `File must contain ManagedLoginBranding.Assets array and ManagedLoginBranding.Settings object.`,
      );
    }

    // Transform assets from AWS CLI format (PascalCase) to CloudFormation format (camelCase)
    // Filter to only include assets with required extension field
    const assets = parsed.ManagedLoginBranding.Assets.filter(asset => asset.Extension !== undefined).map(asset => ({
      category: asset.Category,
      colorMode: asset.ColorMode,
      extension: asset.Extension as string,
      bytes: asset.Bytes,
    }));

    return {
      settings: parsed.ManagedLoginBranding.Settings,
      assets,
    };
  }

  /**
   * Type guard to validate branding config structure from AWS CLI output.
   * The AWS CLI 'describe-managed-login-branding' command returns a specific JSON structure
   * that we need to transform for CloudFormation's CfnManagedLoginBranding resource.
   */
  private isValidBrandingConfig(config: unknown): config is CognitoBrandingConfigFile {
    if (typeof config !== 'object' || config === null) {
      return false;
    }

    const obj = config as Record<string, unknown>;
    if (typeof obj.ManagedLoginBranding !== 'object' || obj.ManagedLoginBranding === null) {
      return false;
    }

    const branding = obj.ManagedLoginBranding as Record<string, unknown>;
    if (!Array.isArray(branding.Assets)) {
      return false;
    }

    // Validate each asset has required fields
    for (const asset of branding.Assets) {
      if (typeof asset !== 'object' || asset === null) {
        return false;
      }
      const assetObj = asset as Record<string, unknown>;
      if (typeof assetObj.Category !== 'string' || typeof assetObj.ColorMode !== 'string') {
        return false;
      }
    }

    return true;
  }
}

/**
 * Type definition for AWS CLI 'describe-managed-login-branding' output.
 * This structure is defined by AWS and used to configure Cognito's managed login UI.
 * See: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/describe-managed-login-branding.html
 */
interface CognitoBrandingConfigFile {
  ManagedLoginBranding: {
    Assets: Array<{
      Category: string;
      ColorMode: string;
      Extension?: string;
      Bytes?: string;
    }>;
    Settings?: Record<string, unknown>;
  };
}
