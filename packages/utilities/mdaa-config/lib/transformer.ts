import { ConfigurationElement } from './config';

export type TransformResult = string | number;

export interface IMdaaConfigValueTransformer {
  transformValue(value: string, contextPath?: string): TransformResult;
}

export interface IMdaaConfigTransformer {
  transformConfig(config: ConfigurationElement): ConfigurationElement;
}

/**
 * A utility class which executs transformer functions against MDAA Configs.
 */
export class MdaaConfigTransformer implements IMdaaConfigTransformer {
  private readonly valueTransformer: IMdaaConfigValueTransformer;
  private readonly keyTransformer?: IMdaaConfigValueTransformer;
  constructor(valueTransformer: IMdaaConfigValueTransformer, keyTransformer?: IMdaaConfigValueTransformer) {
    this.valueTransformer = valueTransformer;
    this.keyTransformer = keyTransformer;
  }
  public transformConfig(config: ConfigurationElement): ConfigurationElement {
    return this.transformConfigObject('/', config);
  }
  /**
   * A recursive function which applies a transformation function to all config values.
   * @param contextPath
   * @param resolvedConfig The config object being transformed
   * @returns A config object with the transformation function applied to all config values.
   */
  public transformConfigObject(contextPath: string, resolvedConfig: ConfigurationElement): ConfigurationElement {
    const transformedConfig: ConfigurationElement = {};
    for (const key in resolvedConfig) {
      const value = resolvedConfig[key];
      const transformedKey = this.keyTransformer
        ? this.keyTransformer.transformValue(key, contextPath + '/' + key)
        : key;
      if (typeof value === 'string' || value instanceof String)
        transformedConfig[transformedKey] = this.valueTransformer.transformValue(
          value.toString(),
          contextPath + '/' + key,
        );
      else if (value instanceof Array)
        transformedConfig[transformedKey] = this.transformConfigArray(contextPath + '/' + key, value);
      else if (value instanceof Object) {
        transformedConfig[transformedKey] = this.transformConfigObject(
          contextPath + '/' + key,
          value as ConfigurationElement,
        );
      } else transformedConfig[transformedKey] = value;
    }
    return transformedConfig;
  }
  /**
   * A helper function for transformConfigObject for use with Arrays.
   * @param contextPath
   * @param resolvedConfig (Required) - The config object being transformed
   * @returns A config object with the transformation function applied to all config values.
   */
  public transformConfigArray(contextPath: string, resolvedConfig: unknown[]): unknown[] {
    const transformedConfig: ConfigurationElement | unknown[] = [];
    resolvedConfig.forEach(value => {
      if (typeof value === 'string' || value instanceof String)
        transformedConfig.push(this.valueTransformer.transformValue(value.toString(), contextPath));
      else if (value instanceof Array)
        transformedConfig.push(this.transformConfigArray(contextPath, value as unknown[]));
      else if (value instanceof Object)
        transformedConfig.push(this.transformConfigObject(contextPath, value as ConfigurationElement));
      else transformedConfig.push(value);
    });
    return transformedConfig;
  }
}
