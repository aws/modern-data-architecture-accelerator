/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigConfigPathValueTransformer,
  ConfigurationElement,
  MdaaConfigTransformer,
  MdaaCustomAspect,
  MdaaServiceCatalogProductConfig,
  TagElement,
} from '@aws-mdaa/config';
import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IMdaaResourceNaming, MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { App, AppProps, Aspects, Stack, Tags } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  CfnLaunchRoleConstraint,
  CfnLaunchRoleConstraintProps,
  CloudFormationProduct,
  CloudFormationProductProps,
  CloudFormationTemplate,
  Portfolio,
} from 'aws-cdk-lib/aws-servicecatalog';
import { AwsSolutionsChecks, HIPAASecurityChecks, NIST80053R5Checks, PCIDSS321Checks } from 'cdk-nag';
import * as path from 'path';
import {
  MdaaAppConfigParser,
  MdaaAppConfigParserProps,
  MdaaBaseConfigContents,
  MdaaSageMakerCustomBluePrintConfig,
} from './app_config';
import { MdaaBlueprintStack, MdaaProductStack } from './blueprint-product-stack';
import * as configSchema from './config-schema.json';
import { MdaaStack } from './stack';
import { cleanContextStringValue, filterConfigurationElement, getNodeValue, readYamlFile } from './utils';
// nosemgrep
import { DomainConfig } from '@aws-mdaa/datazone-constructs';
import * as assert from 'assert';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as pjson from '../package.json';
import { CustomBlueprintL3Construct } from './custom-blueprint-l3-construct';

export interface MdaaAppProps extends AppProps {
  readonly appConfigRaw?: ConfigurationElement;
  readonly useBootstrap?: boolean;
}

export interface MdaaPackageNameVersion {
  readonly name: string;
  readonly version: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Deployment interface.
 *
 * Use cases: Application deployment; Schema validation; Configuration management; MDAA app orchestration
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface Deployment {
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * AWS account ID for deployment targeting in multi-account architectures. Specifies the target AWS account where resources should be deployed, enabling cross-account deployments and multi-account data architectures.
   *
   * Use cases: Multi-account deployment; Cross-account resource targeting; Account-specific stack deployment
   *
   * AWS: AWS CDK Stack environment account property for cross-account deployment
   *
   * Validation: Must be valid 12-digit AWS account ID; optional string for deployment targeting
   **/
  readonly account?: string;
  readonly addDependencyMainStack?: boolean;
}

/**
 * Base class for MDAA CDK Apps. Provides consistent app behaviours in
 * configuration parsing, stack generation, resource naming,
 * and CDK Nag compliance configurations.
 * Reads all required inputs as CDK Context.
 */
export abstract class MdaaCdkApp extends App {
  private readonly naming: IMdaaResourceNaming;
  protected readonly moduleName: string;
  private readonly appConfigRaw: ConfigurationElement;
  private readonly tags: { [name: string]: string };
  private readonly org: string;
  private readonly env: string;
  private readonly domain: string;
  private readonly solutionId: string;
  private readonly solutionName: string;
  private readonly solutionVersion: string;
  protected readonly deployRegion?: string;
  protected readonly deployAccount?: string;
  private readonly useBootstrap: boolean;
  private readonly stack: MdaaStack;
  private readonly baseConfigParser: MdaaAppConfigParser<MdaaBaseConfigContents>;
  private readonly additionalStacksMap: { [account: string]: { [region: string]: Stack } };

  /**
   * Constructor does most of the app initialization, reading inputs from CDK context, parsing App config files, configuring resource naming, and configuring CDK Nag.
   * @param props - CDK AppProps (default empty). Not typically required if running using the CDK cli, but useful for direct instantiation.
   * @param packageNameVersion
   */
  constructor(props: MdaaAppProps, packageNameVersion?: MdaaPackageNameVersion) {
    super(props);

    this.node.setContext('aws-cdk:enableDiffNoFail', true);
    this.node.setContext('@aws-cdk/core:enablePartitionLiterals', true);

    assert(this.node.tryGetContext('org'), "Organization must be specified in context as 'org'");
    assert(this.node.tryGetContext('env'), "Environment must be specified in context as 'env'");
    assert(this.node.tryGetContext('domain'), "Domain must be specified in context as 'domain'");
    assert(this.node.tryGetContext('module_name'), "Module Name must be specified in context as 'module_name'");

    this.org = this.node.tryGetContext('org').toLowerCase();
    this.env = this.node.tryGetContext('env').toLowerCase();
    this.domain = this.node.tryGetContext('domain').toLowerCase();
    this.moduleName = this.node.tryGetContext('module_name').toLowerCase();

    // Solution Details
    this.solutionId = pjson.solution_id;
    this.solutionName = pjson.solution_name;
    this.solutionVersion = pjson.version;

    const packageName = packageNameVersion?.name.replace('@aws-mdaa/', '') ?? 'unknown';
    const packageVersion = packageNameVersion?.version ?? 'unknown';

    console.log(`Running MDAA Module ${packageName} Version: ${packageVersion}`);
    if (this.node.tryGetContext('@aws-mdaa/legacyCaefTags')) {
      this.tags = {
        caef_org: this.org,
        caef_env: this.env,
        caef_domain: this.domain,
        caef_cdk_app: packageName,
        caef_module_name: this.moduleName,
      };
    } else {
      this.tags = {
        mdaa_org: this.org,
        mdaa_env: this.env,
        mdaa_domain: this.domain,
        mdaa_cdk_app: packageName,
        mdaa_module_name: this.moduleName,
      };
    }

    if (props.useBootstrap != undefined) {
      this.useBootstrap = props.useBootstrap;
    } else {
      this.useBootstrap =
        this.node.tryGetContext('use_bootstrap') == undefined
          ? true
          : cleanContextStringValue(this.node.tryGetContext('use_bootstrap')).toLowerCase() === 'true';
    }
    const namingModule: string = this.node.tryGetContext('naming_module');
    const namingClass: string = this.node.tryGetContext('naming_class');
    this.naming = this.configNamingModule(namingModule, namingClass);
    const logSuppressions: boolean =
      this.node.tryGetContext('log_suppressions') == undefined
        ? false
        : cleanContextStringValue(this.node.tryGetContext('log_suppressions')).toLowerCase() === 'true';

    Aspects.of(this).add(new AwsSolutionsChecks({ verbose: true, logIgnores: logSuppressions }));
    Aspects.of(this).add(new NIST80053R5Checks({ verbose: true, logIgnores: logSuppressions }));
    Aspects.of(this).add(new HIPAASecurityChecks({ verbose: true, logIgnores: logSuppressions }));
    Aspects.of(this).add(new PCIDSS321Checks({ verbose: true, logIgnores: logSuppressions }));

    this.applyCustomAspects();

    this.appConfigRaw = {
      ...this.loadConfigFromFiles(this.node.tryGetContext('module_configs')?.split(',') || []),
      ...this.loadAppConfigDataFromContext(),
      ...props.appConfigRaw,
    };
    this.tags = { ...this.loadTagConfigFromFiles(), ...this.loadTagConfigDataFromContext(), ...this.tags };

    this.deployAccount = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
    this.deployRegion = process.env.CI_SUPPLIED_TARGET_REGION || process.env.CDK_DEFAULT_REGION;

    this.stack = this.createEmptyStack(packageName);

    const additionalStacks = getNodeValue(this.node, 'additional_stacks', []) as Deployment[];
    this.additionalStacksMap = Object.fromEntries(
      additionalStacks?.map(deployment => {
        const account = deployment.account ?? this.stack.account;
        const region = deployment.region ?? this.stack.region;
        const addDependencyMainStack = deployment.addDependencyMainStack ?? true;

        let stackName: string;
        if (deployment.account && deployment.region) {
          stackName = this.naming.stackName(account + '-' + region);
        } else if (deployment.account) {
          stackName = this.naming.stackName(account);
        } else if (deployment.region) {
          stackName = this.naming.stackName(region);
        } else {
          throw new Error('One of account or region must be specified in additional_stacks');
        }
        const stackProps = {
          naming: this.naming,
          env: {
            region: region,
            account: account,
          },
        };
        const additionalAccountStack = new Stack(this, stackName, stackProps);
        if (addDependencyMainStack) {
          additionalAccountStack.addDependency(this.stack);
        }
        return [account, Object.fromEntries([[region, additionalAccountStack]])];
      }) || [],
    );
    //Issue here with SSM refs being resolved both by the base config parser and the module config parser
    //resulting in SSM param refs needlessly being created. Need to filter base config down
    //to only elements which are actually base config.
    const baseAppConfig = filterConfigurationElement(this.appConfigRaw, [
      'service_catalog_product_config',
      'sagemakerBlueprint',
      'nag_suppressions',
    ]);
    this.baseConfigParser = new MdaaAppConfigParser<MdaaBaseConfigContents>(
      this.stack,
      this.getConfigParserProps(baseAppConfig),
      configSchema,
      undefined,
      true,
    );
  }

  protected static parsePackageJson(pjsonPath: string): MdaaPackageNameVersion {
    // nosemgrep
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pjson = require(pjsonPath);
    return {
      name: pjson.name,
      version: pjson.version.replace(/\.\d*$/, '.x'),
    };
  }

  private loadTagConfigDataFromContext(): { [key: string]: string } {
    return getNodeValue(this.node, 'tag_config_data', {});
  }

  private loadAppConfigDataFromContext(): ConfigurationElement {
    return getNodeValue(this.node, 'module_config_data', {});
  }

  private loadTagConfigFromFiles(): TagElement {
    const tagConfigRaw = this.loadConfigFromFiles(
      this.node.tryGetContext('tag_configs')?.split(',').map(cleanContextStringValue) || [],
    );
    return (tagConfigRaw['tags'] as TagElement) || {};
  }

  private loadConfigFromFiles(fileList: string[]): ConfigurationElement {
    // nosemgrep
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const _ = require('lodash');

    function customizer(objValue: unknown, srcValue: unknown): unknown[] | undefined {
      if (_.isArray(objValue)) {
        return (objValue as unknown[]).concat(srcValue);
      }
      return undefined;
    }

    let configRaw: ConfigurationElement = {};

    fileList.forEach((rawFileName: string) => {
      const fileName = cleanContextStringValue(rawFileName);
      console.log(`Reading config from ${fileName}`);
      // nosemgrep
      const parsedYaml = readYamlFile(fileName.trim());
      //Resolve relative paths in parsedYaml
      const baseDir = path.dirname(fileName.trim());
      const pathResolvedYaml = new MdaaConfigTransformer(new ConfigConfigPathValueTransformer(baseDir)).transformConfig(
        parsedYaml as ConfigurationElement,
      );
      configRaw = _.mergeWith(configRaw, pathResolvedYaml, customizer);
    });

    return configRaw;
  }

  private configNamingModule(namingModule: string, namingClass: string): IMdaaResourceNaming {
    if (namingModule) {
      // nosemgrep
      const naming_module_path = namingModule.startsWith('./') ? path.resolve(namingModule) : namingModule;
      // nosemgrep
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const customNamingModule = require(naming_module_path);
      return new customNamingModule[namingClass]({
        cdkNode: this.node,
        org: this.org,
        env: this.env,
        domain: this.domain,
        moduleName: this.moduleName,
      });
    } else {
      return new MdaaDefaultResourceNaming({
        cdkNode: this.node,
        org: this.org,
        env: this.env,
        domain: this.domain,
        moduleName: this.moduleName,
      });
    }
  }

  private applyCustomAspects() {
    const customAspects: MdaaCustomAspect[] = getNodeValue(this.node, 'custom_aspects', []);
    console.log(typeof customAspects);
    customAspects.forEach(customAspect => this.applyCustomAspect(customAspect));
  }

  private applyCustomAspect(customAspect: MdaaCustomAspect) {
    // nosemgrep
    const customAspectModulePath = customAspect.aspect_module.startsWith('./')
      ? path.resolve(customAspect.aspect_module)
      : customAspect.aspect_module;
    console.log(`Applying custom aspect: ${customAspect.aspect_module}:${customAspect.aspect_class}`);
    // nosemgrep
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const customAspectModule = require(customAspectModulePath);
    const aspect = new customAspectModule[customAspect.aspect_class](customAspect.aspect_props);
    Aspects.of(this).add(aspect);
  }

  private generateServiceCatalogProductParentStackResources(
    serviceCatalogConfig: MdaaServiceCatalogProductConfig,
    parentStack: MdaaStack,
    productStack: MdaaProductStack,
  ): Stack {
    const productProps: CloudFormationProductProps = {
      productName: serviceCatalogConfig.name,
      owner: serviceCatalogConfig.owner,
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: CloudFormationTemplate.fromProductStack(productStack),
        },
      ],
    };
    const product = new CloudFormationProduct(parentStack, 'Product', productProps);
    const portfolio = Portfolio.fromPortfolioArn(parentStack, 'portfolio', serviceCatalogConfig.portfolio_arn);
    if (serviceCatalogConfig.launch_role_name) {
      const launchRoleConstraintProps: CfnLaunchRoleConstraintProps = {
        portfolioId: portfolio.portfolioId,
        productId: product.productId,
        localRoleName: serviceCatalogConfig.launch_role_name,
      };
      new CfnLaunchRoleConstraint(parentStack, 'launch-role-constraint', launchRoleConstraintProps);
    }
    portfolio.addProduct(product);
    return parentStack;
  }

  private generateSageMakerBlueprintStack(sagemakerBlueprintConfig: MdaaSageMakerCustomBluePrintConfig) {
    const domainConfig = sagemakerBlueprintConfig.domainConfigSSMParam
      ? new DomainConfig(this.stack, 'domain-config-parser', {
          ssmParamBase: sagemakerBlueprintConfig.domainConfigSSMParam,
          naming: this.naming,
        })
      : sagemakerBlueprintConfig.domainConfig;

    if (!domainConfig) {
      throw new Error('One of domainConfig or domainConfigSSMParam must be specified');
    }

    const domainBucket = sagemakerBlueprintConfig.domainBucketName
      ? Bucket.fromBucketName(this.stack, 'sm-domain-bucket-import', sagemakerBlueprintConfig.domainBucketName)
      : Bucket.fromBucketArn(
          this.stack,
          'sm-domain-bucket-import',
          StringParameter.valueFromLookup(
            this.stack,
            domainConfig.ssmParamBase + '/' + DomainConfig.SSM_PARAM_DOMAIN_BUCKET_ARN,
            `arn:${this.stack.partition}:s3:::placeholder-bucket`,
          ),
        );

    const blueprintName = sagemakerBlueprintConfig.blueprintName ?? this.moduleName;

    const blueprintStack = new MdaaBlueprintStack(this.stack, `${this.stack.stackName}-blueprint`, {
      naming: this.naming,
      useBootstrap: false,
      assetBucket: domainBucket,
      blueprintName: blueprintName,
    });
    // Need to remove the blueprint props from the config we pass to the underlying module.
    // This ensures SSM references from the blueprint config don't polute the blueprint stack,
    // which might be deployed into different accounts.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sagemakerBlueprint, ...appConfigWithoutSagemakerBlueprint } = this.appConfigRaw;
    this.subGenerateResources(
      blueprintStack,
      this.createL3ConstructProps(blueprintStack),
      this.getConfigParserProps(appConfigWithoutSagemakerBlueprint),
    );

    const tags = {
      mdaa_dz_domain_id: blueprintStack.dzDomainIdParam.valueAsString,
      mdaa_dz_project_name: blueprintStack.dzProjectNameParam.valueAsString,
      mdaa_dz_project_id: blueprintStack.dzProjectIdParam.valueAsString,
      mdaa_dz_environment_id: blueprintStack.dzEnvIdParam.valueAsString,
    };
    Object.entries(tags).forEach(([tag, value]) => Tags.of(blueprintStack).add(tag, value));
    const template = CloudFormationTemplate.fromProductStack(blueprintStack);
    new CustomBlueprintL3Construct(this.stack, 'custom-blueprint-l3', {
      ...this.createL3ConstructProps(this.stack),
      templateUrl: template.bind(this.stack).httpUrl,
      domainConfig: domainConfig,
      domainBucket,
      blueprintName,
      sagemakerBlueprintConfig,
    });
  }

  public generateStack(): Stack {
    if (this.baseConfigParser.serviceCatalogConfig) {
      const portfolioBucketArn = `arn:${this.stack.partition}:s3:::${this.baseConfigParser.serviceCatalogConfig.portfolio_bucket_name}`;
      const portfolioBucket = Bucket.fromBucketArn(this.stack, 'sm-domain-bucket-import', portfolioBucketArn);

      const productStack = new MdaaProductStack(this.stack, `${this.stack.stackName}-product`, {
        naming: this.naming,
        useBootstrap: this.useBootstrap,
        assetBucket: portfolioBucket,
      });

      this.subGenerateResources(
        productStack,
        this.createL3ConstructProps(productStack),
        this.getConfigParserProps(this.appConfigRaw),
      );

      return this.generateServiceCatalogProductParentStackResources(
        this.baseConfigParser.serviceCatalogConfig,
        this.stack,
        productStack,
      );
    } else if (this.baseConfigParser.sagemakerBlueprintConfig) {
      this.generateSageMakerBlueprintStack(this.baseConfigParser.sagemakerBlueprintConfig);
    } else {
      this.subGenerateResources(
        this.stack,
        this.createL3ConstructProps(this.stack),
        this.getConfigParserProps(this.appConfigRaw),
      );
    }
    this.addTagsAndSuppressions();
    return this.stack;
  }

  /**
   * Implemented in derived MDAA App classes in order to generate CDK scopes.
   */
  protected abstract subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ): void;

  private createEmptyStack(packageName: string): MdaaStack {
    const stackName = this.naming.stackName();
    const stackDescription = `(${this.solutionId}-${packageName}) ${this.solutionName}. Version ${this.solutionVersion}`;
    const stackProps = {
      naming: this.naming,
      description: stackDescription,
      useBootstrap: this.useBootstrap,
      env: {
        region: this.deployRegion,
        account: this.deployAccount,
      },
      crossRegionReferences: this.node.tryGetContext('allow_cross_reference_stack')?.toLowerCase() === 'true',
    };
    const stack = new MdaaStack(this, stackName, stackProps);
    new MdaaStringParameter(stack, 'StackDescriptionParameter', {
      parameterName: this.naming.ssmPath('aws-solution'),
      stringValue: stackDescription,
      description: 'Stack description parameter to update on version changes',
    });

    return stack;
  }

  private addTagsAndSuppressions() {
    const allAccountStacks = [
      this.stack,
      ...Object.entries(this.additionalStacksMap).flatMap(x => Object.entries(x[1]).map(y => y[1])),
    ];
    allAccountStacks.forEach(stack => {
      this.baseConfigParser.nagSuppressions?.by_path?.forEach(suppression => {
        try {
          MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, suppression.path, suppression.suppressions);
        } catch (error) {
          console.log(`Error adding suppression for path ${suppression.path} to stack ${stack}:`, error);
        }
      });
      // Apply our tags
      for (const tagKey in this.tags) {
        if (tagKey in this.tags) {
          Tags.of(stack).add(tagKey, this.tags[tagKey]);
        }
      }
    });
  }

  private createL3ConstructProps(stack: MdaaStack): MdaaL3ConstructProps {
    return {
      naming: stack.props.naming,
      roleHelper: stack.roleHelper,
      crossAccountStacks: this.additionalStacksMap,
      tags: this.tags,
    };
  }

  /**
   * @returns A standard set of MDAA Stack Props for use in Mdaa App Configs
   */
  private getConfigParserProps(rawConfig: ConfigurationElement): MdaaAppConfigParserProps {
    return {
      org: this.org,
      domain: this.domain,
      environment: this.env,
      module_name: this.moduleName,
      rawConfig: rawConfig,
      naming: this.naming,
    };
  }
}
