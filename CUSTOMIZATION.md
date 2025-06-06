# Customization

MDAA can optionally be customized using code-based extension points/escape hatches. Specifically, a custom naming module and custom CDK aspects can be used to modify the resources/stacks produced by MDAA before deployment.

## Custom Naming Implementation

Custom naming modules can be implemented through implementation of the *IMdaaResourceNaming* interface located in the @aws-mdaa/naming npm package. Sample code is available below and also in the `./sample_code/custom-naming` subdirectory of the MDAA repo (along with full package structure).

Custom naming implementations can be used in MDAA via the following config in the mdaa.yaml. This config can be applied globally, per domain, environment, or module

```yaml
# Path to a custom naming module (relative to mdaa.yaml) implementation and class name
naming_module: ../custom-naming
naming_class: YourCustomNamingClass
```

```yaml
# Path to a custom naming module (published to NPM) implementation and class name
naming_module: @your-custom-namespace/your-custom-naming
naming_class: YourCustomNamingClass
```

### Example/Default naming implementation

The following is the default naming implementation for MDAA. This can be modified, built, and included in your MDAA config to provide custom naming to all deployed resources.

```typescript
/**
 * A default MDAA Naming implementation
 */
export class MdaaDefaultResourceNaming implements IMdaaResourceNaming {
    public readonly props: MdaaResourceNamingConfig;

    constructor( props: MdaaResourceNamingConfig ) {
        this.props = props;
    }
    /**
     * Returns this naming object but with a new moduleName
     * 
     * @param moduleName The new module name
     */
    public withModuleName ( moduleName: string ): IMdaaResourceNaming {
        const newProps: MdaaResourceNamingConfig = {
            cdkNode: this.props.cdkNode,
            org: this.props.org,
            env: this.props.env,
            domain: this.props.domain,
            moduleName: moduleName,
        };
        return new MdaaDefaultResourceNaming( newProps );
    }

    /**
     * Generates a resource name in the format of <org>-<env>-<domain>-<module_name>
     */
    public resourceName ( resourceNameSuffix?: string, maxLength?: number ): string {
        let name = `${this.props.org}-${this.props.env}-${this.props.domain}-${this.props.moduleName}`;
        if ( resourceNameSuffix ) {
          name = `${name}-${this.lowerCase(resourceNameSuffix)}`;
        }
        if ( maxLength && name.length >= maxLength ) {
          const hashCodeHex = MdaaDefaultResourceNaming.hashCodeHex(name);
          return `${name.substring(0, maxLength - (hashCodeHex.length + 1))}-${hashCodeHex}`;
        }
        return name;
    }

    /**
     * Generates a ssm param name in the format of /<org>/<env>/<domain>/<module_name>
     */
      public ssmPath(path: string, includeModuleName = true, lowerCase = true): string {
        let name = `/${this.props.org}/${this.props.domain}`;
        if ( includeModuleName ) {
          name = `${name}/${this.props.moduleName}`;
        }
        return lowerCase ? this.lowerCase(`${name}/${path}`) : `${name}/${path}`;
    }

    /**
     * Generates a export name in the format of <org>:<env>:<domain>:<module_name>
     */
      public exportName(path: string, includeModuleName = true, lowerCase = true): string {
        let name = `${this.props.org}:${this.props.domain}`;
        if ( includeModuleName ) {
          name = `${name}:${this.props.moduleName}`;
        }
        return lowerCase ? this.lowerCase(`${name}:${path}`) : `${name}:${path}`;
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
        if ( suffix ) {
          stackName = `${stackName}-${this.lowerCase(suffix)}`;
        }
        return stackName;
    }

    protected static sanitize ( component: string ): string | undefined {
        if ( !component ) {
          return component;
        }
        return component.replace(/^\W+$/g, '').replace(/_/g, '-');
    }

    protected static hashCodeHex ( s: string ) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
            return h.toString( 16 );
        }

      protected lowerCase(input: string): string {
        return input.toLowerCase().replace(/\{token\[token\.(\d+)\]\}/, '{Token[TOKEN.$1]}');
      }
}

```

#### Example Extended Naming Implementation

```typescript
import { IMdaaResourceNaming, MdaaResourceNamingConfig, MdaaDefaultResourceNaming } from '@aws-mdaa/naming'

export class ExtendedDefaultNaming extends MdaaDefaultResourceNaming {
    constructor( props: MdaaResourceNamingConfig ) {
        super( props )
        console.log( 'Using ExtendedDefaultNaming2' );
    }

    ssmPath ( path: string ): string {
        return "my-custom-prefix/" + path
    }

}
```

## Custom Aspects

CDK [Custom Aspects](https://docs.aws.amazon.com/cdk/v2/guide/aspects.html) can be used to customize the stacks and resources MDAA produces before they are deployed. Custom aspects use the visitor pattern to 'visit' each resource, the properties of which can be modified as required. Sample code is available below and also in the ./samples/sample-code/custom-aspects subdirectory of the MDAA repo.

Custom aspects implementations can be used in MDAA via the following config in the mdaa.yaml. This config can be applied globally, per domain, environment, or module

```yaml
custom_aspects:
  # Example of a local custom aspect module, located relative to mdaa.yaml
  - aspect_module: ./custom-aspects
    aspect_class: RolePermissionsBoundaryAspect
    # props which will be passed to the custom aspect constructor
    aspect_props:
      permissionsBoundaryArn: some-test-arn
  # Example of a custom module which will be installed from NPM package
  - aspect_module: "@aws-mdaa-testing/sample-custom-aspects@0.0.3"
    aspect_class: SampleCustomAspect
```

### Example Custom Aspects

This sample custom aspect illustrates the basic structure/use of custom aspects in MDAA.

```yaml
custom_aspects:
  - aspect_module: "@aws-mdaa-testing/sample-custom-aspects@0.0.3"
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

This sample custom aspect is used to apply a permission boundary (by policy arn) to any role produced by MDAA.

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
