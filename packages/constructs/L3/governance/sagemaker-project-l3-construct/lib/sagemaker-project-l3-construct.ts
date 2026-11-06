/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DomainConfig,
  FormFieldProps,
  GlossaryTermProps,
  MdaaDatazoneFormType,
  MdaaDatazoneGlossary,
  MdaaDatazoneGlossaryTermRelations,
  MdaaDatazoneProjectProps,
  MdaaDatazoneS3Connection,
  MdaaDatazoneS3ConnectionProps,
  MdaaSageMakerProject,
  ProjectEnvironmentConfiguration,
} from '@aws-mdaa/datazone-constructs';
import { Annotations, CustomResource, Token } from 'aws-cdk-lib';

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
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
   * Exact DataZone project name, used verbatim and bypassing MDAA naming conventions.
   * Intended for the user-facing SMUS project title, which is a free-form label chosen
   * by the business and is not derivable from org/env/domain/module metadata. All other
   * resources created by the module keep MDAA naming.
   *
   * AWS: AWS::DataZone::Project Name
   *
   * Validation: Optional; 1-64 chars matching `^[\w -]+$` (spaces and mixed case
   * allowed); must be unique within the DataZone domain.
   */
  readonly nameOverride?: string;

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
   * Data sources to import into the project. Each entry is either a `databaseName`, which
   * imports a Glue database and grants the project's environment user Lake Formation read
   * permissions on it and its tables, or an `s3`, which creates a DataZone S3 connection and
   * grants the project's environment user role IAM read (list and get) on the registered
   * bucket and prefix.
   *
   * Use cases: Importing existing Glue databases into SageMaker projects; Onboarding raw S3
   * data lake locations into a SMUS project's data catalog; Data asset discovery
   *
   * AWS: DataZone data sources with Glue run configuration; DataZone connections with S3
   * properties (AWS::DataZone::Connection)
   *
   * Validation: Optional; map of data source name to DataSourceProps
   */
  readonly dataSources?: { [name: string]: DataSourceProps };

  /**
   * Default values for `publishOnImport`, `enableSetting`, `schedule`, `recommendation`,
   * `autoImportDataQualityResult`, and `filterExpressions`, inherited by every Glue
   * (`databaseName`) entry in `dataSources`. A data source that specifies one of these
   * fields itself overrides the default for that field entirely (fields are not
   * deep-merged). Has no effect on an `s3` data source, which has no equivalent
   * properties.
   *
   * Use cases: Consistent run schedule/publishing behavior across many data sources in a
   * producer project
   *
   * AWS: AWS::DataZone::DataSource (defaults applied per-data-source at synth time)
   *
   * Validation: Optional; DataSourceDefaultsProps
   *
   * @default - no defaults; each data source uses DataZone's own defaults for unset fields
   */
  readonly dataSourceDefaults?: DataSourceDefaultsProps;

  /**
   * Metadata form types to create, owned by this project. Each form is defined by
   * a set of fields; MDAA assembles the Smithy model (setting the namespace to the
   * domain ID and the structure name to the form name). Forms are usable across the
   * domain to attach standardized metadata to assets. The map key is used as the form's
   * stable identifier; renaming a key replaces that form type (create-then-delete).
   *
   * Use cases: Data governance metadata standards; Asset metadata enforcement; Searchable custom attributes
   *
   * AWS: DataZone metadata form types (AWS::DataZone::FormType) owned by the project
   *
   * Validation: Optional; map of form name to MetadataFormProps; form name must be a valid Smithy structure name
   */
  readonly metadataForms?: { [formName: string]: MetadataFormProps };

  /**
   * Business glossaries to create, owned by this project. A metadata form field's
   * `glossaryId` may reference a declared glossary here as `"<glossaryName>"`, or a
   * declared term as `"<glossaryName>.<termName>"`, which MDAA resolves to the
   * glossary's deploy-time ID and wires as a CDK dependency, or it may continue to
   * use a literal, pre-existing glossary ID string, unchanged. The map key is used
   * as the glossary's stable identifier; renaming a key replaces that glossary
   * (create-then-delete).
   *
   * Use cases: Business glossary/terminology as code; Linking standardized terms to metadata forms
   *
   * AWS: DataZone business glossaries and terms, owned by the project
   *
   * Validation: Optional; map of glossary name to GlossaryProps
   */
  readonly glossaries?: { [glossaryName: string]: GlossaryProps };
}

export interface GlossaryProps {
  /**
   * Terms to create under this glossary. The map key is used as the term's stable
   * identifier and is the name referenced by a form field's `glossaryId` as
   * `"<glossaryName>.<termName>"`.
   *
   * Use cases: Standardized business terminology; Terms linked to metadata form fields
   *
   * AWS: DataZone business glossary terms
   *
   * Validation: Optional; map of term name to GlossaryTermProps
   * @default - no terms are created
   */
  readonly terms?: { [termName: string]: GlossaryTermProps };
  /**
   * Human-readable description of the glossary.
   *
   * Use cases: Glossary documentation
   *
   * AWS: DataZone glossary description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Glossary status. DISABLED glossaries are retained but not attachable.
   *
   * Use cases: Staged glossary rollout; Temporarily retiring a glossary
   *
   * AWS: DataZone glossary status
   *
   * Validation: Optional; 'ENABLED' | 'DISABLED'
   * @default ENABLED
   */
  readonly status?: 'ENABLED' | 'DISABLED';
}

export interface MetadataFormProps {
  /**
   * Field definitions for the form. Each entry becomes a member of the generated
   * Smithy structure; declaration order is preserved.
   *
   * Use cases: Custom metadata attributes; Required governance fields; Searchable attributes
   *
   * AWS: Smithy structure members in a DataZone form type model
   *
   * Validation: Required; non-empty map of field name to FormFieldProps
   */
  readonly fields: { [fieldName: string]: FormFieldProps };
  /**
   * Human-readable description of the form type.
   *
   * Use cases: Form documentation; Governance context
   *
   * AWS: DataZone form type description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Form type status. DISABLED form types are retained but not attachable.
   *
   * Use cases: Staged form rollout; Temporarily retiring a form
   *
   * AWS: DataZone form type status
   *
   * Validation: Optional; 'ENABLED' | 'DISABLED'
   * @default ENABLED
   */
  readonly status?: 'ENABLED' | 'DISABLED';
}

/**
 * Glue-run configuration shared between a project's `dataSourceDefaults` and an
 * individual data source. Any field specified on a data source entirely replaces the
 * corresponding default (fields are not deep-merged); fields omitted on the data source
 * fall back to the default, if any. There is no way to omit an inherited `schedule`
 * other than setting the data source's own `enableSetting` to `DISABLED`, which disables
 * the whole data source rather than just the schedule.
 */
export interface DataSourceDefaultsProps {
  /**
   * Whether assets imported by the data source are automatically published to the
   * project's catalog. When false, imported assets remain in the project inventory
   * and must be published by hand.
   *
   * Use cases: Publish-and-subscribe data mesh models; Automated asset catalog population
   *
   * AWS: AWS::DataZone::DataSource PublishOnImport
   *
   * Validation: Optional; boolean
   *
   * @default false (DataZone default; assets are not auto-published)
   */
  readonly publishOnImport?: boolean;

  /**
   * Whether the data source is enabled to run.
   *
   * AWS: AWS::DataZone::DataSource EnableSetting
   *
   * Validation: Optional; 'ENABLED' | 'DISABLED'
   *
   * @default ENABLED (DataZone default)
   */
  readonly enableSetting?: 'ENABLED' | 'DISABLED';

  /**
   * Schedule on which the data source runs automatically. When omitted, the data source
   * never runs on its own and must be run manually or via another trigger.
   *
   * Use cases: Automated, recurring metadata import
   *
   * AWS: AWS::DataZone::DataSource Schedule (AWS::DataZone::DataSource ScheduleConfiguration)
   *
   * Validation: Optional; DataSourceScheduleProps
   *
   * @default - data source does not run on a schedule
   */
  readonly schedule?: DataSourceScheduleProps;

  /**
   * Business name generation recommendation configuration for assets this data source
   * imports.
   *
   * AWS: AWS::DataZone::DataSource Recommendation (AWS::DataZone::DataSource RecommendationConfiguration)
   *
   * Validation: Optional; DataSourceRecommendationProps
   *
   * @default - business name generation is not enabled
   */
  readonly recommendation?: DataSourceRecommendationProps;

  /**
   * Whether to automatically import AWS Glue Data Quality results as part of the data
   * source run.
   *
   * AWS: AWS::DataZone::DataSource Configuration.GlueRunConfiguration.AutoImportDataQualityResult
   *
   * Validation: Optional; boolean
   *
   * @default true
   */
  readonly autoImportDataQualityResult?: boolean;

  /**
   * Filter expressions limiting which tables in the Glue database are imported. When
   * omitted, every table in the database is imported.
   *
   * Use cases: Importing a subset of tables from a large shared database
   *
   * AWS: AWS::DataZone::DataSource Configuration.GlueRunConfiguration.RelationalFilterConfigurations[].FilterExpressions
   *
   * Validation: Optional; array of DataSourceFilterExpressionProps
   *
   * @default - every table in the database is imported
   */
  readonly filterExpressions?: DataSourceFilterExpressionProps[];
}

/**
 * Valid `AWS::DataZone::DataSource` `ScheduleConfiguration.Timezone` values, per
 * https://docs.aws.amazon.com/datazone/latest/APIReference/API_ScheduleConfiguration.html.
 */
export type DataZoneScheduleTimezone =
  | 'UTC'
  | 'AFRICA_JOHANNESBURG'
  | 'AMERICA_MONTREAL'
  | 'AMERICA_SAO_PAULO'
  | 'ASIA_BAHRAIN'
  | 'ASIA_BANGKOK'
  | 'ASIA_CALCUTTA'
  | 'ASIA_DUBAI'
  | 'ASIA_HONG_KONG'
  | 'ASIA_JAKARTA'
  | 'ASIA_KUALA_LUMPUR'
  | 'ASIA_SEOUL'
  | 'ASIA_SHANGHAI'
  | 'ASIA_SINGAPORE'
  | 'ASIA_TAIPEI'
  | 'ASIA_TOKYO'
  | 'AUSTRALIA_MELBOURNE'
  | 'AUSTRALIA_SYDNEY'
  | 'CANADA_CENTRAL'
  | 'CET'
  | 'CST6CDT'
  | 'ETC_GMT'
  | 'ETC_GMT0'
  | 'ETC_GMT_ADD_0'
  | 'ETC_GMT_ADD_1'
  | 'ETC_GMT_ADD_10'
  | 'ETC_GMT_ADD_11'
  | 'ETC_GMT_ADD_12'
  | 'ETC_GMT_ADD_2'
  | 'ETC_GMT_ADD_3'
  | 'ETC_GMT_ADD_4'
  | 'ETC_GMT_ADD_5'
  | 'ETC_GMT_ADD_6'
  | 'ETC_GMT_ADD_7'
  | 'ETC_GMT_ADD_8'
  | 'ETC_GMT_ADD_9'
  | 'ETC_GMT_NEG_0'
  | 'ETC_GMT_NEG_1'
  | 'ETC_GMT_NEG_10'
  | 'ETC_GMT_NEG_11'
  | 'ETC_GMT_NEG_12'
  | 'ETC_GMT_NEG_13'
  | 'ETC_GMT_NEG_14'
  | 'ETC_GMT_NEG_2'
  | 'ETC_GMT_NEG_3'
  | 'ETC_GMT_NEG_4'
  | 'ETC_GMT_NEG_5'
  | 'ETC_GMT_NEG_6'
  | 'ETC_GMT_NEG_7'
  | 'ETC_GMT_NEG_8'
  | 'ETC_GMT_NEG_9'
  | 'EUROPE_DUBLIN'
  | 'EUROPE_LONDON'
  | 'EUROPE_PARIS'
  | 'EUROPE_STOCKHOLM'
  | 'EUROPE_ZURICH'
  | 'ISRAEL'
  | 'MEXICO_GENERAL'
  | 'MST7MDT'
  | 'PACIFIC_AUCKLAND'
  | 'US_CENTRAL'
  | 'US_EASTERN'
  | 'US_MOUNTAIN'
  | 'US_PACIFIC';

export interface DataSourceScheduleProps {
  /**
   * Cron expression for the data source run schedule, e.g. `cron(0 6 * * ? *)`. DataZone's
   * cron grammar only accepts a single value in the minute and hour fields (no lists,
   * ranges, or step values, e.g. an every-6-hours step); such expressions pass synth
   * but fail at deploy.
   *
   * AWS: AWS::DataZone::DataSource ScheduleConfiguration.Schedule
   *
   * Validation: Required; valid DataZone cron expression with single-value minute/hour fields
   */
  readonly schedule: string;
  /**
   * Timezone the schedule is evaluated in, e.g. `UTC`, `US_EASTERN`.
   *
   * AWS: AWS::DataZone::DataSource ScheduleConfiguration.Timezone
   *
   * Validation: Optional; valid DataZone Timezone enum value
   *
   * @default UTC (DataZone default)
   */
  readonly timezone?: DataZoneScheduleTimezone;
}

export interface DataSourceRecommendationProps {
  /**
   * Whether automatic business name generation is enabled for assets this data source
   * imports.
   *
   * AWS: AWS::DataZone::DataSource RecommendationConfiguration.EnableBusinessNameGeneration
   *
   * Validation: Optional; boolean
   *
   * @default false (DataZone default)
   */
  readonly enableBusinessNameGeneration?: boolean;
}

/**
 * A filter expression controls only which tables the data source imports into the
 * catalog; it is not an access boundary. The project's environment user is still granted
 * Lake Formation read permissions on every table in the database (see `createDataSource`),
 * so an `EXCLUDE`d table remains queryable and should not be relied on to hide sensitive data.
 */
export interface DataSourceFilterExpressionProps {
  /**
   * The filter expression, e.g. a glob pattern matching table names.
   *
   * AWS: AWS::DataZone::DataSource FilterExpression.Expression
   *
   * Validation: Required; 1-2048 chars
   *
   * @minLength 1
   * @maxLength 2048
   */
  readonly expression: string;
  /**
   * Whether the expression includes or excludes matching tables.
   *
   * AWS: AWS::DataZone::DataSource FilterExpression.Type
   *
   * Validation: Required; 'INCLUDE' | 'EXCLUDE'
   */
  readonly type: 'INCLUDE' | 'EXCLUDE';
}

export interface DataSourceMetadataFormProps {
  /**
   * JSON-encoded field values to pre-populate on this form when attached to each asset
   * the data source imports. Must conform to the referenced form type's field schema:
   * every field the form declares `required: true` must be present, and every key must
   * match a field the form declares. Validated at synth time.
   *
   * AWS: AWS::DataZone::DataSource FormInput.Content
   *
   * Validation: Optional; JSON string, max 75000 chars; required if the referenced form
   * declares any required fields; keys must match the form's declared fields
   *
   * @maxLength 75000
   * @default - form is attached with no pre-populated content (only valid if the referenced form declares no required fields)
   */
  readonly content?: string;
}

/**
 * A project data source: either a Glue database or a raw S3 location, plus optional
 * run/publish behavior. Exactly one of `databaseName` or `s3` is required; this is
 * enforced at synth time (not via the JSON schema, since the mutually-exclusive pair
 * sits alongside other, non-exclusive optional fields here). The inherited
 * `DataSourceDefaultsProps` fields (and `metadataForms`) only apply to `databaseName`
 * entries; setting any of them directly on an `s3` entry is a synth-time error, since
 * an `AWS::DataZone::Connection` has no equivalent properties. Values an `s3` entry
 * inherits from the project's `dataSourceDefaults` are silently not applied instead,
 * since a project-level default is not a misconfiguration of the entry itself.
 */
export interface DataSourceProps extends DataSourceDefaultsProps {
  /**
   * Glue database name to use as the data source. The project's environment user
   * will be granted Lake Formation read permissions on this database and its tables.
   * Mutually exclusive with `s3`.
   *
   * Use cases: Glue database import; Data asset registration
   *
   * AWS: Glue database referenced as a DataZone data source
   *
   * Validation: Exactly one of databaseName or s3 is required; valid Glue database name
   */
  readonly databaseName?: string;

  /**
   * S3 location to register as a data source. Mutually exclusive with `databaseName`.
   *
   * Use cases: Onboarding raw S3 data lake locations into a SMUS project's data catalog
   *
   * AWS: DataZone connection with S3 properties (AWS::DataZone::Connection)
   *
   * Validation: Exactly one of databaseName or s3 is required
   */
  readonly s3?: S3DataSourceProps;

  /**
   * Metadata forms, declared under this project's `metadataForms`, to attach to every
   * asset this data source imports. Map key must match a key declared under
   * `metadataForms`, must reference an `ENABLED` form, and `content` must satisfy that
   * form's required fields; only applies to Glue database data sources (a synth-time
   * error on an `s3` entry).
   *
   * Use cases: Pre-populating governance metadata on imported assets
   *
   * AWS: AWS::DataZone::DataSource AssetFormsInput
   *
   * Validation: Optional; map of declared metadataForms key to DataSourceMetadataFormProps;
   * max 10 entries; each key must exist in this project's metadataForms
   *
   * @maxProperties 10
   * @default - no metadata forms are attached
   */
  readonly metadataForms?: { [formName: string]: DataSourceMetadataFormProps };
}

export interface S3DataSourceProps {
  /**
   * Name of the S3 bucket to register as the data source. Accepts a literal bucket name or
   * an MDAA `ssm-org:`/`ssm-domain:` reference to a bucket created by another module
   * (e.g. `ssm-org:/shared/datalake/bucket/research/name`).
   *
   * AWS: AWS::DataZone::Connection S3Properties.S3Uri (bucket component)
   *
   * Validation: Required; valid S3 bucket name, or an `ssm-org:`/`ssm-domain:` reference
   */
  readonly bucketName: string;
  /**
   * Key prefix within the bucket to register, e.g. `raw/`. When omitted, registers the whole
   * bucket and grants the project's environment user role IAM read over the whole bucket
   * rather than a scoped prefix.
   *
   * AWS: AWS::DataZone::Connection S3Properties.S3Uri (prefix component)
   *
   * Validation: Optional; S3 key prefix
   *
   * @default ''
   */
  readonly prefix?: string;
  /**
   * Whether to register an S3 Access Grants location for the connection.
   *
   * AWS: AWS::DataZone::Connection S3Properties.RegisterS3AccessGrantLocation
   *
   * Validation: Optional; boolean
   */
  readonly registerS3AccessGrantLocation?: boolean;
  /**
   * S3 Access Grants location ID to associate with the connection.
   *
   * AWS: AWS::DataZone::Connection S3Properties.S3AccessGrantLocationId
   *
   * Validation: Optional; valid S3 Access Grants location ID
   */
  readonly s3AccessGrantLocationId?: string;
}

/**
 * A project's declared `metadataForms` entry: the construct created for it (for the
 * synth-time-unresolved form type revision) alongside the config it was declared with
 * (for `status`/`fields`, which are only known from config, not from the construct).
 */
interface DeclaredMetadataForm {
  readonly formType: MdaaDatazoneFormType;
  readonly props: MetadataFormProps;
}

/** Internal, non-jsii-exported options for `createDataSource`. */
interface CreateDataSourceOptions {
  readonly projectName: string;
  readonly project: MdaaSageMakerProject;
  readonly dataSourceName: string;
  readonly dataSourceProps: DataSourceProps;
  readonly dataSourceDefaults: DataSourceDefaultsProps | undefined;
  readonly declaredMetadataForms: { [formName: string]: DeclaredMetadataForm };
}

/** Internal, non-jsii-exported options for `resolveDataSourceMetadataForms`. */
interface ResolveDataSourceMetadataFormsOptions {
  readonly projectName: string;
  readonly dataSourceName: string;
  readonly formRefs: { [formName: string]: DataSourceMetadataFormProps } | undefined;
  readonly declaredForms: { [formName: string]: DeclaredMetadataForm };
}

/** A term declared under some project glossary, keyed `"<glossaryName>.<termName>"`. */
interface DeclaredTerm {
  readonly glossaryName: string;
  readonly termName: string;
  readonly termProps: GlossaryTermProps;
}

/** A resolved `relatesTo` entry: either another declared term, or a literal term ID. */
type ResolvedEdge = { readonly targetKey: string } | { readonly literalId: string };

/** Internal, non-jsii-exported context shared by the `relatesTo` resolution helpers. */
interface RelatesToContext {
  readonly projectName: string;
  readonly glossaries: { [glossaryName: string]: GlossaryProps };
  readonly declaredTerms: Map<string, DeclaredTerm>;
  readonly glossaryKeyOwners: Map<string, string>;
}

/**
 * Data source fields that only apply to a Glue (`databaseName`) data source. An
 * `AWS::DataZone::Connection` (the `s3` entry's resource) has no equivalent properties.
 */
const GLUE_ONLY_DATASOURCE_FIELDS: ReadonlyArray<keyof DataSourceProps> = [
  'publishOnImport',
  'enableSetting',
  'schedule',
  'recommendation',
  'autoImportDataQualityResult',
  'filterExpressions',
  'metadataForms',
];

/**
 * Per-field merge of a data source's run/publish options against the project's
 * `dataSourceDefaults`. A plain object spread (`{ ...defaults, ...overrides }`) is not
 * used because a key present on `overrides` but explicitly `undefined` — which only a
 * programmatic (non-YAML) caller can produce, since the JSON schema rejects
 * null/undefined — would wipe a set default; `??` instead falls back to the default for
 * any field the data source leaves `undefined`. Object/array fields (`schedule`,
 * `recommendation`, `filterExpressions`) are still not deep-merged: a value present on
 * `overrides` fully replaces the matching default.
 */
export function resolveDataSourceDefaults(
  defaults: DataSourceDefaultsProps | undefined,
  overrides: DataSourceDefaultsProps,
): DataSourceDefaultsProps {
  return {
    publishOnImport: overrides.publishOnImport ?? defaults?.publishOnImport,
    enableSetting: overrides.enableSetting ?? defaults?.enableSetting,
    schedule: overrides.schedule ?? defaults?.schedule,
    recommendation: overrides.recommendation ?? defaults?.recommendation,
    autoImportDataQualityResult: overrides.autoImportDataQualityResult ?? defaults?.autoImportDataQualityResult,
    filterExpressions: overrides.filterExpressions ?? defaults?.filterExpressions,
  };
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
  // DataZone's AWS::DataZone::DataSource AssetFormsInput accepts at most 10 entries.
  private static readonly MAX_METADATA_FORMS_PER_DATASOURCE = 10;

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
        name: this.props.naming
          .withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE)
          .resourceName(`project-profiles-config-ssm`),
        resourceArns: projectProfilesConfigParams,
        principals: projectProfileAccounts,
      };
      new CfnResourceShare(scope, `profiles-config-ram-share`, configParamRamShareProps);
    }

    const glossaryKeyOwners = this.collectGlossaryKeyOwners(props.projects);
    this.projects = this.createProjects(domainConfig, projectProfilesConfig, glossaryKeyOwners);
  }

  /**
   * Collects the project owning each declared glossary key across all projects, throwing at
   * synth if two projects declare the same key: glossary names are unique per domain, and a
   * `glossaryId` reference only resolves within its declaring project, so a reused key would
   * create two same-named glossaries and an ambiguous reference.
   */
  private collectGlossaryKeyOwners(
    projects: { [projectName: string]: SageMakerProjectProps } | undefined,
  ): Map<string, string> {
    const owners = new Map<string, string>();
    const duplicates: string[] = [];
    Object.entries(projects || {}).forEach(([projectName, projectProps]) => {
      Object.keys(projectProps.glossaries || {}).forEach(glossaryKey => {
        const existingOwner = owners.get(glossaryKey);
        if (existingOwner) {
          duplicates.push(`'${glossaryKey}' (declared by both '${existingOwner}' and '${projectName}')`);
        } else {
          owners.set(glossaryKey, projectName);
        }
      });
    });
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate glossary key(s) declared across projects: ${duplicates.join(', ')}. Glossary names ` +
          'must be unique within a domain, and a glossaryId reference only resolves within its ' +
          'declaring project, so reusing a key across projects would create two same-named glossaries ' +
          'and an ambiguous reference.',
      );
    }
    return owners;
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
    glossaryKeyOwners: Map<string, string>,
  ): { [name: string]: MdaaSageMakerProject } {
    return Object.fromEntries(
      Object.entries(this.props.projects || {}).map(([projectName, projectProps]) => {
        const projectAndDataSources = this.createSageMakerProject(
          this,
          projectName,
          projectProps,
          domainConfig,
          projectProfilesConfig,
          glossaryKeyOwners,
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
    glossaryKeyOwners: Map<string, string>,
  ): MdaaSageMakerProject {
    const projectProfileId = projectProfilesConfig.getProjectProfileId(projectProps.profileName);

    const constructProps: MdaaDatazoneProjectProps = {
      name: projectName,
      nameOverride: projectProps.nameOverride,
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

    const createdGlossaries = Object.fromEntries(
      Object.entries(projectProps.glossaries || {}).map(([glossaryName, glossaryProps]) => {
        return [glossaryName, this.createGlossary(project, glossaryName, glossaryProps)];
      }),
    );
    // Resolved after every glossary/term in the project exists, since a term's relatesTo may
    // reference a term in a different (sibling) glossary.
    this.createTermRelations(project, createdGlossaries, {
      projectName,
      glossaries: projectProps.glossaries || {},
      declaredTerms: SagemakerProjectL3Construct.buildDeclaredTerms(projectProps.glossaries || {}),
      glossaryKeyOwners,
    });

    // Created before dataSources, since a data source's metadataForms reference these by name.
    const createdMetadataForms: { [formName: string]: DeclaredMetadataForm } = Object.fromEntries(
      Object.entries(projectProps.metadataForms || {}).map(([formName, formProps]) => {
        const formType = this.createMetadataForm(
          project,
          projectName,
          formName,
          formProps,
          createdGlossaries,
          glossaryKeyOwners,
        );
        return [formName, { formType, props: formProps }];
      }),
    );

    const createdDataSources = Object.entries(projectProps.dataSources || {}).map(
      ([dataSourceName, dataSourceProps]) => {
        return this.createDataSource({
          projectName,
          project,
          dataSourceName,
          dataSourceProps,
          dataSourceDefaults: projectProps.dataSourceDefaults,
          declaredMetadataForms: createdMetadataForms,
        });
      },
    );
    console.debug(`Created ${createdDataSources.length} datasources`);

    return project;
  }

  private createGlossary(
    project: MdaaSageMakerProject,
    glossaryName: string,
    glossaryProps: GlossaryProps,
  ): MdaaDatazoneGlossary {
    // Created via the domain custom-resource role, so wait for its PROJECT_OWNER membership. The map
    // key is the construct ID, so renaming a glossary key replaces the glossary.
    const glossary = new MdaaDatazoneGlossary(project, `glossary-${glossaryName}`, {
      naming: this.props.naming,
      domainIdentifier: project.project.attrDomainId,
      owningProjectIdentifier: project.project.attrId,
      glossaryName: glossaryName,
      terms: glossaryProps.terms || {},
      description: glossaryProps.description,
      status: glossaryProps.status,
      handlerRole: project.customResourceRole,
    });
    glossary.node.addDependency(project.crRoleProjectMembership);
    return glossary;
  }

  /** Flattens every declared term across a project's glossaries, keyed `"<glossaryName>.<termName>"`. */
  private static buildDeclaredTerms(glossaries: { [glossaryName: string]: GlossaryProps }): Map<string, DeclaredTerm> {
    const declaredTerms = new Map<string, DeclaredTerm>();
    Object.entries(glossaries).forEach(([glossaryName, glossaryProps]) => {
      Object.entries(glossaryProps.terms || {}).forEach(([termName, termProps]) => {
        declaredTerms.set(`${glossaryName}.${termName}`, { glossaryName, termName, termProps });
      });
    });
    return declaredTerms;
  }

  /** De-duplicates resolved `relatesTo` edges, preserving first-occurrence order. */
  private static dedupeEdges(edges: ResolvedEdge[]): ResolvedEdge[] {
    const seen = new Set<string>();
    return edges.filter(edge => {
      const key = 'targetKey' in edge ? `target:${edge.targetKey}` : `literal:${edge.literalId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Resolves every declared term's `relatesTo` entries (bare `"<termName>"` for the same
   * glossary, `"<glossaryName>.<termName>"` for another glossary in this project, or a
   * literal pre-existing term ID otherwise - same convention as `resolveFieldGlossaryId`)
   * and wires one `MdaaDatazoneGlossaryTermRelations` per term that declares at least one,
   * depending on that term and every term it relates to so DataZone always sees the related
   * term(s) already exist.
   */
  private createTermRelations(
    project: MdaaSageMakerProject,
    createdGlossaries: { [glossaryName: string]: MdaaDatazoneGlossary },
    context: RelatesToContext,
  ): void {
    const { declaredTerms } = context;

    const edgesByTerm = new Map<string, ResolvedEdge[]>();
    declaredTerms.forEach((declared, sourceKey) => {
      const relatesTo = declared.termProps.relatesTo ?? [];
      const edges = relatesTo.map(ref => this.resolveRelatesToEntry(context, sourceKey, ref));
      edgesByTerm.set(sourceKey, SagemakerProjectL3Construct.dedupeEdges(edges));
    });

    this.detectRelatesToCycles(context.projectName, edgesByTerm);
    this.rejectExcessHasTypes(context.projectName, edgesByTerm);

    edgesByTerm.forEach((edges, sourceKey) => {
      if (edges.length === 0) {
        return;
      }
      // sourceKey is always a declaredTerms key: edgesByTerm was built from exactly those keys.
      const declared = declaredTerms.get(sourceKey) as DeclaredTerm;
      const sourceTerm = createdGlossaries[declared.glossaryName].terms[declared.termName];
      const relatedTermIds = edges.map(edge =>
        'literalId' in edge
          ? edge.literalId
          : this.termFor(createdGlossaries, declaredTerms, edge.targetKey).getAttString('termId'),
      );
      const relations = new MdaaDatazoneGlossaryTermRelations(project, `term-relations-${sourceKey}`, {
        naming: this.props.naming,
        domainIdentifier: project.project.attrDomainId,
        termId: sourceTerm.getAttString('termId'),
        relatedTermIds: relatedTermIds,
        handlerRole: project.customResourceRole,
      });
      relations.node.addDependency(sourceTerm);
      edges.forEach(edge => {
        if ('targetKey' in edge) {
          relations.node.addDependency(this.termFor(createdGlossaries, declaredTerms, edge.targetKey));
        }
      });
    });
  }

  private termFor(
    createdGlossaries: { [glossaryName: string]: MdaaDatazoneGlossary },
    declaredTerms: Map<string, DeclaredTerm>,
    key: string,
  ): CustomResource {
    const declared = declaredTerms.get(key);
    if (!declared) {
      throw new Error(`Internal error: term key '${key}' not found in declaredTerms`);
    }
    return createdGlossaries[declared.glossaryName].terms[declared.termName];
  }

  private resolveRelatesToEntry(context: RelatesToContext, sourceKey: string, ref: string): ResolvedEdge {
    const { projectName, glossaries, declaredTerms, glossaryKeyOwners } = context;
    // sourceKey is always a declaredTerms key: the only caller iterates declaredTerms itself.
    const declared = declaredTerms.get(sourceKey) as DeclaredTerm;

    const dotIndex = ref.indexOf('.');
    if (dotIndex === -1) {
      const candidateKey = `${declared.glossaryName}.${ref}`;
      if (declaredTerms.has(candidateKey)) {
        return { targetKey: candidateKey };
      }
      // A term of this name declared under a sibling glossary is almost always the fix for a
      // missing glossary-name prefix, so suggest it by name instead of a generic typo nudge.
      const siblingMatch = Array.from(declaredTerms.keys()).find(
        key => key !== candidateKey && key.endsWith(`.${ref}`),
      );
      Annotations.of(this).addWarning(
        `relatesTo '${ref}' on term '${sourceKey}' in project '${projectName}' does not match any term ` +
          'declared in this glossary.' +
          (siblingMatch
            ? ` Did you mean '${siblingMatch}'?`
            : ' If this is meant to reference one of them, check for a typo;') +
          ' Otherwise it is treated as a literal, pre-existing term ID.',
      );
      return { literalId: ref };
    }

    if (declaredTerms.has(ref)) {
      return { targetKey: ref };
    }
    const refGlossaryName = ref.slice(0, dotIndex);
    if (Object.prototype.hasOwnProperty.call(glossaries, refGlossaryName)) {
      throw new Error(
        `relatesTo '${ref}' on term '${sourceKey}' in project '${projectName}' references an undeclared ` +
          `term. Declare it under glossaries.${refGlossaryName}.terms, or use a literal, pre-existing ` +
          'term ID (which may not contain a period).',
      );
    }
    // DataZone term IDs never contain a period, so a dotted value whose glossary segment
    // isn't declared (in this or another project) can never be a valid literal term ID
    // either - unlike a bare entry, there's no literal-ID interpretation to fall back to.
    const otherOwner = glossaryKeyOwners.get(refGlossaryName);
    if (otherOwner && otherOwner !== projectName) {
      throw new Error(
        `relatesTo '${ref}' on term '${sourceKey}' in project '${projectName}' references a glossary ` +
          `declared by project '${otherOwner}'. A relatesTo reference only resolves within its declaring ` +
          `project; declare '${refGlossaryName}' under this project's glossaries, or use a literal, ` +
          'pre-existing term ID (which may not contain a period).',
      );
    }
    throw new Error(
      `relatesTo '${ref}' on term '${sourceKey}' in project '${projectName}' does not match any glossary ` +
        "declared under this project's glossaries, and DataZone term IDs may not contain a period. " +
        `Declare '${refGlossaryName}' under this project's glossaries, or use a literal, pre-existing term ` +
        'ID without a period.',
    );
  }

  private detectRelatesToCycles(projectName: string, edgesByTerm: Map<string, ResolvedEdge[]>): void {
    const graph = new Map<string, string[]>();
    edgesByTerm.forEach((edges, sourceKey) => {
      graph.set(
        sourceKey,
        edges.filter((e): e is { targetKey: string } => 'targetKey' in e).map(e => e.targetKey),
      );
    });

    const state = new Map<string, 'visiting' | 'done'>();
    const stack: string[] = [];

    const visit = (node: string): void => {
      if (state.get(node) === 'done') {
        return;
      }
      if (state.get(node) === 'visiting') {
        const cycleStart = stack.indexOf(node);
        const cycle = [...stack.slice(cycleStart), node];
        throw new Error(
          `Circular relatesTo reference in project '${projectName}': ${cycle.join(' -> ')}. A term cannot ` +
            "be both directly and indirectly 'a type of' itself; break the cycle in the glossary config.",
        );
      }
      state.set(node, 'visiting');
      stack.push(node);
      // Every targetKey is a declaredTerms key, and graph has an entry for every one of those.
      (graph.get(node) as string[]).forEach(visit);
      stack.pop();
      state.set(node, 'done');
    };

    Array.from(graph.keys()).forEach(visit);
  }

  /**
   * DataZone caps a term's `isA` at `MdaaDatazoneGlossary.MAX_RELATES_TO`, but relationships
   * are bidirectional (SageMaker Unified Studio shows the inverse "Has Types" automatically),
   * so the same cap applies to how many *other* declared terms may name one term in their own
   * `relatesTo`. A literal, pre-existing term ID target can't be counted here (it isn't a
   * declared term), so this only catches the declared-term case.
   */
  private rejectExcessHasTypes(projectName: string, edgesByTerm: Map<string, ResolvedEdge[]>): void {
    const sourcesByTarget = new Map<string, Set<string>>();
    edgesByTerm.forEach((edges, sourceKey) => {
      edges.forEach(edge => {
        if ('targetKey' in edge) {
          const sources = sourcesByTarget.get(edge.targetKey) ?? new Set<string>();
          sourcesByTarget.set(edge.targetKey, sources.add(sourceKey));
        }
      });
    });
    sourcesByTarget.forEach((sources, targetKey) => {
      if (sources.size > MdaaDatazoneGlossary.MAX_RELATES_TO) {
        throw new Error(
          `Term '${targetKey}' in project '${projectName}' is named in the relatesTo of ${sources.size} terms; ` +
            `DataZone allows at most ${MdaaDatazoneGlossary.MAX_RELATES_TO} "Has Types" relationships per term.`,
        );
      }
    });
  }

  private createMetadataForm(
    project: MdaaSageMakerProject,
    projectName: string,
    formName: string,
    formProps: MetadataFormProps,
    glossaries: { [glossaryName: string]: MdaaDatazoneGlossary },
    glossaryKeyOwners: Map<string, string>,
  ): MdaaDatazoneFormType {
    const termDependencies: CustomResource[] = [];
    const fields = Object.fromEntries(
      Object.entries(formProps.fields).map(([fieldName, fieldProps]) => {
        const { fieldProps: resolvedFieldProps, termDependency } = this.resolveFieldGlossaryId(
          projectName,
          formName,
          fieldName,
          fieldProps,
          glossaries,
          glossaryKeyOwners,
        );
        if (termDependency) {
          termDependencies.push(termDependency);
        }
        return [fieldName, resolvedFieldProps];
      }),
    );

    // Created via the domain custom-resource role, so wait for its PROJECT_OWNER membership. The map
    // key is the construct ID, so renaming a form key replaces the form type.
    const form = new MdaaDatazoneFormType(project, `form-${formName}`, {
      naming: this.props.naming,
      domainIdentifier: project.project.attrDomainId,
      owningProjectIdentifier: project.project.attrId,
      formName: formName,
      fields: fields,
      description: formProps.description,
      status: formProps.status,
      handlerRole: project.customResourceRole,
    });
    form.node.addDependency(project.crRoleProjectMembership);
    // Any field referencing a declared glossary term must wait for that term to exist, since
    // CreateFormType embeds the glossary's deploy-time-resolved ID in the Smithy model it
    // submits, and the named term is required to exist for that reference to be valid.
    termDependencies.forEach(term => form.node.addDependency(term));
    return form;
  }

  /**
   * Resolves a field's `glossaryId` when it references a declared glossary as
   * `"<glossaryName>"`, or a declared glossary term as `"<glossaryName>.<termName>"`, to
   * that glossary's deploy-time ID. DataZone's `@amazon.datazone#glossaryterm("<id>")`
   * trait takes the glossary's ID (the field accepts any term from that glossary as its
   * value), not a specific term's ID. When a term name is given, that term is still
   * required to exist and is depended on, so the field isn't usable before it's created.
   * A plain ID matching no declared glossary (no literal '.', which DataZone IDs never
   * contain, and which declared glossary/term names may not contain either, enforced by
   * `MdaaDatazoneGlossary.validate`) is passed through unchanged, for backward compatibility
   * with pre-existing, manually-created glossaries - unless it matches a key declared by a
   * *different* project, which is rejected: a glossaryId reference only resolves within its
   * declaring project, so that would otherwise silently fall through as if it were a literal,
   * pre-existing ID.
   */
  private resolveFieldGlossaryId(
    projectName: string,
    formName: string,
    fieldName: string,
    fieldProps: FormFieldProps,
    glossaries: { [glossaryName: string]: MdaaDatazoneGlossary },
    glossaryKeyOwners: Map<string, string>,
  ): { fieldProps: FormFieldProps; termDependency?: CustomResource } {
    const glossaryId = fieldProps.glossaryId;
    if (glossaryId === undefined) {
      return { fieldProps };
    }

    const dotIndex = glossaryId.indexOf('.');
    if (dotIndex === -1) {
      if (!Object.prototype.hasOwnProperty.call(glossaries, glossaryId)) {
        const otherOwner = glossaryKeyOwners.get(glossaryId);
        if (otherOwner && otherOwner !== projectName) {
          throw new Error(
            `glossaryId '${glossaryId}' on field '${formName}.${fieldName}' in project '${projectName}' ` +
              `references a glossary declared by project '${otherOwner}'. A glossaryId reference only ` +
              `resolves within its declaring project; declare '${glossaryId}' under this project's ` +
              'glossaries, or use a literal, pre-existing glossary ID (which may not contain a period).',
          );
        }
        if (Object.keys(glossaries).length > 0) {
          // This project declares glossaries, but this bare value matches none of them (and
          // none declared elsewhere): likely a typo, though it could also be a literal,
          // pre-existing glossary ID, so warn instead of failing synth.
          Annotations.of(this).addWarning(
            `glossaryId '${glossaryId}' on field '${formName}.${fieldName}' in project '${projectName}' ` +
              "does not match any glossary declared under this project's glossaries. If this is meant to " +
              'reference one of them, check for a typo; otherwise it is treated as a literal, ' +
              'pre-existing glossary ID.',
          );
        }
        // A literal, pre-existing glossary ID; nothing declared to resolve or depend on.
        return { fieldProps };
      }
      return {
        fieldProps: { ...fieldProps, glossaryId: glossaries[glossaryId].glossary.getAttString('glossaryId') },
      };
    }

    const glossaryName = glossaryId.slice(0, dotIndex);
    const termName = glossaryId.slice(dotIndex + 1);
    const glossary = Object.prototype.hasOwnProperty.call(glossaries, glossaryName)
      ? glossaries[glossaryName]
      : undefined;
    const term =
      glossary && Object.prototype.hasOwnProperty.call(glossary.terms, termName) ? glossary.terms[termName] : undefined;
    if (!glossary || !term) {
      throw new Error(
        `glossaryId '${glossaryId}' on field '${formName}.${fieldName}' references an undeclared ` +
          `glossary term. Declare it under glossaries.${glossaryName}.terms.${termName}, or use a literal, ` +
          'pre-existing glossary ID (which may not contain a period).',
      );
    }
    return {
      fieldProps: { ...fieldProps, glossaryId: glossary.glossary.getAttString('glossaryId') },
      termDependency: term,
    };
  }

  private createDataSource(options: CreateDataSourceOptions) {
    const { projectName, project, dataSourceName, dataSourceProps, dataSourceDefaults, declaredMetadataForms } =
      options;
    if (!!dataSourceProps.s3 === !!dataSourceProps.databaseName) {
      throw new Error(`Data source '${dataSourceName}': specify exactly one of 'databaseName' or 's3'`);
    }
    if (dataSourceProps.s3) {
      this.rejectGlueOnlyFieldsOnS3DataSource(dataSourceName, dataSourceProps);
      return this.createS3Connection(project, dataSourceName, dataSourceProps.s3);
    }
    const databaseName = dataSourceProps.databaseName as string;
    const resolved = resolveDataSourceDefaults(dataSourceDefaults, dataSourceProps);
    const assetFormsInput = this.resolveDataSourceMetadataForms({
      projectName,
      dataSourceName,
      formRefs: dataSourceProps.metadataForms,
      declaredForms: declaredMetadataForms,
    });
    const datasourceProps = this.buildGlueDataSourceCfnProps(
      project,
      dataSourceName,
      databaseName,
      resolved,
      assetFormsInput,
    );
    const datasource = new CfnDataSource(project, `${dataSourceName}-datazone-datasource`, datasourceProps);
    this.grantDataSourceDatabaseReadAccess(datasource, projectName, project, databaseName);
    return { dataSourceName: dataSourceName, dataSource: datasource, props: dataSourceProps };
  }

  /**
   * An `s3` entry's resource (`AWS::DataZone::Connection`) has no equivalent properties for
   * Glue-only fields, so a field set directly on the entry itself is almost certainly a
   * misconfiguration rather than a deliberate no-op. A value the entry inherits from the
   * project's `dataSourceDefaults` is not flagged here: that's a project-level default
   * applying across heterogeneous data sources, not a mistake in this entry.
   */
  private rejectGlueOnlyFieldsOnS3DataSource(dataSourceName: string, dataSourceProps: DataSourceProps): void {
    const setFields = GLUE_ONLY_DATASOURCE_FIELDS.filter(field => dataSourceProps[field] !== undefined);
    if (setFields.length > 0) {
      throw new Error(
        `Data source '${dataSourceName}': [${setFields.join(', ')}] only apply to Glue ('databaseName') data ` +
          "sources and cannot be set on an 's3' entry.",
      );
    }
  }

  private buildGlueDataSourceCfnProps(
    project: MdaaSageMakerProject,
    dataSourceName: string,
    databaseName: string,
    resolved: DataSourceDefaultsProps,
    assetFormsInput: CfnDataSource.FormInputProperty[],
  ): CfnDataSourceProps {
    return {
      domainIdentifier: project.project.attrDomainId,
      connectionIdentifier: project.glueConnectionId, //Need to pass glue connection id for SMUS projects
      name: this.props.naming.withResourceType(MdaaResourceType.DATAZONE_DATASOURCE).resourceName(dataSourceName),
      projectIdentifier: project.project.attrId,
      type: 'glue',
      publishOnImport: resolved.publishOnImport,
      enableSetting: resolved.enableSetting,
      schedule: resolved.schedule,
      recommendation: resolved.recommendation,
      assetFormsInput: assetFormsInput.length > 0 ? assetFormsInput : undefined,
      configuration: {
        glueRunConfiguration: {
          autoImportDataQualityResult: resolved.autoImportDataQualityResult ?? true,
          relationalFilterConfigurations: [
            {
              databaseName: databaseName,
              // DataSourceFilterExpressionProps mirrors FilterExpressionProperty 1:1.
              filterExpressions: resolved.filterExpressions,
            },
          ],
        },
      },
    };
  }

  private grantDataSourceDatabaseReadAccess(
    datasource: CfnDataSource,
    projectName: string,
    project: MdaaSageMakerProject,
    databaseName: string,
  ): void {
    const grantProps: GrantProps = {
      database: databaseName,
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
  }

  /**
   * Resolves a data source's `metadataForms` references to `AssetFormsInput` entries.
   * Each key must match a form declared under the project's `metadataForms` (created
   * before data sources specifically so this can resolve), since DataZone's
   * `typeIdentifier` for a custom form type is just its name, and `typeRevision` is
   * only known once the form type's custom resource has run. Also validates `status` and
   * `content` against the declared form, since DataZone only enforces those at deploy
   * time or when the data source runs.
   */
  private resolveDataSourceMetadataForms(
    options: ResolveDataSourceMetadataFormsOptions,
  ): CfnDataSource.FormInputProperty[] {
    const { projectName, dataSourceName, formRefs, declaredForms } = options;
    const entries = Object.entries(formRefs || {});
    if (entries.length > SagemakerProjectL3Construct.MAX_METADATA_FORMS_PER_DATASOURCE) {
      throw new Error(
        `Data source '${dataSourceName}' in project '${projectName}' declares ${entries.length} metadataForms, ` +
          `which exceeds the maximum of ${SagemakerProjectL3Construct.MAX_METADATA_FORMS_PER_DATASOURCE} ` +
          'AssetFormsInput entries DataZone allows per data source.',
      );
    }
    return entries.map(([formName, formProps]) => {
      const context = `Data source '${dataSourceName}' in project '${projectName}': metadataForms.'${formName}'`;
      const declared = Object.prototype.hasOwnProperty.call(declaredForms, formName)
        ? declaredForms[formName]
        : undefined;
      if (!declared) {
        throw new Error(`${context} is not declared under this project's metadataForms.`);
      }
      if (declared.props.status === 'DISABLED') {
        throw new Error(`${context} references a DISABLED form, which is retained but not attachable.`);
      }
      this.validateMetadataFormContent(context, declared.props, formProps.content);
      return {
        formName: formName,
        typeIdentifier: formName,
        typeRevision: declared.formType.formType.getAttString('revision'),
        ...(formProps.content ? { content: formProps.content } : {}),
      };
    });
  }

  /**
   * Validates a `metadataForms` reference's `content` at synth time against the form it
   * declares: `content`, if set, must be a JSON object naming only fields the form
   * declares, and every field the form declares `required: true` must be present
   * (whether supplied via `content` or omitted entirely). Skipped for a deploy-time
   * value, e.g. a `content` built from an `ssm-org:` reference, since its value isn't
   * known until deploy.
   */
  private validateMetadataFormContent(
    context: string,
    declaredForm: MetadataFormProps,
    content: string | undefined,
  ): void {
    if (content !== undefined && Token.isUnresolved(content)) {
      return;
    }
    let parsedContent: Record<string, unknown> = {};
    if (content !== undefined) {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        throw new Error(`${context} content is not valid JSON.`);
      }
      if (typeof parsedContent !== 'object' || parsedContent === null || Array.isArray(parsedContent)) {
        throw new Error(`${context} content must be a JSON object.`);
      }
      const undeclaredFields = Object.keys(parsedContent).filter(
        fieldName => !Object.prototype.hasOwnProperty.call(declaredForm.fields, fieldName),
      );
      if (undeclaredFields.length > 0) {
        throw new Error(
          `${context} content references field(s) [${undeclaredFields.join(', ')}] the form does not declare.`,
        );
      }
    }
    const missingRequiredFields = Object.entries(declaredForm.fields)
      .filter(([, fieldProps]) => fieldProps.required)
      .map(([fieldName]) => fieldName)
      .filter(fieldName => parsedContent[fieldName] === undefined || parsedContent[fieldName] === null);
    if (missingRequiredFields.length > 0) {
      throw new Error(`${context} content is missing required field(s) [${missingRequiredFields.join(', ')}].`);
    }
  }

  private createS3Connection(project: MdaaSageMakerProject, dataSourceName: string, s3Props: S3DataSourceProps) {
    const connectionProps: MdaaDatazoneS3ConnectionProps = {
      naming: this.props.naming,
      name: dataSourceName,
      domainIdentifier: project.project.attrDomainId,
      projectIdentifier: project.project.attrId,
      environmentIdentifier: project.toolingEnvId,
      bucketName: s3Props.bucketName,
      prefix: s3Props.prefix,
      registerS3AccessGrantLocation: s3Props.registerS3AccessGrantLocation,
      s3AccessGrantLocationId: s3Props.s3AccessGrantLocationId,
      grantReadRoleArn: project.envUserArn,
    };
    const connection = new MdaaDatazoneS3Connection(project, `${dataSourceName}-s3-connection`, connectionProps);
    return { dataSourceName: dataSourceName, dataSource: connection.connection, props: { s3: s3Props } };
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
