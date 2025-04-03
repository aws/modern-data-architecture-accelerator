/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { aws_events_targets, CustomResource, Duration } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import { Effect, FederatedPrincipal, IRole, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

export type QSUserType = 'READER' | 'AUTHOR';
export interface FederationRoleProps {
  /**
   * QS Groups info for creating Creating QS Groups
   */
  readonly qsGroups: string[];
  /**
   * QS Role(Reader|Author) info for creating IAM Roles
   */
  readonly qsUserType: QSUserType;
}

export interface FederationProps {
  /**
   * URL used by the connecting driver
   */
  readonly url: string;
  /**
   * Arn or SSM Import (prefix with ssm:) of the federation provider
   */
  readonly providerArn: string;
  /**
   * QS Groups and QS Role(Reader|Author) info for creating IAM Roles, Creating QS Groups, Registering Users with a QS Role
   */
  readonly roles: { [key: string]: FederationRoleProps };
}
export interface NameAndFederationProps extends FederationProps {
  /**
   * Name of the Federation
   */
  readonly federationName: string;
}

export interface QuickSightNamespaceL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Map of federation names to federation definitions
   */
  readonly federations: NameAndFederationProps[];
  /**
   * List of glue resources to which the namespace roles will be granted access.
   */
  readonly glueResourceAccess?: string[];
}

//This stack creates QuickSight namespaces
export class QuickSightNamespaceL3Construct extends MdaaL3Construct {
  protected readonly props: QuickSightNamespaceL3ConstructProps;

  private readonly namespaceName: string;

  constructor(scope: Construct, id: string, props: QuickSightNamespaceL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    this.namespaceName = props.naming.resourceName();
    const readerManagedPolicy = this.createReaderManagedPolicy();
    const glueManagedPolicy =
      this.props.glueResourceAccess && this.props.glueResourceAccess.length > 0
        ? this.createGlueManagedPolicy()
        : undefined;
    const authorManagedPolicy = this.createAuthorManagedPolicy();
    const namespaceProvider = this.createNamespaceProvider();
    this.createNamespace(this.namespaceName, namespaceProvider);
    const namespaceLambdaUserRole = this.createNamespaceUserLambdaRole();

    //Create federation roles for each federation config
    props.federations.forEach(federation => {
      Object.entries(federation.roles).forEach(roleProps => {
        const roleProp: FederationRoleProps = roleProps[1];
        const roleName: string = roleProps[0];
        const role: IRole = this.createFederationRoles(federation, roleName);
        if (roleProp.qsUserType == 'AUTHOR') {
          authorManagedPolicy.attachToRole(role);
          if (glueManagedPolicy) {
            glueManagedPolicy.attachToRole(role);
          }
        } else if (roleProp.qsUserType == 'READER') {
          readerManagedPolicy.attachToRole(role);
        }
        //role.roleName is IAM Role that was created by createFederationRoles
        //roleName=sampleReaders|sampleAuthors
        //qSUserType=READER|AUTHOR -> Not needed in logical names
        this.createNamespaceUserMonitor(
          this.namespaceName,
          [role.roleName],
          roleProp.qsUserType,
          roleProp.qsGroups,
          roleName,
          namespaceLambdaUserRole,
        );
      });
    });
  }

  private createNamespaceUserMonitor(
    namespace: string,
    iamRoleName: string[],
    qsUserType: string,
    qsGroupNames: string[],
    roleName: string,
    namespaceLambdaUserRole: MdaaLambdaRole,
  ): void {
    //Create the Lambda Function for this namespace and role
    const namespaceUserFunction = this.createNamespaceUserFunction(
      this.namespaceName,
      qsUserType,
      qsGroupNames,
      roleName,
      namespaceLambdaUserRole,
    );

    //Create an EventBridge Rule to trigger this lambda function each time this role is used to create a QuickSight user
    const eventRule = new Rule(this, `event-rule-${roleName}`, {
      enabled: true,
      description: `Events to map QuickSight users for ${roleName} to namespace ${namespace}`,
      ruleName: this.props.naming.resourceName(`event-rule-${roleName}`, 64),
      eventPattern: {
        source: ['aws.quicksight'],
        detail: {
          eventName: ['CreateUser'],
          userIdentity: {
            sessionContext: {
              sessionIssuer: {
                userName: iamRoleName,
              },
            },
          },
        },
      },
    });

    eventRule.addTarget(
      new aws_events_targets.LambdaFunction(namespaceUserFunction, {
        retryAttempts: 5, // Optional: set the max number of retry attempts
      }),
    );
  }

  private createNamespaceUserLambdaRole(): MdaaLambdaRole {
    const namespaceUserRole: MdaaLambdaRole = new MdaaLambdaRole(this, 'user-cr-role', {
      description: 'CR Role',
      roleName: 'user-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('user-READER'), this.props.naming.resourceName('user-AUTHOR')],
      createParams: false,
      createOutputs: false,
    });

    const managedPolicy: ManagedPolicy = new ManagedPolicy(this, 'ns-user-lambda', {
      managedPolicyName: this.props.naming.resourceName('ns-user-lambda'),
      roles: [namespaceUserRole],
    });

    // Allow describing default namespace users by the lambda
    const describeUserStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:user/default/*`],
      actions: ['quicksight:DescribeUser'],
    });
    managedPolicy.addStatements(describeUserStatement);

    // Allow registering users by the lambda
    const registerUserStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:user/${this.namespaceName}/*`],
      actions: ['quicksight:RegisterUser'],
    });
    managedPolicy.addStatements(registerUserStatement);

    // Allow registering users by the lambda
    const groupRelatedStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:group/${this.namespaceName}/*`],
      actions: [
        'quicksight:ListGroups',
        'quicksight:CreateGroup',
        'quicksight:CreateGroupMembership',
        'quicksight:ListGroupMemberships',
      ],
    });
    managedPolicy.addStatements(groupRelatedStatement);

    // Allow deleting users by the  Default federated user principals need to be deleted before registration in a namespace.
    const deleteUserStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:user/default/*`],
      actions: ['quicksight:DeleteUser'],
    });
    managedPolicy.addStatements(deleteUserStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      managedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'User Name is not known at deployment time.',
        },
      ],
      true,
    );

    return namespaceUserRole;
  }

  private createNamespaceUserFunction(
    namespace: string,
    qsUserType: string,
    qsGroupNames: string[],
    roleName: string,
    namespaceLambdaUserRole: MdaaLambdaRole,
  ): LambdaFunction {
    // This Lambda is used as a Custom Resource in order to create the QuickSight Namespace
    const quicksightNamespaceUserLambda: MdaaLambdaFunction = new MdaaLambdaFunction(this, `user-${roleName}`, {
      functionName: `user-${roleName}`,
      naming: this.props.naming,
      code: Code.fromAsset(`${__dirname}/../src/python/quicksight_namespace_user`),
      handler: 'quicksight_namespace_user.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(600),
      environment: {
        ACCOUNT_ID: this.account,
        NAMESPACE: namespace,
        QUICKSIGHT_ROLE: qsUserType,
        QUICKSIGHT_GROUPS: qsGroupNames
          .map(qsGroupName => {
            return `${namespace}-${qsGroupName}`;
          })
          .toString(),
        LOG_LEVEL: 'INFO',
      },
      role: namespaceLambdaUserRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      quicksightNamespaceUserLambda,
      [
        { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function will interact only with QuickSight APIs.' },
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'No DLQ required. Failures to be manually remediated by Admin.' },
        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Concurrency limits not required.' },
        { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function will interact only with QuickSight APIs.' },
        { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'Function will interact only with QuickSight APIs.' },
        { id: 'HIPAA.Security-LambdaDLQ', reason: 'No DLQ required. Failures to be manually remediated by Admin.' },
        { id: 'PCI.DSS.321-LambdaDLQ', reason: 'No DLQ required. Failures to be manually remediated by Admin.' },
        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Concurrency limits not required.' },
        { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Concurrency limits not required.' },
      ],
      true,
    );
    return quicksightNamespaceUserLambda;
  }

  private createNamespace(name: string, namespaceProvider: Provider): CustomResource {
    return new CustomResource(this, `namespace-cr`, {
      serviceToken: namespaceProvider.serviceToken,
      properties: {
        name: name,
      },
    });
  }

  private createNamespaceProvider(): Provider {
    //Create a role which will be used by the Namespace Custom Resource Function
    const namespaceCrRole: MdaaLambdaRole = new MdaaLambdaRole(this, 'namespace-cr-role', {
      description: 'CR Role',
      roleName: 'namespace-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('ns-cr-func')],
      createParams: false,
      createOutputs: false,
    });

    const namespaceCrManagedPolicy: ManagedPolicy = new ManagedPolicy(this, 'ns-cr-lambda', {
      managedPolicyName: this.props.naming.resourceName('ns-cr-lambda'),
      roles: [namespaceCrRole],
    });

    const qsNamespacePolicyStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:namespace/${this.namespaceName}`],
      actions: [
        'quicksight:CreateNamespace',
        'quicksight:DescribeNamespace',
        'quicksight:DeleteNamespace',
        'quicksight:TagResource',
      ],
    });
    namespaceCrManagedPolicy.addStatements(qsNamespacePolicyStatement);

    //QuickSight uses Directory Service to manage users
    const dsPolicyStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ds:CreateIdentityPoolDirectory', //Takes no resource
        'ds:DescribeDirectories', //Takes no resource
      ],
    });
    namespaceCrManagedPolicy.addStatements(dsPolicyStatement);

    const dsPolicyStatement2: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ds:${this.region}:${this.account}:directory/*`],
      actions: ['ds:AuthorizeApplication', 'ds:UnauthorizeApplication'],
    });
    namespaceCrManagedPolicy.addStatements(dsPolicyStatement2);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      namespaceCrManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ds:CreateIdentityPoolDirectory,ds:DescribeDirectories - Takes no resource.',
          appliesTo: ['Resource::*'],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ds:AuthorizeApplication,ds:UnauthorizeApplication - Directory name randomly generated.',
          appliesTo: [`Resource::arn:${this.partition}:ds:${this.region}:${this.account}:directory/*`],
        },
      ],
      true,
    );
    const srcDir = `${__dirname}/../src/python/quicksight_namespace`;
    // This Lambda is used as a Custom Resource in order to create the QuickSight Namespace
    const quicksightNamespaceCrLambda: MdaaLambdaFunction = new MdaaLambdaFunction(this, 'ns-cr-func', {
      functionName: 'namespace-cr',
      naming: this.props.naming,
      code: Code.fromAsset(srcDir),
      handler: 'quicksight_namespace.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(120),
      environment: {
        ACCOUNT_ID: this.account,
        IDENTITY_STORE: 'QUICKSIGHT',
        LOG_LEVEL: 'INFO',
      },
      role: namespaceCrRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      quicksightNamespaceCrLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
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
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
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
    const namespaceCrProviderFunctionName: string = this.props.naming.resourceName('ns-cr-prov', 64);
    const namespaceCrProviderRole: MdaaLambdaRole = new MdaaLambdaRole(this, 'namespace-cr-prov-role', {
      description: 'CR Role',
      roleName: 'namespace-cr-prov',
      naming: this.props.naming,
      logGroupNames: [namespaceCrProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });
    const namespaceCrProvider: Provider = new Provider(this, 'ns-cr-provider', {
      providerFunctionName: namespaceCrProviderFunctionName,
      onEventHandler: quicksightNamespaceCrLambda,
      role: namespaceCrProviderRole,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      namespaceCrProviderRole,
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
      namespaceCrProvider,
      [
        { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
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
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
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
    return namespaceCrProvider;
  }
  //Creates Federation roles for each federation config
  private createFederationRoles(federation: NameAndFederationProps, roleName: string): IRole {
    //Create a Role which will be provided the accesses required to access Athena via Lake Formation
    return new MdaaRole(this, `role-${roleName}-${federation.federationName}`, {
      naming: this.props.naming,
      assumedBy: new FederatedPrincipal(federation.providerArn, {}, 'sts:AssumeRoleWithSAML'),
      description: `QuickSight Federation Role for ${roleName}`,
      roleName: `${roleName}-${federation.federationName}`,
    });
  }

  private createReaderManagedPolicy(): ManagedPolicy {
    const managedPolicy: ManagedPolicy = new ManagedPolicy(this, 'reader-policy', {
      managedPolicyName: this.props.naming.resourceName('reader-policy'),
    });
    const accessQuickSightCreateReaderStatement: PolicyStatement = new PolicyStatement({
      sid: 'CreateReader',
      effect: Effect.ALLOW,
      actions: ['quicksight:CreateReader'],
      resources: [`arn:${this.partition}:quicksight::${this.account}:user/` + '${aws:userid}'],
    });
    managedPolicy.addStatements(accessQuickSightCreateReaderStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      managedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'quicksight:CreateReader - Username not known at deployment time.',
        },
      ],
      true,
    );

    const accessQuickSightDescribeStatement = new PolicyStatement({
      sid: 'Describe',
      effect: Effect.ALLOW,
      actions: [
        'quicksight:DescribeAnalysis',
        'quicksight:DescribeDashboard',
        'quicksight:DescribeDataset',
        'quicksight:DescribeDataSource',
        'quicksight:DescribeFolder',
        'quicksight:DescribeGroup',
        'quicksight:DescribeIngestion',
        'quicksight:DescribeTemplate',
        'quicksight:DescribeTheme',
        'quicksight:DescribeUser',
      ],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightDescribeStatement);

    const accessQuickSightListStatement: PolicyStatement = new PolicyStatement({
      sid: 'List',
      effect: Effect.ALLOW,
      actions: [
        'quicksight:ListAnalyses',
        'quicksight:ListCustomPermissions',
        'quicksight:ListDashboards',
        'quicksight:ListDashboardVersions',
        'quicksight:ListDataSets',
        'quicksight:ListDataSources',
        'quicksight:ListFolders',
        'quicksight:ListFolderMembers',
        'quicksight:ListGroups',
        'quicksight:ListGroupMemberships',
        'quicksight:ListIngestions',
        'quicksight:ListTagsForResource',
        'quicksight:ListTemplates',
        'quicksight:ListTemplateAliases',
        'quicksight:ListTemplateVersions',
        'quicksight:ListThemes',
        'quicksight:ListThemeAliases',
        'quicksight:ListThemeVersions',
        'quicksight:ListUsers',
        'quicksight:ListUserGroups',
      ],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightListStatement);

    const accessQuickSightSearchStatement: PolicyStatement = new PolicyStatement({
      sid: 'Search',
      effect: Effect.ALLOW,
      actions: ['quicksight:SearchAnalyses', 'quicksight:SearchDashboards', 'quicksight:SearchFolders'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightSearchStatement);

    const accessLakeFormationStatement: PolicyStatement = new PolicyStatement({
      sid: 'LakeFormationAccess',
      effect: Effect.ALLOW,
      actions: ['lakeformation:GetDataAccess'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessLakeFormationStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      managedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'lakeformation:GetDataAccess does not take resource. QuickSight resource permissions managed in QuickSight.',
          appliesTo: [`Resource::*`],
        },
      ],
      true,
    );
    return managedPolicy;
  }

  private createAuthorManagedPolicy(): ManagedPolicy {
    const managedPolicy: ManagedPolicy = new ManagedPolicy(this, 'author-policy', {
      managedPolicyName: this.props.naming.resourceName('author-policy'),
    });

    const accessRedShiftDescribeStatement: PolicyStatement = new PolicyStatement({
      sid: 'RedShiftDescribe',
      effect: Effect.ALLOW,
      actions: ['redshift:DescribeClusters'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessRedShiftDescribeStatement);

    const accessQuickSightCancelIngestionStatement: PolicyStatement = new PolicyStatement({
      sid: 'CancelIngestion',
      effect: Effect.ALLOW,
      actions: ['quicksight:CancelIngestion'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightCancelIngestionStatement);

    const accessQuickSightCreateStatement: PolicyStatement = new PolicyStatement({
      sid: 'Create',
      effect: Effect.ALLOW,
      actions: [
        'quicksight:CreateDashboard',
        'quicksight:CreateFolder',
        'quicksight:CreateFolderMembership',
        'quicksight:CreateIngestion',
      ],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightCreateStatement);

    const accessQuickSightDeleteStatement: PolicyStatement = new PolicyStatement({
      sid: 'Delete',
      effect: Effect.ALLOW,
      actions: [
        'quicksight:DeleteAnalysis',
        'quicksight:DeleteDashboard',
        'quicksight:DeleteFolder',
        'quicksight:DeleteFolderMembership',
      ],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightDeleteStatement);

    const accessQuickSightEmbedUrlStatement: PolicyStatement = new PolicyStatement({
      sid: 'GenerateEmbedUrl',
      effect: Effect.ALLOW,
      actions: ['quicksight:GenerateEmbedUrlForRegisteredUser', 'quicksight:GetDashboardEmbedUrl'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightEmbedUrlStatement);

    const accessQuickSightPassDataStatement: PolicyStatement = new PolicyStatement({
      sid: 'PassData',
      effect: Effect.ALLOW,
      actions: ['quicksight:PassDataSet', 'quicksight:PassDataSource'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightPassDataStatement);

    const accessQuickSightRestoreAnalysisStatement: PolicyStatement = new PolicyStatement({
      sid: 'RestoreAnalysis',
      effect: Effect.ALLOW,
      actions: ['quicksight:RestoreAnalysis'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightRestoreAnalysisStatement);

    const accessQuickSightTagsStatement: PolicyStatement = new PolicyStatement({
      sid: 'Tags',
      effect: Effect.ALLOW,
      actions: ['quicksight:TagResource', 'quicksight:UnTagResource'],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightTagsStatement);

    const accessQuickSightUpdateStatement: PolicyStatement = new PolicyStatement({
      sid: 'Update',
      effect: Effect.ALLOW,
      actions: [
        'quicksight:UpdateAnalysis',
        'quicksight:UpdateAnalysisPermissions',
        'quicksight:UpdateDashboard',
        'quicksight:UpdateDashboardPermissions',
        'quicksight:UpdateDashboardPublishedVersion',
        'quicksight:UpdateFolder',
        'quicksight:UpdateFolderPermissions',
      ],
      resources: ['*'],
    });
    managedPolicy.addStatements(accessQuickSightUpdateStatement);

    const accessQuickSightCreateUserStatement: PolicyStatement = new PolicyStatement({
      sid: 'CreateUser',
      effect: Effect.ALLOW,
      actions: ['quicksight:CreateUser'],
      resources: [`arn:${this.partition}:quicksight::${this.account}:user/` + '${aws:userid}'],
    });
    managedPolicy.addStatements(accessQuickSightCreateUserStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      managedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Quicksight usernames not known at deployment time.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'redshift:DescribeClusters does not take resource. QuickSight resource permissions managed in QuickSight.',
          appliesTo: [`Resource::*`],
        },
      ],
      true,
    );
    return managedPolicy;
  }

  private createGlueManagedPolicy(): ManagedPolicy | void {
    const glueResourceArns: string[] | undefined = this.props.glueResourceAccess?.map(resource => {
      if (resource.includes('*')) {
        console.warn(
          `Glue resource access '${resource}' contains wildcard (*). Consider revising to specific resources.`,
        );
      }
      return `arn:${this.partition}:glue:${this.region}:${this.account}:${resource}`;
    });
    glueResourceArns?.push(`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`);
    glueResourceArns?.push(`arn:${this.partition}:glue:${this.region}:${this.account}:database/default`);

    //Allow to access the glue catalog resources
    const gluePolicy: ManagedPolicy = new ManagedPolicy(this, 'glue-access-policy', {
      managedPolicyName: this.props.naming.resourceName('glue-access-policy'),
    });
    const accessGlueStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:SearchTables',
      ],
      resources: glueResourceArns,
    });
    gluePolicy.addStatements(accessGlueStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      gluePolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource wildcards may originate from app config. Warnings logged.',
        },
      ],
      true,
    );
    return gluePolicy;
  }
}
