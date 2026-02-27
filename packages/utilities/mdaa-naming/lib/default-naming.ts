import { IMdaaResourceNaming, MdaaResourceNamingConfig } from './resource-naming';
import { validateResourceName } from './utils';

/**
 * A default MDAA Naming implementation
 */
export class MdaaDefaultResourceNaming implements IMdaaResourceNaming {
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
      name = `${name}-${this.lowerCase(resourceNameSuffix)}`;
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
   * Generates a ssm param name in the format of /<org>/<env>/<domain>/<module_name>
   */
  public ssmPath(path: string, includeModuleName = true, lowerCase = true): string {
    let name = `/${this.props.org}/${this.props.domain}`;
    if (includeModuleName) {
      name = `${name}/${this.props.moduleName}`;
    }
    return lowerCase ? this.lowerCase(`${name}/${path}`) : `${name}/${path}`;
  }

  /**
   * Generates a export name in the format of <org>:<env>:<domain>:<module_name>
   */
  public exportName(path: string): string {
    const name = `${this.props.org}:${this.props.domain}:${this.props.moduleName}`;
    return this.lowerCase(`${name}:${path}`);
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
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h.toString(16);
  }

  protected lowerCase(input: string): string {
    return input.toLowerCase().replace(/\{token\[token\.(\d+)]}/, '{Token[TOKEN.$1]}');
  }
}
