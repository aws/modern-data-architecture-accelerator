import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";

import {AdvancedSecurityMode} from "aws-cdk-lib/aws-cognito"; //NOSONAR
import * as ssm from "aws-cdk-lib/aws-ssm";
import {Construct} from "constructs";
import {SupportedAuthTypes, SystemConfig} from "../shared/types";
import {NagSuppressions} from "cdk-nag";
import {MdaaConstructProps} from "@aws-mdaa/construct";

export interface AuthenticationProps extends MdaaConstructProps {
  readonly config: SystemConfig;
}

export class Authentication extends Construct {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolDomain: cognito.IUserPoolDomain;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly identityPool: cognitoIdentityPool.IdentityPool;

  constructor(scope: Construct, id: string, props: AuthenticationProps) {
    super(scope, id);

    let userPool: cognito.IUserPool

    if (props.config.auth?.existingPoolId !== undefined) {
      userPool = cognito.UserPool.fromUserPoolId(this, 'ExistingUserPool',
          props.config.auth.existingPoolId)
    } else {
      userPool = new cognito.UserPool(this, "UserPool", {
        userPoolName: props.naming.resourceName(),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        selfSignUpEnabled: false,
        autoVerify: { email: true, phone: true },
        signInAliases: {
          email: true,
        },
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireDigits: true,
          requireSymbols: true,
        },
        featurePlan: cognito.FeaturePlan.PLUS,
        advancedSecurityMode: AdvancedSecurityMode.ENFORCED //NOSONAR
      });
    }

    let userPoolClient: cognito.IUserPoolClient;

    if (props.config.auth?.existingPoolClientId !== undefined) {
      userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(this, 'ExistingUserPoolClient',
          props.config.auth.existingPoolClientId)
    } else {
      if (props.config.auth.authType === SupportedAuthTypes.ACTIVE_DIRECTORY &&
          props.config.auth?.idpSamlMetadataUrlOrFileParamPath &&
          props.config.auth?.idpSamlEmailClaimParamPath
      )
      {
        const adProviderMetaDataContent = ssm.StringParameter.valueForStringParameter(
            this, props.config.auth.idpSamlMetadataUrlOrFileParamPath
        );

        const adProviderEmailAttribute = ssm.StringParameter.valueForStringParameter(
            this, props.config.auth.idpSamlEmailClaimParamPath
        )

        const adProvider = new cognito.UserPoolIdentityProviderSaml(this, "ADProvider", {
          metadata: {
            metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL,
            metadataContent: adProviderMetaDataContent,
          },
          name: "EnterpriseAD",
          idpSignout: true,
          userPool,
          attributeMapping: {
            email: cognito.ProviderAttribute.other(adProviderEmailAttribute),
          }
        })

        userPool.registerIdentityProvider(adProvider)

        userPoolClient = userPool.addClient("UserPoolClient", {
          generateSecret: false,
          userPoolClientName: props.naming.resourceName('web-app'),
          authFlows: {
            custom: true,
            userSrp: true,
          },
          oAuth: {
            flows: {
              authorizationCodeGrant: true,
            },
            scopes: [
              cognito.OAuthScope.OPENID,
              cognito.OAuthScope.EMAIL,
              cognito.OAuthScope.COGNITO_ADMIN,
              cognito.OAuthScope.PROFILE
            ],
            callbackUrls: [`https://${props.config.auth.oAuthRedirectUrl}`],
            logoutUrls: [`https://${props.config.auth.oAuthRedirectUrl}`],
          },
          preventUserExistenceErrors: true,
          supportedIdentityProviders: [
            cognito.UserPoolClientIdentityProvider.custom(adProvider.providerName)
          ],
        });
      } else {
        userPoolClient = userPool.addClient("UserPoolClient", {
          generateSecret: false,
          authFlows: {
            adminUserPassword: true,
            userPassword: true,
            userSrp: true,
          },
        });
      }
    }

    let userPoolDomain: cognito.IUserPoolDomain

    if (props.config.auth?.existingPoolDomain !== undefined) {
      userPoolDomain = cognito.UserPoolDomain.fromDomainName(this, 'ExistingUserPoolDomain',
          `https://${props.config.auth.existingPoolDomain}`)
    } else {
      userPoolDomain = userPool.addDomain("UserPoolDomain", {
        cognitoDomain: {
          domainPrefix: props.config.auth?.cognitoDomain!
        }
      })
    }

    const identityPool = new cognitoIdentityPool.IdentityPool(
      this,
      "IdentityPool",
      {
        identityPoolName: props.naming.resourceName(),
        authenticationProviders: {
          userPools: [
            new cognitoIdentityPool.UserPoolAuthenticationProvider({
              userPool,
              userPoolClient,
            }),
          ],
        },
      }
    );

    NagSuppressions.addResourceSuppressions(
        userPool,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Default SMS Role created by UserPool, resource not known at deployment time and not used",
            appliesTo: ['Resource::*']
          },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' }
        ],
        true
    );

    this.userPool = userPool;
    this.userPoolClient = userPoolClient;
    this.identityPool = identityPool;
    this.userPoolDomain = userPoolDomain;

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });


    new ssm.StringParameter(this, 'UserPoolIdSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/id'),
      stringValue: userPool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolWebClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new ssm.StringParameter(this, 'UserPoolWebClientIdSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/client/id'),
      stringValue: userPoolClient.userPoolClientId
    });


    new ssm.StringParameter(this, 'IdentityPoolIdSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/identity/pool/id'),
      stringValue: identityPool.identityPoolId
    });

    new ssm.StringParameter(this, 'UserPoolDomainSSMParam', {
      parameterName: props.naming.ssmPath('auth/cognito/user/pool/domain'),
      stringValue: userPoolDomain.domainName
    });

    new cdk.CfnOutput(this, "UserPoolLink", {
      value: `https://${
        cdk.Stack.of(this).region
      }.console.aws.amazon.com/cognito/v2/idp/user-pools/${
        userPool.userPoolId
      }/users?region=${cdk.Stack.of(this).region}`,
    });
  }
}
