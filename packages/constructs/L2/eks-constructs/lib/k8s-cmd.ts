import { CustomResource, Duration, Token } from 'aws-cdk-lib';

import { Construct } from 'constructs';
import { CaefEKSCluster } from './cluster';

/**
 * Properties for KubernetesCmd.
 */
export interface KubernetesCmdProps {
  /**
   * The EKS cluster to fetch attributes from.
   *
   * [disable-awslint:ref-via-interface]
   */
  readonly cluster: CaefEKSCluster;

  /**
   * The command to run.
   */
  readonly cmd: string[];

  /**
   * The namespace the object belongs to.
   *
   * @default 'default'
   * @jsii ignore
  */
  readonly namespace?: string;


  /**
   * Timeout for waiting on a value.
   *
   * @default Duration.minutes(5)
   */
  readonly timeout?: Duration;

  /**
   * If specified, causes re-execution of the cmd only if this key changes across deployments.
   * If not specified, the cmd will run only once.
   */
  readonly executionKey?: string


  readonly expectedOutput?: string
}

/**
 * Represents a value of a specific object deployed in the cluster.
 * Use this to fetch any information available by the `kubectl get` command.
 */
export class KubernetesCmd extends Construct {
  /**
   * The CloudFormation reosurce type.
   */
  public static readonly RESOURCE_TYPE = 'Custom::AWSCDK-EKS-KubernetesCmd';

  private _resource: CustomResource;

  constructor( scope: Construct, id: string, props: KubernetesCmdProps ) {
    super( scope, id );

    const provider = props.cluster.caefKubeCtlProvider

    this._resource = new CustomResource( this, 'Resource', {
      resourceType: KubernetesCmd.RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      properties: {
        ClusterName: props.cluster.clusterName,
        RoleArn: provider.roleArn,
        Cmd: props.cmd,
        ExpectedOutput: props.expectedOutput,
        Namespace: props.namespace ?? 'default',
        TimeoutSeconds: ( props?.timeout ?? Duration.minutes( 5 ) ).toSeconds(),
        ExecutionKey: props.executionKey
      },
    } );

  }

  /**
   * The value as a string token.
   */
  public get value (): string {
    return Token.asString( this._resource.getAtt( 'Value' ) );
  }
}
