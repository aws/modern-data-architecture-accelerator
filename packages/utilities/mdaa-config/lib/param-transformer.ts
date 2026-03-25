import { CfnParameter, CfnParameterProps, Stack } from 'aws-cdk-lib';
import { MdaaConfigRefValueTransformerProps, MdaaConfigRefValueTransformer } from './ref-value-transformer';

export interface MdaaConfigParamRefValueTransformerProps extends MdaaConfigRefValueTransformerProps {
  readonly paramProps: { [name: string]: CfnParameterProps };
}
export class MdaaConfigParamRefValueTransformer extends MdaaConfigRefValueTransformer {
  private readonly paramProps: { [name: string]: CfnParameterProps };
  constructor(props: MdaaConfigParamRefValueTransformerProps) {
    super(props);
    this.paramProps = props.paramProps;
  }
  protected override parseRef(value: string, refMatch: string[]): string | number {
    /**
     * Handle base case where we resolve and return a single naked parameter value,
     * Important as we need to avoid building a string if we have a standalone numerical value
     */
    const standaloneParam = this.resolveStandaloneParam(value, refMatch);
    if (standaloneParam) {
      return standaloneParam;
    }
    // In all other cases, return a recursively substituted string
    let toReturn: string = value;
    refMatch.forEach(ref => {
      let resolvedValue: string | undefined;
      const refInner = this.transformValue(ref).toString();
      if (refInner.startsWith('param:') && this.props.scope instanceof Stack) {
        resolvedValue = this.createParam(refInner).toString();
      }
      toReturn = resolvedValue ? toReturn.replace(`{{${ref}}}`, resolvedValue) : toReturn;
    });
    return toReturn;
  }
  /**
   * Resolve standalone parameters with no other content in the value.
   * "Standalone" means it is not embedded in a string value.
   * Important as this can be a case where a number should be returned instead of a string.
   * @param value
   * @param refMatch
   * @returns
   */
  private resolveStandaloneParam(value: string, refMatch: string[]): string | number | undefined {
    if (refMatch.length === 1) {
      const strippedValue = value.replace(`{{${refMatch[0]}}}`, '').trim();
      if (strippedValue.length === 0) {
        const refInner = this.transformValue(refMatch[0]);
        if (typeof refInner === 'string') {
          if (refInner.startsWith('param:') && this.props.scope instanceof Stack) {
            return this.createParam(refInner);
          }
        }
      }
    }
    return undefined;
  }
  /**
   * Create new or resolve existing parameter for a given parameter reference
   * @param refInner
   * @returns Value of CfnParameter
   */
  private createParam(refInner: string): string | number {
    if (!this.props.scope) {
      throw new Error('Unable to create parameters outside of a Construct');
    }
    const stack = Stack.of(this.props.scope);
    const paramBase = refInner.replace(/^param:/, '');
    const paramName = paramBase
      .replace(/^string:/, '')
      .replace(/^number:/, '')
      .replace(/^list:/, '');
    const paramProps = this.getParamProps(paramName);
    const exists = stack.node.tryFindChild(paramName) as CfnParameter;
    // Return values for existing parameter if it already exists
    if (exists?.type) {
      if (this.isStringType(exists.type)) return exists.valueAsString;
      else if (this.isNumberType(exists.type)) return exists.valueAsNumber;
      else if (this.isListType(exists.type)) return exists.valueAsList.join(',');
    }
    // If parameter exists, but we weren't able to infer a type, return it as a string
    if (exists) {
      return exists.valueAsString;
    }
    // If parameter properties are present, use them to infer the parameter type if possible
    if (paramProps?.type) {
      return this.createParamUsingProps(paramName, paramProps.type, paramProps);
    }
    // If no paramProps type was found, create a new parameter based on type labels if present
    return this.createParamUsingTypeLabels(paramBase, paramName, paramProps);
  }
  private createParamUsingProps(paramName: string, paramType: string, paramProps: CfnParameterProps) {
    if (!this.props.scope) {
      throw new Error('Unable to create params outside of a Construct');
    }
    if (this.isNumberType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsNumber;
    } else if (this.isStringType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsString;
    } else if (this.isListType(paramType)) {
      return new CfnParameter(this.props.scope, paramName, paramProps).valueAsList.join(',');
    } else {
      throw new Error(
        `Invalid parameter type passed to paramProps: "${paramType}". Type must be one of ['String', 'Number', 'CommaDelimitedList']`,
      );
    }
  }
  protected createParamUsingTypeLabels(
    paramBase: string,
    paramName: string,
    paramProps: CfnParameterProps | undefined,
  ) {
    if (!this.props.scope) {
      throw new Error('Unable to create params outside of a Construct');
    }
    if (paramBase.startsWith('string:')) {
      const typedProps = { ...paramProps, type: 'String' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsString;
    } else if (paramBase.startsWith('number')) {
      const typedProps = { ...paramProps, type: 'Number' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsNumber;
    } else if (paramBase.startsWith('list')) {
      const typedProps = { ...paramProps, type: 'CommaDelimitedList' };
      return new CfnParameter(this.props.scope, paramName, typedProps).valueAsList.join(',');
    }
    // If no type is specified in paramProps, then assume that the parameter is a string
    return new CfnParameter(this.props.scope, paramName, paramProps).valueAsString;
  }
  /**
   * Whether the given parameter type is a list type
   * Follows conventions of CfnParameter internal functions
   */
  private isListType(type: string) {
    return type.includes('List<') || type.includes('CommaDelimitedList');
  }
  /**
   * Whether the given parameter type is a number type
   * Follows conventions of CfnParameter internal functions
   */
  private isNumberType(type: string) {
    return type === 'Number';
  }
  /**
   * Whether the given parameter type is a string type
   * Follows conventions of CfnParameter internal functions
   */
  private isStringType(type: string) {
    return !this.isListType(type) && !this.isNumberType(type);
  }
  private getParamProps(paramName: string): CfnParameterProps | undefined {
    if (this.paramProps[paramName]) {
      return this.paramProps[paramName];
    }
    return undefined;
  }
}
