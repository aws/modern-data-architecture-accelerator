/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DomainConfig,
  MdaaDatazoneProjectProps,
  MdaaSageMakerProject,
  ProjectEnvironmentConfiguration,
} from '@aws-mdaa/datazone-constructs';

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnDataSource, CfnDataSourceProps, CfnProjectProfile } from 'aws-cdk-lib/aws-datazone';

import { Construct } from 'constructs';
import { getParamComplianceOverrides } from './blueprint-compliance';
import { ProjectProfilesConfig } from '@aws-mdaa/datazone-constructs/lib/project_profile_config';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { NamedAuthorizationPolicies } from '@aws-mdaa/datazone-constructs/lib/authorization';
import * as cdk from 'aws-cdk-lib/core';
import {
  GrantProps,
  LakeFormationAccessControlL3Construct,
  LakeFormationAccessControlL3ConstructProps,
} from '@aws-mdaa/lakeformation-access-control-l3-construct';

export interface NamedSageMakerProjects {
  /** @jsii ignore */
  readonly [name: string]: SageMakerProjectProps;
}

export interface SageMakerProjectProps {
  readonly profileName: string;

  readonly authorizations?: NamedAuthorizationPolicies;

  readonly environmentConfigs?: { [name: string]: ProjectEnvironmentConfiguration };
  readonly domainUnit?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Owner user references for project ownership enabling user-based project administration and full administrative permissions. Specifies MDAA module user configuration names (not DataZone usernames or Identity Center identifiers) that have PROJECT_OWNER designation with full administrative access to the DataZone project, supporting user-based project governance and individual administration.
   *
   * Use cases: User-based project ownership; Project administration; Full administrative access; Owner permissions; Project governance
   *
   * AWS: Amazon DataZone project owner users with PROJECT_OWNER designation for full administrative access
   *
   * Validation: Must be array of valid MDAA user configuration names as defined in the SageMaker module users section; references must exist in module configuration
   **/
  readonly ownerUsers?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Owner group references for project ownership enabling group-based project administration and collective administrative permissions. Specifies MDAA module group configuration names (not DataZone group names or Identity Center group identifiers) that have PROJECT_OWNER designation with full administrative access to the DataZone project, supporting group-based project governance and collective administration.
   *
   * Use cases: Group-based project ownership; Collective administration; Full administrative access; Owner permissions; Team governance
   *
   * AWS: Amazon DataZone project owner groups with PROJECT_OWNER designation for full administrative access
   *
   * Validation: Must be array of valid MDAA group configuration names as defined in the SageMaker module groups section; references must exist in module configuration
   **/
  readonly ownerGroups?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Contributor user references for project access enabling user-based project contribution and standard permissions. Specifies MDAA module user configuration names (not DataZone usernames or Identity Center identifiers) that have PROJECT_CONTRIBUTOR designation with contributor-level access to the DataZone project, supporting user-based project collaboration and individual contribution.
   *
   * Use cases: User-based project access; Project contribution; Contributor permissions; Collaboration; Standard access
   *
   * AWS: Amazon DataZone project contributor users with PROJECT_CONTRIBUTOR designation for contributor-level access
   *
   * Validation: Must be array of valid MDAA user configuration names as defined in the SageMaker module users section; references must exist in module configuration
   **/
  readonly users?: { [id: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Contributor group references for project access enabling group-based project contribution and collective standard permissions. Specifies MDAA module group configuration names (not DataZone group names or Identity Center group identifiers) that have PROJECT_CONTRIBUTOR designation with contributor-level access to the DataZone project, supporting group-based project collaboration and collective contribution.
   *
   * Use cases: Group-based project access; Collective contribution; Contributor permissions; Team collaboration; Standard access
   *
   * AWS: Amazon DataZone project contributor groups with PROJECT_CONTRIBUTOR designation for contributor-level access
   *
   * Validation: Must be array of valid MDAA group configuration names as defined in the SageMaker module groups section; references must exist in module configuration
   **/
  readonly groups?: { [id: string]: string };

  readonly account?: string;

  readonly dataSources?: { [name: string]: DataSourceProps };
}

export interface DataSourceProps {
  readonly databaseName: string;
}

export interface SagemakerProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SSM parameter reference for domain configuration enabling dynamic domain configuration management. Specifies the SSM parameter containing domain configuration data for flexible domain setup and configuration management.
   *
   * Use cases: Dynamic configuration; SSM parameter reference; Configuration management; Flexible setup
   *
   * AWS: AWS Systems Manager parameter for DataZone domain configuration reference
   *
   * Validation: Must be valid SSM parameter name if provided; parameter must contain valid domain configuration
   **/
  readonly domainConfigSSMParam?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional direct domain configuration for DataZone project setup enabling inline domain configuration management. Provides direct domain configuration object for DataZone project setup and governance configuration without external parameter references.
   *
   * Use cases: Direct configuration; Inline setup; Domain configuration; Governance setup
   *
   * AWS: DataZone domain configuration for project setup and governance management
   *
   * Validation: Must be valid DomainConfig object if provided; enables direct domain configuration when specified
   *   **/
  readonly domainConfig?: DomainConfig;

  readonly projects?: NamedSageMakerProjects;
  readonly projectProfiles?: NamedProjectProfiles;
  readonly projectProfileEnvironmentsTemplates?: { [name: string]: NamedProfileEnvironmentConfigs };
}

export interface ProjectProfileProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional domain unit specification for DataZone project organization enabling hierarchical domain management and project categorization. Defines the domain unit within the DataZone domain for project organization and governance scope management.
   *
   * Use cases: Domain organization; Project categorization; Hierarchical management; Governance scope
   *
   * AWS: DataZone domain unit for project organization and governance management
   *
   * Validation: Must be valid domain unit string if provided; affects project organization and governance scope
   **/
  readonly domainUnit?: string;
  readonly environments?: NamedProfileEnvironmentConfigs;
  readonly account?: string;
  readonly region?: string;
  readonly environmentsTemplate?: string;
}

export interface NamedProfileEnvironmentConfigs {
  /** @jsii ignore */
  readonly [name: string]: ProfileEnvironmentConfig;
}

type ConfigurationParameter = CfnProjectProfile.EnvironmentConfigurationParametersDetailsProperty | cdk.IResolvable;

export interface ProfileEnvironmentConfig {
  readonly deploymentMode?: 'ON_CREATE' | 'ON_DEMAND';
  readonly deploymentOrder?: number;
  readonly configurationParameters?: {
    [key: string]: ConfigurationParameter;
  };
}

export interface NamedProjectProfiles {
  /** @jsii ignore */
  readonly [name: string]: ProjectProfileProps;
}

export class SagemakerProjectL3Construct extends MdaaL3Construct {
  protected readonly props: SagemakerProjectL3ConstructProps;

  public readonly projects: { [name: string]: MdaaSageMakerProject };

  constructor(scope: Construct, id: string, props: SagemakerProjectL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const domainConfig = props.domainConfigSSMParam
      ? new DomainConfig(this, 'domain-config-parser', {
          ssmParamBase: props.domainConfigSSMParam,
          naming: props.naming,
          refresh: true,
        })
      : props.domainConfig;

    if (!domainConfig) {
      throw new Error('One of domainConfig or domainConfigSSMParam must be specified');
    }
    const createdProjectProfiles = this.createProjectProfiles(domainConfig);
    const projectProfilesConfig = new ProjectProfilesConfig(this, 'project-profiles-config', {
      projectProfileIds: createdProjectProfiles,
      ssmParamBase: domainConfig.ssmParamBase,
    });
    const projectProfilesConfigParams = projectProfilesConfig.createProjectProfileParams();

    const projectProfileAccounts = Object.entries(props.projectProfiles || {})
      .filter(x => x[1].account != undefined)
      .map(x => x[1].account as string);

    if (projectProfileAccounts.length > 0) {
      // Create RAM share for project profile config SSM parameters
      // This will allow project profile Ids to be resolved from profile names in
      // associated accounts.
      const configParamRamShareProps: CfnResourceShareProps = {
        name: this.props.naming.resourceName(`project-profiles-config-ssm`),
        resourceArns: projectProfilesConfigParams,
        principals: projectProfileAccounts,
      };
      new CfnResourceShare(scope, `profiles-config-ram-share`, configParamRamShareProps);
    }

    this.projects = this.createProjects(domainConfig, projectProfilesConfig);
  }

  private createProjectProfiles(domainConfig: DomainConfig): { [key: string]: string } {
    return Object.fromEntries(
      Object.entries(this.props.projectProfiles || {}).map(([profileName, profileProps]) => {
        const profile = this.createProjectProfile(
          this,
          profileName,
          profileProps,
          domainConfig,
          this.props.projectProfileEnvironmentsTemplates,
        );
        return [profileName, profile.attrId];
      }),
    );
  }

  private createProjects(
    domainConfig: DomainConfig,
    projectProfilesConfig: ProjectProfilesConfig,
  ): { [name: string]: MdaaSageMakerProject } {
    return Object.fromEntries(
      Object.entries(this.props.projects || {}).map(([projectName, projectProps]) => {
        const projectAndDataSources = this.createSageMakerProject(
          this,
          projectName,
          projectProps,
          domainConfig,
          projectProfilesConfig,
        );
        return [projectName, projectAndDataSources];
      }),
    );
  }

  private createSageMakerProject(
    scope: Construct,
    projectName: string,
    projectProps: SageMakerProjectProps,
    domainConfig: DomainConfig,
    projectProfilesConfig: ProjectProfilesConfig,
  ): MdaaSageMakerProject {
    const projectProfileId = projectProfilesConfig.getProjectProfileId(projectProps.profileName);

    const constructProps: MdaaDatazoneProjectProps = {
      name: projectName,
      naming: this.props.naming,
      domainConfig: domainConfig,
      projectProfileId: projectProfileId,
      domainUnit: projectProps.domainUnit,
      ownerGroups: projectProps.ownerGroups,
      ownerUsers: projectProps.ownerUsers,
      users: projectProps.users,
      groups: projectProps.groups,
      environmentConfigurations: projectProps.environmentConfigs,
    };
    const project = new MdaaSageMakerProject(scope, `project-${projectName}`, constructProps);

    const createdDataSources = Object.entries(projectProps.dataSources || {}).map(
      ([dataSourceName, dataSourceProps]) => {
        return this.createDataSource(projectName, project, dataSourceName, dataSourceProps);
      },
    );
    console.debug(`Created ${createdDataSources.length} datasources`);

    return project;
  }

  private createDataSource(
    projectName: string,
    project: MdaaSageMakerProject,
    dataSourceName: string,
    dataSourceProps: DataSourceProps,
  ) {
    const datasourceProps: CfnDataSourceProps = {
      domainIdentifier: project.project.attrDomainId,
      connectionIdentifier: project.glueConnectionId, //Need to pass glue connection id for SMUS projects
      name: this.props.naming.resourceName(dataSourceName),
      projectIdentifier: project.project.attrId,
      type: 'glue',
      configuration: {
        glueRunConfiguration: {
          autoImportDataQualityResult: true,
          relationalFilterConfigurations: [
            {
              databaseName: dataSourceProps.databaseName,
            },
          ],
        },
      },
    };
    const datasource = new CfnDataSource(project, `${dataSourceName}-datazone-datasource`, datasourceProps);
    const grantProps: GrantProps = {
      database: dataSourceProps.databaseName,
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      principals: {
        'datazone-user': {
          role: {
            refId: `datazone-user-${projectName}`,
            arn: project.envUserArn,
          },
        },
      },
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
    };
    const lakeFormationProps: LakeFormationAccessControlL3ConstructProps = {
      grants: { 'datasource-usr-access': grantProps },
      ...this.props,
    };
    new LakeFormationAccessControlL3Construct(datasource, 'lf-permissions', lakeFormationProps);
    return { dataSourceName: dataSourceName, dataSource: datasource, props: dataSourceProps };
  }

  private createProjectProfile(
    scope: Construct,
    profileName: string,
    profileProps: ProjectProfileProps,
    domainConfig: DomainConfig,
    projectProfileEnvironmentsTemplates?: { [name: string]: NamedProfileEnvironmentConfigs },
  ): CfnProjectProfile {
    // Resolve environment template if specified
    const templateEnvs =
      profileProps.environmentsTemplate && projectProfileEnvironmentsTemplates
        ? projectProfileEnvironmentsTemplates[profileProps.environmentsTemplate]
        : undefined;
    if (profileProps.environmentsTemplate && !templateEnvs) {
      throw new Error(
        `Environment template ${profileProps.environmentsTemplate} not found in projectProfileEnvironmentsTemplates`,
      );
    }

    // Build environment configurations from template and profile props
    const envConfigs: CfnProjectProfile.EnvironmentConfigurationProperty[] = Object.entries({
      ...templateEnvs,
      ...profileProps.environments,
    }).map(([envName, envPropsRaw]) => {
      const blueprintName = envName;
      const blueprintId = domainConfig.getBlueprintId(blueprintName);
      if (!blueprintId) {
        throw new Error(`Environment blueprint ${blueprintName} not found in enabledManagedBlueprints`);
      }

      return {
        awsRegion: { regionName: profileProps.region ?? this.region },
        awsAccount: {
          awsAccountId: profileProps.account ?? this.account,
        },
        environmentBlueprintName: blueprintName,
        configurationParameters: {
          ...envPropsRaw.configurationParameters,
          parameterOverrides: getParamComplianceOverrides(blueprintName),
        },
        name: envName,
        environmentBlueprintId: blueprintId,
        deploymentMode: envPropsRaw.deploymentMode,
        deploymentOrder: envPropsRaw.deploymentOrder,
      };
    });

    // Create required Tooling environment configuration
    const toolingEnvConfig: CfnProjectProfile.EnvironmentConfigurationProperty = {
      awsRegion: { regionName: profileProps.region ?? this.region },
      awsAccount: {
        awsAccountId: profileProps.account ?? this.account,
      },
      environmentBlueprintId: domainConfig.getBlueprintId('Tooling'),
      name: 'Tooling',
      deploymentMode: 'ON_CREATE',
      deploymentOrder: 1,
      configurationParameters: {
        parameterOverrides: getParamComplianceOverrides('Tooling'),
      },
    };

    // Create required DataLake environment configuration
    const datalakeEnvConfig: CfnProjectProfile.EnvironmentConfigurationProperty = {
      awsRegion: { regionName: profileProps.region ?? this.region },
      awsAccount: {
        awsAccountId: profileProps.account ?? this.account,
      },
      environmentBlueprintId: domainConfig.getBlueprintId('DataLake'),
      name: 'DataLake',
      deploymentMode: 'ON_CREATE',
      deploymentOrder: 2,
      configurationParameters: {
        parameterOverrides: getParamComplianceOverrides('DataLake'),
      },
    };

    // Resolve domain unit ID if specified
    const domainUnitId = profileProps.domainUnit ? domainConfig.getDomainUnitId(profileProps.domainUnit) : undefined;
    if (profileProps.domainUnit && !domainUnitId) {
      throw new Error(`Domain unit ${profileProps.domainUnit} not found in domain config`);
    }

    // Create project profile with all environment configurations
    return new CfnProjectProfile(scope, profileName, {
      domainIdentifier: domainConfig.domainId,
      domainUnitIdentifier: domainUnitId,
      name: profileName,
      environmentConfigurations: [toolingEnvConfig, datalakeEnvConfig, ...envConfigs],
      status: 'ENABLED',
    });
  }
}
