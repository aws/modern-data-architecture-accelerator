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
  /**
   * Name of the project profile to use for this project. The profile must
   * target the same account as the project.
   *
   * Use cases: Profile-based project creation; Environment template selection
   *
   * AWS: DataZone project profile reference
   *
   * Validation: Required; string; must match a key in projectProfiles config
   */
  readonly profileName: string;

  /**
   * Per-environment configuration overrides for this project's environments.
   *
   * Use cases: Project-specific environment customization
   *
   * AWS: DataZone project environment configurations
   *
   * Validation: Optional; map of environment name to ProjectEnvironmentConfiguration
   */
  readonly environmentConfigs?: { [name: string]: ProjectEnvironmentConfiguration };
  /**
   * Domain unit path where the project will be created (e.g., /some/domain/unit).
   *
   * Use cases: Project organizational placement; Governance scope targeting
   *
   * AWS: DataZone domain unit for project placement
   *
   * Validation: Optional; slash-delimited domain unit path
   */
  readonly domainUnit?: string;
  /**
   * MDAA user configuration names (from the SageMaker module users section) that
   * receive PROJECT_OWNER designation with full administrative access to the project.
   * These are not DataZone usernames or Identity Center identifiers.
   *
   * Use cases: User-based project ownership; Full project admin access
   *
   * AWS: DataZone project membership with PROJECT_OWNER role
   *
   * Validation: Optional; map of ID to user config name; names must exist in module users config
   */
  readonly ownerUsers?: { [id: string]: string };
  /**
   * MDAA group configuration names (from the SageMaker module groups section) that
   * receive PROJECT_OWNER designation with full administrative access to the project.
   * These are not DataZone group names or Identity Center group identifiers.
   *
   * Use cases: Team-based project ownership; Group admin access
   *
   * AWS: DataZone project membership with PROJECT_OWNER role
   *
   * Validation: Optional; map of ID to group config name; names must exist in module groups config
   */
  readonly ownerGroups?: { [id: string]: string };
  /**
   * MDAA user configuration names that receive PROJECT_CONTRIBUTOR designation
   * with contributor-level access to the project.
   *
   * Use cases: User-based project contribution; Standard project access
   *
   * AWS: DataZone project membership with PROJECT_CONTRIBUTOR role
   *
   * Validation: Optional; map of ID to user config name; names must exist in module users config
   */
  readonly users?: { [id: string]: string };
  /**
   * MDAA group configuration names that receive PROJECT_CONTRIBUTOR designation
   * with contributor-level access to the project.
   *
   * Use cases: Team-based project contribution; Group standard access
   *
   * AWS: DataZone project membership with PROJECT_CONTRIBUTOR role
   *
   * Validation: Optional; map of ID to group config name; names must exist in module groups config
   */
  readonly groups?: { [id: string]: string };

  /**
   * Glue data sources to import into the project. Each data source references
   * a Glue database and creates Lake Formation read permissions for the project's
   * environment user.
   *
   * Use cases: Importing existing Glue databases into SageMaker projects; Data asset discovery
   *
   * AWS: DataZone data sources with Glue run configuration
   *
   * Validation: Optional; map of data source name to DataSourceProps
   */
  readonly dataSources?: { [name: string]: DataSourceProps };
}

export interface DataSourceProps {
  /**
   * Glue database name to use as the data source. The project's environment user
   * will be granted Lake Formation read permissions on this database and its tables.
   *
   * Use cases: Glue database import; Data asset registration
   *
   * AWS: Glue database referenced as a DataZone data source
   *
   * Validation: Required; valid Glue database name
   */
  readonly databaseName: string;
}

export interface SagemakerProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * SSM parameter base name containing SageMaker domain configuration. Allows
   * all required domain config (domain ID, blueprint IDs, domain unit IDs) to be
   * pulled from SSM and APIs. If omitted, the full domainConfig object must be
   * provided instead.
   *
   * Use cases: Dynamic domain config resolution; Decoupled domain/project deployments
   *
   * AWS: SSM Parameter Store for SageMaker domain configuration
   *
   * Validation: Optional; valid SSM parameter name; mutually exclusive with domainConfig
   */
  readonly domainConfigSSMParam?: string;
  /**
   * Direct domain configuration object for SageMaker project setup. Use this
   * when SSM-based config resolution is not desired. Mutually exclusive with
   * domainConfigSSMParam.
   *
   * Use cases: Inline domain config; Testing; Single-stack deployments
   *
   * AWS: SageMaker (DataZone V2) domain configuration
   *
   * Validation: Optional; valid DomainConfig; mutually exclusive with domainConfigSSMParam
   */
  readonly domainConfig?: DomainConfig;

  /**
   * SageMaker projects to create in the domain. Each project references a
   * project profile and can include data sources and membership assignments.
   *
   * Use cases: Project deployment; Data source registration; Team membership
   *
   * AWS: DataZone projects with profile-based environment provisioning
   *
   * Validation: Optional; valid NamedSageMakerProjects
   */
  readonly projects?: NamedSageMakerProjects;
  /**
   * Project profiles defining environment blueprints and deployment configurations.
   * Profiles are reusable templates that determine which environments are provisioned
   * when a project is created.
   *
   * Use cases: Standardized project templates; Blueprint environment bundling
   *
   * AWS: DataZone project profiles with environment configurations
   *
   * Validation: Optional; valid NamedProjectProfiles
   */
  readonly projectProfiles?: NamedProjectProfiles;
  /**
   * Reusable environment templates that can be referenced by project profiles
   * via the environmentsTemplate property. Template environments are merged
   * with profile-specific environments.
   *
   * Use cases: Shared environment definitions; DRY profile configuration
   *
   * AWS: DataZone project profile environment templates
   *
   * Validation: Optional; map of template name to NamedProfileEnvironmentConfigs
   */
  readonly projectProfileEnvironmentsTemplates?: { [name: string]: NamedProfileEnvironmentConfigs };
}

export interface ProjectProfileProps {
  /**
   * Domain unit path within the DataZone domain where this project profile
   * is scoped. Uses slash-delimited paths (e.g., /root/team-a).
   *
   * Use cases: Profile scoping to organizational units; Governance boundary control
   *
   * AWS: DataZone domain unit for project profile scoping
   *
   * Validation: Optional; valid domain unit path string
   */
  readonly domainUnit?: string;
  /**
   * Named environment configurations for this profile. Each key is a blueprint
   * name that must exist in the domain's enabled blueprints. Merged with
   * environments from the referenced environmentsTemplate.
   *
   * Use cases: Profile-specific environment definitions; Blueprint parameter overrides
   *
   * AWS: DataZone project profile environment configurations
   *
   * Validation: Optional; valid NamedProfileEnvironmentConfigs
   */
  readonly environments?: NamedProfileEnvironmentConfigs;
  /**
   * Target AWS account ID for the profile's environments. Defaults to the
   * deploying stack's account if omitted.
   *
   * Use cases: Cross-account project profiles; Account-specific environment targeting
   *
   * AWS: Target account for DataZone environment provisioning
   *
   * Validation: Optional; valid 12-digit AWS account ID
   */
  readonly account?: string;
  /**
   * Target AWS region for the profile's environments. Defaults to the
   * deploying stack's region if omitted.
   *
   * Use cases: Cross-region project profiles; Region-specific environment targeting
   *
   * AWS: Target region for DataZone environment provisioning
   *
   * Validation: Optional; valid AWS region identifier
   */
  readonly region?: string;
  /**
   * Name of an environment template from projectProfileEnvironmentsTemplates.
   * Template environments are merged with this profile's environments, with
   * profile-level values taking precedence.
   *
   * Use cases: Reusable environment definitions; Template-based profile configuration
   *
   * AWS: DataZone project profile environment template reference
   *
   * Validation: Optional; must match a key in projectProfileEnvironmentsTemplates
   */
  readonly environmentsTemplate?: string;
}

export interface NamedProfileEnvironmentConfigs {
  /** @jsii ignore */
  readonly [name: string]: ProfileEnvironmentConfig;
}

export interface ParameterOverrideProps {
  /**
   * Whether this parameter can be edited by project creators. When false,
   * the value is locked to the profile-defined value.
   *
   * Use cases: Compliance-enforced parameters; Locked vs. flexible overrides
   *
   * AWS: DataZone project profile parameter editability
   *
   * Validation: Optional; boolean
   */
  readonly isEditable?: boolean;
  /**
   * Override value for this blueprint parameter.
   *
   * Use cases: Default parameter values; Compliance-enforced settings
   *
   * AWS: DataZone project profile parameter value
   *
   * Validation: Optional; string
   */
  readonly value?: string;
}

export interface ProfileEnvironmentConfig {
  /**
   * When the environment is deployed relative to project creation.
   * ON_CREATE deploys immediately; ON_DEMAND requires manual trigger.
   *
   * Use cases: Automatic vs. manual environment provisioning
   *
   * AWS: DataZone environment deployment mode
   *
   * Validation: Optional; 'ON_CREATE' | 'ON_DEMAND'
   */
  readonly deploymentMode?: 'ON_CREATE' | 'ON_DEMAND';
  /**
   * Numeric order for environment deployment. Lower numbers deploy first.
   * Tooling is always order 1, DataLake is always order 2.
   *
   * Use cases: Ordered environment provisioning; Dependency sequencing
   *
   * AWS: DataZone environment deployment order
   *
   * Validation: Optional; positive integer
   */
  readonly deploymentOrder?: number;
  /**
   * Blueprint parameter overrides for this environment configuration.
   * Supports per-parameter value and editability settings.
   *
   * Use cases: Blueprint-specific parameter customization; Compliance overrides
   *
   * AWS: DataZone project profile environment parameters
   *
   * Validation: Optional; object with overrides map of parameter name to ParameterOverrideProps
   *
   * @jsii ignore
   */
  readonly parameters?: { overrides: { [name: string]: ParameterOverrideProps } };
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
          refresh: true, //Ensures that newly added blueprints can be referenced
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

    // Merge template and profile environments, then separate reserved (Tooling/DataLake) from custom
    const allEnvs = { ...templateEnvs, ...profileProps.environments };
    const { Tooling: userTooling, DataLake: userDataLake, ...otherEnvs } = allEnvs;

    // Build environment configurations for custom (non-reserved) environments
    const envConfigs: CfnProjectProfile.EnvironmentConfigurationProperty[] = Object.entries(otherEnvs).map(
      ([envName, envProps]) => {
        const blueprintName = envName;
        const blueprintId = domainConfig.getBlueprintId(blueprintName);
        if (!blueprintId) {
          throw new Error(`Environment blueprint ${blueprintName} not found in enabledManagedBlueprints`);
        }

        const overrides = Object.entries(envProps.parameters?.overrides || {}).map(([paramName, paramProps]) => {
          return {
            ...paramProps,
            name: paramName,
          };
        });

        const configParameters: CfnProjectProfile.EnvironmentConfigurationParametersDetailsProperty = {
          ...envProps.parameters,
          parameterOverrides: [...overrides, ...getParamComplianceOverrides(blueprintName)],
        };
        const envConfig: CfnProjectProfile.EnvironmentConfigurationProperty = {
          awsRegion: { regionName: profileProps.region ?? this.region },
          awsAccount: {
            awsAccountId: profileProps.account ?? this.account,
          },
          configurationParameters: configParameters,
          name: envName,
          environmentBlueprintId: blueprintId,
          deploymentMode: envProps.deploymentMode,
          deploymentOrder: envProps.deploymentOrder,
        };
        return envConfig;
      },
    );

    // Merge user-supplied Tooling overrides with compliance overrides (compliance takes precedence)
    const toolingUserOverrides = Object.entries(userTooling?.parameters?.overrides || {}).map(
      ([paramName, paramProps]) => ({ ...paramProps, name: paramName }),
    );
    const toolingOverrides = [...toolingUserOverrides, ...getParamComplianceOverrides('Tooling')];

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
        parameterOverrides: toolingOverrides,
      },
    };

    // Merge user-supplied DataLake overrides with compliance overrides (compliance takes precedence)
    const datalakeUserOverrides = Object.entries(userDataLake?.parameters?.overrides || {}).map(
      ([paramName, paramProps]) => ({ ...paramProps, name: paramName }),
    );
    const datalakeOverrides = [...datalakeUserOverrides, ...getParamComplianceOverrides('DataLake')];

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
        parameterOverrides: datalakeOverrides,
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
