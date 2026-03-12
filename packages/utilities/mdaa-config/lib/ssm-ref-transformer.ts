import { IMdaaConfigValueTransformer } from '.';

export class MdaaConfigSSMValueTransformer implements IMdaaConfigValueTransformer {
  public transformValue(value: string, contextPath: string): string {
    const ignorePaths = ['policyDocument/Statement/Action'];
    if (
      value.startsWith('ssm:') &&
      ignorePaths.every(ignorePath => !contextPath.toLowerCase().endsWith(ignorePath.toLowerCase()))
    ) {
      const paramName = value.replace(/^ssm:\s*/, '');
      return `{{resolve:ssm:${paramName}}}`;
    } else {
      return value;
    }
  }
}
