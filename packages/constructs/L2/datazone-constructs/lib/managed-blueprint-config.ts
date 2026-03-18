/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import {
  CfnEnvironmentBlueprintConfiguration,
  CfnEnvironmentBlueprintConfigurationProps,
} from 'aws-cdk-lib/aws-datazone';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DataZoneAuthorizationConstruct, EntityType, NamedAuthorizationPolicies } from './authorization';

export interface DataZoneManagedBlueprintConfigConstructProps extends MdaaConstructProps {
  readonly domainName: string;
  readonly domainVersion: 'V1' | 'V2';
  readonly blueprintName: string;
  readonly enabledRegions: string[];
  readonly manageAccessRole?: IRole;
  readonly provisioningRole?: IRole;
  readonly regionalParameters?: CfnEnvironmentBlueprintConfiguration.RegionalParameterProperty[];
  readonly authorizedDomainUnits?: { [name: string]: string };
  readonly account: string;
  readonly domainId: string;
}

export class DataZoneManagedBlueprintConfigConstruct extends Construct {
  public readonly blueprintConfig: CfnEnvironmentBlueprintConfiguration;
  public readonly blueprintConfigId: string;

  constructor(scope: Construct, id: string, props: DataZoneManagedBlueprintConfigConstructProps) {
    super(scope, id);

    //Maintains backwards compat for before domains were their own L2 construct
    const resolvedScope = props.domainVersion == 'V1' ? scope : this;
    const resolvedId =
      props.domainVersion == 'V1' ? `env-blueprint-config-${props.domainName}-${props.blueprintName}` : 'config';

    const configProps: CfnEnvironmentBlueprintConfigurationProps = {
      domainIdentifier: props.domainId,
      enabledRegions: props.enabledRegions,
      environmentBlueprintIdentifier: props.blueprintName,
      manageAccessRoleArn: props.manageAccessRole?.roleArn,
      provisioningRoleArn: props.provisioningRole?.roleArn,
      regionalParameters: props.regionalParameters,
    };

    this.blueprintConfig = new CfnEnvironmentBlueprintConfiguration(resolvedScope, resolvedId, configProps);
    this.blueprintConfigId = this.blueprintConfig.attrEnvironmentBlueprintId;

    this.createAuthorization(props);
  }

  private createAuthorization(props: DataZoneManagedBlueprintConfigConstructProps): void {
    const authorizationPolicies: NamedAuthorizationPolicies = Object.fromEntries(
      Object.entries(props.authorizedDomainUnits || {}).map(([domainUnit, domainUnitId]) => {
        return [
          `blueprint-${domainUnit}`,
          {
            policyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
            principals: [{ allUsersGrantFilter: true }],
            includeChildDomainUnits: true,
            domainUnitId: domainUnitId,
          },
        ];
      }) || [],
    );

    new DataZoneAuthorizationConstruct(this, 'authorization', {
      naming: props.naming,
      domainId: props.domainId,
      entityId: `${props.account}:${this.blueprintConfigId}`,
      entityType: EntityType.ENVIRONMENT_BLUEPRINT_CONFIGURATION,
      policies: authorizationPolicies,
    });
  }
}
