/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
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
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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
 * Q-ENHANCED-INTERFACE
 * SAML identity federation configuration interface for IAM identity provider setup with SAML document integration and provider ARN management. Defines federation properties for establishing trust relationships between AWS and external identity providers using SAML 2.0 for federated access to AWS resources.
 *
 * Use cases: SAML identity federation; External identity provider integration; Federated access control; SSO integration; Identity provider trust relationships; Enterprise authentication
 *
 * AWS: IAM SAML identity provider configuration with SAML metadata document for federated authentication and access control
 *
 * Validation: providerArn must be valid IAM SAML provider ARN if specified; samlDoc must be valid SAML metadata document; exactly one of providerArn or samlDoc must be provided
 */
export interface FederationProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Existing SAML identity provider ARN for federated authentication with pre-configured identity provider integration. References an existing IAM SAML provider for establishing trust relationships with external identity systems, enabling federated access to AWS resources without creating new providers.
   *
   * Use cases: Existing provider integration; Pre-configured SAML federation; Identity provider reuse; Established trust relationships
   *
   * AWS: AWS IAM SAML identity provider ARN reference for federated authentication and access control
   *
   * Validation: Must be valid IAM SAML provider ARN if specified; provider must exist in the account; mutually exclusive with samlDoc
   **/
  readonly providerArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * SAML metadata document file path for creating new identity provider with custom federation configuration. Specifies the path to a SAML metadata document that will be used to create a new IAM SAML provider, enabling custom federation setup with external identity systems.
   *
   * Use cases: New provider creation; Custom federation setup; SAML metadata integration; Identity provider configuration
   *
   * AWS: AWS IAM SAML identity provider creation using SAML metadata document for federated authentication
   *
   * Validation: Must be valid file path to SAML metadata document if specified; document must be valid SAML format; mutually exclusive with providerArn
   **/
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
 * Q-ENHANCED-INTERFACE
 * SuppressionProps configuration interface for resource configuration and infrastructure management.
 *
 * Use cases: Identity management; Access control; Role-based permissions; Security policies
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface SuppressionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required suppression rule identifier for CDK Nag rule suppression enabling specific security rule bypassing. Defines the specific CDK Nag rule ID that will be suppressed for this resource, allowing controlled bypassing of security checks when justified by business requirements or architectural constraints.
   *
   * Use cases: Security rule suppression; CDK Nag rule bypassing; Compliance exception handling; Justified security exceptions; Rule-specific suppression
   *
   * AWS: CDK Nag suppression rule identifier for controlled security rule bypassing and compliance exception management
   *
   * Validation: Must be valid CDK Nag rule ID; required for rule suppression identification
   **/
  readonly id: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required justification reason for CDK Nag rule suppression enabling documented security exception rationale. Provides business justification and technical reasoning for why a specific security rule is being suppressed, ensuring proper documentation and audit trail for security exceptions.
   *
   * Use cases: Security exception documentation; Audit trail maintenance; Compliance justification; Business requirement documentation; Technical reasoning
   *
   * AWS: CDK Nag suppression justification for documented security exception rationale and audit compliance
   *
   * Validation: Must be descriptive string explaining suppression rationale; required for security exception documentation
   **/
  readonly reason: string;
}
export interface GenerateRoleWithNameProps extends GenerateRoleProps {
  /**
   * Name of the role.
   */
  readonly name: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * IAM trusted principal configuration interface for role trust policy management with principal specification and additional action permissions. Defines trusted principal properties for IAM role trust relationships including principal identification and optional additional trusted actions for flexible assume role configurations.
 *
 * Use cases: Trust policy configuration; Principal trust relationships; Assume role permissions; Multi-action trust; Principal-based access; Trust relationship management
 *
 * AWS: IAM role trust policy configuration with trusted principal specification and additional assume role actions
 *
 * Validation: trustedPrincipal must be valid AWS principal ARN or identifier; additionalTrustedActions must be valid IAM actions if specified
 */
export interface TrustedPrincipalProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Trusted principal identifier for IAM role assume role trust policy configuration enabling secure principal-based access control. Specifies the AWS principal (user, role, service, or account) that is allowed to assume the role, establishing trust relationships for secure access delegation.
   *
   * Use cases: Trust relationship establishment; Principal-based access control; Secure access delegation; Cross-account role assumption
   *
   * AWS: AWS IAM role trust policy principal specification for assume role permissions and access control
   *
   * Validation: Must be valid AWS principal ARN or identifier; required; establishes trust relationship for role assumption
   **/
  readonly trustedPrincipal: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Additional trusted actions beyond standard assume role for extended trust policy capabilities enabling multi-action trust relationships. Provides additional IAM actions that the trusted principal can perform, extending beyond basic assume role functionality for trust management.
   *
   * Use cases: Extended trust capabilities; Multi-action trust relationships; Advanced trust policy configuration; principal permissions
   *
   * AWS: AWS IAM role trust policy additional actions for extended principal capabilities and trust management
   *
   * Validation: Must be array of valid IAM action strings if specified; actions must be appropriate for trust policy context
   **/
  readonly additionalTrustedActions?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * IAM role generation configuration interface for automated role creation with persona-based permissions and trust policy management. Defines role generation properties including base persona selection, trusted principal configuration, additional trust relationships, and conditional access controls for secure role-based access management.
 *
 * Use cases: Automated role creation; Persona-based permissions; Trust policy management; Conditional access control; Multi-principal trust; Role template generation
 *
 * AWS: IAM role generation with persona-based policies and configurable trust relationships for automated access management
 *
 * Validation: trustedPrincipal must be valid AWS principal; basePersona must be valid BasePersona enum if specified; additionalTrustedPrincipals must be valid TrustedPrincipalProps; assumeRoleTrustConditions must be valid IAM conditions
 */
export interface GenerateRoleProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Base persona template for automated role policy assignment enabling persona-based permission management. Specifies the foundational persona (data-admin, data-engineer, data-scientist) that determines the base set of policies and permissions automatically associated with the generated role.
   *
   * Use cases: Persona-based permissions; Automated policy assignment; Role template application; Standardized access patterns
   *
   * AWS: AWS IAM role with persona-based managed policy attachments for standardized permission sets
   *
   * Validation: Must be valid BasePersona enum value if specified; determines base policy set for role generation
   *   **/
  readonly basePersona?: BasePersona;
  /**
   * Q-ENHANCED-PROPERTY
   * Primary trusted principal for role assumption enabling secure access delegation and trust relationship establishment. Defines the main AWS principal that can assume this role, establishing the primary trust relationship for secure access control and delegation.
   *
   * Use cases: Primary trust relationship; Secure access delegation; Role assumption control; Principal-based access
   *
   * AWS: AWS IAM role trust policy primary principal for assume role permissions and access control
   *
   * Validation: Must be valid AWS principal ARN or identifier; required; establishes primary trust relationship for role assumption
   **/
  readonly trustedPrincipal: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Additional trusted principals for multi-principal role assumption enabling complex trust relationships and flexible access patterns. Provides additional principals that can assume the role beyond the primary trusted principal, supporting multi-user and cross-account access scenarios.
   *
   * Use cases: Multi-principal access; Complex trust relationships; Cross-account role sharing; Flexible access patterns
   *
   * AWS: AWS IAM role trust policy additional principals for multi-principal assume role capabilities
   *
   * Validation: Must be array of valid TrustedPrincipalProps if specified; enables multiple trust relationships for role assumption
   **/
  readonly additionalTrustedPrincipals?: TrustedPrincipalProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Conditional access controls for assume role trust policy enabling context-aware access restrictions and enhanced security. Defines IAM conditions that must be met for successful role assumption, providing fine-grained access control based on request context, time, source IP, or other factors.
   *
   * Use cases: Context-aware access control; Enhanced security restrictions; Conditional role assumption; Fine-grained access management
   *
   * AWS: AWS IAM role trust policy conditions for context-aware assume role access control
   *
   * Validation: Must be object with valid IAM condition keys and Condition values if specified; conditions must be valid IAM policy conditions
   *   **/
  readonly assumeRoleTrustConditions?: { [key: string]: Condition };

  /**
   * Q-ENHANCED-PROPERTY
   * Verbatim role naming control bypassing naming convention application for precise role name specification. When enabled, creates the role with the exact specified name without applying organizational naming conventions, supporting legacy integration and specific naming requirements.
   *
   * Use cases: Legacy integration; Exact naming requirements; Naming convention bypass; Specific role naming
   *
   * AWS: AWS IAM role name without naming convention transformation for precise naming control
   *
   * Validation: Must be boolean; defaults to false; when true, naming conventions do not apply to role creation
   **/
  readonly verbatimRoleName?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * AWS managed policy ARNs for standardized permission attachment enabling consistent access patterns and AWS best practices. Provides list of AWS-managed policies to attach to the role, leveraging AWS-maintained policies for common access patterns and security best practices.
   *
   * Use cases: Standardized permissions; AWS best practices; Common access patterns; Managed policy leverage
   *
   * AWS: AWS IAM role with AWS managed policy attachments for standardized permission management
   *
   * Validation: Must be array of valid AWS managed policy ARNs if specified; policies must exist and be accessible
   **/
  readonly awsManagedPolicies?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Customer managed policy names for custom permission attachment enabling organization-specific access control. Provides list of customer-managed policies to attach to the role, supporting custom permission sets and organization-specific access requirements.
   *
   * Use cases: Custom permissions; Organization-specific access; Custom policy attachment; Tailored access control
   *
   * AWS: AWS IAM role with customer managed policy attachments for custom permission management
   *
   * Validation: Must be array of valid customer managed policy names if specified; policies must exist in the account
   **/
  readonly customerManagedPolicies?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Generated policy names for dynamic permission attachment enabling automated policy creation and management. Provides list of policies that will be generated and attached to the role, supporting dynamic permission creation and automated policy management.
   *
   * Use cases: Dynamic policy creation; Automated permission management; Generated policy attachment; Custom policy automation
   *
   * AWS: AWS IAM role with generated policy attachments for automated permission management
   *
   * Validation: Must be array of valid policy names if specified; policies will be generated and attached during role creation
   **/
  readonly generatedPolicies?: string[];
  /**
   * Suppressions if required by the role configuration.
   */
  readonly suppressions?: SuppressionProps[];
}
export interface RolesL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of federation names to federation definitions for identity provider integration enabling federated access and SSO capabilities. Provides federation configurations for integrating with external identity providers and enabling federated access to AWS resources.
   *
   * Use cases: Identity federation; SSO integration; External identity providers; Federated access
   *
   * AWS: IAM identity provider federations for SSO and external identity integration
   *
   * Validation: Must be valid federation name to FederationProps mapping if provided; enables identity federation and SSO
   *   **/
  readonly federations?: { [key: string]: FederationProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of managed policy definitions for custom policy creation enabling fine-grained permission management and reusable access controls. Provides managed policy configurations for creating custom policies with specific permissions and access patterns for role assignment and governance.
   *
   * Use cases: Custom policy creation; Permission management; Reusable access controls; Policy governance
   *
   * AWS: IAM managed policies for custom permission management and reusable access controls
   *
   * Validation: Must be array of valid GenerateManagedPolicyWithNameProps if provided; enables custom policy creation and management
   **/
  readonly generatePolicies?: GenerateManagedPolicyWithNameProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM role definitions for custom role creation enabling role-based access control and identity management. Provides role configurations for creating custom IAM roles with specific trust relationships, permissions, and access patterns for identity governance.
   *
   * Use cases: Custom role creation; Role-based access control; Identity management; Access governance
   *
   * AWS: IAM roles for custom role-based access control and identity management
   *
   * Validation: Must be array of valid GenerateRoleWithNameProps if provided; enables custom role creation and management
   **/
  readonly generateRoles?: GenerateRoleWithNameProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling MDAA persona managed policy creation enabling standardized role personas and consistent access patterns. When enabled (default), creates predefined managed policies for common data platform personas providing standardized access patterns and role templates.
   *
   * Use cases: Persona-based access; Standardized roles; Consistent access patterns; Role templates
   *
   * AWS: MDAA persona managed policies for standardized role-based access and consistent permissions
   *
   * Validation: Boolean value; defaults to true; enables standardized persona-based access control and role templates
   **/
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
          name: this.props.naming.resourceName(fedConfigName),
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

      generateRole.additionalTrustedPrincipals?.forEach(trustPrincipalProps => {
        if (role.assumeRolePolicy) {
          const trustPrincipal = this.resolveTrustedPrincipal(
            trustPrincipalProps.trustedPrincipal,
            federationProviders,
          );
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

      new MdaaStringParameter(role, `${generateRole.name}-ssm-generated-role-arn`, {
        parameterName: this.props.naming.ssmPath(`generated-role/${generateRole.name}/arn`, false),
        stringValue: role.roleArn,
      });
      new MdaaStringParameter(role, `${generateRole.name}-ssm-generated-role-id`, {
        parameterName: this.props.naming.ssmPath(`generated-role/${generateRole.name}/id`, false),
        stringValue: role.roleId,
      });
      return [generateRole.name, role];
    });
    return Object.fromEntries(generatedRoles || []);
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
    } else if (ref == 'this_account') {
      return new AccountPrincipal(this.account);
    } else {
      throw new Error("Trusted principal must start with service:, account:, federation: or equal 'this_account'");
    }
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
