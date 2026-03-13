/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnParameter } from 'aws-cdk-lib';
import { ProductStack, ProductStackProps } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct, Node } from 'constructs';
import { MdaaStackProps } from './stack';
import { MdaaDefaultResourceNaming, MdaaResourceNamingConfig, IMdaaResourceNaming } from '@aws-mdaa/naming';

interface MdaaBaseProductStackProps extends ProductStackProps {
  readonly naming: IMdaaResourceNaming;
}

class BlueprintRoleHelper extends MdaaRoleHelper {
  constructor() {
    // Pass dummy values to parent constructor since they won't be used
    super({} as Construct, {} as IMdaaResourceNaming);
  }

  public override resolveRoleRefsWithOrdinals(): never {
    throw new Error(
      'Role references cannot be resolved in a Blueprint. Instead, directly provide the required arn/name/id fields on the reference. (resolveRoleRefsWithOrdinals)',
    );
  }

  public override resolveRoleRefs(): never {
    throw new Error(
      'Role references cannot be resolved in a Blueprint. Instead, directly provide the required arn/name/id fields on the reference. (resolveRoleRefs)',
    );
  }

  public override resolveRoleRefWithRefId(): never {
    throw new Error(
      'Role references cannot be resolved in a Blueprint. Instead, directly provide the required arn/name/id fields on the reference. (resolveRoleRefWithRefId)',
    );
  }

  public override resolveRoleRef(): never {
    throw new Error(
      'Role references cannot be resolved in a Blueprint. Instead, directly provide the required arn/name/id fields on the reference. (resolveRoleRef)',
    );
  }

  public override createProviderServiceToken(): never {
    throw new Error(
      'Role references cannot be resolved in a Blueprint. Instead, directly provide the required arn/name/id fields on the reference. (createProviderServiceToken)',
    );
  }
}

abstract class MdaaBaseProductBlueprintStack extends ProductStack {
  public readonly roleHelper: MdaaRoleHelper = new BlueprintRoleHelper();

  protected constructor(scope: Construct, id: string, props: MdaaBaseProductStackProps) {
    super(scope, id, props);
  }
}

export interface MdaaProductStackProps extends MdaaStackProps {
  readonly assetBucket: IBucket;
}

export class MdaaProductStack extends MdaaBaseProductBlueprintStack {
  public props: MdaaProductStackProps;
  public readonly provisionedNameParam: CfnParameter;

  constructor(scope: Construct, id: string, props: MdaaProductStackProps) {
    super(scope, id, props);
    const provisionedNameParam = new CfnParameter(this, 'provisionedName', {
      description: 'A unique name for the provisioned product.',
      maxLength: 16,
    });

    const productNaming = new ExpectedLengthNaming({
      cdkNode: props.naming.props.cdkNode,
      org: props.naming.props.org,
      domain: props.naming.props.domain,
      env: props.naming.props.env,
      moduleName: props.naming.props.moduleName + '-' + provisionedNameParam.valueAsString,
      expectedEnvLength: props.naming.props.moduleName.length + 17,
    });

    this.props = { ...props, naming: productNaming };
    this.provisionedNameParam = provisionedNameParam;
  }
}

export interface MdaaBlueprintStackProps extends MdaaStackProps {
  readonly assetBucket: IBucket;
  readonly blueprintName: string;
}

export class MdaaBlueprintStack extends MdaaBaseProductBlueprintStack {
  public props: MdaaBlueprintStackProps;
  public readonly dzDomainIdParam: CfnParameter;
  public readonly dzProjectNameParam: CfnParameter;
  public readonly dzEnvIdParam: CfnParameter;
  public readonly dzProjectIdParam: CfnParameter;

  constructor(scope: Construct, id: string, props: MdaaBlueprintStackProps) {
    super(scope, id, props);
    const dzDomainIdParam = new CfnParameter(this, 'datazoneEnvironmentDomainId', {
      description: 'A unique id for the owning domain.',
      maxLength: 18,
    });

    const dzProjectNameParam = new CfnParameter(this, 'datazoneEnvironmentProjectName', {
      description: 'Name of the owning project.',
    });

    const dzEnvIdParam = new CfnParameter(this, 'datazoneEnvironmentEnvironmentId', {
      description: 'A unique id for the deployed environment.',
      maxLength: 14,
    });

    const dzProjectIdParam = new CfnParameter(this, 'datazoneEnvironmentProjectId', {
      description: 'A unique id for the owning project.',
      maxLength: 14,
    });

    const blueprintNaming = new BlueprintNaming({
      cdkNode: props.naming.props.cdkNode,
      org: props.naming.props.org,
      datazoneEnvId: dzEnvIdParam.valueAsString,
      datazoneProjectId: dzProjectIdParam.valueAsString,
      blueprintName: props.blueprintName,
    });

    this.props = { ...props, naming: blueprintNaming };
    this.dzDomainIdParam = dzDomainIdParam;
    this.dzProjectNameParam = dzProjectNameParam;
    this.dzEnvIdParam = dzEnvIdParam;
    this.dzProjectIdParam = dzProjectIdParam;
  }
}

export interface ExpectedLengthNamingConfig extends MdaaResourceNamingConfig {
  readonly expectedOrgLength?: number;
  readonly expectedEnvLength?: number;
  readonly expectedDomainLength?: number;
  readonly expectedModuleNameLength?: number;
}

export class ExpectedLengthNaming extends MdaaDefaultResourceNaming {
  private readonly expectedOrgLength?: number;
  private readonly expectedEnvLength?: number;
  private readonly expectedDomainLength?: number;
  private readonly expectedModuleNameLength?: number;

  constructor(props: ExpectedLengthNamingConfig) {
    super(props);
    this.expectedOrgLength = props.expectedOrgLength;
    this.expectedEnvLength = props.expectedEnvLength;
    this.expectedDomainLength = props.expectedDomainLength;
    this.expectedModuleNameLength = props.expectedModuleNameLength;
  }

  public resourceName(resourceNameSuffix?: string, maxLength?: number): string {
    const baseName = super.resourceName(resourceNameSuffix);

    if (!maxLength) {
      return baseName;
    }

    // Start with 3 hyphens that separate org-env-domain-moduleName
    let placeholderLength = 3;
    let expectedLength = 3;

    // Add actual org length vs expected org length if specified
    if (this.expectedOrgLength !== undefined) {
      placeholderLength += this.props.org.length;
      expectedLength += this.expectedOrgLength;
    }
    // Add actual env length vs expected env length if specified
    if (this.expectedEnvLength !== undefined) {
      placeholderLength += this.props.env.length;
      expectedLength += this.expectedEnvLength;
    }
    // Add actual domain length vs expected domain length if specified
    if (this.expectedDomainLength !== undefined) {
      placeholderLength += this.props.domain.length;
      expectedLength += this.expectedDomainLength;
    }
    // Add actual moduleName length vs expected moduleName length if specified
    if (this.expectedModuleNameLength !== undefined) {
      placeholderLength += this.props.moduleName.length;
      expectedLength += this.expectedModuleNameLength;
    }

    // Adjust maxLength by the difference between expected and placeholder lengths
    // This reserves space for the expected final values while using placeholders during template generation
    const adjustedMaxLength = maxLength - (expectedLength - placeholderLength);
    return super.resourceName(resourceNameSuffix, adjustedMaxLength);
  }
}

export interface BlueprintNamingConfig {
  readonly datazoneEnvId: string;
  readonly datazoneProjectId: string;
  readonly blueprintName: string;
  readonly cdkNode: Node;
  readonly org: string;
}

export class BlueprintNaming extends ExpectedLengthNaming {
  // DataZone environment IDs are 14 characters (e.g., "b5iz4eoebmwo0a")
  private static readonly EXPECTED_ENV_LENGTH = 14;
  // DataZone project IDs are 14 characters (e.g., "d8o9ibda3nb9fu")
  private static readonly EXPECTED_DOMAIN_LENGTH = 14;

  constructor(props: BlueprintNamingConfig) {
    super({
      cdkNode: props.cdkNode,
      org: props.org,
      // Map DataZone environment ID to base naming env property
      env: props.datazoneEnvId,
      // Map DataZone project ID to base naming domain property
      domain: props.datazoneProjectId,
      // Map blueprint name to base naming moduleName property
      moduleName: props.blueprintName,
      // Only specify expected lengths for env and domain; org and moduleName used verbatim
      expectedEnvLength: BlueprintNaming.EXPECTED_ENV_LENGTH,
      expectedDomainLength: BlueprintNaming.EXPECTED_DOMAIN_LENGTH,
    });
  }
}
