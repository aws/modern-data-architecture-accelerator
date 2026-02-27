/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnParameterProps } from 'aws-cdk-lib';

export type ConfigurationElement = { [key: string]: unknown };
export type TagElement = { [key: string]: string };
export type Workspace = {
  name: string;
  location: string;
};
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for custom CDK aspects that apply cross-cutting concerns to all MDAA-deployed resources. Enables integration of custom security checks, compliance validations, and resource modifications across the entire MDAA infrastructure deployment.
 *
 * Use cases: Custom security policy enforcement; Organization-specific compliance checks; Automated resource tagging and modification
 *
 * AWS: Applies custom logic to all AWS resources during CDK synthesis and deployment
 *
 * Validation: aspect_module must be valid module path; aspect_class must be exported class implementing CDK IAspect interface
 */
export interface MdaaCustomAspect {
  /**
   * Q-ENHANCED-PROPERTY
   * Module path or package name containing the custom CDK aspect implementation. Specifies the location of the aspect code that will be dynamically loaded and applied to all MDAA resources during deployment.
   *
   * Use cases: Custom security aspect modules; Organization-specific compliance aspects; Third-party aspect integrations
   *
   * AWS: CDK aspect module loading for resource modification during synthesis
   *
   * Validation: Must be valid Node.js module path or npm package name; module must export the specified aspect class
   **/
  readonly aspect_module: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Class name of the custom CDK aspect implementation within the specified module. Must implement the CDK IAspect interface to provide visit() method for resource inspection and modification.
   *
   * Use cases: Specific aspect class selection; Multiple aspects per module; Aspect implementation targeting
   *
   * AWS: CDK aspect class instantiation for resource processing during synthesis
   *
   * Validation: Must be valid exported class name implementing CDK IAspect interface with visit() method
   **/
  readonly aspect_class: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional configuration properties passed to the custom aspect constructor for aspect-specific behavior customization. Enables parameterized aspect behavior and environment-specific aspect configuration.
   *
   * Use cases: Aspect behavior customization; Environment-specific aspect settings; Parameterized compliance rules
   *
   * AWS: Aspect constructor parameters for customized resource processing behavior
   *
   * Validation: Must be valid configuration object matching aspect constructor parameter expectations
   **/
  readonly aspect_props?: ConfigurationElement;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for custom MDAA naming implementations that override the default org-env-domain-module naming pattern. Enables integration with enterprise naming standards, regulatory requirements, and organization-specific resource naming conventions.
 *
 * Use cases: Enterprise naming standard compliance; Regulatory naming requirements; Custom naming for legacy system integration
 *
 * AWS: Controls naming patterns for all AWS resources deployed by MDAA including S3 buckets, IAM roles, and CloudFormation stacks
 *
 * Validation: naming_module must be valid module path; naming_class must implement IMdaaResourceNaming interface
 */
export interface MdaaCustomNaming {
  /**
   * Q-ENHANCED-PROPERTY
   * Module path or package name containing the custom MDAA naming implementation. Specifies the location of the naming code that will be dynamically loaded to generate resource names according to custom patterns.
   *
   * Use cases: Custom naming implementation modules; Enterprise naming standard packages; Third-party naming integrations
   *
   * AWS: Naming module loading for custom AWS resource name generation patterns
   *
   * Validation: Must be valid Node.js module path or npm package name; module must export the specified naming class
   **/
  readonly naming_module: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Class name of the custom MDAA naming implementation within the specified module. Must implement the IMdaaResourceNaming interface to provide consistent resource naming methods across all MDAA modules.
   *
   * Use cases: Specific naming class selection; Multiple naming strategies per module; Naming implementation targeting
   *
   * AWS: Naming class instantiation for custom AWS resource name generation
   *
   * Validation: Must be valid exported class name implementing IMdaaResourceNaming interface with required naming methods
   **/
  readonly naming_class: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional configuration properties passed to the custom naming implementation constructor for naming behavior customization. Enables parameterized naming patterns and environment-specific naming configuration.
   *
   * Use cases: Naming behavior customization; Environment-specific naming patterns; Parameterized naming rules
   *
   * AWS: Naming constructor parameters for customized AWS resource name generation behavior
   *
   * Validation: Must be valid configuration object matching naming constructor parameter expectations
   **/
  readonly naming_props?: ConfigurationElement;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CDK Nag rule suppressions organized by CloudFormation resource paths. Enables selective suppression of security compliance rules for specific resources while maintaining overall compliance posture and audit trail.
 *
 * Use cases: False positive suppression; Approved security exceptions; Legacy resource compliance exemptions
 *
 * AWS: Suppresses CDK Nag security rule violations for specific CloudFormation resources during deployment validation
 *
 * Validation: by_path array must contain valid suppression configurations with resource paths and justifications
 */
export interface MdaaNagSuppressionConfigs {
  /**
   * Q-ENHANCED-PROPERTY
   * Array of CDK Nag suppressions organized by CloudFormation resource path, enabling targeted suppression of specific security rules for individual resources. Each suppression requires justification and maps to specific CloudFormation resource paths.
   *
   * Use cases: Resource-specific security exceptions; False positive rule suppressions; Approved compliance deviations
   *
   * AWS: CDK Nag rule suppression targeting specific CloudFormation resources during security validation
   *
   * Validation: Must be array of valid MdaaNagSuppressionByPath objects with valid resource paths and suppression details
   *   **/
  readonly by_path: MdaaNagSuppressionByPath[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for suppressing specific CDK Nag security rules on individual CloudFormation resources identified by their resource path. Provides targeted rule suppression with mandatory justification for audit and compliance tracking.
 *
 * Use cases: Individual resource security exceptions; False positive rule suppressions; Documented compliance deviations
 *
 * AWS: Suppresses specific CDK Nag security rules for individual CloudFormation resources during deployment validation
 *
 * Validation: path must be valid CloudFormation resource path; suppressions array must contain valid rule IDs and justifications
 */
export interface MdaaNagSuppressionByPath {
  /**
   * Q-ENHANCED-PROPERTY
   * CloudFormation resource path identifying the specific resource for which CDK Nag rules should be suppressed. Uses CDK construct tree path format to precisely target individual resources within the deployment stack.
   *
   * Use cases: Specific resource targeting; Individual resource exceptions; Precise suppression scope control
   *
   * AWS: CloudFormation resource path for targeted CDK Nag rule suppression during validation
   *
   * Validation: Must be valid CDK construct tree path format (e.g., /StackName/ConstructName/ResourceName)
   **/
  readonly path: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Array of specific CDK Nag rule suppressions with rule IDs and mandatory justifications for audit compliance. Each suppression must include the rule identifier and business justification for the security exception.
   *
   * Use cases: Multiple rule suppressions per resource; Documented security exceptions; Audit trail maintenance
   *
   * AWS: CDK Nag rule ID suppression with justification tracking for compliance auditing
   *
   * Validation: Each suppression must have valid CDK Nag rule ID and non-empty reason string
   *   **/
  readonly suppressions: {
    readonly id: string;
    readonly reason: string;
  }[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Service Catalog constraint rule assertions that define validation logic for Service Catalog product parameters. Enables parameter validation and business rule enforcement during Service Catalog product provisioning.
 *
 * Use cases: Parameter validation rules; Business logic enforcement; Service Catalog product compliance
 *
 * AWS: Configures AWS Service Catalog constraint rules for product parameter validation during provisioning
 *
 * Validation: assert must be valid constraint assertion expression; description must be non-empty explanatory text
 */
export interface MdaaServiceCatalogConstraintRuleAssertionConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Constraint assertion expression that defines the validation logic for Service Catalog product parameters. Uses CloudFormation intrinsic functions and conditions to validate parameter values during product provisioning.
   *
   * Use cases: Parameter range validation; Cross-parameter dependency checks; Business rule enforcement
   *
   * AWS: AWS Service Catalog constraint rule assertion for parameter validation
   *
   * Validation: Must be valid CloudFormation condition expression using intrinsic functions
   **/
  readonly assert: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Human-readable description explaining the purpose and requirements of the constraint assertion. Provides clear guidance to users about parameter validation requirements and business rules.
   *
   * Use cases: User guidance for parameter validation; Error message context; Business rule documentation
   *
   * AWS: AWS Service Catalog constraint rule description for user guidance
   *
   * Validation: Must be non-empty descriptive text explaining the constraint purpose
   **/
  readonly description: string;
}

// It seems we need this empty interface in the schema even though no one uses it
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MdaaServiceCatalogConstraintRuleCondititionConfig {}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Service Catalog constraint rules that combine conditions and assertions for parameter validation. Enables complex validation logic with conditional assertions based on parameter values.
 *
 * Use cases: Complex parameter validation; Conditional business rules; Multi-parameter validation logic
 *
 * AWS: Configures AWS Service Catalog constraint rules with conditions and assertions for product parameter validation
 *
 * Validation: condition must be valid condition config; assertions must be array of valid assertion configs
 */
export interface MdaaServiceCatalogConstraintRuleConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Condition configuration that determines when the constraint rule assertions should be evaluated. Enables conditional validation logic based on parameter values and deployment context.
   *
   * Use cases: Conditional validation logic; Context-dependent rules; Parameter-dependent constraints
   *
   * AWS: AWS Service Catalog constraint rule condition for conditional validation
   *
   * Validation: Must be valid MdaaServiceCatalogConstraintRuleCondititionConfig object
   **/
  readonly condition: MdaaServiceCatalogConstraintRuleCondititionConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Array of constraint assertions that define the validation logic to be applied when the condition is met. Each assertion validates specific aspects of the Service Catalog product parameters.
   *
   * Use cases: Multiple validation checks; parameter validation; Business rule enforcement
   *
   * AWS: AWS Service Catalog constraint rule assertions for parameter validation
   *
   * Validation: Must be array of valid MdaaServiceCatalogConstraintRuleAssertionConfig objects
   **/
  readonly assertions: MdaaServiceCatalogConstraintRuleAssertionConfig[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Service Catalog constraints that group multiple validation rules with descriptive information. Enables parameter validation and business rule enforcement for Service Catalog products.
 *
 * Use cases: Product parameter validation; Business rule grouping; Service Catalog compliance enforcement
 *
 * AWS: Configures AWS Service Catalog constraints with multiple validation rules for product provisioning
 *
 * Validation: description must be non-empty; rules must be object with valid constraint rule configurations
 */
export interface MdaaServiceCatalogConstraintConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Human-readable description explaining the purpose and scope of the Service Catalog constraint. Provides clear documentation about the validation rules and business requirements enforced by the constraint.
   *
   * Use cases: Constraint documentation; User guidance; Business rule explanation
   *
   * AWS: AWS Service Catalog constraint description for user understanding
   *
   * Validation: Must be non-empty descriptive text explaining the constraint purpose and scope
   **/
  readonly description: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Object containing named constraint rules that define the validation logic for Service Catalog product parameters. Each rule can contain conditions and assertions for parameter validation.
   *
   * Use cases: Named validation rules; Organized constraint logic; Multiple validation scenarios
   *
   * AWS: AWS Service Catalog constraint rules for structured parameter validation
   *
   * Validation: Must be object with string keys and valid MdaaServiceCatalogConstraintRuleConfig values
   *   **/
  readonly rules: { [key: string]: MdaaServiceCatalogConstraintRuleConfig };
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Service Catalog product parameters that combines CloudFormation parameter properties with optional constraint validation. Enables parameterized Service Catalog products with validation rules.
 *
 * Use cases: Service Catalog product parameterization; Parameter validation; User input constraints
 *
 * AWS: Configures AWS Service Catalog product parameters with CloudFormation properties and validation constraints
 *
 * Validation: props must be valid CfnParameterProps; constraints must be valid constraint configuration if provided
 */
export interface MdaaServiceCatalogParameterConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * CloudFormation parameter properties that define the parameter characteristics including type, default value, and allowed values. Provides the foundational parameter definition for Service Catalog products.
   *
   * Use cases: Parameter type definition; Default value specification; Allowed value constraints
   *
   * AWS: AWS CloudFormation parameter properties for Service Catalog product parameters
   *
   * Validation: Must be valid CfnParameterProps object with required CloudFormation parameter properties
   **/
  readonly props: CfnParameterProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional constraint configuration that defines additional validation rules for the Service Catalog product parameter. Enables business rule enforcement and complex parameter validation beyond basic CloudFormation constraints.
   *
   * Use cases: Advanced parameter validation; Business rule enforcement; Cross-parameter validation
   *
   * AWS: AWS Service Catalog parameter constraints for enhanced validation during provisioning
   *
   * Validation: Must be valid MdaaServiceCatalogConstraintConfig object if provided
   **/
  readonly constraints?: MdaaServiceCatalogConstraintConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Service Catalog product deployment that specifies portfolio association, ownership, and parameterization. Enables MDAA modules to be deployed as self-service Service Catalog products with controlled access and validation.
 *
 * Use cases: Self-service infrastructure deployment; Controlled resource provisioning; Parameterized product offerings
 *
 * AWS: Configures AWS Service Catalog products for self-service deployment of MDAA modules with portfolio management
 *
 * Validation: portfolio_arn must be valid Service Catalog portfolio ARN; owner and name must be non-empty strings
 */
export interface MdaaServiceCatalogProductConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * ARN of the AWS Service Catalog portfolio where the product will be associated. Determines access control and organizational structure for the Service Catalog product deployment.
   *
   * Use cases: Portfolio organization; Access control; Product categorization
   *
   * AWS: AWS Service Catalog portfolio ARN for product association and access management
   *
   * Validation: Must be valid AWS Service Catalog portfolio ARN format
   **/
  readonly portfolio_arn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Owner identifier for the Service Catalog product, typically representing the team or organization responsible for the product. Provides accountability and contact information for product management.
   *
   * Use cases: Product ownership identification; Contact information; Responsibility assignment
   *
   * AWS: AWS Service Catalog product owner for accountability and management
   *
   * Validation: Must be non-empty string identifying the product owner
   **/
  readonly owner: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Display name for the Service Catalog product that will be visible to end users in the Service Catalog console. Should be descriptive and user-friendly to facilitate product discovery and selection.
   *
   * Use cases: Product identification; User-friendly naming; Service Catalog console display
   *
   * AWS: AWS Service Catalog product name for user interface display
   *
   * Validation: Must be non-empty string suitable for Service Catalog product naming
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role name that will be used to launch the Service Catalog product. Enables controlled permissions for product provisioning and resource creation with specific IAM role constraints.
   *
   * Use cases: Controlled provisioning permissions; IAM role-based access; Security constraint enforcement
   *
   * AWS: AWS Service Catalog launch role for controlled product provisioning permissions
   *
   * Validation: Must be valid IAM role name if provided
   **/
  readonly launch_role_name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional object containing named parameter configurations for the Service Catalog product. Enables parameterized product deployment with validation rules and user input constraints.
   *
   * Use cases: Product parameterization; User input collection; Deployment customization
   *
   * AWS: AWS Service Catalog product parameters for user-configurable deployment options
   *
   * Validation: Must be object with string keys and valid MdaaServiceCatalogParameterConfig values if provided
   *   **/
  readonly parameters?: { [key: string]: MdaaServiceCatalogParameterConfig };

  readonly portfolio_bucket_name: string;
}
