/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCatalogSettings } from '@aws-mdaa/glue-constructs';
import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { CfnDataCatalog } from 'aws-cdk-lib/aws-athena';
import {
  ArnPrincipal,
  Effect,
  IPrincipal,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

const GLUE_READ_ACTIONS: string[] = ['glue:Get*', 'glue:List*'];
const GLUE_WRITE_ACTIONS: string[] = [...GLUE_READ_ACTIONS];
const GLUE_SHARE_RESOURCE_ACTIONS: string[] = ['glue:ShareResource'];

/**
 * Q-ENHANCED-INTERFACE
 * CatalogAccessPolicyProps configuration interface for ETL operations and data catalog management.
 *
 * Use cases: ETL operations; Data catalog management; Schema discovery; Data transformation
 *
 * AWS: AWS Glue configuration for ETL operations and data catalog management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS Glue and MDAA requirements
 */
export interface CatalogAccessPolicyProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of principal ARNs granted read access to Glue catalog resources enabling cross-account and cross-service data catalog access. Specifies IAM principals (users, roles, accounts) that can read catalog metadata, schemas, and table definitions for data discovery and query operations.
   *
   * Use cases: Cross-account data access; Data discovery permissions; Read-only catalog access; Metadata sharing; Query permissions
   * AWS: AWS Glue catalog resource policy read permissions for cross-account and service access control
   * Validation: Must be array of valid IAM principal ARNs if provided; optional for read access control
   *   */
  readonly readPrincipalArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of principal ARNs granted read/write access to Glue catalog resources enabling cross-account and cross-service data catalog management. Specifies IAM principals (users, roles, accounts) that can modify catalog metadata, create/update tables, and manage schema definitions for data operations.
   *
   * Use cases: Cross-account data management; Catalog administration; Schema management; Data operations; ETL permissions
   * AWS: AWS Glue catalog resource policy write permissions for cross-account and service management access
   * Validation: Must be array of valid IAM principal ARNs if provided; optional for write access control
   *   */
  readonly writePrincipalArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Glue catalog resource ARNs defining the scope of access policy permissions. Specifies the exact catalog resources (databases, tables, partitions) to which the access policy applies, enabling fine-grained resource-level access control for data governance.
   *
   * Use cases: Resource-level access control; Fine-grained permissions; Data governance; Catalog security; Resource scoping
   * AWS: AWS Glue catalog resource ARNs for resource-level access policy scope definition
   * Validation: Must be array of valid Glue catalog resource ARNs; required for access policy scope definition
   *   */
  readonly resources: string[];
}
export interface GlueCatalogL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of access policy names to access policy definitions for Glue catalog resource access control enabling fine-grained permissions and cross-account data sharing. Provides access policy configurations for controlling catalog resource access with specific permissions and principal-based access control.
   *
   * Use cases: Access control; Fine-grained permissions; Cross-account sharing; Resource policies
   *
   * AWS: Glue catalog access policies for resource-based access control and cross-account data sharing
   *
   * Validation: Must be valid access policy name to CatalogAccessPolicyProps mapping if provided; enables catalog access control
   *   **/
  readonly accessPolicies?: { [key: string]: CatalogAccessPolicyProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of consumer account names to account IDs for catalog read access enabling cross-account data consumption and data mesh architecture. Provides consumer account configurations for granting read access to the Glue catalog for cross-account data sharing and consumption scenarios.
   *
   * Use cases: Cross-account consumption; Data mesh architecture; Consumer access; Data sharing
   *
   * AWS: Consumer account IDs for Glue catalog cross-account read access and data consumption
   *
   * Validation: Must be valid account name to account ID mapping if provided; enables cross-account catalog consumption
   *   **/
  readonly consumerAccounts?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of producer account names to account IDs for Athena catalog creation enabling cross-account data production and federated queries. Provides producer account configurations for creating additional Athena catalogs pointing to producer account Glue catalogs for federated query capabilities.
   *
   * Use cases: Cross-account production; Federated queries; Producer access; Data federation
   *
   * AWS: Producer account IDs for Athena catalog creation and cross-account data federation
   *
   * Validation: Must be valid account name to account ID mapping if provided; enables cross-account catalog federation
   *   **/
  readonly producerAccounts?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of KMS key consumer account names to account IDs for catalog encryption key access enabling secure cross-account data access with customer-controlled encryption. Provides KMS key access for consumer accounts to decrypt catalog data while maintaining encryption security and compliance.
   *
   * Use cases: Secure cross-account access; Encryption key sharing; Customer-controlled encryption; Secure data sharing
   *
   * AWS: Consumer account IDs for Glue catalog KMS key access and secure cross-account data sharing
   *
   * Validation: Must be valid account name to account ID mapping if provided; enables secure cross-account encryption key access
   *   **/
  readonly kmsKeyConsumerAccounts?: { [key: string]: string };
}

export class GlueCatalogL3Construct extends MdaaL3Construct {
  protected readonly props: GlueCatalogL3ConstructProps;
  public static readonly ACCOUNT_KEY_SSM_PATH = '/glue-catalog-settings/catalog-kms-key';
  private catalogResourcePolicyProvider?: Provider;
  private consumerAccounts?: { [key: string]: string };
  private kmsKeyConsumerAccounts?: { [key: string]: string };
  private producerAccounts?: { [key: string]: string };

  constructor(scope: Construct, id: string, props: GlueCatalogL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    this.consumerAccounts = Object.fromEntries(
      Object.entries(this.props.consumerAccounts || []).filter(x => x[1] != this.account),
    );
    this.kmsKeyConsumerAccounts = Object.fromEntries(
      Object.entries(this.props.kmsKeyConsumerAccounts || []).filter(x => x[1] != this.account),
    );
    this.producerAccounts = Object.fromEntries(
      Object.entries(this.props.producerAccounts || []).filter(x => x[1] != this.account),
    );
    const allReadPrincipalArns: string[] = [];
    const allWritePrincipalArns: string[] = [];

    const resourcePolicyDocument = new PolicyDocument();
    Object.keys(this.props.accessPolicies || {}).forEach(accessPolicyName => {
      console.log(accessPolicyName);
      const accessPolicy = (this.props.accessPolicies || {})[accessPolicyName];
      console.log(accessPolicy);
      allReadPrincipalArns.push(...(accessPolicy.readPrincipalArns || []));
      allWritePrincipalArns.push(...(accessPolicy.writePrincipalArns || []));
      const statements = this.createResourcePolicyStatements(
        accessPolicyName,
        accessPolicy.resources,
        accessPolicy.readPrincipalArns,
        accessPolicy.writePrincipalArns,
      );
      resourcePolicyDocument.addStatements(...statements);
    });

    if (this.consumerAccounts && Object.keys(this.consumerAccounts).length > 0) {
      const readPrincipalArns = Object.entries(this.consumerAccounts).map(
        x => `arn:${this.partition}:iam::${x[1]}:root`,
      );
      const statements = this.createResourcePolicyStatements('accounts', ['*'], readPrincipalArns);
      resourcePolicyDocument.addStatements(...statements);
    }

    if (resourcePolicyDocument.statementCount > 0) {
      //Required as per https://docs.aws.amazon.com/lake-formation/latest/dg/hybrid-cross-account.html
      const shareResourceStatement = this.getShareResourcePolicyStatement();
      resourcePolicyDocument.addStatements(shareResourceStatement);

      const catalogCrProvider = this.getGlueCatalogResourcePolicyCrProvider();
      const catalogResourcePolicy = new CustomResource(this.scope, `catalog-resource-policy`, {
        serviceToken: catalogCrProvider.serviceToken,
        properties: {
          resourcePolicyJson: resourcePolicyDocument.toJSON(),
          account: this.account,
          policyHashParam: this.props.naming.ssmPath('policyHash'),
        },
      });
      new StringParameter(this.scope, 'catalog-resource-policy-hash-ssm', {
        parameterName: this.props.naming.ssmPath('policyHash'),
        stringValue: catalogResourcePolicy.getAttString('PolicyHash'),
      });
    }

    if (this.producerAccounts && Object.keys(this.producerAccounts).length > 0) {
      Object.entries(this.producerAccounts).forEach(producerAcct => {
        const acctName = producerAcct[0];
        const acctId = producerAcct[1];
        new CfnDataCatalog(this.scope, `athena-catalog-${acctName}`, {
          name: acctName,
          type: 'GLUE',
          parameters: {
            'catalog-id': acctId,
          },
        });
      });
    }
    const catalogKmsKeyConsumerAccounts = Object.entries({
      ...(this.consumerAccounts || {}),
      ...(this.kmsKeyConsumerAccounts || {}),
    }).map(x => x[1]);

    //Use some private helper functions to create the catalog resources
    const catalogKmsKey = this.createCatalogKmsKey(
      allReadPrincipalArns,
      allWritePrincipalArns,
      catalogKmsKeyConsumerAccounts,
    );

    new MdaaCatalogSettings(this.scope, 'glue-catalog-settings', {
      naming: this.props.naming,
      catalogId: this.account,
      catalogKmsKey: catalogKmsKey,
    });

    return this;
  }

  /**
   * Creates a new PolicyStatement with ALLOW set as a default Effect.
   * @param policyName Name to give to the policy
   * @param resources List of resources
   * @param principalArns List of ARNs
   * @param actions List of Actions
   * @returns PolicyStatement
   */
  private createPolicyStatement(
    policyName: string,
    resources: string[],
    principalArns: IPrincipal[],
    actions: string[],
  ): PolicyStatement {
    return new PolicyStatement({
      sid: policyName,
      actions: actions,
      principals: principalArns,
      resources: resources,
    });
  }

  /**
   * Returns a new policy statement to allow `ram.amazonaws.com` to access all databases and tables.
   * The purpose is to allow cross-account data sharing.
   * Based on https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-prereqs.html
   * @returns PolicyStatement
   */
  private getShareResourcePolicyStatement(): PolicyStatement {
    const glueResourceArns: string[] = [];
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`);
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:database/*`);
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:table/*/*`);

    const glueShareResourcePolicyStatement = this.createPolicyStatement(
      'allow-ram-sharing',
      glueResourceArns,
      [new ServicePrincipal('ram.amazonaws.com')],
      GLUE_SHARE_RESOURCE_ACTIONS,
    );

    return glueShareResourcePolicyStatement;
  }

  private createResourcePolicyStatements(
    accessPolicyName: string,
    resources: string[],
    readPrincipalArns?: string[],
    writePrincipalArns?: string[],
  ): PolicyStatement[] {
    const policyStatements: PolicyStatement[] = [];
    const glueResourceArns = resources.map(resource => {
      if (resource.includes('*')) {
        console.warn(
          `Glue resource access '${resource}' contains wildcard (*). Consider revising to specific resources.`,
        );
      }
      return `arn:${this.partition}:glue:${this.region}:${this.account}:${resource}`;
    });
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`);
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:database/default`);
    if (readPrincipalArns && readPrincipalArns.length > 0) {
      const readPolicyStatement = this.createPolicyStatement(
        `${accessPolicyName}-read`,
        glueResourceArns,
        readPrincipalArns.map(x => new ArnPrincipal(x)),
        GLUE_READ_ACTIONS,
      );
      policyStatements.push(readPolicyStatement);
    }
    if (writePrincipalArns && writePrincipalArns.length > 0) {
      const writePolicyStatement = this.createPolicyStatement(
        `${accessPolicyName}-write`,
        glueResourceArns,
        writePrincipalArns.map(x => new ArnPrincipal(x)),
        GLUE_WRITE_ACTIONS,
      );
      policyStatements.push(writePolicyStatement);
    }

    return policyStatements;
  }

  private createCatalogKmsKey(readPrincipalArns: string[], writePrincipalArns: string[], readAccounts?: string[]): Key {
    // This catalog KMS key will be used to encrypt all data written by the catalog to the catalog bucket
    const catalogKmsKey = new MdaaKmsKey(this.scope, 'kms-cmk', {
      description: `KMS Key for ${this.props.naming.resourceName()}`,
      naming: this.props.naming,
    });

    const usageAccounts = [this.account, ...(readAccounts || [])];
    usageAccounts.forEach(account => {
      //Add a statement that allows anyone in the account to use the key as long as it is via Glue
      const accountKeyUsagePolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
      });
      accountKeyUsagePolicyStatement.addAnyPrincipal();
      accountKeyUsagePolicyStatement.addCondition('StringEquals', {
        'kms:CallerAccount': account,
        'kms:ViaService': [`glue.${this.region}.amazonaws.com`, `datazone.${this.region}.amazonaws.com`],
      });
      catalogKmsKey.addToResourcePolicy(accountKeyUsagePolicyStatement);
    });
    if (readPrincipalArns.length > 0) {
      const readPrincipalPolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, 'kms:DescribeKey'],
        principals: readPrincipalArns.map(x => new ArnPrincipal(x)),
      });
      catalogKmsKey.addToResourcePolicy(readPrincipalPolicyStatement);
    }

    if (writePrincipalArns.length > 0) {
      const writePrincipalPolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
        principals: writePrincipalArns.map(x => new ArnPrincipal(x)),
      });
      catalogKmsKey.addToResourcePolicy(writePrincipalPolicyStatement);
    }
    new StringParameter(catalogKmsKey, 'account-key-ssm', {
      parameterName: GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH,
      stringValue: catalogKmsKey.keyArn,
    });
    return catalogKmsKey;
  }

  private getGlueCatalogResourcePolicyCrProvider(): Provider {
    if (this.catalogResourcePolicyProvider) {
      return this.catalogResourcePolicyProvider;
    }

    const catalogCrFunctionRole = new MdaaLambdaRole(this.scope, 'catalog-function-role', {
      description: 'CR Role',
      roleName: 'catalog-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('catalog-cr')],
      createParams: false,
      createOutputs: false,
    });

    //Permissions for managing Glue Resource Policies
    const manageCatalogStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`],
      actions: ['glue:PutResourcePolicy', 'glue:DeleteResourcePolicy'],
    });
    catalogCrFunctionRole.addToPolicy(manageCatalogStatement);

    //Permissions for managing Glue Resource Policies
    const queryRamStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ram:${this.region}:${this.account}:resource-share/*`],
      actions: ['ram:ListResources'],
    });
    catalogCrFunctionRole.addToPolicy(queryRamStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      catalogCrFunctionRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource. Inline policy specific to custom resource.',
        },
      ],
      true,
    );

    const sourceDir = `${__dirname}/../src/python/glue_catalog_resource_policy`;
    // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
    const catalogResourcePolicyLambda = new MdaaLambdaFunction(this.scope, 'catalog-cr-function', {
      functionName: 'catalog-cr',
      code: Code.fromAsset(sourceDir),
      handler: 'glue_catalog_resource_policy.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(120),
      role: catalogCrFunctionRole,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      environment: {
        LOG_LEVEL: 'INFO',
      },
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      catalogResourcePolicyLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );

    const catalogCrProviderFunctionName = this.props.naming.resourceName('catalog-cr-prov', 64);
    const catalogCrProviderRole = new MdaaLambdaRole(this.scope, 'catalog-provider-role', {
      description: 'CR Role',
      roleName: 'catalog-provider-role',
      naming: this.props.naming,
      logGroupNames: [catalogCrProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });

    const catalogResourcePolicyProvider = new Provider(this.scope, 'datalake-catalog-cr-provider', {
      providerFunctionName: catalogCrProviderFunctionName,
      onEventHandler: catalogResourcePolicyLambda,
      frameworkOnEventRole: catalogCrProviderRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      catalogCrProviderRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      catalogResourcePolicyProvider,
      [
        { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    this.catalogResourcePolicyProvider = catalogResourcePolicyProvider;
    return catalogResourcePolicyProvider;
  }
}
