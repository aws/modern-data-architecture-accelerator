import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import * as path from 'path';
import { Shared } from '../shared';
import { BackendApisProps, Direction, SystemConfig } from '../shared/types';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaSqsDeadLetterQueue, MdaaSqsQueue } from '@aws-mdaa/sqs-constructs';
import { MdaaDDBTable } from '@aws-mdaa/ddb-constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaLogGroup, MdaaLogGroupProps } from '@aws-mdaa/cloudwatch-constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration } from 'aws-cdk-lib';

interface WebSocketApiProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly userPool: cognito.IUserPool;
  encryptionKey: MdaaKmsKey;
}

export class WebSocketApi extends MdaaL3Construct {
  public readonly api: apigwv2.WebSocketApi;
  public readonly messagesTopic: sns.Topic;
  private readonly props: WebSocketApiProps;
  constructor(scope: Construct, id: string, props: WebSocketApiProps) {
    super(scope, id, props);

    this.props = props;

    // Create the main Message Topic acting as a message bus
    const messagesTopic = new MdaaSnsTopic(this, 'WeSocketMessagesTopic', {
      masterKey: props.encryptionKey,
      naming: props.naming,
      createParams: true,
      createOutputs: false,
      topicName: 'WeSocketMessagesTopic',
    });

    const connectionsTable = new MdaaDDBTable(this, 'ConnectionsTable', {
      encryptionKey: props.encryptionKey,
      naming: props.naming,
      tableName: props.naming.resourceName('Connections'),
      createParams: true,
      createOutputs: false,
      partitionKey: {
        name: 'connectionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'byUser',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const vpcNetworkInterfacePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
      resources: ['*'],
    });

    const connectionHandlerFunctionRole = new MdaaLambdaRole(this, 'WebSocketConnectionHandlerFunctionRole', {
      naming: this.props.naming,
      roleName: 'WebSocketConnectionHandlerFunctionRole',
      logGroupNames: [this.props.naming.resourceName('websocket-connection-handler')],
      createParams: false,
      createOutputs: false,
    });

    connectionHandlerFunctionRole.addToPolicy(vpcNetworkInterfacePolicy);

    const connectionHandlerFunction = this.createConnectionHandlerFunction(
      connectionHandlerFunctionRole,
      props.shared.appSecurityGroup,
      connectionsTable,
    );
    props.encryptionKey.grantEncryptDecrypt(connectionHandlerFunction);
    connectionsTable.grantReadWriteData(connectionHandlerFunctionRole);

    const authorizerFunctionRole = new MdaaLambdaRole(this, 'WebSocketAuthorizerFunctionRole', {
      naming: this.props.naming,
      roleName: 'WebSocketAuthorizerFunctionRole',
      logGroupNames: [this.props.naming.resourceName('websocket-authorizer')],
      createParams: false,
      createOutputs: false,
    });
    authorizerFunctionRole.addToPolicy(vpcNetworkInterfacePolicy);
    const authorizerFunction = this.createAuthorizerFunction(props.shared.appSecurityGroup, authorizerFunctionRole);

    const webSocketApi = new apigwv2.WebSocketApi(this, 'WebSocketApi', {
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer('Authorizer', authorizerFunction, {
          identitySource: ['route.request.querystring.token'],
        }),
        integration: new WebSocketLambdaIntegration('ConnectIntegration', connectionHandlerFunction),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', connectionHandlerFunction),
      },
    });

    if (this.props.config?.api?.socketApiDomainName === undefined) {
      new ssm.StringParameter(this, 'SocketApiIdSSMParam', {
        parameterName: this.props.naming.ssmPath('socket/api/id'),
        stringValue: webSocketApi.apiId,
      });
    }

    const stage = new apigwv2.WebSocketStage(this, 'WebSocketApiStage', {
      webSocketApi,
      stageName: 'socket',
      autoDeploy: true,
    });

    const apiCustomDomainConfigs = props.config.api;
    if (apiCustomDomainConfigs !== undefined) {
      this.applyCustomDomain(apiCustomDomainConfigs, webSocketApi, stage);
    }

    const apiAccessLogGroupProps: MdaaLogGroupProps = {
      logGroupName: 'genai-admin-websocket-api',
      encryptionKey: this.props.encryptionKey,
      // WAF log group destination names must start with aws-waf-logs-
      // https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
      logGroupNamePathPrefix: 'genai-admin-websocket-api-access-logs-',
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
    };

    const apiAccessLogGroup = new MdaaLogGroup(this, 'WebSocketApiLogGroup', apiAccessLogGroupProps);

    const cfnStage = stage.node.defaultChild as unknown as apigwv2.CfnStage;
    cfnStage.accessLogSettings = {
      destinationArn: apiAccessLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        caller: '$context.identity.caller',
        user: '$context.identity.user',
        connectionId: '$context.connectionId',
      }),
    };

    const incomingMessageHandlerFunctionRole = new MdaaLambdaRole(this, 'WebSocketIncomingMessageHandlerFunctionRole', {
      naming: props.naming,
      roleName: 'WebSocketIncomingMessageHandlerFunctionRole',
      logGroupNames: [props.naming.resourceName('websocket-incoming-message-handler')],
      createParams: false,
      createOutputs: false,
    });

    incomingMessageHandlerFunctionRole.addToPolicy(vpcNetworkInterfacePolicy);

    const incomingMessageHandlerFunction = this.createIncomingMessageHandlerFunction(
      incomingMessageHandlerFunctionRole,
      props.shared.appSecurityGroup,
      messagesTopic,
      stage,
    );
    props.encryptionKey.grantEncryptDecrypt(incomingMessageHandlerFunctionRole);
    messagesTopic.grantPublish(incomingMessageHandlerFunctionRole);
    incomingMessageHandlerFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['events:PutEvents'],
        resources: [`arn:${cdk.Aws.PARTITION}:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:event-bus/default`],
      }),
    );

    incomingMessageHandlerFunctionRole.addToPolicy(vpcNetworkInterfacePolicy);

    webSocketApi.addRoute('$default', {
      integration: new WebSocketLambdaIntegration('DefaultIntegration', incomingMessageHandlerFunction),
    });

    const outgoingMessageHandlerFunctionRole = new MdaaLambdaRole(this, 'WebSocketOutgoingMessageFunctionRole', {
      naming: props.naming,
      roleName: 'WebSocketOutgoingMessageHandlerFunctionRole',
      logGroupNames: [props.naming.resourceName('websocket-outgoing-message-handler')],
      createParams: false,
      createOutputs: false,
    });
    props.encryptionKey.grantEncryptDecrypt(outgoingMessageHandlerFunctionRole);
    outgoingMessageHandlerFunctionRole.addToPolicy(vpcNetworkInterfacePolicy);

    const outgoingMessageHandlerFunction = this.createOutgoingMessageHandlerFunction(
      outgoingMessageHandlerFunctionRole,
      connectionsTable,
      stage,
    );

    connectionsTable.grantReadData(outgoingMessageHandlerFunctionRole);
    outgoingMessageHandlerFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${webSocketApi.apiId}/${stage.stageName}/*/*`,
        ],
      }),
    );

    const deadLetterQueue = new MdaaSqsDeadLetterQueue(this, 'WebSocketOutgoingMessagesDLQ', {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      queueName: 'WebSocketOutgoingMessagesDLQ',
      createParams: false,
      createOutputs: false,
    });

    const queue = new MdaaSqsQueue(this, 'WebSocketOutgoingMessagesQueue', {
      encryptionMasterKey: props.encryptionKey,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      queueName: 'WebSocketOutgoingMessagesQueue',
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // grant eventbridge permissions to send messages to the queue
    queue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: [queue.queueArn],
        principals: [new iam.ServicePrincipal('events.amazonaws.com'), new iam.ServicePrincipal('sqs.amazonaws.com')],
      }),
    );

    outgoingMessageHandlerFunction.addEventSource(new lambdaEventSources.SqsEventSource(queue));

    // Route all outgoing messages to the websocket interface queue
    messagesTopic.addSubscription(
      new subscriptions.SqsSubscription(queue, {
        filterPolicyWithMessageBody: {
          direction: sns.FilterOrPolicy.filter(
            sns.SubscriptionFilter.stringFilter({
              allowlist: [Direction.OUT],
            }),
          ),
        },
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      incomingMessageHandlerFunctionRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'X-Ray actions only support wildcard and execute api manage connections restricted to stack api gateway',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      outgoingMessageHandlerFunctionRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'X-Ray actions only support wildcard and execute api manage connections restricted to stack api gateway, and AWSLambdaBasicExecutionRole restrictive enough',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      webSocketApi,
      [{ id: 'AwsSolutions-APIG4', reason: 'API guarded with Cognito Auth and an Authorizer lambda' }],
      true,
    );

    this.api = webSocketApi;
    this.messagesTopic = messagesTopic;
  }
  private createOutgoingMessageHandlerFunction(
    outgoingMessageHandlerFunctionRole: MdaaRole,
    connectionsTable: dynamodb.ITable,
    stage: apigwv2.WebSocketStage,
  ) {
    const outgoingMessageHandlerCodePath =
      this.props.config?.codeOverwrites?.webSocketOutgoingMessageHandlerCodePath !== undefined
        ? this.props.config.codeOverwrites.webSocketOutgoingMessageHandlerCodePath
        : path.join(__dirname, './functions/outgoing-message-handler');
    const outgoingMessageHandlerFunction = new MdaaLambdaFunction(this, 'WebSocketOutgoingMessageFunction', {
      functionName: 'websocket-outgoing-message-handler',
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      role: outgoingMessageHandlerFunctionRole,
      code: lambda.Code.fromAsset(outgoingMessageHandlerCodePath),
      handler: 'index.handler',
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      timeout: Duration.seconds(6),
      tracing: lambda.Tracing.ACTIVE,
      layers: [this.props.shared.powerToolsLayer],
      environment: {
        ...this.props.shared.defaultEnvironmentVariables,
        WEBSOCKET_API_ENDPOINT: stage.callbackUrl,
        CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
      },
      reservedConcurrentExecutions: this.props.config?.concurrency?.websocketConcurrentLambdas || 1,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      outgoingMessageHandlerFunction,
      [
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Lambda in vpc is not enforced, outgoing messages just communicates to socket gateway.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Lambda in vpc is not enforced, outgoing messages just communicates to socket gateway.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Lambda in vpc is not enforced, outgoing messages just communicates to socket gateway.',
        },
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );
    return outgoingMessageHandlerFunction;
  }

  private createIncomingMessageHandlerFunction(
    incomingMessageHandlerFunctionRole: MdaaRole,
    apiSecurityGroup: ec2.ISecurityGroup,
    messagesTopic: sns.ITopic,
    stage: apigwv2.WebSocketStage,
  ) {
    const incomingMessageHandlerCodePath =
      this.props.config?.codeOverwrites?.webSocketIncomingMessageHandlerCodePath !== undefined
        ? this.props.config.codeOverwrites.webSocketIncomingMessageHandlerCodePath
        : path.join(__dirname, './functions/incoming-message-handler');
    const incomingMessageHandlerFunction = new MdaaLambdaFunction(this, 'WebSocketIncomingMessageHandlerFunction', {
      functionName: 'websocket-incoming-message-handler',
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      role: incomingMessageHandlerFunctionRole,
      code: lambda.Code.fromAsset(incomingMessageHandlerCodePath),
      vpc: this.props.shared.vpc,
      securityGroups: [apiSecurityGroup],
      vpcSubnets: { subnets: this.props.shared.appSubnets },
      handler: 'index.handler',
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      timeout: Duration.seconds(6),
      tracing: lambda.Tracing.ACTIVE,
      layers: [this.props.shared.powerToolsLayer],
      environment: {
        ...this.props.shared.defaultEnvironmentVariables,
        MESSAGES_TOPIC_ARN: messagesTopic.topicArn,
        WEBSOCKET_API_ENDPOINT: stage.callbackUrl,
      },
      reservedConcurrentExecutions: this.props.config?.concurrency?.websocketConcurrentLambdas || 1,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      incomingMessageHandlerFunction,
      [
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );
    return incomingMessageHandlerFunction;
  }

  private createAuthorizerFunction(apiSecurityGroup: ec2.ISecurityGroup, authorizerFunctionRole: iam.IRole) {
    const authorizerFunctionCodePath =
      this.props.config?.codeOverwrites?.webSocketAuthorizerFunctionCodePath !== undefined
        ? this.props.config.codeOverwrites.webSocketAuthorizerFunctionCodePath
        : path.join(__dirname, './functions/authorizer');
    const authorizerFunction = new MdaaLambdaFunction(this, 'WebSocketAuthorizerFunction', {
      functionName: 'websocket-authorizer',
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      role: authorizerFunctionRole,
      code: lambda.Code.fromAsset(authorizerFunctionCodePath),
      vpc: this.props.shared.vpc,
      securityGroups: [apiSecurityGroup],
      vpcSubnets: { subnets: this.props.shared.appSubnets },
      handler: 'index.handler',
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      timeout: Duration.seconds(6),
      tracing: lambda.Tracing.ACTIVE,
      layers: [this.props.shared.powerToolsLayer],
      environment: {
        ...this.props.shared.defaultEnvironmentVariables,
      },
      reservedConcurrentExecutions: this.props.config?.concurrency?.websocketConcurrentLambdas || 1,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      authorizerFunction,
      [
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );

    this.props.userPool.grant(authorizerFunctionRole, 'cognito-idp:GetUser');
    MdaaNagSuppressions.addCodeResourceSuppressions(
      authorizerFunctionRole,
      [
        { id: 'AwsSolutions-IAM5', reason: 'X-Ray actions only support wildcard.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );
    return authorizerFunction;
  }

  private applyCustomDomain(
    apiCustomDomainProps: BackendApisProps,
    api: apigwv2.WebSocketApi,
    stage: apigwv2.WebSocketStage,
  ) {
    const hostedZone = route53.HostedZone.fromLookup(this, 'WebSocketApiMainHostedZone', {
      domainName: apiCustomDomainProps.hostedZoneName,
    });
    const domainName = new apigwv2.DomainName(this, 'WebSocketApiDomainName', {
      domainName: apiCustomDomainProps.socketApiDomainName,
      certificate: new acm.Certificate(this, 'Certificate', {
        domainName: apiCustomDomainProps.socketApiDomainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      }),
    });

    new apigwv2.CfnApiMapping(this, 'Mapping', {
      apiId: api.apiId,
      domainName: domainName.name,
      stage: stage.stageName,
      apiMappingKey: 'socket',
    });

    new route53.ARecord(this, 'DnsRecord', {
      recordName: apiCustomDomainProps.socketApiDomainName,
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId),
      ),
    });
  }

  private createConnectionHandlerFunction(
    connectionHandlerFunctionRole: iam.IRole,
    apiSecurityGroup: ec2.ISecurityGroup,
    connectionsTable: dynamodb.ITable,
  ) {
    const connectionHandlerCodePath =
      this.props.config?.codeOverwrites?.webSocketConnectionHandlerCodePath !== undefined
        ? this.props.config.codeOverwrites.webSocketConnectionHandlerCodePath
        : path.join(__dirname, './functions/connection-handler');

    const connectionHandlerFunction = new MdaaLambdaFunction(this, 'WebSocketConnectionHandlerFunction', {
      functionName: 'websocket-connection-handler',
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      role: connectionHandlerFunctionRole,
      code: lambda.Code.fromAsset(connectionHandlerCodePath),
      vpc: this.props.shared.vpc,
      securityGroups: [apiSecurityGroup],
      vpcSubnets: { subnets: this.props.shared.appSubnets },
      handler: 'index.handler',
      runtime: this.props.shared.pythonRuntime,
      architecture: this.props.shared.lambdaArchitecture,
      timeout: Duration.seconds(6),
      tracing: lambda.Tracing.ACTIVE,
      layers: [this.props.shared.powerToolsLayer],
      environment: {
        ...this.props.shared.defaultEnvironmentVariables,
        CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
      },
      reservedConcurrentExecutions: this.props.config?.concurrency?.websocketConcurrentLambdas || 1,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      connectionHandlerFunction,
      [
        { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is API implementation and will be invoked synchronously.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is API implementation and will be invoked via API Gateway with WAF protections.',
        },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      connectionHandlerFunctionRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'X-Ray actions only support wildcard and log group not known at deployment.',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
      ],
      true,
    );

    return connectionHandlerFunction;
  }
}
