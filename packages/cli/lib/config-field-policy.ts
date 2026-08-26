/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fail-fast, parse-time format validation of constrained config fields.
 *
 * This is the *early* half of the CLI's shell-safety design. It does not provide
 * the shell-safety guarantee — that comes from quoting every value at the sink
 * where it enters a shell command (see {@link ./shell-command}), which holds
 * regardless of what this file accepts. What this file adds is an early, clear
 * error for values that are obviously malformed, so a typo surfaces at parse time
 * with a helpful message instead of much later as a confusing failure. Validators
 * are therefore intentionally lenient: they reject only values that could not be
 * a legitimate instance of their field, never on shell-metacharacter grounds.
 *
 * Every field of every config interface that can carry a shell-bound value is
 * *classified* here in a `Record<keyof Interface, FieldPolicy>` registry. Because
 * the registries are keyed by `keyof T`, adding a field to one of the config
 * interfaces without classifying it here is a **compile error** — the
 * "new fields can't be forgotten" guarantee, enforced by the TypeScript compiler
 * rather than by a reviewer.
 *
 * The four policies:
 *  - `validated`   — constrained format; a concrete value is checked now, and a
 *                    `{{...}}` reference is deferred (it is not yet resolvable at
 *                    parse time). Only region/account are *re-validated* after
 *                    resolution (validateModuleDeploymentTarget at the CDK sink);
 *                    for ARN, naming_class, aspect_class and mdaa_version a
 *                    deferred reference is covered by sink quoting ALONE — its
 *                    resolved value is never re-checked against the format. The
 *                    fail-fast check therefore only catches malformed *concrete*
 *                    values; it is safety-neutral either way (the sink quotes).
 *  - `quote-only`  — free-form (paths, context blobs, module_config_data); relies
 *                    solely on the shell-quoting applied at each sink.
 *  - `structural`  — a nested object/map/array the walker recurses into.
 *  - `not-shell`   — never interpolated into a shell command (booleans, objects
 *                    written to files, the arbitrary-by-design hook command).
 */

// Interfaces come from ./config-types (not the parser) to keep the dependency
// one-way and avoid a cycle; the parser imports validateConfigContents from here.
import {
  HookConfig,
  MdaaConfigContents,
  MdaaDomainConfig,
  MdaaEnvironmentConfig,
  MdaaModuleConfig,
  TerraformConfig,
} from './config-types';
import { MdaaCustomAspect, MdaaCustomNaming } from '@aws-mdaa/config';
import { Deployment } from './deployment-types';
import {
  isConfigReference,
  validateDeployAccountValueOrRef,
  validateDeployRegionValueOrRef,
} from './deployment-target-validator';

export type FieldPolicy =
  | { readonly kind: 'validated'; readonly validate: (value: string, context: string) => void }
  | { readonly kind: 'quote-only' }
  | { readonly kind: 'structural'; readonly recurse: (value: unknown, context: string) => void }
  | { readonly kind: 'not-shell' };

// org/domain/env/module names — the pre-existing MDAA name charset.
const NAME_PATTERN = /^[a-z0-9-]+$/;
// IAM permissions boundary ARN. `aws` is allowed in the account position for
// AWS-managed policy ARNs (arn:aws:iam::aws:policy/...); charset excludes all
// shell metacharacters.
const ARN_PATTERN = /^arn:[a-z0-9-]+:[a-z0-9-]*:[a-z0-9-]*:(\d{0,12}|aws):[\w\-/.:+=,@*]+$/;
// JS class identifier for naming_class/aspect_class. `$`/`_` are legal identifier
// chars (hence admitted); `$` is inert here because `$(...)`/`${...}` also need
// `(`/`{`, which this excludes — not an accidental widening.
const NAMING_CLASS_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// npm specifier charset — mdaa_version flows into `${modulePath}@${version}`, so
// it admits full node-semver range syntax (comparators, `*`, `|`, spaces, `^`/`~`,
// dist-tags). Shell-significant chars here are made inert by sink quoting; this
// only excludes the substitution/chaining/break-out set and `/` (never in a specifier).
// Exported because `mdaa init`/`mdaa upgrade` read `mdaa_version` directly out of
// mdaa.yaml without going through `MdaaCliConfig` (see {@link ./init-version}), and
// the two readers must not drift on what a legal pin is.
export const MDAA_VERSION_PATTERN = /^[A-Za-z0-9._~^+|*<>= -]+$/;

function validateName(value: string, context: string): void {
  if (!NAME_PATTERN.test(value)) {
    throw new Error(
      `Invalid name '${value}' (${context}). Name must match ${NAME_PATTERN} (lowercase letters, digits, hyphens).`,
    );
  }
}

/**
 * Check a concrete value against `pattern`; skip `{{...}}` references (not
 * resolvable at parse time). Unlike region/account, these fields are NOT
 * re-validated after resolution — resolved values rely on sink quoting alone.
 */
function validatePatternOrRef(value: string, context: string, pattern: RegExp, label: string): void {
  if (isConfigReference(value)) {
    return;
  }
  if (!pattern.test(value)) {
    throw new Error(
      `Invalid ${label} '${value}' (${context}). Must match ${pattern}. ` +
        `This value is interpolated into a shell command and must not contain special characters.`,
    );
  }
}

function validatePermissionsBoundaryArn(value: string, context: string): void {
  validatePatternOrRef(value, context, ARN_PATTERN, 'permissions_boundary_arn');
}

function validateNamingClass(value: string, context: string): void {
  validatePatternOrRef(value, context, NAMING_CLASS_PATTERN, 'naming_class');
}

function validateAspectClass(value: string, context: string): void {
  // Same shape as naming_class (a class identifier), so same check.
  validatePatternOrRef(value, context, NAMING_CLASS_PATTERN, 'aspect_class');
}

function validateMdaaVersion(value: string, context: string): void {
  validatePatternOrRef(value, context, MDAA_VERSION_PATTERN, 'mdaa_version');
}

const VALIDATED_REGION: FieldPolicy = { kind: 'validated', validate: validateDeployRegionValueOrRef };
const VALIDATED_ACCOUNT: FieldPolicy = { kind: 'validated', validate: validateDeployAccountValueOrRef };
const VALIDATED_ARN: FieldPolicy = { kind: 'validated', validate: validatePermissionsBoundaryArn };
const VALIDATED_MDAA_VERSION: FieldPolicy = { kind: 'validated', validate: validateMdaaVersion };
const VALIDATED_NAMING_CLASS: FieldPolicy = { kind: 'validated', validate: validateNamingClass };
const VALIDATED_ASPECT_CLASS: FieldPolicy = { kind: 'validated', validate: validateAspectClass };
const QUOTE_ONLY: FieldPolicy = { kind: 'quote-only' };
const NOT_SHELL: FieldPolicy = { kind: 'not-shell' };

/**
 * Walk one config level: per present key, run its `validated` check or recurse a
 * `structural` value. Unknown keys are ignored — AJV's `additionalProperties:false`
 * already rejects them.
 */
function validateLevel(config: Record<string, unknown>, registry: Record<string, FieldPolicy>, context: string): void {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) {
      continue;
    }
    const policy = registry[key];
    if (!policy) {
      continue;
    }
    if (policy.kind === 'validated') {
      // Every `validated` field is a string per its interface and AJV's shape
      // check, so a non-string never reaches here; guarding also avoids String()'s
      // '[object Object]' default on an object (typescript:S6551).
      if (typeof value === 'string') {
        policy.validate(value, context);
      }
    } else if (policy.kind === 'structural') {
      policy.recurse(value, context);
    }
  }
}

/** Validate each element of an array-of-object field (`custom_aspects`, `additional_stacks`). */
function recurseArray(value: unknown, registry: Record<string, FieldPolicy>, context: string): void {
  if (!Array.isArray(value)) {
    return;
  }
  value.forEach((element, index) => {
    if (element && typeof element === 'object') {
      validateLevel(element as Record<string, unknown>, registry, `${context}[${index}]`);
    }
  });
}

/** Recurse into a map of named modules, validating each module name. */
function recurseModules(value: unknown, context: string): void {
  Object.entries(value as Record<string, MdaaModuleConfig>).forEach(([moduleName, module]) => {
    validateName(moduleName, `${context}, module ${moduleName}`);
    validateLevel(
      module as unknown as Record<string, unknown>,
      MODULE_FIELD_POLICY,
      `${context}, module ${moduleName}`,
    );
  });
}

const HOOK_FIELD_POLICY: Record<keyof HookConfig, FieldPolicy> = {
  // The hook command is arbitrary shell by design (the documented trust
  // boundary) — it is executed verbatim, never quoted, so it is not-shell here.
  command: NOT_SHELL,
  exit_if_fail: NOT_SHELL,
  after_success: NOT_SHELL,
};

const TERRAFORM_FIELD_POLICY: Record<keyof TerraformConfig, FieldPolicy> = {
  // The override object is serialized to mdaa_override.tf.json via writeFileSync,
  // never interpolated into a shell command.
  override: NOT_SHELL,
};

const CUSTOM_NAMING_FIELD_POLICY: Record<keyof MdaaCustomNaming, FieldPolicy> = {
  naming_module: QUOTE_ONLY,
  naming_class: VALIDATED_NAMING_CLASS,
  naming_props: NOT_SHELL,
};

const CUSTOM_ASPECT_FIELD_POLICY: Record<keyof MdaaCustomAspect, FieldPolicy> = {
  // aspect_module flows into the npm install sink (`prepNpmPackage`); quoted there.
  aspect_module: QUOTE_ONLY,
  // aspect_class mirrors naming_class — a class identifier resolved as a module
  // export — so it gets the same fail-fast identifier check.
  aspect_class: VALIDATED_ASPECT_CLASS,
  aspect_props: NOT_SHELL,
};

// region/account are re-validated by validateDeployments at the CDK sink; quote-only
// here so parse-time walking still visits and closes the interface.
const DEPLOYMENT_FIELD_POLICY: Record<keyof Deployment, FieldPolicy> = {
  region: QUOTE_ONLY,
  account: QUOTE_ONLY,
  addDependencyMainStack: NOT_SHELL,
};

const STRUCTURAL_TERRAFORM: FieldPolicy = {
  kind: 'structural',
  recurse: (value, context) =>
    validateLevel(value as Record<string, unknown>, TERRAFORM_FIELD_POLICY, `${context}, terraform`),
};

const STRUCTURAL_CUSTOM_NAMING: FieldPolicy = {
  kind: 'structural',
  recurse: (value, context) =>
    validateLevel(value as Record<string, unknown>, CUSTOM_NAMING_FIELD_POLICY, `${context}, custom_naming`),
};

const STRUCTURAL_CUSTOM_ASPECTS: FieldPolicy = {
  kind: 'structural',
  recurse: (value, context) => recurseArray(value, CUSTOM_ASPECT_FIELD_POLICY, `${context}, custom_aspects`),
};

const STRUCTURAL_ADDITIONAL_STACKS: FieldPolicy = {
  kind: 'structural',
  recurse: (value, context) => recurseArray(value, DEPLOYMENT_FIELD_POLICY, `${context}, additional_stacks`),
};

const STRUCTURAL_HOOK = (label: string): FieldPolicy => ({
  kind: 'structural',
  recurse: (value, context) =>
    validateLevel(value as Record<string, unknown>, HOOK_FIELD_POLICY, `${context}, ${label}`),
});

const MODULE_FIELD_POLICY: Record<keyof MdaaModuleConfig, FieldPolicy> = {
  module_type: NOT_SHELL, // 'cdk' | 'tf' enum, drives branching (not interpolated)
  module_path: QUOTE_ONLY,
  cdk_app: QUOTE_ONLY,
  additional_context: NOT_SHELL, // deprecated, unused in command assembly
  context: QUOTE_ONLY,
  tag_configs: QUOTE_ONLY,
  app_configs: QUOTE_ONLY,
  app_config_data: QUOTE_ONLY,
  module_configs: QUOTE_ONLY,
  module_config_data: QUOTE_ONLY,
  tag_config_data: QUOTE_ONLY,
  mdaa_version: VALIDATED_MDAA_VERSION,
  use_bootstrap: NOT_SHELL,
  custom_aspects: STRUCTURAL_CUSTOM_ASPECTS,
  custom_naming: STRUCTURAL_CUSTOM_NAMING,
  allow_cross_reference_stack: NOT_SHELL,
  // Array of bare account strings (re-validated at the CDK sink); additional_stacks
  // below is an array of Deployment objects, walked into.
  additional_accounts: QUOTE_ONLY,
  additional_stacks: STRUCTURAL_ADDITIONAL_STACKS,
  terraform: STRUCTURAL_TERRAFORM,
  mdaa_compliant: NOT_SHELL,
  predeploy: STRUCTURAL_HOOK('predeploy'),
  postdeploy: STRUCTURAL_HOOK('postdeploy'),
};

const ENV_FIELD_POLICY: Record<keyof MdaaEnvironmentConfig, FieldPolicy> = {
  template: NOT_SHELL, // env-template name, validated for existence at runtime
  account: VALIDATED_ACCOUNT,
  region: VALIDATED_REGION,
  modules: { kind: 'structural', recurse: recurseModules },
  context: QUOTE_ONLY,
  mdaa_version: VALIDATED_MDAA_VERSION,
  tag_config_data: QUOTE_ONLY,
  tag_configs: QUOTE_ONLY,
  use_bootstrap: NOT_SHELL,
  custom_aspects: STRUCTURAL_CUSTOM_ASPECTS,
  custom_naming: STRUCTURAL_CUSTOM_NAMING,
  terraform: STRUCTURAL_TERRAFORM,
  permissions_boundary_arn: VALIDATED_ARN,
};

// Environment keys are name-validated; env-template keys are not (pre-existing behavior).
function recurseEnvironments(value: unknown, context: string): void {
  Object.entries(value as Record<string, MdaaEnvironmentConfig>).forEach(([envName, env]) => {
    validateName(envName, `${context}, env ${envName}`);
    validateLevel(env as unknown as Record<string, unknown>, ENV_FIELD_POLICY, `${context}, env ${envName}`);
  });
}

function recurseEnvTemplates(value: unknown, context: string): void {
  Object.entries(value as Record<string, MdaaEnvironmentConfig>).forEach(([templateName, template]) => {
    validateLevel(
      template as unknown as Record<string, unknown>,
      ENV_FIELD_POLICY,
      `${context ? context + ', ' : ''}env_template ${templateName}`,
    );
  });
}

const DOMAIN_FIELD_POLICY: Record<keyof MdaaDomainConfig, FieldPolicy> = {
  environments: { kind: 'structural', recurse: recurseEnvironments },
  context: QUOTE_ONLY,
  mdaa_version: VALIDATED_MDAA_VERSION,
  tag_config_data: QUOTE_ONLY,
  tag_configs: QUOTE_ONLY,
  custom_aspects: STRUCTURAL_CUSTOM_ASPECTS,
  custom_naming: STRUCTURAL_CUSTOM_NAMING,
  env_templates: { kind: 'structural', recurse: recurseEnvTemplates },
  terraform: STRUCTURAL_TERRAFORM,
  region: VALIDATED_REGION,
  account: VALIDATED_ACCOUNT,
  permissions_boundary_arn: VALIDATED_ARN,
};

function recurseDomains(value: unknown, _context: string): void {
  Object.entries(value as Record<string, MdaaDomainConfig>).forEach(([domainName, domain]) => {
    validateName(domainName, `domain ${domainName}`);
    validateLevel(domain as unknown as Record<string, unknown>, DOMAIN_FIELD_POLICY, `domain ${domainName}`);
  });
}

const GLOBAL_FIELD_POLICY: Record<keyof MdaaConfigContents, FieldPolicy> = {
  naming_module: QUOTE_ONLY,
  naming_class: VALIDATED_NAMING_CLASS,
  naming_props: NOT_SHELL,
  organization: { kind: 'validated', validate: validateName },
  region: VALIDATED_REGION,
  account: VALIDATED_ACCOUNT,
  log_suppressions: NOT_SHELL,
  tag_configs: QUOTE_ONLY,
  domains: { kind: 'structural', recurse: recurseDomains },
  context: QUOTE_ONLY,
  custom_aspects: STRUCTURAL_CUSTOM_ASPECTS,
  mdaa_version: VALIDATED_MDAA_VERSION,
  tag_config_data: QUOTE_ONLY,
  devops: QUOTE_ONLY, // nested strings (repo, branch, connection arn) flow into module command context, so quoted not trusted
  env_templates: { kind: 'structural', recurse: recurseEnvTemplates },
  terraform: STRUCTURAL_TERRAFORM,
  useStaging: NOT_SHELL,
  permissions_boundary_arn: VALIDATED_ARN,
};

/**
 * Registries keyed by schema-definition name. The cross-check test uses this to
 * assert every schema property is classified (backstopping `Record<keyof T>`
 * against type/schema drift).
 */
export const FIELD_POLICY_REGISTRIES: Record<string, Record<string, FieldPolicy>> = {
  MdaaConfigContents: GLOBAL_FIELD_POLICY,
  MdaaDomainConfig: DOMAIN_FIELD_POLICY,
  MdaaEnvironmentConfig: ENV_FIELD_POLICY,
  MdaaModuleConfig: MODULE_FIELD_POLICY,
  HookConfig: HOOK_FIELD_POLICY,
  TerraformConfig: TERRAFORM_FIELD_POLICY,
  MdaaCustomNaming: CUSTOM_NAMING_FIELD_POLICY,
  MdaaCustomAspect: CUSTOM_ASPECT_FIELD_POLICY,
  Deployment: DEPLOYMENT_FIELD_POLICY,
};

/** Entry point: drive parse-time validation from the registries, starting at the global level. */
export function validateConfigContents(contents: MdaaConfigContents): void {
  validateLevel(contents as unknown as Record<string, unknown>, GLOBAL_FIELD_POLICY, 'global');
}
