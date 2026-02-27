import { IMdaaConfigValueTransformer } from '.';

const IGNORE_PATH = ['policyDocument/Statement/Action'];
export class MdaaConfigSSMValueTransformer implements IMdaaConfigValueTransformer {
  public transformValue(value: string, contextPath: string): string {
    if (
      value.startsWith('ssm:') &&
      IGNORE_PATH.every(ignorePath => !contextPath.toLowerCase().endsWith(ignorePath.toLowerCase()))
    ) {
      const paramName = value.replace(/^ssm:\s*/, '');
      return `{{resolve:ssm:${paramName}}}`;
    } else {
      return value;
    }
  }
}
