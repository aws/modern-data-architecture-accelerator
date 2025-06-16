/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Code } from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { MdaaRdsServerlessCluster } from './serverless-cluster';

export interface MdaaRdsDataResourceProps extends MdaaConstructProps {
  readonly rdsCluster: MdaaRdsServerlessCluster;
  readonly databaseName?: string;
  readonly onCreateSqlStatements: string[];
  readonly onUpdateSqlStatements?: string[];
  readonly onDeleteSqlStatements?: string[];
  readonly timeout?: Duration;
}

export class MdaaRdsDataResource extends MdaaCustomResource {
  private static setRdsDataProps(props: MdaaRdsDataResourceProps): MdaaCustomResourceProps {
    return {
      resourceType: 'RDS-Data',
      naming: props.naming,
      runtime: Runtime.PYTHON_3_13,
      handler: 'index.lambda_handler',
      handlerTimeout: props.timeout ? props.timeout : Duration.minutes(11),
      code: Code.fromAsset(`${__dirname}/functions/rds-data/`),
      handlerRolePolicyStatements: [
        new PolicyStatement({
          actions: ['rds-data:ExecuteStatement'],
          resources: [props.rdsCluster.clusterArn],
        }),
      ],
      handlerProps: {
        cluster_arn: props.rdsCluster.clusterArn,
        secret_arn: props.rdsCluster.secret?.secretArn,
        database_name: props.databaseName,
        on_create_sql_statements: props.onCreateSqlStatements,
        on_update_sql_statements: props.onUpdateSqlStatements,
        on_delete_sql_statements: props.onDeleteSqlStatements,
      },
    };
  }

  public constructor(scope: Construct, id: string, props: MdaaRdsDataResourceProps) {
    super(scope, id, MdaaRdsDataResource.setRdsDataProps(props));
  }
}
