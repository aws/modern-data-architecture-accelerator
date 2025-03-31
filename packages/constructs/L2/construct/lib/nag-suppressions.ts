import { Stack } from 'aws-cdk-lib';
import { NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';

export class MdaaNagSuppressions {
  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addCodeResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const oldLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    const location = new Error().stack
      ?.split('\n')[2]
      .replace(/.*\(/, '') //NOSONAR
      .replace(/\).*/, '')
      .replace(/.*\/packages\//, 'packages/'); //NOSONAR
    Error.stackTraceLimit = oldLimit;
    Error.stackTraceLimit = oldLimit;
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[MDAA:${location}] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const configFilePath = construct.node.tryGetContext('module_configs');
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[CONFIG:${configFilePath}] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children via its path
   * @param stack The Stack the construct belongs to
   * @param path The path(s) to the construct in the provided stack
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressionsByPath(
    stack: Stack,
    path: string | string[],
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[CONFIG] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressionsWithSource, applyToChildren);
  }
}
