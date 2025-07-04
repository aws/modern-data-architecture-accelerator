/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigConfigPathValueTransformer,
  ConfigurationElement,
  MdaaConfigTransformer,
  MdaaCustomAspect,
  TagElement,
} from '@aws-mdaa/config';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaFunctionProps, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { IMdaaResourceNaming, MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { App, AppProps, Aspects, CfnMacro, Stack, Tags } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
  CfnLaunchRoleConstraint,
  CfnLaunchRoleConstraintProps,
  CloudFormationProduct,
  CloudFormationProductProps,
  CloudFormationTemplate,
  Portfolio,
} from 'aws-cdk-lib/aws-servicecatalog';
import { AwsSolutionsChecks, HIPAASecurityChecks, NIST80053R5Checks, PCIDSS321Checks } from 'cdk-nag';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from './app_config';
import * as configSchema from './config-schema.json';
import { MdaaProductStack, MdaaProductStackProps, MdaaStack } from './stack';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
// nosemgrep
import assert = require('assert');
const pjson = require('../package.json');

export interface MdaaAppProps extends AppProps {
  readonly appConfigRaw?: ConfigurationElement;
  readonly useBootstrap?: boolean;
}

export interface MdaaPackageNameVersion {
  readonly name: string;
  readonly version: string;
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
  private readonly additionalAccounts?: string[];
  private readonly additionalAccountStacks: { [AccountRecovery: string]: Stack };
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
          : /true/i.test(this.node.tryGetContext('use_bootstrap'));
    }
    const namingModule: string = this.node.tryGetContext('naming_module');
    const namingClass: string = this.node.tryGetContext('naming_class');
    this.naming = this.configNamingModule(namingModule, namingClass);
    const logSuppressions: boolean =
      this.node.tryGetContext('log_suppressions') == undefined
        ? false
        : /true/i.test(this.node.tryGetContext('log_suppressions'));

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

    this.additionalAccounts = this.node.tryGetContext('additional_accounts')?.split(',');

    this.stack = this.createEmptyStack(packageName);
    this.additionalAccountStacks = Object.fromEntries(
      this.additionalAccounts?.map(account => {
        const stackName = this.naming.stackName(account);
        const stackProps = {
          naming: this.naming,
          env: {
            region: this.stack.region,
            account: account,
          },
        };
        const additionalAccountStack = new Stack(this, stackName, stackProps);
        additionalAccountStack.addDependency(this.stack);
        return [account, additionalAccountStack];
      }) || [],
    );
    this.baseConfigParser = new MdaaAppConfigParser<MdaaBaseConfigContents>(
      this.stack,
      this.getConfigParserProps(),
      configSchema,
      undefined,
      true,
    );
  }

  protected static parsePackageJson(pjsonPath: string): MdaaPackageNameVersion {
    // nosemgrep
    const pjson = require(pjsonPath);
    return {
      name: pjson.name,
      version: pjson.version.replace(/\.\d*$/, '.x'),
    };
  }

  private loadTagConfigDataFromContext(): { [key: string]: string } {
    const tagConfigDataFromContextString: string = this.node.tryGetContext('tag_config_data');
    if (tagConfigDataFromContextString) {
      return JSON.parse(tagConfigDataFromContextString);
    }
    return {};
  }

  private loadAppConfigDataFromContext(): ConfigurationElement {
    const appConfigDataFromContextString: string = this.node.tryGetContext('module_config_data');
    if (appConfigDataFromContextString) {
      return JSON.parse(appConfigDataFromContextString);
    }
    return {};
  }

  private loadTagConfigFromFiles(): TagElement {
    const tagConfigRaw = this.loadConfigFromFiles(this.node.tryGetContext('tag_configs')?.split(',') || []);
    return (tagConfigRaw['tags'] as TagElement) || {};
  }

  private loadConfigFromFiles(fileList: string[]): ConfigurationElement {
    // nosemgrep
    const _ = require('lodash');
    function customizer(objValue: unknown, srcValue: unknown): unknown[] | undefined {
      if (_.isArray(objValue)) {
        return (objValue as unknown[]).concat(srcValue);
      }
      return undefined;
    }
    let configRaw: ConfigurationElement = {};

    fileList.forEach((fileName: string) => {
      console.log(`Reading config from ${fileName}`);
      // nosemgrep
      const parsedYaml = yaml.parse(fs.readFileSync(fileName.trim(), 'utf8'));
      //Resolve relative paths in parsedYaml
      const baseDir = path.dirname(fileName.trim());
      const pathResolvedYaml = new MdaaConfigTransformer(new ConfigConfigPathValueTransformer(baseDir)).transformConfig(
        parsedYaml,
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
    const customAspectsContextString: string = this.node.tryGetContext('custom_aspects');
    if (customAspectsContextString) {
      const customAspects: MdaaCustomAspect[] = JSON.parse(customAspectsContextString);
      customAspects.forEach(customAspect => this.applyCustomAspect(customAspect));
    }
  }

  private applyCustomAspect(customAspect: MdaaCustomAspect) {
    // nosemgrep
    const customAspectModulePath = customAspect.aspect_module.startsWith('./')
      ? path.resolve(customAspect.aspect_module)
      : customAspect.aspect_module;
    console.log(`Applying custom aspect: ${customAspect.aspect_module}:${customAspect.aspect_class}`);
    // nosemgrep
    const customAspectModule = require(customAspectModulePath);
    const aspect = new customAspectModule[customAspect.aspect_class](customAspect.aspect_props);
    Aspects.of(this).add(aspect);
  }

  public generateStack(): Stack {
    if (this.baseConfigParser.serviceCatalogConfig) {
      const productStack = this.createEmptyProductStack(this.stack);
      this.subGenerateResources(productStack, this.createL3ConstructProps(productStack), this.getConfigParserProps());
      const productProps: CloudFormationProductProps = {
        productName: this.baseConfigParser.serviceCatalogConfig.name,
        owner: this.baseConfigParser.serviceCatalogConfig.owner,
        productVersions: [
          {
            productVersionName: 'v1',
            cloudFormationTemplate: CloudFormationTemplate.fromProductStack(productStack),
          },
        ],
      };
      const product = new CloudFormationProduct(this.stack, 'Product', productProps);
      const portfolio = Portfolio.fromPortfolioArn(
        this.stack,
        'portfolio',
        this.baseConfigParser.serviceCatalogConfig.portfolio_arn,
      );
      if (this.baseConfigParser.serviceCatalogConfig.launch_role_name) {
        const launchRoleConstraintProps: CfnLaunchRoleConstraintProps = {
          portfolioId: portfolio.portfolioId,
          productId: product.productId,
          localRoleName: this.baseConfigParser.serviceCatalogConfig.launch_role_name,
        };
        new CfnLaunchRoleConstraint(this.stack, 'launch-role-constraint', launchRoleConstraintProps);
      }
      portfolio.addProduct(product);
    } else {
      this.subGenerateResources(this.stack, this.createL3ConstructProps(this.stack), this.getConfigParserProps());
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
    };
    const stack = new MdaaStack(this, stackName, stackProps);
    new StringParameter(stack, 'StackDescriptionParameter', {
      parameterName: this.naming.ssmPath('aws-solution'),
      stringValue: stackDescription,
      description: 'Stack description parameter to update on version changes',
    });

    return stack;
  }

  private createEmptyProductStack(stack: MdaaStack): MdaaProductStack {
    const productStackProps: MdaaProductStackProps = {
      naming: this.naming,
      useBootstrap: this.useBootstrap,
      moduleName: this.moduleName,
    };
    const productStack = new MdaaProductStack(stack, `${stack.stackName}-product`, productStackProps);
    const provisioningMacroFunctionRole = new MdaaLambdaRole(stack, 'provisioning-macro-function-role', {
      description: 'Provisioning Macro Role',
      roleName: 'prov-macro',
      naming: this.naming,
      logGroupNames: [this.naming.resourceName('provisioningMacro')],
      createParams: false,
      createOutputs: false,
    });
    const provisioningMacroFunctionProps: MdaaLambdaFunctionProps = {
      runtime: Runtime.PYTHON_3_13,
      code: Code.fromAsset(`${__dirname}/../src/python/provisioning_macro`),
      handler: 'provisioning_macro.lambda_handler',
      functionName: 'provisioningMacro',
      role: provisioningMacroFunctionRole,
      naming: this.naming,
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    const provisioningMacroFunction = new MdaaLambdaFunction(
      stack,
      'provisioning-macro-function',
      provisioningMacroFunctionProps,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      provisioningMacroFunction,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for Cfn Macro and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for Cfn Macro and will interact only with CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for Cfn Macro and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for Cfn Macro and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for Cfn Macro and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for Cfn Macro and will interact only with CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for Cfn Macro and will interact only with CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for Cfn Macro and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for Cfn Macro and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    const provisioningMacro = new CfnMacro(stack, 'provisioning-macro', {
      name: this.naming.resourceName('provisioning-macro'),
      functionName: provisioningMacroFunction.functionArn,
    });
    productStack.templateOptions.transforms = [provisioningMacro.name];
    return productStack;
  }

  private addTagsAndSuppressions() {
    const allStacks = [this.stack, ...Object.entries(this.additionalAccountStacks).map(x => x[1])];
    allStacks.forEach(stack => {
      this.baseConfigParser.nagSuppressions?.by_path?.forEach(suppression => {
        try {
          MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, suppression.path, suppression.suppressions);
        } catch (error) {
          console.log(`Error adding suppression for path ${suppression.path} to stack ${stack.stackName}`);
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
      naming: this.naming,
      roleHelper: stack.roleHelper,
      crossAccountStacks: this.additionalAccountStacks,
      tags: this.tags,
    };
  }
  /**
   *
   * @returns A standard set of MDAA Stack Props for use in Mdaa App Configs
   */
  private getConfigParserProps(): MdaaAppConfigParserProps {
    return {
      org: this.org,
      domain: this.domain,
      environment: this.env,
      module_name: this.moduleName,
      rawConfig: this.appConfigRaw,
      naming: this.naming,
    };
  }
}
