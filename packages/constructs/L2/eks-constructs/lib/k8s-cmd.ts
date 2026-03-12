/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomResource, Duration, Token } from 'aws-cdk-lib';

import { Construct } from 'constructs';
import { MdaaEKSCluster } from './cluster';

export interface KubernetesCmdProps {
  readonly cluster: MdaaEKSCluster;
  readonly cmd: string[];
  readonly namespace?: string;
  /** Timeout duration for kubectl command execution enabling controlled operation timing and failure handling */
  readonly timeout?: Duration;
  readonly executionKey?: string;
  readonly expectedOutput?: string;
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

  constructor(scope: Construct, id: string, props: KubernetesCmdProps) {
    super(scope, id);

    const provider = props.cluster.mdaaKubeCtlProvider;

    this._resource = new CustomResource(this, 'Resource', {
      resourceType: KubernetesCmd.RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      properties: {
        ClusterName: props.cluster.clusterName,
        RoleArn: provider.roleArn,
        Cmd: props.cmd,
        ExpectedOutput: props.expectedOutput,
        Namespace: props.namespace ?? 'default',
        TimeoutSeconds: (props?.timeout ?? Duration.minutes(5)).toSeconds(),
        ExecutionKey: props.executionKey,
      },
    });
  }

  /**
   * The value as a string token.
   */
  public get value(): string {
    return Token.asString(this._resource.getAtt('Value'));
  }
}
