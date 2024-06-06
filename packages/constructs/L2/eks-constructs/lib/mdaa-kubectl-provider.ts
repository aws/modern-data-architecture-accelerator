/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Duration, Names, NestedStack, Stack } from 'aws-cdk-lib';
import { Cluster, ICluster, IKubectlProvider, KubectlProvider, KubectlProviderAttributes, KubectlProviderProps } from 'aws-cdk-lib/aws-eks';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { AwsCliLayer } from 'aws-cdk-lib/lambda-layer-awscli';
import { KubectlLayer } from 'aws-cdk-lib/lambda-layer-kubectl';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Implementation of Kubectl Lambda
 */
export class MdaaKubectlProvider extends NestedStack implements IKubectlProvider {

  /**
   * Take existing provider or create new based on cluster
   *
   * @param scope Construct
   * @param cluster k8s cluster
   */
  public static getOrCreate ( scope: Construct, cluster: ICluster ) {
    // if this is an "owned" cluster, it has a provider associated with it
    if ( cluster instanceof Cluster ) {
      return cluster._attachKubectlResourceScope( scope );
    }

    // if this is an imported cluster, it maybe has a predefined kubectl provider?
    if ( cluster.kubectlProvider ) {
      return cluster.kubectlProvider;
    }

    // if this is an imported cluster and there is no kubectl provider defined, we need to provision a custom resource provider in this stack
    // we will define one per stack for each cluster based on the cluster uniqueid
    const uid = `${ Names.nodeUniqueId( cluster.node ) }-MdaaKubectlProvider`;
    const stack = Stack.of( scope );
    let provider = stack.node.tryFindChild( uid ) as KubectlProvider;
    if ( !provider ) {
      provider = new KubectlProvider( stack, uid, { cluster } );
    }

    return provider;
  }

  /**
   * Import an existing provider
   *
   * @param scope Construct
   * @param id an id of resource
   * @param attrs attributes for the provider
   */
  public static fromKubectlProviderAttributes ( scope: Construct, id: string, attrs: KubectlProviderAttributes ): IKubectlProvider {
    return new ImportedKubectlProvider( scope, id, attrs );
  }

  /**
   * The custom resource provider's service token.
   */
  public readonly serviceToken: string;

  /**
   * The IAM role to assume in order to perform kubectl operations against this cluster.
   */
  public readonly roleArn: string;

  /**
   * The IAM execution role of the handler.
   */
  public readonly handlerRole: IRole;

  public constructor( scope: Construct, id: string, props: KubectlProviderProps ) {
    super( scope, id );

    const cluster = props.cluster;

    if ( !cluster.kubectlRole ) {
      throw new Error( '"kubectlRole" is not defined, cannot issue kubectl commands against this cluster' );
    }

    if ( cluster.kubectlPrivateSubnets && !cluster.kubectlSecurityGroup ) {
      throw new Error( '"kubectlSecurityGroup" is required if "kubectlSubnets" is specified' );
    }

    const memorySize = cluster.kubectlMemory ? cluster.kubectlMemory.toMebibytes() : 1024;

    const handler = new Function( this, 'Handler', { //NOSONAR false positive
      code: Code.fromAsset( path.join( __dirname, 'kubectl-handler' ) ),
      runtime: Runtime.PYTHON_3_12,
      handler: 'index.handler',
      timeout: Duration.minutes( 15 ),
      description: 'onEvent handler for EKS kubectl resource provider',
      memorySize,
      environment: cluster.kubectlEnvironment,
      role: cluster.kubectlLambdaRole,

      // defined only when using private access
      vpc: cluster.kubectlPrivateSubnets ? cluster.vpc : undefined,
      securityGroups: cluster.kubectlPrivateSubnets && cluster.kubectlSecurityGroup ? [ cluster.kubectlSecurityGroup ] : undefined,
      vpcSubnets: cluster.kubectlPrivateSubnets ? { subnets: cluster.kubectlPrivateSubnets } : undefined,
    } );

    // allow user to customize the layers with the tools we need
    handler.addLayers( props.cluster.awscliLayer ?? new AwsCliLayer( this, 'AwsCliLayer' ) );
    handler.addLayers( props.cluster.kubectlLayer ?? new KubectlLayer( this, 'KubectlLayer' ) );

    this.handlerRole = handler.role!;

    const provider = new Provider( this, 'Provider', {
      onEventHandler: handler,
      vpc: cluster.kubectlPrivateSubnets ? cluster.vpc : undefined,
      vpcSubnets: cluster.kubectlPrivateSubnets ? { subnets: cluster.kubectlPrivateSubnets } : undefined,
      securityGroups: cluster.kubectlPrivateSubnets && cluster.kubectlSecurityGroup ? [ cluster.kubectlSecurityGroup ] : undefined,
    } );

    this.serviceToken = provider.serviceToken;
    this.roleArn = cluster.kubectlRole.roleArn;
    NagSuppressions.addResourceSuppressions( this, [
      { id: "AwsSolutions-IAM4", reason: "AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are least privilege." },
      { id: "AwsSolutions-IAM5", reason: "Resource names not known at deployment time." },
      { id: "AwsSolutions-L1", reason: "Function generated by EKS L2 construct." },
      { id: "NIST.800.53.R5-LambdaConcurrency", reason: "Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn." },
      { id: "NIST.800.53.R5-LambdaDLQ", reason: "Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn." },
      { id: "NIST.800.53.R5-IAMNoInlinePolicy", reason: "Policy statements are specific to custom resource." },
      { id: "HIPAA.Security-LambdaConcurrency", reason: "Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn." },
      { id: "HIPAA.Security-LambdaDLQ", reason: "Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn." },
      { id: "HIPAA.Security-IAMNoInlinePolicy", reason: "Policy statements are specific to custom resource." },
    ], true );
  }

}

class ImportedKubectlProvider extends Construct implements IKubectlProvider {

  /**
   * The custom resource provider's service token.
   */
  public readonly serviceToken: string;

  /**
   * The IAM role to assume in order to perform kubectl operations against this cluster.
   */
  public readonly roleArn: string;

  /**
   * The IAM execution role of the handler.
   */
  public readonly handlerRole: IRole;

  constructor( scope: Construct, id: string, props: KubectlProviderAttributes ) {
    super( scope, id );

    this.serviceToken = props.functionArn;
    this.roleArn = props.kubectlRoleArn;
    this.handlerRole = props.handlerRole;
  }
}
