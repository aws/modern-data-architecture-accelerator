/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import {
  AccountPrincipal,
  ArnPrincipal,
  Condition,
  Effect,
  IPrincipal,
  IRole,
  ISamlProvider,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  PrincipalWithConditions,
  SamlMetadataDocument,
  SamlPrincipal,
  SamlProvider,
  ServicePrincipal,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { CfnResourceShare } from 'aws-cdk-lib/aws-ram';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

/**
 * Define UsageProfile types
 */
export enum BasePersona {
  DATA_ADMIN = 'data-admin',
  DATA_ENGINEER = 'data-engineer',
  DATA_SCIENTIST = 'data-scientist',
}
export interface PersonaConfigProps {
  readonly personas: { [key: string]: Array<string> };
}
/**
 * SAML identity federation configuration for IAM identity provider setup.
 * Specify either an existing provider ARN or a SAML metadata document path to create a new one.
 *
 * Use cases: SAML federation with external IdPs; SSO integration; Enterprise authentication
 *
 * AWS: IAM SAML identity provider for federated authentication
 *
 * Validation: Exactly one of providerArn or samlDoc must be specified
 */
export interface FederationProps {
  /**
   * ARN of an existing IAM SAML identity provider.
   * Mutually exclusive with samlDoc.
   *
   * Use cases: Reusing pre-configured SAML federation
   *
   * AWS: IAM SAML provider ARN reference
   *
   * Validation: Optional; must be valid IAM SAML provider ARN; mutually exclusive with samlDoc
   */
  readonly providerArn?: string;
  /**
   * File path to a SAML metadata XML document for creating a new IAM SAML provider.
   * Relative paths should be prefixed with "./". Mutually exclusive with providerArn.
   *
   * Use cases: New SAML federation setup; Custom IdP integration
   *
   * AWS: IAM SAML provider creation from metadata document
   *
   * Validation: Optional; must be valid file path to SAML metadata XML; mutually exclusive with providerArn
   */
  readonly samlDoc?: string;
}

export interface GenerateManagedPolicyWithNameProps extends GenerateManagedPolicyProps {
  /**
   * Name of the managed policy.
   */
  readonly name: string;
}
export interface GenerateManagedPolicyProps {
  /**
   * Managed policy document contents.
   */
  readonly policyDocument: PolicyDocument;
  /**
   * CDK Nag suppressions if policyDocument generates Nags.
   */
  readonly suppressions?: SuppressionProps[];
  /**
   * If true (default false), policy name will be set verbatim instead of using the naming class
   */
  readonly verbatimPolicyName?: boolean;
  /**
   * Additional policy statements that may be added to policyDocument
   */
  readonly statements?: PolicyStatement[];
}
/**
 * CDK Nag suppression configuration for justified security rule exceptions.
 *
 * Use cases: Documented compliance exceptions; CDK Nag rule suppression with audit trail
 *
 * AWS: CDK Nag suppression for IAM policy and role compliance
 *
 * Validation: id and reason required
 */
export interface SuppressionProps {
  /**
   * CDK Nag rule ID to suppress (e.g. "AwsSolutions-IAM5").
   *
   * Use cases: Specific security rule bypassing with justification
   *
   * AWS: CDK Nag rule identifier
   *
   * Validation: Required; must be valid CDK Nag rule ID
   */
  readonly id: string;
  /**
   * Business justification for the suppression.
   *
   * Use cases: Audit trail; Compliance documentation
   *
   * AWS: CDK Nag suppression reason for audit compliance
   *
   * Validation: Required; descriptive string explaining the exception
   */
  readonly reason: string;
}
export interface GenerateRoleWithNameProps extends GenerateRoleProps {
  /**
   * Name of the role.
   */
  readonly name: string;
}
/**
 * Trusted principal for IAM role trust policy with optional additional actions.
 *
 * Use cases: Multi-service trust; Additional STS actions (e.g. sts:SetSourceIdentity)
 *
 * AWS: IAM role trust policy principal with optional additional trusted actions
 *
 * Validation: trustedPrincipal required; additionalTrustedActions optional
 */
export interface TrustedPrincipalProps {
  /**
   * AWS principal identifier for trust policy. Supports formats:
   * "this_account", "service:svc.amazonaws.com", "account:123456789012",
   * "federation:name", "webidentity:oidc-provider-arn", or ARN.
   *
   * Use cases: Service trust; Cross-account trust; Federation trust;
   * OIDC web identity federation (e.g. GitLab CI/CD, GitHub Actions)
   *
   * AWS: IAM trust policy principal specification
   *
   * Validation: Required; must be valid principal identifier
   */
  readonly trustedPrincipal: string;
  /**
   * Additional STS actions the trusted principal can perform beyond sts:AssumeRole
   * (e.g. ["sts:SetSourceIdentity"]).
   *
   * Use cases: Extended trust capabilities; Source identity propagation
   *
   * AWS: IAM trust policy additional actions
   *
   * Validation: Optional; array of valid IAM action strings
   */
  readonly additionalTrustedActions?: string[];
}

/**
 * IAM role generation configuration with persona-based permissions, trust policies,
 * and managed policy attachments. Supports multiple trust principals, conditional
 * access, and both AWS and customer managed policies.
 *
 * Use cases: Automated role creation; Persona-based permissions; Multi-principal trust; Conditional access
 *
 * AWS: IAM role with configurable trust policy, managed policy attachments, and CDK Nag suppressions
 *
 * Validation: trustedPrincipal required; all other properties optional
 */
export interface GenerateRoleProps {
  /**
   * Base persona determining the default set of MDAA managed policies attached to the role.
   * Valid values: data-admin, data-engineer, data-scientist.
   *
   * Use cases: Standardized permission sets; Role template application
   *
   * AWS: MDAA persona-based managed policy attachments
   *
   * Validation: Optional; must be valid BasePersona enum value
   */
  readonly basePersona?: BasePersona;
  /**
   * Primary trusted principal for the role's trust policy. Supports formats:
   * "this_account", "service:svc.amazonaws.com", "account:123456789012",
   * "federation:name", "webidentity:oidc-provider-arn", or ARN.
   *
   * Use cases: Service trust; Cross-account trust; Federation-based assume role;
   * OIDC web identity federation (e.g. GitLab CI/CD, GitHub Actions)
   *
   * AWS: IAM role trust policy primary principal
   *
   * Validation: Required; must be valid principal identifier
   */
  readonly trustedPrincipal: string;
  /**
   * Additional STS actions the primary trusted principal can perform beyond the default
   * assume role action (e.g. ["sts:TagSession", "sts:SetSourceIdentity"]).
   *
   * Use cases: Session tagging for principals with principal tags; ABAC; OIDC federation
   *
   * AWS: IAM trust policy additional actions
   *
   * Validation: Optional; array of valid IAM action strings
   */
  readonly additionalTrustedActions?: string[];
  /**
   * Additional principals that can assume this role beyond the primary.
   * Each can specify additional trusted actions (e.g. sts:SetSourceIdentity).
   *
   * Use cases: Multi-service trust; Cross-account sharing; Complex trust relationships
   *
   * AWS: IAM role trust policy additional principals
   *
   * Validation: Optional; array of valid TrustedPrincipalProps
   */
  readonly additionalTrustedPrincipals?: TrustedPrincipalProps[];
  /**
   * IAM conditions for the assume role trust policy (e.g. StringEquals on aws:PrincipalArn).
   * Provides context-aware access restrictions.
   *
   * Use cases: Conditional role assumption; IP-based restrictions; Principal ARN constraints
   *
   * AWS: IAM trust policy conditions
   *
   * Validation: Optional; must be valid IAM condition key-value pairs
   */
  readonly assumeRoleTrustConditions?: { [key: string]: Condition };

  /**
   * When true, uses the exact role name without MDAA naming prefixes.
   *
   * Use cases: Legacy integration; Exact role name requirements
   *
   * AWS: IAM role naming control
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly verbatimRoleName?: boolean;
  /**
   * AWS accounts allowed to read this role's generated-role ARN and id SSM parameters. A RAM share
   * always names its principals, so only the accounts listed here can read them.
   *
   * Set this when a deployment in another account must reference this role but cannot construct
   * its ARN, since MDAA hash-truncates a role name at 64 characters. The accounts must be in the
   * same AWS Organization and region as this deployment, and the shared parameters move to the
   * billed Advanced tier that RAM requires. The module README explains why each holds.
   *
   * Use cases: Granting a role to a bucket or key policy in another account; Cross-account role references
   *
   * AWS: SSM Advanced-tier parameters and a RAM resource share
   *
   * Validation: Optional; array of 12-digit AWS account IDs in this account's AWS Organization
   * @default - no parameters are shared and all parameters stay in the Standard tier
   */
  readonly shareParametersWithAccounts?: string[];
  /**
   * AWS managed policy names to attach (e.g. "service-role/AWSGlueServiceRole").
   *
   * Use cases: Standardized AWS permissions; Common service role policies
   *
   * AWS: AWS managed policy attachments on IAM role
   *
   * Validation: Optional; array of valid AWS managed policy names
   */
  readonly awsManagedPolicies?: string[];
  /**
   * Existing customer managed policy names to attach.
   *
   * Use cases: Organization-specific permissions; Pre-existing policy reuse
   *
   * AWS: Customer managed policy attachments on IAM role
   *
   * Validation: Optional; array of valid customer managed policy names
   */
  readonly customerManagedPolicies?: string[];
  /**
   * Names of policies from the generatePolicies config section to attach.
   *
   * Use cases: Dynamic policy attachment; Config-driven permission management
   *
   * AWS: Generated managed policy attachments on IAM role
   *
   * Validation: Optional; must reference valid policy names from generatePolicies config
   */
  readonly generatedPolicies?: string[];
  /**
   * Suppressions if required by the role configuration.
   */
  readonly suppressions?: SuppressionProps[];
}
export interface RolesL3ConstructProps extends MdaaL3ConstructProps {
  /** Federation configurations for SAML identity provider integration. */
  readonly federations?: { [key: string]: FederationProps };
  /** Managed policy definitions for custom policy creation. */
  readonly generatePolicies?: GenerateManagedPolicyWithNameProps[];
  /** IAM role definitions for custom role creation. */
  readonly generateRoles?: GenerateRoleWithNameProps[];
  /** When true (default), creates MDAA persona-based managed policies. */
  readonly createPersonaManagedPolicies?: boolean;
}

interface MdaaPersonaAndManagedPolicies {
  /**
   * Map of persona names to list of managed policy names
   */
  readonly personaToMdaaPolicyMap: { [personaName: string]: string[] };
  /**
   * Map of managed policy-name to MDAA Managed Policy
   */
  readonly mdaaPolicies: { [policyName: string]: MdaaManagedPolicy };
}

export class RolesL3Construct extends MdaaL3Construct {
  protected readonly props: RolesL3ConstructProps;
  protected readonly personaToMdaaPolicyMap: { [personaName: string]: string[] };
  protected readonly mdaaManagedPolicies: { [policyName: string]: MdaaManagedPolicy };

  public readonly generatedRoles: { [key: string]: IRole };

  constructor(scope: Construct, id: string, props: RolesL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    if (props.createPersonaManagedPolicies || props.createPersonaManagedPolicies == undefined) {
      const mdaaPersonaAndManagedPolicies = this.createMdaaManagedPolicies();
      this.personaToMdaaPolicyMap = mdaaPersonaAndManagedPolicies.personaToMdaaPolicyMap;
      this.mdaaManagedPolicies = mdaaPersonaAndManagedPolicies.mdaaPolicies;
    } else {
      this.personaToMdaaPolicyMap = {};
      this.mdaaManagedPolicies = {};
    }

    const federationProviders = this.createFederations();
    const generatedPolicies = this.createManagedPolicies();
    this.generatedRoles = this.createRoles(federationProviders, generatedPolicies) || {};
  }

  private createFederations(): { [key: string]: ISamlProvider } {
    const federations: { [key: string]: ISamlProvider } = {};
    Object.keys(this.props.federations || {}).forEach(fedConfigName => {
      const fedConfig = (this.props.federations || {})[fedConfigName];
      if (fedConfig.providerArn) {
        if (fedConfig.samlDoc) {
          throw new Error("Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config");
        }
        federations[fedConfigName] = SamlProvider.fromSamlProviderArn(
          this.scope,
          `resolved-provider-${fedConfigName}`,
          fedConfig.providerArn,
        );
      } else if (fedConfig.samlDoc) {
        if (fedConfig.providerArn) {
          throw new Error("Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config");
        }
        federations[fedConfigName] = new SamlProvider(this.scope, `saml-provider-${fedConfigName}`, {
          name: this.props.naming.withResourceType(MdaaResourceType.IAM_SAML_PROVIDER).resourceName(fedConfigName),
          metadataDocument: SamlMetadataDocument.fromFile(fedConfig.samlDoc),
        });
      } else {
        throw new Error("Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config");
      }
    });
    return federations;
  }

  private createManagedPolicies(): { [key: string]: ManagedPolicy } {
    const generatedPolicies: { [key: string]: ManagedPolicy } = {};
    this.props.generatePolicies?.forEach(policyProps => {
      const policy = new MdaaManagedPolicy(this.scope, `policy-${policyProps.name}`, {
        naming: this.props.naming,
        managedPolicyName: policyProps.name,
        verbatimPolicyName: policyProps.verbatimPolicyName,
        document: policyProps.policyDocument,
      });
      generatedPolicies[policyProps.name] = policy;
      if (policyProps.suppressions) {
        MdaaNagSuppressions.addConfigResourceSuppressions(policy, policyProps.suppressions, true);
      }
    });
    return generatedPolicies;
  }

  private createMdaaManagedPolicies(): MdaaPersonaAndManagedPolicies {
    const personaToMdaaPolicyMap: { [key: string]: string[] } = {};
    const personaConfig = this.loadPolicyConfig('../policy-statements/persona-map.yaml') as PersonaConfigProps;
    const mdaaPolicySet = new Set<string>();
    Object.entries(personaConfig.personas).forEach(([basePersona, personaProps]) => {
      personaProps.forEach(policyConfigFile => {
        mdaaPolicySet.add(policyConfigFile);
        if (this.getFileName(policyConfigFile)) {
          if (!personaToMdaaPolicyMap[basePersona]) {
            personaToMdaaPolicyMap[basePersona] = [];
          }
          personaToMdaaPolicyMap[basePersona].push(this.getFileName(policyConfigFile));
        }
      });
    });

    const mdaaGeneratedPolicies: { [key: string]: MdaaManagedPolicy } = {};
    mdaaPolicySet.forEach(policyConfigFile => {
      const name = this.getFileName(policyConfigFile);
      if (name) {
        const managedPolicyProps = this.loadPolicyConfig(`../policy-statements/${policyConfigFile}.yaml`) as {
          statements?: PolicyStatement[];
          suppressions?: SuppressionProps[];
        };
        const policyStatements: PolicyStatement[] = (managedPolicyProps.statements || []).map(statement => {
          return PolicyStatement.fromJson(statement);
        });
        // Create MDAA Managed Policy
        const mdaaPolicy = new MdaaManagedPolicy(this.scope, `caef-managed-policy-${name}`, {
          naming: this.props.naming,
          managedPolicyName: name,
          document: new PolicyDocument({
            statements: policyStatements,
          }),
        });

        // Add Suppression
        if (managedPolicyProps.suppressions) {
          MdaaNagSuppressions.addCodeResourceSuppressions(mdaaPolicy, managedPolicyProps.suppressions, true);
        }
        mdaaGeneratedPolicies[name] = mdaaPolicy;
      }
    });

    return {
      personaToMdaaPolicyMap: personaToMdaaPolicyMap,
      mdaaPolicies: mdaaGeneratedPolicies,
    };
  }

  private getFileName(policyConfigFile: string) {
    return policyConfigFile.split('/').pop() || '';
  }

  private createRoles(
    federationProviders: { [key: string]: ISamlProvider },
    generatedPolicies: { [key: string]: ManagedPolicy },
  ): { [key: string]: IRole } | undefined {
    const generatedRoles = this.props.generateRoles?.map(generateRole => {
      const awsManagedPolicies = generateRole.awsManagedPolicies?.map(policyName =>
        MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(this, policyName),
      );
      const customerManagedPolicies = generateRole.customerManagedPolicies?.map(policyName =>
        ManagedPolicy.fromManagedPolicyName(this.scope, `${generateRole.name}-${policyName}`, policyName),
      );
      const managedPolicies = [...(awsManagedPolicies || []), ...(customerManagedPolicies || [])];

      // OIDC providers are not account-bound, so a webidentity trust with no conditions would permit
      // sts:AssumeRoleWithWebIdentity from ANY identity issued by the provider. Require the operator to
      // scope the trust on the provider's OWN identity claims (condition keys prefixed with the OIDC
      // issuer host, e.g. "gitlab.com:sub"). Merely having a non-empty condition is not enough: an empty
      // {} / { StringLike: {} } scopes nothing, and a condition on an unrelated key (e.g. aws:RequestTag)
      // leaves the OIDC principal effectively unscoped. Keying on the issuer-host prefix rather than a
      // fixed claim name lets operators use :sub (GitLab/GitHub) or :aud (Cognito identity pools) as
      // appropriate to their provider.
      if (generateRole.trustedPrincipal.startsWith('webidentity:')) {
        const providerId = RolesL3Construct.webidentityProviderId(generateRole.trustedPrincipal);
        if (!RolesL3Construct.conditionsScopeProvider(providerId, generateRole.assumeRoleTrustConditions)) {
          throw new Error(
            `Role '${generateRole.name}': webidentity trusted principals require assumeRoleTrustConditions ` +
              `that constrain the OIDC trust on the provider's own claims (at least one condition key ` +
              `beginning with '${providerId}:', e.g. '${providerId}:sub'); an unscoped condition, or one on ` +
              `an unrelated key, would allow any identity from the OIDC provider to assume the role.`,
          );
        }
      }

      const resolvedTrustPrincipal = this.resolveTrustedPrincipal(generateRole.trustedPrincipal, federationProviders);
      const trustPrincipal = generateRole.assumeRoleTrustConditions
        ? new PrincipalWithConditions(resolvedTrustPrincipal, generateRole.assumeRoleTrustConditions)
        : resolvedTrustPrincipal;
      const role = new MdaaRole(this.scope, generateRole.name, {
        assumedBy: trustPrincipal,
        roleName: generateRole.name,
        managedPolicies: managedPolicies,
        naming: this.props.naming,
        verbatimRoleName: generateRole.verbatimRoleName,
      });

      if (role.assumeRolePolicy && generateRole.additionalTrustedActions?.length) {
        RolesL3Construct.validateTrustedActions(
          generateRole.additionalTrustedActions,
          `role '${generateRole.name}' additionalTrustedActions`,
        );
        // Reuse the (optionally condition-scoped) trustPrincipal rather than the raw resolvedTrustPrincipal
        // so the same assumeRoleTrustConditions apply here. Otherwise a webidentity primary with
        // additionalTrustedActions would emit a second, unscoped statement granting those sts actions to
        // the OIDC provider, re-introducing the unscoped OIDC trust the primary guard prevents.
        role.assumeRolePolicy.addStatements(
          new PolicyStatement({
            actions: generateRole.additionalTrustedActions,
            principals: [trustPrincipal],
            effect: Effect.ALLOW,
          }),
        );
      }

      generateRole.additionalTrustedPrincipals?.forEach(trustPrincipalProps => {
        if (role.assumeRolePolicy) {
          // additionalTrustedPrincipals cannot carry trust conditions, so a webidentity principal here
          // could only ever produce an unscoped OIDC trust. Reject it and direct operators to the
          // primary trustedPrincipal (with assumeRoleTrustConditions) instead.
          if (trustPrincipalProps.trustedPrincipal.startsWith('webidentity:')) {
            throw new Error(
              `Role '${generateRole.name}': webidentity trusted principals are not supported as ` +
                `additionalTrustedPrincipals because their OIDC trust cannot be scoped with conditions. ` +
                `Configure the webidentity principal as the role's primary trustedPrincipal with assumeRoleTrustConditions.`,
            );
          }
          const trustPrincipal = this.resolveTrustedPrincipal(
            trustPrincipalProps.trustedPrincipal,
            federationProviders,
          );
          if (trustPrincipalProps.additionalTrustedActions?.length) {
            RolesL3Construct.validateTrustedActions(
              trustPrincipalProps.additionalTrustedActions,
              `role '${generateRole.name}' additionalTrustedPrincipals`,
            );
          }
          role.assumeRolePolicy.addStatements(
            new PolicyStatement({
              actions: [trustPrincipal.assumeRoleAction, ...(trustPrincipalProps.additionalTrustedActions || [])],
              principals: [trustPrincipal],
              effect: Effect.ALLOW,
            }),
          );
        }
      });

      if (generateRole.basePersona) {
        // Attach Mdaa Generated Policies to the roles based on the persona defined in 'persona-map.yaml'
        this.personaToMdaaPolicyMap[generateRole.basePersona].forEach(policyName => {
          this.mdaaManagedPolicies[policyName].attachToRole(role);
        });
      }

      if (generateRole.generatedPolicies) {
        generateRole.generatedPolicies.forEach(policyNamRef => {
          if (!generatedPolicies[policyNamRef]) {
            throw new Error(`Role ${generateRole.name} references non-existent policy: ${policyNamRef}`);
          } else {
            generatedPolicies[policyNamRef].attachToRole(role);
          }
        });
      }

      if (generateRole.suppressions) {
        MdaaNagSuppressions.addConfigResourceSuppressions(role, generateRole.suppressions, true);
      }

      // Advanced tier is what RAM requires in order to share a parameter, and an Advanced-tier
      // parameter is billed, so the tier follows the sharing config rather than being set always.
      const parameterTier = generateRole.shareParametersWithAccounts?.length ? ParameterTier.ADVANCED : undefined;
      const roleParameters = [
        new MdaaStringParameter(role, `${generateRole.name}-ssm-generated-role-arn`, {
          parameterName: this.props.naming.ssmPath(`generated-role/${generateRole.name}/arn`, false),
          stringValue: role.roleArn,
          tier: parameterTier,
        }),
        new MdaaStringParameter(role, `${generateRole.name}-ssm-generated-role-id`, {
          parameterName: this.props.naming.ssmPath(`generated-role/${generateRole.name}/id`, false),
          stringValue: role.roleId,
          tier: parameterTier,
        }),
      ];
      this.shareRoleParameters(generateRole, roleParameters);
      return [generateRole.name, role];
    });
    return Object.fromEntries(generatedRoles || []);
  }

  /**
   * Lets the configured accounts read this role's generated-role parameters, so a deployment there
   * can reference the role without reproducing MDAA's role naming - which it cannot do reliably,
   * since a name at or over 64 characters is truncated with a hash of the untruncated name.
   */
  private shareRoleParameters(generateRole: GenerateRoleWithNameProps, roleParameters: MdaaStringParameter[]) {
    const accounts = generateRole.shareParametersWithAccounts;
    if (!accounts || accounts.length == 0) {
      return;
    }
    new CfnResourceShare(this.scope, `${generateRole.name}-parameter-share`, {
      name: this.props.naming
        .withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE)
        .resourceName(`${generateRole.name}-params`),
      resourceArns: roleParameters.map(parameter => parameter.parameterArn),
      principals: accounts,
      // RAM defaults this to true, which lets the share reach accounts outside the organization.
      allowExternalPrincipals: false,
    });
  }

  private resolveTrustedPrincipal(ref: string, federationProviders: { [key: string]: ISamlProvider }): IPrincipal {
    if (ref.startsWith('service:')) {
      return new ServicePrincipal(ref.replace(/^service:\s*/, ''));
    } else if (ref.startsWith('account:')) {
      return new AccountPrincipal(ref.replace(/^account:\s*/, ''));
    } else if (ref.startsWith('arn:')) {
      return new ArnPrincipal(ref);
    } else if (ref.startsWith('federation:')) {
      const federation = federationProviders[ref.replace(/^federation:\s*/, '')];
      if (!federation) {
        throw new Error(`Role references non-existent federation in config: ${ref}`);
      }
      return new SamlPrincipal(federation, {});
    } else if (ref.startsWith('webidentity:')) {
      return new WebIdentityPrincipal(ref.replace(/^webidentity:\s*/, ''));
    } else if (ref == 'this_account') {
      return new AccountPrincipal(this.account);
    } else {
      throw new Error(
        "Trusted principal must start with service:, account:, webidentity:, federation: or equal 'this_account'",
      );
    }
  }

  private static readonly STS_ACTION_PATTERN = /^sts:[A-Za-z]+$/;

  private static validateTrustedActions(actions: string[], context: string): void {
    actions.forEach(action => {
      if (!RolesL3Construct.STS_ACTION_PATTERN.test(action)) {
        throw new Error(
          `Invalid action '${action}' in ${context}. Actions must match pattern '^sts:[A-Za-z]+$' (e.g. 'sts:TagSession', 'sts:SetSourceIdentity').`,
        );
      }
    });
  }

  /**
   * Extracts the OIDC issuer identifier from a `webidentity:<oidc-provider-arn>` trusted principal.
   * IAM OIDC condition keys are prefixed with this identifier (the issuer host/path), e.g. the ARN
   * `arn:aws:iam::123456789012:oidc-provider/gitlab.com` yields `gitlab.com`, whose claims appear as
   * `gitlab.com:sub`, `gitlab.com:aud`, etc. Returns '' if the ref is not a well-formed provider ARN.
   */
  private static webidentityProviderId(ref: string): string {
    const arn = ref.replace(/^webidentity:\s*/, '');
    return arn.split('oidc-provider/')[1] ?? '';
  }

  /**
   * Returns true only if the supplied trust conditions actually scope the OIDC trust to the given
   * provider — i.e. a positively-matching condition operator contains a key prefixed with
   * `<providerId>:` (typically `:sub`, or `:aud` for Cognito identity pools) whose value is not a bare
   * `*` wildcard. This deliberately rejects:
   *  - empty conditions (`{}`, `{ StringLike: {} }`),
   *  - conditions that only constrain unrelated keys (e.g. `aws:RequestTag/*`),
   *  - a provider claim matched against `*` (e.g. `{ StringLike: { 'gitlab.com:sub': '*' } }`), and
   *  - operators that do not positively pin the claim: negation (`StringNotEquals`/`StringNotLike`,
   *    which mean "any identity except…"), set operators satisfied when the claim is absent
   *    (`ForAllValues:*`), `*IfExists` variants (satisfied when the claim is absent), and `Null`.
   * all of which leave the OIDC principal effectively unscoped. It does not attempt to judge how narrow
   * a non-`*` value is: partial wildcards are legitimately used by operators and cannot be reliably
   * classified here.
   */
  private static conditionsScopeProvider(providerId: string, conditions?: { [key: string]: Condition }): boolean {
    if (!providerId) {
      return false;
    }
    return Object.entries(conditions ?? {}).some(
      ([operator, operatorValues]) =>
        RolesL3Construct.isPositiveMatchOperator(operator) &&
        typeof operatorValues === 'object' &&
        operatorValues !== null &&
        Object.entries(operatorValues).some(
          ([conditionKey, conditionValue]) =>
            conditionKey.startsWith(`${providerId}:`) && RolesL3Construct.isConstrainingValue(conditionValue),
        ),
    );
  }

  /**
   * A condition operator positively pins the claim only if it asserts the claim equals/matches a value
   * that is present in the request. Negation operators (`StringNotEquals`/`StringNotLike`) invert the
   * meaning, `ForAllValues:*` is vacuously satisfied when the claim is absent, `*IfExists` is satisfied
   * when the claim is absent, and `Null` tests presence rather than value — none of these constrain
   * *which* identity may assume the role, so they do not count as scoping the OIDC trust.
   */
  private static isPositiveMatchOperator(operator: string): boolean {
    return (
      operator !== 'Null' &&
      !operator.includes('Not') &&
      !operator.startsWith('ForAllValues:') &&
      !operator.endsWith('IfExists')
    );
  }

  /**
   * A condition value meaningfully constrains a claim unless it is a bare `*` wildcard (or an
   * array whose every entry is `*`), which matches any value and scopes nothing.
   */
  private static isConstrainingValue(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim() !== '*';
    }
    if (Array.isArray(value)) {
      // IAM OR-evaluates the values under a single condition key, so a bare '*' anywhere in the array
      // matches any identity. Require a non-empty array whose EVERY entry is constraining (fail closed):
      // one '*' entry makes the whole condition non-scoping.
      return value.length > 0 && value.every(entry => RolesL3Construct.isConstrainingValue(entry));
    }
    // Non-string/array values (e.g. numeric/boolean condition values) are inherently specific.
    return value !== null && value !== undefined;
  }

  private loadPolicyConfig(fileName: string) {
    // nosemgrep
    const configFilePath = resolve(__dirname, fileName);
    console.log('Reading config file from path' + configFilePath);
    try {
      //  Read the configuration file
      // nosemgrep
      const rawConfigFile = readFileSync(configFilePath, 'utf8');
      return parse(rawConfigFile);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
