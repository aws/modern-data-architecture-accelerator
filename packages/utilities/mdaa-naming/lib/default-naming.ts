/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token } from 'aws-cdk-lib';
import { IMdaaResourceNaming, MdaaResourceNamingConfig } from './resource-naming';
import { MdaaResourceType } from './resource-type';
import { validateResourceName } from './utils';

/** How CDK renders an unresolved token embedded in a string, e.g. `${Token[AWS.AccountId.9]}`. */
const TOKEN_MARKER_PATTERN = /^\$\{Token\[[^\]]*\]\}$/;

/** The same marker as a capturing split pattern, so `split` yields the markers alongside the literals. */
const TOKEN_MARKER_SPLIT_PATTERN = /(\$\{Token\[[^\]]*\]\})/;

/**
 * A default MDAA Naming implementation
 */
export class MdaaDefaultResourceNaming implements IMdaaResourceNaming {
  /**
   * When set to `true` (or the string `"true"`), `env` is included in SSM parameter paths and
   * CloudFormation export names. This prevents collisions when the same module is deployed to
   * multiple environments within a single AWS account. Defaults to false when absent; any value
   * other than `true`/`false` is rejected as an error.
   */
  public static readonly INCLUDE_ENV_IN_SSM_PATH_CONTEXT_KEY = '@mdaaIncludeEnvInSsmPath';

  public readonly props: MdaaResourceNamingConfig;

  constructor(props: MdaaResourceNamingConfig) {
    this.props = props;
  }

  public withOrg(org: string): IMdaaResourceNaming {
    return this.createNewNaming({ org });
  }

  public withEnv(env: string): IMdaaResourceNaming {
    return this.createNewNaming({ env });
  }

  public withDomain(domain: string): IMdaaResourceNaming {
    return this.createNewNaming({ domain });
  }

  public withSuffix(suffix: string): IMdaaResourceNaming {
    return this.createNewNaming({ moduleName: `${this.props.moduleName}-${suffix}` });
  }

  /**
   * Returns this naming object but with a new moduleName
   * @param moduleName The new module name
   */
  public withModuleName(moduleName: string): IMdaaResourceNaming {
    return this.createNewNaming({ moduleName });
  }

  /**
   * Returns this naming instance unchanged. Custom naming implementations
   * can override this to return a resource-type-aware naming instance.
   * @param _resourceType The resource type (ignored by default implementation)
   */
  public withResourceType(_resourceType: MdaaResourceType): IMdaaResourceNaming {
    return this;
  }

  /**
   * Creates a new naming instance with the specified property overrides
   */
  private createNewNaming(overrides: Partial<MdaaResourceNamingConfig>): IMdaaResourceNaming {
    return new MdaaDefaultResourceNaming({
      cdkNode: this.props.cdkNode,
      org: this.props.org,
      env: this.props.env,
      domain: this.props.domain,
      moduleName: this.props.moduleName,
      ...overrides,
    });
  }

  /**
   * Generates a resource name in the format of <org>-<env>-<domain>-<module_name>
   * @param resourceNameSuffix Optional naming suffix to be added to the generated resource name.
   * Useful when multiple resources of the same type are created within the same stack.
   * @param maxLength Should be used to truncate the generated resource names to a specified length.
   * The result should still be unique and stable.
   * Caution: Known bug - names exactly equal to `maxLength` are unnecessarily truncated with hash suffix
   * (should use `>` instead of `>=`). Left unfixed to prevent breaking existing deployments that rely on
   * this behavior. Cosmetic issue only - does not affect infrastructure functionality.
   */
  public resourceName(resourceNameSuffix?: string, maxLength?: number): string {
    let name = `${this.props.org}-${this.props.env}-${this.props.domain}-${this.props.moduleName}`;
    if (resourceNameSuffix) {
      // Lower-cased even when it carries an unresolved token: `lowerCase` lower-cases only the
      // literal text around the markers, so a suffix like `my-Domain-<account token>-tooling` still
      // gets the casing the naming convention requires without breaking the token.
      name = `${name}-${this.lowerCase(resourceNameSuffix)}`;
    }
    // An unresolved name has no synth-time length or character set, so neither truncation nor
    // validation can apply: truncating would cut through the token marker and corrupt it (leaving
    // text like `${to` in the template), and the character check would reject the marker's own
    // punctuation. Return it intact and let CloudFormation resolve it at deploy, where the service
    // enforces its own naming rules.
    if (Token.isUnresolved(name)) {
      return name;
    }
    if (maxLength && name.length >= maxLength) {
      const hashCodeHex = MdaaDefaultResourceNaming.hashCodeHex(name);
      name = `${name.substring(0, maxLength - (hashCodeHex.length + 1))}-${hashCodeHex}`;
    }
    return validateResourceName(name);
  }

  /**
   * Generates a ssm param name in the format of /<org>/<path>
   */
  public ssmOrgPath(path: string, lowerCase = true): string {
    const name = `/${this.props.org}`;
    const slashPath = path.startsWith('/') ? path.substring(1) : path;
    return lowerCase ? this.lowerCase(`${name}/${slashPath}`) : `${name}/${slashPath}`;
  }

  /**
   * Generates a ssm param name in the format of /<org>/<domain>/<path>
   */
  public ssmDomainPath(path: string, lowerCase = true): string {
    const name = `/${this.props.org}/${this.props.domain}`;
    const slashPath = path.startsWith('/') ? path.substring(1) : path;
    return lowerCase ? this.lowerCase(`${name}/${slashPath}`) : `${name}/${slashPath}`;
  }

  /**
   * Generates a ssm param name in the format of /<org>/<domain>/<env>/<path>
   */
  public ssmEnvPath(path: string, lowerCase = true): string {
    const name = `/${this.props.org}/${this.props.domain}/${this.props.env}`;
    const slashPath = path.startsWith('/') ? path.substring(1) : path;
    return lowerCase ? this.lowerCase(`${name}/${slashPath}`) : `${name}/${slashPath}`;
  }

  /**
   * Generates a ssm param name in the format of /<org>/<domain>/<module_name>.
   * When the `@mdaaIncludeEnvInSsmPath` context flag is enabled, `env` is inserted after
   * `domain`, producing /<org>/<domain>/<env>/<module_name> to avoid cross-environment
   * collisions when the same module is deployed to multiple environments in one account.
   */
  public ssmPath(path: string, includeModuleName = true, lowerCase = true): string {
    let name = `/${this.props.org}/${this.props.domain}`;
    if (this.includeEnvInSsmPath()) {
      name = `${name}/${this.props.env}`;
    }
    if (includeModuleName) {
      name = `${name}/${this.props.moduleName}`;
    }
    return lowerCase ? this.lowerCase(`${name}/${path}`) : `${name}/${path}`;
  }

  /**
   * Generates a export name in the format of <org>:<domain>:<module_name>.
   * When the `@mdaaIncludeEnvInSsmPath` context flag is enabled, `env` is inserted after
   * `domain`, producing <org>:<domain>:<env>:<module_name> to keep export names parallel
   * with `ssmPath()` and avoid cross-environment collisions within one account.
   */
  public exportName(path: string): string {
    let name = `${this.props.org}:${this.props.domain}`;
    if (this.includeEnvInSsmPath()) {
      name = `${name}:${this.props.env}`;
    }
    name = `${name}:${this.props.moduleName}`;
    return this.lowerCase(`${name}:${path}`);
  }

  /**
   * Reads the `@mdaaIncludeEnvInSsmPath` CDK context flag. The value must be exactly the
   * boolean `true`/`false` or the string `"true"`/`"false"`. When the flag is absent, it
   * defaults to false. Any other value is an error, to avoid silently misinterpreting a
   * typo (e.g. `"yes"`, `"1"`) as enabled or disabled.
   */
  private includeEnvInSsmPath(): boolean {
    const contextValue = this.props.cdkNode.tryGetContext(
      MdaaDefaultResourceNaming.INCLUDE_ENV_IN_SSM_PATH_CONTEXT_KEY,
    );
    if (contextValue === undefined) {
      return false;
    }
    if (contextValue === true || contextValue === 'true') {
      return true;
    }
    if (contextValue === false || contextValue === 'false') {
      return false;
    }
    throw new Error(
      `Invalid value for context flag ${MdaaDefaultResourceNaming.INCLUDE_ENV_IN_SSM_PATH_CONTEXT_KEY}: ` +
        `'${String(contextValue)}'. Expected 'true' or 'false'.`,
    );
  }

  /**
   * Generates a stack name in the format of <org>-<env>-<domain>-<module_name>.
   * Sanitizes non-alpha numeric characters and replaces underscores with '-'
   */
  public stackName(stackNameSuffix?: string): string {
    const org = MdaaDefaultResourceNaming.sanitize(this.props.org);
    const env = MdaaDefaultResourceNaming.sanitize(this.props.env);
    const domain = MdaaDefaultResourceNaming.sanitize(this.props.domain);
    const module_name = MdaaDefaultResourceNaming.sanitize(this.props.moduleName);
    const suffix = stackNameSuffix ? MdaaDefaultResourceNaming.sanitize(stackNameSuffix) : undefined;

    let stackName = `${org}-${env}-${domain}-${module_name}`;
    if (suffix) {
      stackName = `${stackName}-${this.lowerCase(suffix)}`;
    }
    return stackName;
  }

  protected static sanitize(component: string): string {
    if (!component) {
      return component;
    }
    return component.replace(/^\W+$/g, '').replace(/_/g, '-');
  }

  protected static hashCodeHex(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.trunc(Math.imul(31, h) + (s.codePointAt(i) ?? 0));
    return h.toString(16);
  }

  /**
   * Lower-cases a name, leaving any unresolved token it contains verbatim.
   *
   * Lower-casing a token's rendered marker breaks it — CDK stops recognizing the marker, so the value
   * is never resolved and the literal text ships in the template. Only the literal text around the
   * markers is lower-cased, which preserves every token id shape (`AWS.AccountId`, `TOKEN.<n>`, …).
   * The previous implementation lower-cased the whole string and reconstructed the marker afterwards,
   * which only worked for `TOKEN.<n>`: the original casing of any other id is unrecoverable once
   * lower-cased.
   *
   * Split on the marker text rather than resolved via `Tokenization.reverseString`, because that
   * throws on a marker whose key is not registered in the current token map — a name is data here and
   * may legitimately contain marker-shaped text.
   */
  protected lowerCase(input: string): string {
    return input
      .split(TOKEN_MARKER_SPLIT_PATTERN)
      .map(part => (TOKEN_MARKER_PATTERN.test(part) ? part : part.toLowerCase()))
      .join('');
  }
}
