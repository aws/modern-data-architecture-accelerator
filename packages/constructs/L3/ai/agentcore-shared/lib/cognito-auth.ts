/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Annotations, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AccountRecovery,
  AttributeMapping,
  CfnManagedLoginBranding,
  FeaturePlan,
  ManagedLoginVersion,
  Mfa,
  OAuthScope,
  ProviderAttribute,
  StandardThreatProtectionMode,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolClientOptions,
  UserPoolDomain,
  UserPoolIdentityProviderOidc,
  UserPoolIdentityProviderSaml,
  UserPoolIdentityProviderSamlMetadata,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

/**
 * Default and permitted token validity, in minutes.
 *
 * The 15-minute default follows the AgentCore security guidance for agentic workloads
 * (Cognito's own default is 60 minutes): a shorter token narrows the window in which a
 * leaked token remains usable, which matters more for autonomous agents than for
 * interactive users because offline JWT validation cannot revoke an individual token.
 *
 * The 5-60 bound is an MDAA policy choice, not a service limit — Cognito itself permits
 * 5 minutes to 1 day. The upper bound is capped at Cognito's own default so this module
 * cannot be configured to be *less* secure than an unconfigured user pool.
 */
const DEFAULT_TOKEN_VALIDITY_MINUTES = 15;
const MIN_TOKEN_VALIDITY_MINUTES = 5;
const MAX_TOKEN_VALIDITY_MINUTES = 60;

/**
 * Refresh token validity.
 *
 * Cognito's own default is 30 days, which would undercut the 15-minute access token: a
 * leaked refresh token mints fresh access tokens for a month, so the short access-token
 * lifetime would bound only the narrower of the two exposures. One day keeps the
 * revocation gap in the same order of magnitude as the rest of the pool's hardening while
 * still sparing an interactive user from re-authenticating within a working day.
 *
 * Not exposed as config: it is a floor rather than a tuning knob, and a deployment that
 * needs longer-lived sessions should say so as a deliberate change here rather than per
 * config file. `enableTokenRevocation` is on, so a compromised refresh token can also be
 * revoked out of band.
 */
const REFRESH_TOKEN_VALIDITY = Duration.days(1);

/** Cognito domain prefixes accept lowercase letters, digits, and hyphens only. */
const DOMAIN_PREFIX_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** MFA enforcement levels exposed by MDAA, mapped to the CDK {@link Mfa} enum. */
const MFA_MODES = {
  off: Mfa.OFF,
  optional: Mfa.OPTIONAL,
  required: Mfa.REQUIRED,
} as const;

/** Pool removal policies exposed by MDAA, mapped to the CDK {@link RemovalPolicy} enum. */
const REMOVAL_POLICIES = {
  destroy: RemovalPolicy.DESTROY,
  retain: RemovalPolicy.RETAIN,
} as const;

/**
 * Default pool removal policy.
 *
 * `retain` follows the MDAA convention for stateful resources (KMS keys, DynamoDB tables,
 * log groups, EBS volumes all retain). A user pool is an identity store, so the two
 * failure modes are not symmetric: a wrongly retained pool costs a manual cleanup, while
 * a wrongly destroyed one takes every user record with it and locks those users out
 * irrecoverably.
 *
 * Ephemeral deployments should set `removalPolicy: destroy` so the pool is torn down with
 * the stack. Note that a retained pool also keeps its hosted-UI domain, and Cognito domain
 * prefixes are globally unique per region, so a repeatedly-redeployed stack using the
 * derived domain prefix needs either `destroy` or an explicit `cognitoDomainPrefix`.
 */
const DEFAULT_REMOVAL_POLICY: CognitoRemovalPolicy = 'retain';

/**
 * Default MFA enforcement.
 *
 * `required` so the unconfigured pool is the compliant one: it satisfies
 * `AwsSolutions-COG2` with no nag suppression, and weakening it is then a deliberate,
 * reviewable line in a config file rather than an inherited default nobody sees.
 *
 * TOTP is the only second factor this pool enables, and Cognito requires every user to
 * register one before their first token. Who drives that enrolment depends on the config:
 *
 * - With `hostedUi`, Cognito's managed login prompts the user and handles registration.
 * - Without it, the application drives the flow itself: `InitiateAuth` returns an
 *   `MFA_SETUP` challenge, then `AssociateSoftwareToken` yields the secret to present as a
 *   QR code, `VerifySoftwareToken` confirms the user's first code, and
 *   `RespondToAuthChallenge` completes sign-in. Any app enforcing MFA owns this code
 *   regardless of who provisioned the pool, so it is application work rather than a
 *   workaround — but a deployment that does not expect it will find users unable to
 *   authenticate, which is why {@link warnRequiredMfaWithoutHostedUi} says so at synth.
 *
 * Set `mfa: optional` when no human is present to enrol — see {@link CognitoMfaMode}.
 */
const DEFAULT_MFA_MODE: CognitoMfaMode = 'required';

/**
 * OAuth scopes MDAA accepts for the hosted UI, mapped to the CDK {@link OAuthScope} enum.
 *
 * `aws.cognito.signin.user.admin` is deliberately excluded: it authorizes the bearer to
 * read and mutate their own user attributes through the Cognito API, which an AgentCore
 * caller has no need for. CDK's own client default grants it, which is one reason this
 * module never accepts CDK's OAuth defaults (see {@link buildClientOAuthOptions}).
 */
const OAUTH_SCOPES = {
  openid: OAuthScope.OPENID,
  profile: OAuthScope.PROFILE,
  email: OAuthScope.EMAIL,
  phone: OAuthScope.PHONE,
} as const;

/** Scopes granted when `hostedUi` is configured without an explicit `allowedOAuthScopes`. */
const DEFAULT_OAUTH_SCOPES: readonly (keyof typeof OAUTH_SCOPES)[] = ['openid', 'profile', 'email'];

/**
 * MFA enforcement level for the MDAA-created user pool.
 *
 * Defaults to `required`. TOTP from an authenticator app is the only second factor this
 * pool enables, so every user must register one before they can obtain a token — see
 * {@link DEFAULT_MFA_MODE} for who supplies that enrolment step.
 *
 * Set `optional` when tokens are obtained by a caller with no human present (a service or
 * scheduled job authenticating via `USER_PASSWORD_AUTH`). Such a caller cannot register an
 * authenticator, and storing a TOTP seed alongside the password would make the "second"
 * factor a second copy of the first.
 *
 * `off` removes the second factor entirely, so a user cannot enrol one even voluntarily.
 *
 * Use cases: MFA enforcement, interactive sign-in hardening, non-interactive callers
 *
 * AWS: AWS::Cognito::UserPool MfaConfiguration / EnabledMfas
 *
 * Validation: Optional; one of off | optional | required
 */
export type CognitoMfaMode = keyof typeof MFA_MODES;

/**
 * Removal policy for the MDAA-created user pool.
 *
 * Use cases: Ephemeral test deployments, production pool retention
 *
 * AWS: DeletionPolicy / UpdateReplacePolicy on AWS::Cognito::UserPool
 *
 * Validation: Optional; one of destroy | retain
 */
export type CognitoRemovalPolicy = keyof typeof REMOVAL_POLICIES;

/**
 * OAuth scope accepted for the hosted UI authorization code grant.
 *
 * Use cases: Hosted-UI scope restriction
 *
 * AWS: AWS::Cognito::UserPoolClient AllowedOAuthScopes
 *
 * Validation: Optional; one of openid | profile | email | phone
 */
export type CognitoOAuthScope = keyof typeof OAUTH_SCOPES;

/**
 * SAML federation with an enterprise identity provider, registered on the MDAA-created
 * pool and enabled on the app client alongside Cognito-native sign-in.
 *
 * Use cases: Enterprise SSO, Entra ID / ADFS / Okta federation
 *
 * AWS: AWS::Cognito::UserPoolIdentityProvider (ProviderType SAML)
 *
 * Validation: metadataUrl required; must be an https URL
 */
export interface CognitoSamlFederationProperty {
  /**
   * SAML metadata document URL published by the enterprise IdP.
   *
   * Use cases: SAML provider registration
   *
   * AWS: ProviderDetails MetadataURL
   *
   * Validation: Required; String; must be an https URL
   *
   * @pattern ^https://
   **/
  readonly metadataUrl: string;
  /**
   * SAML assertion attribute mapped to the Cognito `email` attribute.
   * Defaults to `email`.
   *
   * Use cases: Attribute mapping, user identification
   *
   * AWS: AttributeMapping email
   *
   * Validation: Optional; String
   **/
  readonly emailClaim?: string;
}

/**
 * OIDC federation with an enterprise identity provider, registered on the MDAA-created
 * pool and enabled on the app client alongside Cognito-native sign-in.
 *
 * The client secret is supplied by value here because Cognito requires it at provider
 * registration. Supply it via an MDAA config secret reference rather than in plaintext
 * config wherever the surrounding config supports it.
 *
 * Use cases: Enterprise SSO with an OIDC IdP
 *
 * AWS: AWS::Cognito::UserPoolIdentityProvider (ProviderType OIDC)
 *
 * Validation: issuerUrl, clientId, and clientSecret all required
 */
export interface CognitoOidcFederationProperty {
  /**
   * OIDC issuer URL. Cognito discovers the provider's endpoints beneath it.
   *
   * Use cases: OIDC provider registration
   *
   * AWS: ProviderDetails oidc_issuer
   *
   * Validation: Required; String; must be an https URL
   *
   * @pattern ^https://
   **/
  readonly issuerUrl: string;
  /**
   * OIDC client ID registered with the enterprise IdP.
   *
   * Use cases: OIDC provider registration
   *
   * AWS: ProviderDetails client_id
   *
   * Validation: Required; String
   **/
  readonly clientId: string;
  /**
   * OIDC client secret registered with the enterprise IdP.
   *
   * Use cases: OIDC provider registration
   *
   * AWS: ProviderDetails client_secret
   *
   * Validation: Required; String
   **/
  readonly clientSecret: string;
  /**
   * OIDC claim mapped to the Cognito `email` attribute. Defaults to `email`.
   *
   * Use cases: Attribute mapping, user identification
   *
   * AWS: AttributeMapping email
   *
   * Validation: Optional; String
   **/
  readonly emailClaim?: string;
}

/**
 * Federation with an enterprise identity provider. At most one of `saml` or `oidc` may
 * be configured — a single pool federating to two enterprise providers is out of scope
 * for this module.
 *
 * Requires `hostedUi`. Cognito signs federated users in only through the hosted-UI Login
 * and Authorize endpoints, never `InitiateAuth`, so a pool with federation and no hosted UI
 * would register a provider no caller could reach.
 *
 * Use cases: Enterprise SSO
 *
 * AWS: AWS::Cognito::UserPoolIdentityProvider
 *
 * Validation: Optional; requires hostedUi; at most one of saml or oidc
 */
export interface CognitoFederationProperty {
  /**
   * SAML federation configuration.
   *
   * Use cases: SAML enterprise SSO
   *
   * AWS: UserPoolIdentityProvider ProviderType SAML
   *
   * Validation: Optional; mutually exclusive with oidc
   **/
  readonly saml?: CognitoSamlFederationProperty;
  /**
   * OIDC federation configuration.
   *
   * Use cases: OIDC enterprise SSO
   *
   * AWS: UserPoolIdentityProvider ProviderType OIDC
   *
   * Validation: Optional; mutually exclusive with saml
   **/
  readonly oidc?: CognitoOidcFederationProperty;
}

/**
 * Hosted-UI authorization code grant, for callers that sign a user in through a browser
 * front end rather than calling `InitiateAuth` directly.
 *
 * Presence of this configuration opts in to OAuth on the app client. When it is absent
 * the client has OAuth disabled entirely — see {@link buildClientOAuthOptions} for why
 * that is the secure default rather than merely the minimal one.
 *
 * Use cases: Browser-based sign-in, hosted login page
 *
 * AWS: AWS::Cognito::UserPoolClient OAuth settings, AWS::Cognito::UserPoolDomain
 *
 * Validation: callbackUrls required and non-empty; all URLs must be https
 */
export interface CognitoHostedUiProperty {
  /**
   * Redirect URIs permitted after a successful sign-in. Required, because a hosted UI
   * without a callback URL cannot complete the code grant.
   *
   * Use cases: OAuth redirect
   *
   * AWS: AllowedOAuthFlows / CallbackURLs
   *
   * Validation: Required; String[]; non-empty; https URLs (http allowed for localhost)
   *
   * @minItems 1
   **/
  readonly callbackUrls: string[];
  /**
   * Redirect URIs permitted after sign-out.
   *
   * Use cases: OAuth sign-out redirect
   *
   * AWS: LogoutURLs
   *
   * Validation: Optional; String[]; https URLs (http allowed for localhost)
   **/
  readonly logoutUrls?: string[];
  /**
   * Cognito hosted-UI domain prefix. Defaults to an MDAA naming-derived prefix.
   *
   * Cognito domain prefixes are globally unique per region, so a naming-derived
   * default can collide with another account's pool in the same region. Set this
   * explicitly if deployment fails with a domain-already-exists error.
   *
   * Use cases: Hosted UI domain
   *
   * AWS: AWS::Cognito::UserPoolDomain Domain
   *
   * Validation: Optional; String; lowercase letters, digits, and hyphens; 1-63 chars
   *
   * @pattern ^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$
   **/
  readonly cognitoDomainPrefix?: string;
  /**
   * OAuth scopes granted to the hosted-UI client. Defaults to openid, profile, email.
   *
   * Use cases: Scope restriction
   *
   * AWS: AllowedOAuthScopes
   *
   * Validation: Optional; subset of openid | profile | email | phone
   **/
  readonly allowedOAuthScopes?: CognitoOAuthScope[];
}

/**
 * MDAA-managed Cognito user pool and app client for AgentCore inbound JWT authorization.
 *
 * Opting in to this configuration makes MDAA create the identity provider rather than
 * requiring a pre-existing one: the pool, an app client with agentic-workload token
 * defaults, and the composed OIDC discovery URL and audience that the runtime's JWT
 * authorizer consumes. An empty object accepts every default.
 *
 * Callers on this path present the **ID token** — see
 * {@link AgentcoreCognitoAuth.discoveryUrl} for why, and why `allowedClients` is not set.
 *
 * Use cases: Deploying an IdP alongside a runtime, agentic-workload token hardening
 *
 * AWS: Amazon Cognito user pool + app client fronting AgentCore CUSTOM_JWT inbound auth
 *
 * Validation: presence of this configuration opts in to pool creation
 */
export interface CognitoAuthProperty {
  /**
   * ID and access token validity in minutes. Defaults to 15.
   *
   * 15-30 minutes is the AgentCore guidance for agentic workloads; Cognito's own
   * default is 60. The accepted 5-60 range is an MDAA policy choice — Cognito itself
   * permits up to 1 day.
   *
   * Use cases: Token lifetime hardening, revocation-gap reduction
   *
   * AWS: AWS::Cognito::UserPoolClient IdTokenValidity / AccessTokenValidity
   *
   * Validation: Optional; Number; 5-60 minutes
   *
   * @default 15
   * @minimum 5
   * @maximum 60
   **/
  readonly idTokenValidityMinutes?: number;
  /**
   * MFA enforcement. Defaults to `required`, so each user must register a TOTP
   * authenticator before their first token — see {@link CognitoMfaMode} for the enrolment
   * paths, and set `optional` when no human is present to enrol.
   *
   * Use cases: MFA enforcement, non-interactive callers
   *
   * AWS: MfaConfiguration / EnabledMfas
   *
   * Validation: Optional; off | optional | required
   **/
  readonly mfa?: CognitoMfaMode;
  /**
   * Pool removal policy. Defaults to `retain`.
   *
   * `retain` keeps the pool when the stack is deleted, so user records survive, and also
   * enables Cognito deletion protection. `destroy` means a stack deletion **deletes the
   * pool and every user record in it** — set it for ephemeral deployments that should tear
   * down cleanly, and note that a retained pool also keeps its hosted-UI domain, whose
   * prefix is globally unique per region.
   *
   * Use cases: Production pool retention, ephemeral test deployments
   *
   * AWS: DeletionPolicy / UpdateReplacePolicy, plus DeletionProtection
   *
   * Validation: Optional; destroy | retain
   *
   * @default retain
   **/
  readonly removalPolicy?: CognitoRemovalPolicy;
  /**
   * Hosted-UI authorization code grant, with a Cognito domain and a managed-login branding
   * style so the sign-in page renders.
   *
   * Configuring it also has three effects beyond the grant itself: managed login drives TOTP
   * enrolment for a `required` MFA pool, the client drops the plaintext-password auth flow
   * (sign-in goes through the code grant instead), and `federation` becomes usable — it
   * requires this block. Omit it and the client has OAuth disabled entirely.
   *
   * Use cases: Browser-based sign-in, federated sign-in, managed TOTP enrolment
   *
   * AWS: UserPoolClient OAuth settings + UserPoolDomain + ManagedLoginBranding
   *
   * Validation: Optional; CognitoHostedUiProperty; required when federation is configured
   **/
  readonly hostedUi?: CognitoHostedUiProperty;
  /**
   * Federation with an enterprise identity provider. Requires `hostedUi`, since Cognito
   * signs federated users in only through the hosted-UI endpoints.
   *
   * Use cases: Enterprise SSO
   *
   * AWS: UserPoolIdentityProvider
   *
   * Validation: Optional; requires hostedUi; at most one of saml or oidc
   **/
  readonly federation?: CognitoFederationProperty;
}

/** Props for {@link createAgentcoreCognitoAuth}. */
export interface CreateAgentcoreCognitoAuthProps {
  /** Cognito configuration from the module config; an empty object accepts all defaults. */
  readonly cognitoConfig: CognitoAuthProperty;
  /** MDAA naming module for resource names. */
  readonly naming: MdaaConstructProps['naming'];
}

/** The MDAA-created Cognito resources, plus the values the runtime's authorizer needs. */
export interface AgentcoreCognitoAuth {
  /** The created user pool. */
  readonly userPool: UserPool;
  /** The created app client, whose ID is the runtime's allowed audience. */
  readonly userPoolClient: UserPoolClient;
  /** The hosted-UI domain, when `hostedUi` is configured. */
  readonly userPoolDomain?: UserPoolDomain;
  /**
   * OIDC discovery URL composed from the pool, for the runtime's `discoveryUrl`.
   *
   * This is an unresolved CDK token, which is load-bearing in two ways. It keeps the
   * pool and the runtime in one stack with no cross-stack or SSM indirection, and it
   * satisfies the runtime's synth-time discovery-URL pattern check — a CloudFormation
   * dynamic reference such as `{{resolve:ssm:...}}` does not match that pattern and
   * would fail synth, so publishing this to SSM for the user to reference back is not
   * a workable alternative.
   */
  readonly discoveryUrl: string;
  /**
   * The created client ID, for the runtime's `allowedAudience`.
   *
   * Cognito puts the app client ID in the **ID token's `aud`** claim but in the
   * **access token's `client_id`** claim, and AgentCore validates every claim filter
   * that is configured — so setting `allowedClients` as well would AND the two and
   * reject every caller. This path therefore commits to ID-token callers: MDAA never sets
   * `allowedClients`, and the runtime module rejects a config that combines it with
   * `cognito`. Access-token callers are supported via the `discoveryUrl` path with a
   * hand-configured `allowedClients`.
   */
  readonly audience: string;
}

/**
 * Creates an MDAA-managed Cognito user pool and app client configured for AgentCore
 * inbound JWT authorization, and returns the composed discovery URL and audience for
 * the runtime's authorizer.
 *
 * Security defaults, following the AgentCore security guidance and the GAIA v2 pool:
 *
 * - `featurePlan: PLUS` with `standardThreatProtectionMode: FULL_FUNCTION`, the current
 *   threat-protection API (the deprecated `advancedSecurityMode` throws if combined with it)
 * - 8+ character mixed-class password policy
 * - Admin-created users only (`selfSignUpEnabled: false`) and email-only account recovery,
 *   so no SMS-based recovery path exists
 * - MFA required by default, with TOTP as the only second factor
 * - 15-minute ID and access tokens and a 1-day refresh token, `preventUserExistenceErrors`,
 *   `enableTokenRevocation`
 * - Pool retained on stack deletion, with Cognito deletion protection enabled
 * - OAuth disabled, and the plaintext-password auth flow omitted, unless a hosted UI is
 *   configured — in which case managed login and a branding style are created with it
 */
export function createAgentcoreCognitoAuth(
  scope: Construct,
  id: string,
  props: CreateAgentcoreCognitoAuthProps,
): AgentcoreCognitoAuth {
  const config = props.cognitoConfig;
  const tokenValidity = Duration.minutes(resolveTokenValidityMinutes(config.idTokenValidityMinutes));
  const removalPolicy = config.removalPolicy ?? DEFAULT_REMOVAL_POLICY;
  const mfa = config.mfa ?? DEFAULT_MFA_MODE;

  const userPool = new UserPool(scope, `${id}UserPool`, {
    userPoolName: props.naming.withResourceType(MdaaResourceType.COGNITO_USER_POOL).resourceName(undefined, 128),
    removalPolicy: REMOVAL_POLICIES[removalPolicy],
    // Tied to the removal policy rather than exposed separately: deletion protection on a
    // pool the stack is meant to delete renders a stack that cannot be deleted without a
    // manual console step, and CDK does not reject that combination.
    deletionProtection: removalPolicy === 'retain',
    // Threat protection requires the PLUS feature plan; FULL_FUNCTION makes Cognito act
    // on detected risk rather than only recording it.
    featurePlan: FeaturePlan.PLUS,
    standardThreatProtectionMode: StandardThreatProtectionMode.FULL_FUNCTION,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigits: true,
      requireSymbols: true,
    },
    // Users are created by an administrator. A runtime's callers are provisioned
    // deliberately, so open self-signup would be an unauthenticated write path.
    selfSignUpEnabled: false,
    signInAliases: { email: true },
    autoVerify: { email: true },
    // Email only: SMS recovery is vulnerable to SIM-swap and would require the pool to
    // carry an SMS role with broader reach than this module needs.
    accountRecovery: AccountRecovery.EMAIL_ONLY,
    mfa: MFA_MODES[mfa],
    // TOTP only, for the same reason recovery is email-only.
    mfaSecondFactor: { otp: true, sms: false },
  });

  const federationProvider = registerFederationProvider(scope, id, userPool, config.federation, config.hostedUi);

  const userPoolClient = userPool.addClient(`${id}Client`, {
    userPoolClientName: props.naming
      .withResourceType(MdaaResourceType.COGNITO_USER_POOL_CLIENT)
      .resourceName(undefined, 128),
    // A public client with no secret: the caller authenticates as a user, so a shared
    // client secret would add a credential to distribute without binding any identity.
    generateSecret: false,
    // SRP always; the plaintext-password flow only where nothing else can be used.
    //
    // USER_PASSWORD_AUTH sends the password itself to the Cognito API (over TLS) instead of
    // proving knowledge of it via SRP's challenge-response, so it is the broader of the two
    // and worth enabling only where it is needed. With a hosted UI, sign-in happens through
    // managed login's authorization-code grant, which is independent of these flows — a
    // browser-based deployment never issues USER_PASSWORD_AUTH itself. Without one, the
    // caller talks to InitiateAuth directly and a non-interactive caller in particular
    // cannot perform the SRP exchange, so the plaintext flow is the only option.
    //
    // Keyed on hostedUi rather than on `mfa`: MFA governs whether a second factor is
    // enforced, not which first-factor protocols the client may use. Deriving the auth
    // surface from the MFA mode would mean a change to MFA silently widened or narrowed it.
    authFlows: { userPassword: !config.hostedUi, userSrp: true },
    idTokenValidity: tokenValidity,
    accessTokenValidity: tokenValidity,
    refreshTokenValidity: REFRESH_TOKEN_VALIDITY,
    preventUserExistenceErrors: true,
    enableTokenRevocation: true,
    supportedIdentityProviders: [
      UserPoolClientIdentityProvider.COGNITO,
      ...(federationProvider ? [UserPoolClientIdentityProvider.custom(federationProvider.providerName)] : []),
    ],
    ...buildClientOAuthOptions(config.hostedUi),
  });

  // CDK renders `SupportedIdentityProviders` from the provider's name, which does not by
  // itself order the client after the provider resource. Without this the client can be
  // created first and fail with an unrecognized-provider error.
  if (federationProvider) {
    userPoolClient.node.addDependency(federationProvider);
  }

  const userPoolDomain = config.hostedUi
    ? userPool.addDomain(`${id}Domain`, {
        cognitoDomain: { domainPrefix: resolveDomainPrefix(config.hostedUi, props.naming) },
        // Opt in to managed login explicitly rather than inheriting Cognito's default of
        // the classic hosted UI. Managed login is the current sign-in experience and the
        // one that walks a user through registering a TOTP authenticator, which matters
        // for any pool configured with `mfa: required` — that is the only enrolment path
        // Cognito provides, short of the caller implementing AssociateSoftwareToken and
        // VerifySoftwareToken itself. Requires the Essentials or Plus feature plan; this
        // pool is always PLUS.
        managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN,
      })
    : undefined;

  // Managed login needs a branding style to render. The console assigns a default one; the
  // API and CloudFormation do not, and `ManagedLoginVersion: 2` alone does not activate the
  // pages — so without this the hosted-UI sign-in page never renders, and with it the
  // TOTP-enrolment path the `required` MFA default relies on. `useCognitoProvidedValues`
  // takes Cognito's default style rather than exposing branding as config, which is a
  // presentation concern this module has no opinion on.
  if (userPoolDomain) {
    new CfnManagedLoginBranding(scope, `${id}ManagedLoginBranding`, {
      userPoolId: userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });
  }

  suppressNonRequiredMfaFindings(userPool, mfa, config.federation);
  warnMfaOffWithoutFederation(scope, mfa, config.federation);
  warnRequiredMfaWithoutHostedUi(scope, mfa, config.hostedUi);

  return {
    userPool,
    userPoolClient,
    userPoolDomain,
    discoveryUrl: `https://cognito-idp.${Stack.of(scope).region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
    audience: userPoolClient.userPoolClientId,
  };
}

/**
 * Validates and defaults the token validity.
 *
 * @throws Error if the configured value falls outside the accepted range
 */
function resolveTokenValidityMinutes(configured?: number): number {
  if (configured === undefined) {
    return DEFAULT_TOKEN_VALIDITY_MINUTES;
  }
  if (
    !Number.isInteger(configured) ||
    configured < MIN_TOKEN_VALIDITY_MINUTES ||
    configured > MAX_TOKEN_VALIDITY_MINUTES
  ) {
    throw new Error(
      `cognito.idTokenValidityMinutes must be a whole number of minutes between ${MIN_TOKEN_VALIDITY_MINUTES} and ` +
        `${MAX_TOKEN_VALIDITY_MINUTES} (received ${configured}). ` +
        `The AgentCore security guidance recommends 15-30 minutes for agentic workloads.`,
    );
  }
  return configured;
}

/**
 * Builds the client's OAuth options.
 *
 * CDK's `addClient` defaults are not safe here: a client created without OAuth options
 * emits `AllowedOAuthFlows: [implicit, code]`, the `aws.cognito.signin.user.admin` scope,
 * and `CallbackURLs: [https://example.com]` — an implicit grant returning tokens in the
 * URL fragment, aimed at a domain the deployer does not own. So OAuth is disabled unless
 * a hosted UI is configured, and when it is configured the flows and scopes are named
 * explicitly rather than defaulted.
 *
 * `disableOAuth` and `oAuth` are mutually exclusive in CDK (passing both throws), which
 * is why this returns one shape or the other rather than a merged object.
 */
function buildClientOAuthOptions(hostedUi?: CognitoHostedUiProperty): UserPoolClientOptions {
  if (!hostedUi) {
    return { disableOAuth: true };
  }

  validateHostedUi(hostedUi);
  const scopes = hostedUi.allowedOAuthScopes?.length ? hostedUi.allowedOAuthScopes : DEFAULT_OAUTH_SCOPES;

  return {
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
        // The implicit grant returns tokens in the redirect fragment, where they land in
        // browser history and referrer headers. The code grant supersedes it.
        implicitCodeGrant: false,
        clientCredentials: false,
      },
      scopes: scopes.map(scope => OAUTH_SCOPES[scope]),
      callbackUrls: hostedUi.callbackUrls,
      logoutUrls: hostedUi.logoutUrls,
    },
  };
}

/**
 * Validates the hosted-UI configuration.
 *
 * @throws Error if callbackUrls is empty or any URL is not https (localhost excepted)
 */
function validateHostedUi(hostedUi: CognitoHostedUiProperty): void {
  if (!hostedUi.callbackUrls?.length) {
    throw new Error(
      'cognito.hostedUi.callbackUrls is required and must contain at least one URL. ' +
        'Omit the hostedUi block entirely to disable the hosted UI and the OAuth flows with it.',
    );
  }
  for (const url of [...hostedUi.callbackUrls, ...(hostedUi.logoutUrls ?? [])]) {
    // Cognito permits plain http only for localhost, which keeps local development
    // possible without opening a cleartext redirect on a real domain.
    if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
      throw new Error(
        `cognito.hostedUi URLs must use https (received '${url}'). ` +
          'Cognito permits plain http only for http://localhost.',
      );
    }
  }
  if (hostedUi.cognitoDomainPrefix && !DOMAIN_PREFIX_PATTERN.test(hostedUi.cognitoDomainPrefix)) {
    throw new Error(
      `cognito.hostedUi.cognitoDomainPrefix '${hostedUi.cognitoDomainPrefix}' is invalid. ` +
        'Use 1-63 lowercase letters, digits, and hyphens, starting and ending with a letter or digit.',
    );
  }
}

/**
 * Resolves the hosted-UI domain prefix, defaulting to an MDAA naming-derived value.
 *
 * Cognito domain prefixes are globally unique per region, so the derived default can
 * collide with another org's pool. `cognitoDomainPrefix` is the escape hatch, and the
 * README documents the failure mode.
 */
function resolveDomainPrefix(hostedUi: CognitoHostedUiProperty, naming: MdaaConstructProps['naming']): string {
  return (
    hostedUi.cognitoDomainPrefix ??
    naming.withResourceType(MdaaResourceType.COGNITO_USER_POOL_DOMAIN).resourceName(undefined, 63).toLowerCase()
  );
}

/**
 * Registers the configured enterprise identity provider on the pool, if any.
 *
 * @returns the registered provider, or undefined when no federation is configured
 * @throws Error if both saml and oidc are configured, or a provider config is invalid
 */
function registerFederationProvider(
  scope: Construct,
  id: string,
  userPool: UserPool,
  federation?: CognitoFederationProperty,
  hostedUi?: CognitoHostedUiProperty,
): UserPoolIdentityProviderSaml | UserPoolIdentityProviderOidc | undefined {
  if (!federation) {
    return undefined;
  }
  // Federated users can only sign in through the hosted-UI Login or Authorize endpoints —
  // Cognito does not accept them via InitiateAuth. Without `hostedUi` there is no domain
  // hosting those endpoints and the client has OAuth disabled, so the provider would be
  // created, referenced in SupportedIdentityProviders, and unreachable. There is no working
  // configuration here, hence an error rather than the warning used for required MFA.
  if (!hostedUi) {
    throw new Error(
      'cognito.federation requires cognito.hostedUi. Cognito signs federated users in only through ' +
        'the hosted-UI Login/Authorize endpoints, so a pool with federation but no hosted UI has no ' +
        'domain and no OAuth flow those users could use — the identity provider would be created but ' +
        'unreachable.',
    );
  }
  if (federation.saml && federation.oidc) {
    throw new Error(
      'cognito.federation accepts at most one of saml or oidc. Federating one pool to two ' +
        'enterprise providers is not supported by this module.',
    );
  }

  if (federation.saml) {
    validateHttpsUrl(federation.saml.metadataUrl, 'cognito.federation.saml.metadataUrl');
    return new UserPoolIdentityProviderSaml(scope, `${id}SamlProvider`, {
      userPool,
      metadata: UserPoolIdentityProviderSamlMetadata.url(federation.saml.metadataUrl),
      attributeMapping: buildEmailAttributeMapping(federation.saml.emailClaim),
    });
  }

  if (federation.oidc) {
    validateHttpsUrl(federation.oidc.issuerUrl, 'cognito.federation.oidc.issuerUrl');
    if (!federation.oidc.clientId || !federation.oidc.clientSecret) {
      throw new Error('cognito.federation.oidc requires both clientId and clientSecret.');
    }
    return new UserPoolIdentityProviderOidc(scope, `${id}OidcProvider`, {
      userPool,
      issuerUrl: federation.oidc.issuerUrl,
      clientId: federation.oidc.clientId,
      clientSecret: federation.oidc.clientSecret,
      scopes: ['openid', 'profile', 'email'],
      attributeMapping: buildEmailAttributeMapping(federation.oidc.emailClaim),
    });
  }

  return undefined;
}

/** Maps the federated provider's email claim onto the pool's `email` attribute. */
function buildEmailAttributeMapping(emailClaim?: string): AttributeMapping {
  return { email: ProviderAttribute.other(emailClaim ?? 'email') };
}

/**
 * @throws Error if the URL is not https
 */
function validateHttpsUrl(url: string, fieldName: string): void {
  if (!url?.startsWith('https://')) {
    throw new Error(`${fieldName} must be an https URL (received '${url}').`);
  }
}

/**
 * Warns at synth when MFA is required but no hosted UI exists to enrol users.
 *
 * This combination is valid and often deliberate — an application with its own sign-in
 * screen drives the TOTP enrolment flow itself. But it is also what a deployment that took
 * the defaults gets, and in that case nothing surfaces until the first sign-in fails with
 * an unexpected `MFA_SETUP` challenge, whose error text does not mention MFA. The warning
 * turns a late, confusing runtime failure into a deploy-time message naming both exits.
 *
 * A warning rather than an error: synth cannot distinguish the deliberate case from the
 * accidental one, and failing would reject a legitimate configuration.
 */
function warnRequiredMfaWithoutHostedUi(
  scope: Construct,
  mfa: CognitoMfaMode,
  hostedUi?: CognitoHostedUiProperty,
): void {
  if (mfa !== 'required' || hostedUi) {
    return;
  }
  Annotations.of(scope).addWarningV2(
    '@aws-mdaa/agentcore-shared:cognitoRequiredMfaWithoutHostedUi',
    `cognito.mfa is 'required' (the default) and cognito.hostedUi is not configured, so this user pool ` +
      `requires every user to register a TOTP authenticator before they can obtain a token, and provides no ` +
      `hosted UI to guide them through it. Your application must drive the enrolment flow: InitiateAuth returns ` +
      `an MFA_SETUP challenge, then AssociateSoftwareToken, VerifySoftwareToken, and RespondToAuthChallenge ` +
      `complete registration. Configure cognito.hostedUi to have Cognito's managed login do this instead, or set ` +
      `cognito.mfa: 'optional' if tokens are obtained by a caller with no human present to enrol — such a caller ` +
      `cannot register an authenticator. See the module README section on inbound authorization.`,
  );
}

/**
 * Warns at synth when MFA is disabled on a pool whose users are not all federated.
 *
 * `off` removes the second factor for every principal and prevents a human from enrolling
 * TOTP even voluntarily. It is justified where Cognito would apply no second factor anyway
 * — a pool whose users all sign in through a federated enterprise IdP, which authenticates
 * them itself — and the nag suppression states exactly that rationale. Nothing enforced it,
 * so a non-federated pool could disable MFA while the suppression asserted a federation
 * that was not there, masking a genuinely unprotected pool from `AwsSolutions-COG2`.
 *
 * A warning rather than an error: `off` without federation is a deliberate, if unusual,
 * choice for a pool no human signs in to, and rejecting it would remove a valid option.
 * `optional` is the better answer whenever any human does sign in directly, since it keeps
 * TOTP available to them.
 */
function warnMfaOffWithoutFederation(
  scope: Construct,
  mfa: CognitoMfaMode,
  federation?: CognitoFederationProperty,
): void {
  if (mfa !== 'off' || federation) {
    return;
  }
  Annotations.of(scope).addWarningV2(
    '@aws-mdaa/agentcore-shared:cognitoMfaOffWithoutFederation',
    `cognito.mfa is 'off' but cognito.federation is not configured, so this pool has no second factor for any ` +
      `principal and a human signing in directly cannot enrol one even voluntarily. 'off' is intended for a pool ` +
      `whose users all authenticate through a federated enterprise IdP, which applies its own MFA — the ` +
      `AwsSolutions-COG2 suppression on this pool states that rationale. Use cognito.mfa: 'optional' if any human ` +
      `signs in to this pool directly, so TOTP remains available to them, or the default 'required' where every ` +
      `caller is a human.`,
  );
}

/**
 * Suppresses the MFA nag rules when MFA is not `required`, documenting why.
 *
 * `AwsSolutions-COG2` treats any `MfaConfiguration` other than `ON` as non-compliant. The
 * module default is `required`, so a pool that took the defaults carries no suppression —
 * it exists for the deployment that deliberately sets `off` or `optional`.
 *
 * That is not a weakening of MFA so much as a recognition that it does not apply: a caller
 * with no human present cannot register an authenticator, and Cognito challenges for the
 * preferred factor on every sign-in rather than only the first, so such a caller would have
 * to keep a TOTP seed beside the password — making the "second" factor a second copy of the
 * first.
 *
 * Applied only when MFA is not `required`, so a pool that requires MFA carries no
 * unnecessary suppression and any future regression away from `required` resurfaces.
 *
 * The `off` branch is additionally gated on `federation` being configured. Its justification
 * is that Cognito applies no second factor to federated users anyway, so MFA is enforced at
 * the IdP instead — a claim that only holds when there is an IdP. Without federation, `off`
 * leaves a pool with genuinely no second factor for anyone, and suppressing `AwsSolutions-COG2`
 * there would hide exactly the finding the rule exists to raise. That pool keeps the nag.
 */
function suppressNonRequiredMfaFindings(
  userPool: UserPool,
  mfa: CognitoMfaMode,
  federation?: CognitoFederationProperty,
): void {
  if (mfa === 'required') {
    return;
  }
  // No federation to delegate MFA to, so the off-mode justification does not apply and the
  // pool is left to raise AwsSolutions-COG2 on its own merits.
  if (mfa === 'off' && !federation) {
    return;
  }
  // 'optional' and 'off' relax different amounts of the control, so they get different
  // reasons. Conflating them would justify the weaker setting with the stronger case.
  const optionalReason =
    "MFA is set to 'optional' rather than the module default of 'required' because this pool issues tokens to " +
    'callers with no human present, authenticating via USER_PASSWORD_AUTH/USER_SRP_AUTH. Such a caller cannot ' +
    'register a TOTP authenticator, and Cognito challenges for the preferred factor on every sign-in, so the seed ' +
    'would have to be stored beside the password — making the second factor a second copy of the first. TOTP ' +
    'remains available, so any human who does sign in to this pool can still enrol and is then challenged. Set ' +
    "mfa: 'required' (the default) where every caller is a human.";
  const offReason =
    "MFA is set to 'off', which removes the second factor for every principal in this pool — including a human " +
    'signing in directly, who cannot enrol TOTP even voluntarily. This is intended only where Cognito applies no ' +
    'second factor in the first place: a pool whose users all authenticate through a federated enterprise IdP, ' +
    'since Cognito delegates authentication for federated users and offers them no additional factor, so MFA must ' +
    "be enforced at that IdP. Use mfa: 'optional' if any user signs in to this pool directly, or the default " +
    "mfa: 'required' where every caller is a human.";
  const reason = mfa === 'off' ? offReason : optionalReason;

  MdaaNagSuppressions.addCodeResourceSuppressions(
    userPool,
    [
      // AwsSolutions-COG2 only: cdk-nag wires CognitoUserPoolMFA into the AwsSolutions pack
      // alone. The NIST 800-53 R5, HIPAA Security, and PCI DSS 3.2.1 packs carry no Cognito
      // rules, so suppressing IDs in those packs would be inert and would assert a
      // compliance claim the tooling never made.
      { id: 'AwsSolutions-COG2', reason: reason },
    ],
    // Pool-scoped, not propagated to children: COG2 evaluates MfaConfiguration on
    // AWS::Cognito::UserPool, so it can never fire on the client, domain, branding style, or
    // identity providers. Propagating there would be inert and would leave a suppression on
    // resources the rule does not examine.
    false,
  );
}
