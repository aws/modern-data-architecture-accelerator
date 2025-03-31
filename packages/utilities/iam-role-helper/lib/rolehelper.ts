/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLambdaRole, MdaaLambdaFunction } from '@aws-mdaa/lambda-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Duration } from 'aws-cdk-lib';
import { PolicyDocument, PolicyStatement, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaResolvableRole } from './resolvablerole';
import { MdaaRoleRef, MdaaResolvableRoleRef } from './roleref';

/**
 * A Helper class which can be used to resolve MdaaRoleRefs using CustomResources.
 */
export class MdaaRoleHelper {
  private readonly scope: Construct;
  private providerServiceToken?: string;
  private readonly naming: IMdaaResourceNaming;

  private readonly resolveRefCache: { [key: string]: MdaaResolvableRole } = {};
  private readonly resolveIdCache: { [key: string]: MdaaResolvableRole } = {};
  private readonly resolveArnCache: { [key: string]: MdaaResolvableRole } = {};
  private readonly resolveNameCache: { [key: string]: MdaaResolvableRole } = {};
  /**
   *
   * @param scope The scope in which role resolution CR Provider will be created.
   * @param naming The MDAA naming implementation which will be used to name resources
   * from the perspective of the calling module.
   */
  constructor(scope: Construct, naming: IMdaaResourceNaming, providerServiceToken?: string) {
    this.scope = scope;
    this.naming = naming;
    this.providerServiceToken = providerServiceToken;
  }

  /**
   * Can be used to resolve MdaaRoleRefs. Each MdaaRoleRef is first converted
   * to a MdaaResolvableRoleRef by auto generating a role ref unique id using
   * refPrefix and a generated ordinal.
   * @param roleRefs The role references to be resolved
   * @param refPrefix The prefix which will be used with ordinal to create a unique ID for use as a resource ID within scopes
   * @returns Resolvable roles.
   */
  public resolveRoleRefsWithOrdinals(roleRefs: MdaaRoleRef[], refPrefix: string): MdaaResolvableRole[] {
    let i = 0;
    const resolvableRoleRefs = roleRefs.map(roleRef => {
      return {
        refId: roleRef.refId || `${refPrefix}-${i++}`,
        ...roleRef,
      };
    });
    return this.resolveRoleRefs(resolvableRoleRefs);
  }

  /**
   *
   * @param roleRefs The role references to be resolved
   * @returns Resolvable roles.
   */
  public resolveRoleRefs(roleRefs: MdaaResolvableRoleRef[]): MdaaResolvableRole[] {
    return roleRefs.map(roleRef => {
      return this.resolveRoleRef(roleRef);
    });
  }
  /**
   *
   * @param roleRef The role references to be resolved
   * @param refId The id of the reference to be used in creating the custom resource
   * @returns Resolvable roles.
   */
  public resolveRoleRefWithRefId(roleRef: MdaaRoleRef, refId: string): MdaaResolvableRole {
    const resolvableRoleRef = {
      refId: refId,
      ...roleRef,
    };
    return this.resolveRoleRef(resolvableRoleRef);
  }
  /**
   *
   * @param roleRef The role reference to be resolved
   * @returns Resolvable roles.
   */
  public resolveRoleRef(roleRef: MdaaResolvableRoleRef): MdaaResolvableRole {
    if (!roleRef.id && !roleRef.arn && !roleRef.name) {
      throw new Error('Role References must have at least one of arn, id, or name specified.');
    }
    if (roleRef.id && this.resolveIdCache[roleRef.id]) {
      return this.resolveIdCache[roleRef.id];
    } else if (roleRef.arn && this.resolveArnCache[roleRef.arn]) {
      return this.resolveArnCache[roleRef.arn];
    } else if (roleRef.name && this.resolveNameCache[roleRef.name]) {
      return this.resolveNameCache[roleRef.name];
    } else {
      return this.createAndReturnResolvableRole(roleRef);
    }
  }

  private createAndReturnResolvableRole(roleRef: MdaaResolvableRoleRef) {
    const resolvableRole = new MdaaResolvableRole(this.scope, this, roleRef);
    this.resolveRefCache[roleRef.refId] = resolvableRole;
    if (roleRef.id) {
      this.resolveIdCache[roleRef.id] = resolvableRole;
    }
    if (roleRef.arn) {
      this.resolveArnCache[roleRef.arn] = resolvableRole;
    }
    if (roleRef.name) {
      this.resolveNameCache[roleRef.name] = resolvableRole;
    }
    return resolvableRole;
  }

  /**
   *
   * @returns A Custom Resource Provider Service Token which can be used to create role resolver custom resources.
   */
  public createProviderServiceToken(): string {
    if (!this.providerServiceToken) {
      console.log('Role resolution required by config. Creating CR Provider.');
      this.providerServiceToken = this.createResolveRoleProvider().serviceToken;
    }
    return this.providerServiceToken;
  }

  private createResolveRoleProvider(): Provider {
    const crLambdaRole = new MdaaLambdaRole(this.scope, 'role-res-cr', {
      description: 'CR Role',
      roleName: 'role-res-cr',
      naming: this.naming,
      logGroupNames: [this.naming.resourceName('role-res-cr')],
      createParams: false,
      createOutputs: false,
    });
    const listRolesPolicyDoc = new PolicyDocument({
      statements: [
        new PolicyStatement({
          resources: ['*'],
          actions: ['iam:ListRoles'],
        }),
      ],
    });

    const iamPolicy = new ManagedPolicy(crLambdaRole, `role-res-pol`, {
      managedPolicyName: this.naming.resourceName(`role-res-pol`),
      document: listRolesPolicyDoc,
      roles: [crLambdaRole],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      iamPolicy,
      [{ id: 'AwsSolutions-IAM5', reason: 'iam:ListRoles does not take a resource.' }],
      true,
    );

    // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
    const resolveRoleLambda = new MdaaLambdaFunction(this.scope, 'resolve-role-res-cr-function', {
      functionName: 'role-res-cr',
      code: Code.fromAsset(`${__dirname}/../src/python/resolve_role/`),
      handler: 'resolve_role.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(120),
      role: crLambdaRole,
      naming: this.naming,
      createParams: false,
      createOutputs: false,
    });
    resolveRoleLambda.node.addDependency(iamPolicy);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      resolveRoleLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with IAM.',
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
          reason: 'Function is for custom resource and will interact only with IAM.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with IAM.',
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
    const resolveRoleProviderFunctionName = this.naming.resourceName('role-res-cr-prov', 64);
    const resolveRoleCrProviderRole = new MdaaLambdaRole(this.scope, 'role-res-cr-prov', {
      description: 'CR Role Resolver Provider',
      roleName: 'role-res-cr-prov',
      naming: this.naming,
      logGroupNames: [resolveRoleProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });
    const resolveRoleProvider = new Provider(this.scope, 'resolve-role-res-cr-provider', {
      providerFunctionName: resolveRoleProviderFunctionName,
      onEventHandler: resolveRoleLambda,
      role: resolveRoleCrProviderRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      resolveRoleCrProviderRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      resolveRoleProvider,
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
    return resolveRoleProvider;
  }
}
