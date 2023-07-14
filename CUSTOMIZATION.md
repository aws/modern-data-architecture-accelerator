# Customization

CAEF can optionally be customized using code-based extension points/escape hatches. Specifically, a custom naming module and custom CDK aspects can be used to modify the resources/stacks produced by CAEF before deployment.

## Custom Naming Implementation

Custom naming modules can be implemented through implementation of the *ICaefResourceNaming* interface located in the @aws-caef/naming npm package. Sample code is available below and also in the `./sample_code/custom-naming` subdirectory of the CAEF repo (along with full package structure).

Custom naming implementations can be used in CAEF via the following config in the caef.yaml. This config can be applied globally, per domain, environment, or module

```yaml
# Path to a custom naming module (relative to caef.yaml) implementation and class name
naming_module: ../custom-naming
naming_class: YourCustomNamingClass
```

```yaml
# Path to a custom naming module (published to NPM) implementation and class name
naming_module: @your-custom-namespace/your-custom-naming
naming_class: YourCustomNamingClass
```

### Example/Default naming implementation

The following is the default naming implementation for CAEF. This can be modified, built, and included in your CAEF config to provide custom naming to all deployed resources.

```typescript
/**
 * A default CAEF Naming implementation
 */
export class ExampleCustomNaming {
    public readonly props: CaefResourceNamingConfig;

    constructor( props: CaefResourceNamingConfig ) {
        this.props = props
    }
    /**
     * Returns this naming object but with a new moduleName
     * 
     * @param moduleName The new module name
     */
    public withModuleName ( moduleName: string ): ICaefResourceNaming {
        const newProps: CaefResourceNamingConfig = {
            cdkNode: this.props.cdkNode,
            org: this.props.org,
            env: this.props.env,
            domain: this.props.domain,
            moduleName: moduleName
        }
        return new CaefDefaultResourceNaming( newProps )
    }

    /**
     * Generates a resource name in the format of <org>-<env>-<domain>-<module_name>
     */
    public resourceName ( resourceNameSuffix?: string, maxLength?: number ): string {
        let name = `${ this.props.org }-${ this.props.env }-${ this.props.domain }-${ this.props.moduleName }`
        if ( resourceNameSuffix ) {
            name = `${ name }-${ resourceNameSuffix.toLowerCase() }`
        }
        if ( maxLength && name.length >= maxLength ) {
            const hashCodeHex = CaefDefaultResourceNaming.hashCodeHex( name )
            return `${ name.substring( 0, maxLength - ( hashCodeHex.length + 1 ) ) }-${ hashCodeHex }`
        }
        return name
    }

    /**
     * Generates a ssm param name in the format of /<org>/<env>/<domain>/<module_name>
     */
    public ssmPath ( path: string, includeModuleName: boolean = true, lowerCase: boolean = true ): string {
        let name = `/${ this.props.org }/${ this.props.domain }`
        if ( includeModuleName ) {
            name = `${ name }/${ this.props.moduleName }`
        }
        return lowerCase ? `${ name }/${ path }`.toLowerCase() : `${ name }/${ path }`
    }

    /**
     * Generates a export name in the format of <org>:<env>:<domain>:<module_name>
     */
    public exportName ( path: string, includeModuleName: boolean = true, lowerCase: boolean = true ): string {
        let name = `${ this.props.org }:${ this.props.domain }`
        if ( includeModuleName ) {
            name = `${ name }:${ this.props.moduleName }`
        }
        return lowerCase ? `${ name }:${ path }`.toLowerCase() : `${ name }:${ path }`
    }

    /**
     * Generates a stack name in the format of <org>-<env>-<domain>-<module_name>.
     * Sanitizes non-alpha numeric characters and replaces underscores with '-'
     */
    public stackName ( stackNameSuffix: string ): string {

        const org = CaefDefaultResourceNaming.sanitize( this.props.org )
        const env = CaefDefaultResourceNaming.sanitize( this.props.env )
        const domain = CaefDefaultResourceNaming.sanitize( this.props.domain )
        const module_name = CaefDefaultResourceNaming.sanitize( this.props.moduleName )
        const suffix = CaefDefaultResourceNaming.sanitize( stackNameSuffix )

        let stackName = `${ org }-${ env }-${ domain }-${ module_name }`
        if ( suffix ) {
            stackName = `${ stackName }-${ suffix.toLowerCase() }`
        }
        return stackName
    }

    protected static sanitize ( component: string ): string | undefined {
        if ( !component ) {
            return component
        }
        return component.replace( /^\W+$/g, '' ).replace( /_/g, '-' )
    }

    protected static hashCodeHex ( s: string ) {
        let h = 0
        for ( let i = 0; i < s.length; i++ )
            h = Math.imul( 31, h ) + s.charCodeAt( i ) | 0;
        return h.toString( 16 );
    }
}
```

#### Example Extended Naming Implementation

```typescript
import { ICaefResourceNaming, CaefResourceNamingConfig, CaefDefaultResourceNaming } from '@aws-caef/naming'

export class ExtendedDefaultNaming extends CaefDefaultResourceNaming {
    constructor( props: CaefResourceNamingConfig ) {
        super( props )
        console.log( 'Using ExtendedDefaultNaming2' );
    }

    ssmPath ( path: string ): string {
        return "my-custom-prefix/" + path
    }

}
```

## Custom Aspects

CDK [Custom Aspects](https://docs.aws.amazon.com/cdk/v2/guide/aspects.html) can be used to customize the stacks and resources CAEF produces before they are deployed. Custom aspects use the visitor pattern to 'visit' each resource, the properties of which can be modified as required. Sample code is available below and also in the ./samples/sample-code/custom-aspects subdirectory of the CAEF repo.

Custom aspects implementations can be used in CAEF via the following config in the caef.yaml. This config can be applied globally, per domain, environment, or module

```yaml
custom_aspects:
  # Example of a local custom aspect module, located relative to caef.yaml
  - aspect_module: ./custom-aspects
    aspect_class: RolePermissionsBoundaryAspect
    # props which will be passed to the custom aspect constructor
    aspect_props:
      permissionsBoundaryArn: some-test-arn
  # Example of a custom module which will be installed from NPM package
  - aspect_module: "@aws-caef-testing/sample-custom-aspects@0.0.3"
    aspect_class: SampleCustomAspect
```

### Example Custom Aspects

This sample custom aspect illustrates the basic structure/use of custom aspects in CAEF.

```yaml
custom_aspects:
  - aspect_module: "@aws-caef-testing/sample-custom-aspects@0.0.3"
    aspect_class: SampleCustomAspect
```

#### Sample Basic Custom Aspect

```typescript
import { IAspect } from "aws-cdk-lib";
import { CfnRole, Role } from "aws-cdk-lib/aws-iam";
import { CfnApplication } from "aws-cdk-lib/aws-sam";
import { IConstruct } from "constructs";

export class SampleCustomAspect implements IAspect {

    constructor( props: { [ key: string ]: any } ) {

    }

    public visit ( construct: IConstruct ): void {
        console.log( `Sample custom aspect visited: ${ construct.node.path }` )
    }

}
```

#### Role Permission Boundary Custom Aspect

This sample custom aspect is used to apply a permission boundary (by policy arn) to any role produced by CAEF.

```yaml
custom_aspects:
  - aspect_module: ./custom-aspects
    aspect_class: RolePermissionsBoundaryAspect
    aspect_props:
      permissionsBoundaryArn: some-test-arn
```

```typescript
import { IAspect } from "aws-cdk-lib";
import { CfnRole, Role } from "aws-cdk-lib/aws-iam";
import { CfnApplication } from "aws-cdk-lib/aws-sam";
import { IConstruct } from "constructs";

export class RolePermissionsBoundaryAspect implements IAspect {
    private readonly permissionsBoundaryArn: string;

    constructor( props: { [ key: string ]: any } ) {
        this.permissionsBoundaryArn = props.permissionsBoundaryArn;
    }

    public visit ( construct: IConstruct ): void {
        const node = construct as any
        if ( node.cfnResourceType == "AWS::IAM::Role" ) {
            const resource = node as CfnRole;
            console.log( `Applying PermissionsBoundary ${ this.permissionsBoundaryArn } to role ${ resource.roleName }` )
            resource.addPropertyOverride( 'PermissionsBoundary', this.permissionsBoundaryArn );
        }
    }
}
```
