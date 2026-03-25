import { CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
// nosemgrep
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import * as XRegExp from 'xregexp';
import { IMdaaConfigValueTransformer, TransformResult } from './transformer';

export interface MdaaConfigBlueprintRefValueTransformerProps {
  readonly naming: IMdaaResourceNaming;
  readonly scope: Construct;
}

export class MdaaConfigBlueprintRefValueTransformer implements IMdaaConfigValueTransformer {
  protected props: MdaaConfigBlueprintRefValueTransformerProps;

  constructor(props: MdaaConfigBlueprintRefValueTransformerProps) {
    this.props = props;
  }

  public transformValue(value: string): TransformResult {
    const refMatch = XRegExp.matchRecursive(value, '{{', '}}', 'g', {
      unbalanced: 'skip',
    });
    if (refMatch.length > 0) {
      return this.parseBlueprintRef(value, refMatch) as TransformResult;
    } else {
      return value;
    }
  }

  protected parseBlueprintRef(value: string, refMatch: string[]): string | number | object {
    // Substitute all references in the string
    return this.substituteBlueprintReferences(value, refMatch);
  }

  private substituteBlueprintReferences(value: string, refMatch: string[]): string {
    return refMatch.reduce((result, ref) => {
      const refInner = this.transformValue(ref).toString();
      const resolvedValue = this.resolveBlueprintReference(refInner);

      if (resolvedValue === undefined) {
        return result;
      }

      const stringValue = this.convertToString(resolvedValue);
      return result.replace(`{{${ref}}}`, stringValue);
    }, value);
  }

  private convertToString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // For objects, use JSON.stringify as a safe fallback
    return JSON.stringify(value);
  }

  private resolveBlueprintReference(refInner: string) {
    if (refInner.startsWith('blueprint:')) {
      if (!this.props.scope) {
        throw new Error('Unable to resolve blueprint params outside of a Construct');
      }
      if (!this.props.naming) {
        throw new Error('Unable to resolve blueprint params without a naming implementation');
      }
      const blueprintPath = refInner.replace(/^blueprint:/, '');
      const ssmOrgPath = this.props.naming?.ssmOrgPath('', false);
      const existingDzProjectParam = this.props.scope?.node.tryFindChild(
        'datazoneEnvironmentProjectId',
      ) as CfnParameter;
      const dzProjectParam =
        existingDzProjectParam ?? new CfnParameter(this.props.scope, 'datazoneEnvironmentProjectId');
      const ssmPath = `{{resolve:ssm:${ssmOrgPath}${dzProjectParam.valueAsString}${blueprintPath}}}`;
      console.log(`Resolving blueprint path: ${ssmPath}`);
      return ssmPath;
    }

    return undefined;
  }
}
