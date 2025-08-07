/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityConfiguration } from '@aws-cdk/aws-glue-alpha';
import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import { DomainConfig, MdaaDatazoneProject, MdaaDatazoneProjectProps } from '@aws-mdaa/datazone-constructs';
import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-mdaa/ec2-l3-construct';
import { MdaaSecurityConfig } from '@aws-mdaa/glue-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, IMdaaKmsKey, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  GrantProps,
  LakeFormationAccessControlL3Construct,
  LakeFormationAccessControlL3ConstructProps,
  NamedGrantProps,
  NamedPrincipalProps,
  NamedResourceLinkProps,
  PermissionsConfig,
  PrincipalProps,
  ResourceLinkProps,
} from '@aws-mdaa/lakeformation-access-control-l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaSnsTopic, MdaaSnsTopicProps } from '@aws-mdaa/sns-constructs';
import { Arn, ArnComponents, ArnFormat, Tags } from 'aws-cdk-lib';
import {
  CfnDataSource,
  CfnDataSourceProps,
  CfnEnvironment,
  CfnEnvironmentActions,
  CfnEnvironmentActionsProps,
  CfnEnvironmentProps,
  CfnSubscriptionTarget,
  CfnSubscriptionTargetProps,
} from 'aws-cdk-lib/aws-datazone';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { CfnClassifier, CfnConnection, CfnDatabase } from 'aws-cdk-lib/aws-glue';
import {
  AccountPrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnPrincipalPermissions, CfnResource } from 'aws-cdk-lib/aws-lakeformation';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ConfigurationElement } from '@aws-mdaa/config';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';

export interface NamedDatabaseGrantProps {
  /**
   * The unique name of the grant
   */
  /** @jsii ignore */
  readonly [name: string]: DatabaseGrantProps;
}

export interface NamedPrincipalArnProps {
  /** @jsii ignore */
  [name: string]: string;
}

export interface DatabaseGrantProps {
  /**
   * Permissions to Grant on database.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
   */
  readonly databasePermissions?: PermissionsConfig;
  /**
   * Permissions to Grant on tables.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
   */
  readonly tablePermissions?: PermissionsConfig;
  /**
   * List of tables for which to create grants. Tables must exist before grants can be created.
   */
  readonly tables?: string[];
  /**
   * Array of strings representing principals to grant permissions to.  These must exist in the 'principals:' section.
   */
  readonly principals?: NamedPrincipalProps;
  /**
   * Mapping of principal names to arns. Can be used as short hand for principals
   */
  readonly principalArns?: NamedPrincipalArnProps;
}

export interface DatabaseLakeFormationProps {
  /**
   * If true (default: false), will automatically add read/write/super LF grants for data admin roles
   *  to database
   */
  readonly createSuperGrantsForDataAdminRoles?: boolean;

  /**
   * If true (default: false), will automatically add read LF grants for data engineer roles
   *  to database
   */
  readonly createReadGrantsForDataEngineerRoles?: boolean;

  /**
   * If true (default: false), will automatically add read/write LF grants for project execution role
   *  to databases and their s3 locations.
   */
  readonly createReadWriteGrantsForProjectExecutionRoles?: boolean;

  /**
   * List of account numbers for which cross account Resource Links will be created.
   * Additional stacks will be created for each account.
   */
  readonly createCrossAccountResourceLinkAccounts?: string[];

  /**
   * Name of the resource link to be created
   * If not specified, defaults to the database name
   */
  readonly createCrossAccountResourceLinkName?: string;

  /**
   * LF Grants to be added to the database
   */
  readonly grants?: NamedDatabaseGrantProps;
}

export interface NamedDatabaseProps {
  /** @jsii ignore */
  readonly [name: string]: DatabaseProps;
}

export interface DatabaseProps {
  /**
   * General description of the database
   */
  readonly description: string;
  /**
   * (Optional) When true, create database with exact name as specified. Naming convention does not apply.
   */
  readonly verbatimName?: boolean;
  /**
   * (Optional) When true, replaces hyphens with underscores in database name. Applies to verbatim db names as well.
   */
  readonly icebergCompliantName?: boolean;
  /**
   * S3 Bucket under which all data for this database will be stored
   */
  readonly locationBucketName?: string;
  /**
   * S3 prefix under which all data for this database will be stored
   */
  readonly locationPrefix?: string;

  readonly lakeFormation?: DatabaseLakeFormationProps;

  readonly createDatazoneDatasource?: boolean;
}

export type ClassifierType = 'csv' | 'grok' | 'json' | 'xml';

// Cannot useCfnClassifier.GrokClassifierProperty as some values allow IResolvable
export interface ClassifierCsvProps {
  readonly allowSingleColumn?: boolean;
  readonly containsHeader?: string;
  readonly delimiter?: string;
  readonly disableValueTrimming?: boolean;
  readonly header?: string[];
  readonly name?: string;
  readonly quoteSymbol?: string;
}

export interface ClassifierConfigProps {
  /**
   * CSV Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-csvclassifier.html
   */
  readonly csvClassifier?: ClassifierCsvProps;
  /**
   * Grok Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-grokclassifier.html
   */
  readonly grokClassifier?: CfnClassifier.GrokClassifierProperty;
  /**
   * JSON Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-jsonclassifier.html
   */
  readonly jsonClassifier?: CfnClassifier.JsonClassifierProperty;
  /**
   * XML Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-xmlclassifier.html
   */
  readonly xmlClassifier?: CfnClassifier.XMLClassifierProperty;
}

export interface NamedClassifierProps {
  /** @jsii ignore */
  readonly [name: string]: ClassifierProps;
}

export interface ClassifierProps {
  /**
   * Custom Classifier type
   */
  readonly classifierType: ClassifierType;
  /**
   * Custom Classifier configuration to use for the type.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-classifier.html
   */
  readonly configuration: ClassifierConfigProps;
}

export type ConnectionType = 'JDBC' | 'KAFKA' | 'MONGODB' | 'NETWORK';

// CDK Type contains IResolvable, so we need to defin this one here!
export interface ConnectionPhysical {
  /**
   * Availability zone to use (eg test-regiona)
   */
  readonly availabilityZone?: string;
  /**
   * List of names of security groups generated within the project config
   */
  readonly projectSecurityGroupNames?: string[];
  /**
   * List of security groups to use when connecting to the VPC.  Assure they are in the VPC matching the SecurityGroupIds
   */
  readonly securityGroupIdList?: string[];
  /**
   * Subnet ID within the Availability Zone chosen above.
   */
  readonly subnetId?: string;
}

export interface NamedConnectionProps {
  /** @jsii ignore */
  readonly [name: string]: ConnectionProps;
}

export interface ConnectionProps {
  /**
   * Connection type to create ("JDBC" | "KAFKA" | "MONGODB" | "NETWORK")
   */
  readonly connectionType: ConnectionType;
  /**
   * Connection properties key value pairs.  See: https://docs.aws.amazon.com/glue/latest/webapi/API_Connection.html
   */
  readonly connectionProperties?: ConfigurationElement;
  /**
   * Connection Description
   */
  readonly description?: string;
  /**
   * A list of criteria that can be used in selecting this connection.
   */
  readonly matchCriteria?: string[];
  /**
   * VPC Definition for this to connect to.  see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-connection-physicalconnectionrequirements.html
   */
  readonly physicalConnectionRequirements?: ConnectionPhysical;
}

export interface DataOpsProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * The KMS Key to be used to encrypt all Job outputs within the project.
   */
  readonly s3OutputKmsKeyArn?: string;
  /**
   * Map of classifer names to classifier definitions
   */
  readonly classifiers?: NamedClassifierProps;
  /**
   * Map of connection names to connection definitions
   */
  readonly connections?: NamedConnectionProps;
  /**
   * The key used to encrypt the Glue catalog and connection credentials
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * The list of execution roles used by project jobs, crawlers, and function resources.
   */
  readonly projectExecutionRoleRefs: MdaaRoleRef[];
  /**
   * Map of database names to database definitions
   */
  readonly databases?: NamedDatabaseProps;
  /**
   * List of data engineer role ids who will interact with project resources
   */
  readonly dataEngineerRoleRefs: MdaaRoleRef[];
  /**
   * List of data admin role ids which will administer project resources
   */
  readonly dataAdminRoleRefs: MdaaRoleRef[];
  /**
   * failure notification configuration
   */
  readonly failureNotifications?: FailureNotificationsProps;
  /**
   * If specified, project security groups will be created which can be shared
   * by project resources
   */
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;

  readonly datazone?: DatazoneProps;
}

export interface DatazoneProps {
  readonly project?: DatazoneProjectProps;
}

export interface DatazoneProjectProps {
  readonly domainUnit?: string;
  readonly domainConfigSSMParam?: string;
  readonly domainConfig?: DomainConfig;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
}

export interface NamedSecurityGroupConfigProps {
  /** @jsii ignore */
  [name: string]: SecurityGroupConfigProps;
}

export interface SecurityGroupConfigProps {
  /**
   * The ID of the VPC on which the Lambda will be deployed
   */
  readonly vpcId: string;
  /**
   * List of egress rules to be added to the function SG
   */
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

export interface FailureNotificationsProps {
  readonly email?: string[];
}

interface DatazoneResources {
  readonly datazoneProject: MdaaDatazoneProject;
  readonly datazoneEnv: CfnEnvironment;
  readonly lakeformationManageAccessRole: IRole;
}

export class DataOpsProjectL3Construct extends MdaaL3Construct {
  protected readonly props: DataOpsProjectL3ConstructProps;

  private projectExecutionRoles: MdaaResolvableRole[];
  private dataAdminRoles: MdaaResolvableRole[];
  private dataEngineerRoles: MdaaResolvableRole[];
  private dataAdminRoleIds: string[];

  constructor(scope: Construct, id: string, props: DataOpsProjectL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.projectExecutionRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.projectExecutionRoleRefs,
      'ProjectExRoles',
    );
    this.dataAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.dataAdminRoleRefs, 'DataAdmin');
    this.dataEngineerRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(
      this.props.dataEngineerRoleRefs,
      'DataEngineer',
    );
    this.dataAdminRoleIds = this.dataAdminRoles.map(x => x.id());

    const projectDeploymentRole = this.createProjectDeploymentRole();
    const lakeFormationLocationRole = this.createLakeFormationRole();
    const datazoneUserRole = this.createDatazoneUserRole();

    const projectKmsKey = this.createProjectKmsKey([
      projectDeploymentRole,
      datazoneUserRole,
      lakeFormationLocationRole,
    ]);

    const s3OutputKmsKey = props.s3OutputKmsKeyArn
      ? MdaaKmsKey.fromKeyArn(this.scope, 's3OutputKmsKey', props.s3OutputKmsKeyArn)
      : projectKmsKey;

    const projectSecurityGroups = Object.fromEntries(
      Object.entries(props.securityGroupConfigs || {}).map(entry => {
        const securityGroupName = entry[0];
        const securityGroupProps = entry[1];
        const sg = this.createProjectSecurityGroup(
          securityGroupName,
          securityGroupProps.vpcId,
          securityGroupProps.securityGroupEgressRules,
        );
        return [securityGroupName, sg];
      }),
    );

    // Create project bucket
    const projectBucket = this.createProjectBucket(
      projectKmsKey,
      s3OutputKmsKey,
      projectDeploymentRole,
      datazoneUserRole,
      lakeFormationLocationRole,
    );

    const datazoneResources = this.createDatazoneResources(projectBucket, datazoneUserRole);

    this.createAthenaWorkgroup(datazoneUserRole, projectBucket, datazoneResources?.datazoneEnv);

    this.createProjectDatabases(this.props.databases || {}, projectBucket, datazoneResources);
    this.createProjectSecurityConfig(projectKmsKey, s3OutputKmsKey);

    // create project SNS topic
    const topic = this.createSNSTopic(projectKmsKey);

    // subcribe SNS topic if failure notification config is enabled
    this.subscribeSNSTopic(topic, this.props.failureNotifications);

    // Build our custom classifiers if they are defined.
    this.createProjectClassifiers(this.props.classifiers || {});

    // Build our connectors if they are in use.
    this.createProjectConnectors(this.props.connections || {}, projectSecurityGroups);

    //If the Glue Catalog KMS key is specified, grant decrypt access to it
    //for project execution roles (direct access required to decrypt Glue connections)
    if (this.props.glueCatalogKmsKeyArn) {
      let i = 0;
      const projectExecutionRoles = this.projectExecutionRoles.map(x => {
        return MdaaRole.fromRoleArn(this.scope, `resolve-role-${i++}`, x.arn());
      });
      const keyAccessPolicy = new ManagedPolicy(this.scope, 'catalog-key-access-policy', {
        managedPolicyName: this.props.naming.resourceName('catalog-key-access'),
        roles: projectExecutionRoles,
      });
      const keyAccessStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: DECRYPT_ACTIONS,
        resources: [this.props.glueCatalogKmsKeyArn],
      });
      keyAccessPolicy.addStatements(keyAccessStatement);
    }
  }
  private createAthenaWorkgroup(datazoneUserRole: Role, projectBucket: IBucket, datazoneEnv?: CfnEnvironment) {
    const athenaWgProps: AthenaWorkgroupL3ConstructProps = {
      dataAdminRoles: this.props.dataAdminRoleRefs,
      athenaUserRoles: [
        {
          refId: 'dz-user-role',
          arn: datazoneUserRole.roleArn,
          id: datazoneUserRole.roleId,
          name: datazoneUserRole.roleName,
        },
        ...this.props.dataEngineerRoleRefs,
      ],
      workgroupBucketName: projectBucket.bucketName,
      workgroupKmsKeyArn: projectBucket.encryptionKey?.keyArn,
      ...this.props,
    };
    const athenaWg = new AthenaWorkgroupL3Construct(this, 'datazone-env-athena-wg', athenaWgProps);
    if (datazoneEnv) {
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneEnvironment', datazoneEnv.attrId);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneProject', datazoneEnv.projectIdentifier);
      Tags.of(athenaWg.workgroup).add('AmazonDataZoneDomain', datazoneEnv.domainIdentifier);
    }
  }
  private createLakeFormationRole() {
    return new MdaaRole(this.scope, 'lake-formation-role', {
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
      roleName: 'lake-formation',
      description: 'Role for accessing the data lake via LakeFormation.',
    });
  }

  private createDatazoneResources(projectBucket: IBucket, datazoneUserRole: IRole): DatazoneResources | undefined {
    if (this.props.datazone) {
      if (this.props.datazone?.project) {
        const datazoneProject = this.createDataZoneProject(this.props.datazone.project);

        datazoneUserRole.addManagedPolicy(datazoneProject.domainKmsUsagePolicy);

        const lakeformationManageAccessRole = this.props.datazone.project.lakeformationManageAccessRole
          ? this.props.roleHelper
              .resolveRoleRefWithRefId(
                this.props.datazone.project.lakeformationManageAccessRole,
                'lf-manage-access-role',
              )
              .role('lf-manage-access-role')
          : Role.fromRoleArn(
              this,
              'lf-manage-access-role',
              StringParameter.valueForStringParameter(
                this,
                LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
              ),
            );

        const datazoneEnv = this.createDataZoneEnvironment(
          projectBucket,
          datazoneProject,
          lakeformationManageAccessRole,
          datazoneUserRole,
          datazoneProject.domainConfig.glueCatalogArns,
        );

        return {
          datazoneProject,
          lakeformationManageAccessRole,
          datazoneEnv: datazoneEnv,
        };
      }
      return undefined;
    }
    return undefined;
  }

  private createDataZoneProject(mdaaProjectProps: DatazoneProjectProps): MdaaDatazoneProject {
    const constructProps: MdaaDatazoneProjectProps = {
      naming: this.props.naming,
      domainUnit: mdaaProjectProps.domainUnit,
      domainConfigSSMParam: mdaaProjectProps.domainConfigSSMParam,
      domainConfig: mdaaProjectProps.domainConfig,
    };
    return new MdaaDatazoneProject(this, 'datazone-project', constructProps);
  }

  private createDataZoneEnvironment(
    projectBucket: IBucket,
    dzProject: MdaaDatazoneProject,
    lakeformationManagedAccessRole: IRole,
    datazoneUserRole: IRole,
    glueCatalogArns: string[],
  ): CfnEnvironment {
    const subBucketLocation = projectBucket.s3UrlForObject('/data/datazone');
    // Create the database
    const subDatabaseName = this.props.naming.resourceName('datazone-sub');
    const subDatabase = new CfnDatabase(this.scope, `datazone-sub-database`, {
      catalogId: this.account,
      databaseInput: {
        name: subDatabaseName,
        description: 'For consuming Datazone subscripts',
        locationUri: subBucketLocation,
      },
    });

    const subDatabaseLFProps: DatabaseLakeFormationProps = {
      createSuperGrantsForDataAdminRoles: true,
    };

    const dataLakeEnvProps: CfnEnvironmentProps = {
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentProfileIdentifier: '',
      name: this.props.naming.resourceName(),
      projectIdentifier: dzProject.project.attrId,
    };

    const datazoneEnv = new CfnEnvironment(this, 'datalake-env', dataLakeEnvProps);
    datazoneEnv.addPropertyOverride('EnvironmentAccountIdentifier', this.account);
    datazoneEnv.addPropertyOverride('EnvironmentAccountRegion', this.region);
    datazoneEnv.addPropertyOverride('EnvironmentBlueprintId', dzProject.domainConfig.domainCustomEnvBlueprintId);
    datazoneEnv.addPropertyOverride('EnvironmentRoleArn', datazoneUserRole.roleArn);

    this.createDatabaseLakeFormationConstruct(
      'datazone-sub',
      subDatabaseName,
      subDatabase,
      subDatabaseLFProps,
      true,
      lakeformationManagedAccessRole,
      subBucketLocation,
    );

    const athenaActionProps: CfnEnvironmentActionsProps = {
      name: 'Query data',
      description: 'Amazon Athena',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        // uri: `https://${this.region}.console.aws.amazon.com/athena/home#/query-editor/domain/${datazoneEnv.attrDomainId}/domainRegion/${this.region}/environment/${datazoneEnv.attrId}`
        uri: `https://us-east-1.console.aws.amazon.com/athena/home?region=${this.region}#/query-editor`,
      },
    };
    new CfnEnvironmentActions(this, 'athena-env-action', athenaActionProps);

    const glueEtlActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue ETL jobs',
      description: 'AWS Glue ETL',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/gluestudio/home?region=${this.region}#/jobs`,
      },
    };
    new CfnEnvironmentActions(this, 'glue-etl-env-action', glueEtlActionProps);

    const glueCatalogActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue Catalogs',
      description: 'AWS Glue Catalog',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/glue/home?region=${this.region}#/v2/data-catalog/tables`,
      },
    };
    new CfnEnvironmentActions(this, 'glue-catalog-env-action', glueCatalogActionProps);

    const s3BucketActionProps: CfnEnvironmentActionsProps = {
      name: 'Project S3 Data',
      description: 'Amazon S3',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${this.region}.console.aws.amazon.com/s3/buckets/${projectBucket}/data/`,
      },
    };
    new CfnEnvironmentActions(this, 's3-env-action', s3BucketActionProps);

    const consoleActionProps: CfnEnvironmentActionsProps = {
      name: 'View AWS Console',
      description: 'AWS Console',
      domainIdentifier: dzProject.project.domainIdentifier,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: 'https://console.aws.amazon.com/',
      },
    };
    new CfnEnvironmentActions(this, 'console-env-action', consoleActionProps);
    const userManagedPolicy = this.createDatazoneUserManagedPolicy(projectBucket, glueCatalogArns);
    userManagedPolicy.attachToRole(datazoneUserRole);

    this.createDatazoneSubscriptionTarget(
      datazoneEnv,
      dzProject,
      datazoneUserRole,
      lakeformationManagedAccessRole,
      subDatabaseName,
    );

    return datazoneEnv;
  }

  private createDatazoneSubscriptionTarget(
    env: CfnEnvironment,
    mdaaProject: MdaaDatazoneProject,
    envRole: IRole,
    lakeformationManagedAccessRole: IRole,
    subDatabaseName: string,
  ) {
    const subTargetProps: CfnSubscriptionTargetProps = {
      applicableAssetTypes: ['GlueTableAssetType'],
      authorizedPrincipals: [envRole.roleArn], //User role
      domainIdentifier: mdaaProject.project.domainIdentifier,
      environmentIdentifier: env.attrId,
      manageAccessRole: lakeformationManagedAccessRole.roleArn, //manage role
      name: this.props.naming.resourceName(),
      subscriptionTargetConfig: [
        {
          content: `{"databaseName":"${subDatabaseName}"}`,
          formName: 'GlueSubscriptionTargetConfigForm',
        },
      ],
      type: 'GlueSubscriptionTargetType',
    };
    new CfnSubscriptionTarget(this, 'datazone-sub-target', subTargetProps);
  }

  private createDatazoneUserRole(): Role {
    const role = new MdaaRole(this.scope, 'dz-user-role', {
      naming: this.props.naming,
      roleName: 'dz-user',
      assumedBy: new AccountPrincipal(this.account),
    });

    role.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:AssumeRole', 'sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com')],
        effect: Effect.ALLOW,
      }),
    );

    return role;
  }

  private createDatazoneUserManagedPolicy(projectBucket: IBucket, glueCatalogArns: string[]): ManagedPolicy {
    //Allow to access the glue catalog resources
    const userPolicy: ManagedPolicy = new ManagedPolicy(this, 'datazone-user-access-policy', {
      managedPolicyName: this.props.naming.resourceName('datazone-user-access-policy'),
    });

    const datazoneStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'datazone:ListDomains',
        'datazone:ListProjects',
        'datazone:ListAccountEnvironments',
        'datazone:ListEnvironments',
        'datazone:GetEnvironment',
        'datazone:*',
      ],
      resources: ['*'],
    });
    userPolicy.addStatements(datazoneStatement);

    //Allow smooth interactions with project bucket via Console
    const projectBucketConsoleStatement = new PolicyStatement({
      sid: 'ProjectBucketGet',
      effect: Effect.ALLOW,
      resources: [projectBucket.bucketArn],
      actions: [
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
        's3:GetBucketTagging',
        's3:GetEncryptionConfiguration',
        's3:GetIntelligentTieringConfiguration',
        's3:GetBucketPolicy',
      ],
    });
    userPolicy.addStatements(projectBucketConsoleStatement);

    const accessAthenaStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['athena:ListWorkGroups'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessAthenaStatement);

    const accessLFStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lakeformation:GetDataAccess'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessLFStatement);

    const accessGlueStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['glue:GetColumnStatisticsTaskRuns'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessGlueStatement);

    const accessGlueResourceStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:SearchTables',
        'glue:GetTableVersion',
        'glue:GetTableVersions',
        'glue:GetColumnStatistics*',
      ],
      resources: glueCatalogArns,
    });
    userPolicy.addStatements(accessGlueResourceStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(userPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'HIPAA.Security-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
    ]);
    return userPolicy;
  }

  private createProjectSecurityGroup(
    sgName: string,
    vpcId: string,
    securityGroupEgressRules?: MdaaSecurityGroupRuleProps,
  ): SecurityGroup {
    const ec2L3Props: Ec2L3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      adminRoles: [],
      securityGroups: {
        [sgName]: {
          vpcId: vpcId,
          egressRules: securityGroupEgressRules,
          addSelfReferenceRule: true,
        },
      },
    };
    const ec2Construct = new Ec2L3Construct(this, `ec2`, ec2L3Props);
    const securityGroup = ec2Construct.securityGroups[sgName];

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(`sg-ssm-${sgName}`, `securityGroupId/${sgName}`, securityGroup.securityGroupId);

    return securityGroup;
  }
  /** @jsii ignore */
  private createProjectConnectors(
    connections: NamedConnectionProps,
    projectSecurityGroups: { [name: string]: SecurityGroup },
  ) {
    Object.entries(connections).forEach(entry => {
      const connectionName = entry[0];
      const connectionProps = entry[1];

      const securityGroupIds = [
        ...(connectionProps.physicalConnectionRequirements?.securityGroupIdList || []),
        ...(connectionProps.physicalConnectionRequirements?.projectSecurityGroupNames?.map(name => {
          const sg = projectSecurityGroups[name];
          if (!sg) {
            throw new Error(`Non-existant project security group name specified`);
          }
          return sg.securityGroupId;
        }) || []),
      ];

      const physicalConnectionRequirements = {
        ...connectionProps.physicalConnectionRequirements,
        securityGroupIdList: securityGroupIds,
      };

      const resourceName = this.props.naming.resourceName(connectionName);
      // We'll support SSM imports for our physical connection requirements as needed.
      new CfnConnection(this.scope, `${connectionName}-connection`, {
        catalogId: this.account,
        connectionInput: {
          ...connectionProps,
          physicalConnectionRequirements: physicalConnectionRequirements,
          name: resourceName,
        },
      });

      this.createProjectSSMParam(`ssm-connection-${connectionName}`, `connections/${connectionName}`, resourceName);
    });
  }
  private createProjectClassifiers(classifiers: NamedClassifierProps) {
    Object.entries(classifiers).forEach(entry => {
      const classifierName = entry[0];
      const classifierProps = entry[1];
      const resourceName = this.props.naming.resourceName(classifierName);
      // We'll need to name our classifiers appropriately over-riding any 'name' values that exist
      for (const classifierType of ['csvClassifier', 'xmlClassifier', 'jsonClassifier', 'grokClassifier']) {
        if (classifierType in classifierProps.configuration) {
          // @ts-ignore - suppressing read only property
          classifierProps.configuration[classifierType]['name'] = resourceName;
        }
      }
      new CfnClassifier(this.scope, `${classifierName}-classifier`, {
        csvClassifier: classifierProps.configuration.csvClassifier,
        xmlClassifier: classifierProps.configuration.xmlClassifier,
        jsonClassifier: classifierProps.configuration.jsonClassifier,
        grokClassifier: classifierProps.configuration.grokClassifier,
      });

      this.createProjectSSMParam(`ssm-classifier-${classifierName}`, `classifiers/${classifierName}`, resourceName);
    });
  }
  private createProjectSecurityConfig(projectKmsKey: IMdaaKmsKey, s3OutputKmsKey: IKey): SecurityConfiguration {
    //Create project security Config
    const projectSecurityConfig = new MdaaSecurityConfig(this.scope, `security-config`, {
      cloudWatchKmsKey: projectKmsKey,
      jobBookMarkKmsKey: projectKmsKey,
      s3OutputKmsKey: s3OutputKmsKey,
      naming: this.props.naming,
    });

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(
      `ssm-securityconfig`,
      `securityConfiguration/default`,
      projectSecurityConfig.securityConfigurationName,
    );

    return projectSecurityConfig;
  }

  private createProjectDatabases(
    databases: NamedDatabaseProps,
    projectBucket: IBucket,
    datazoneResources?: DatazoneResources,
  ) {
    // Build our databases
    Object.entries(databases).forEach(entry => {
      const databaseName = entry[0];
      const databaseProps = entry[1];

      const dbName = databaseProps.verbatimName ? databaseName : this.props.naming.resourceName(databaseName);
      const dbResourceName = databaseProps.icebergCompliantName ? dbName.replace('-', '_') : dbName;
      const databaseBucket = databaseProps.locationBucketName
        ? MdaaBucket.fromBucketName(this, `database-bucket-${databaseName}`, databaseProps.locationBucketName)
        : projectBucket;

      // Create the database
      const database = new CfnDatabase(this.scope, `${databaseName}-database`, {
        catalogId: this.account,
        databaseInput: {
          name: dbResourceName,
          description: databaseProps.description,
          locationUri: databaseBucket?.s3UrlForObject(databaseProps.locationPrefix),
        },
      });

      if (databaseProps.createDatazoneDatasource) {
        this.createDataZoneDatasource(databaseName, dbResourceName, database, datazoneResources);
      }

      // Use LF Access Control L3 Contruct to create LF grants and Resource Links for the database
      if (databaseProps.lakeFormation || databaseProps.createDatazoneDatasource) {
        this.createDatabaseLakeFormationConstruct(
          databaseName,
          dbResourceName,
          database,
          databaseProps.lakeFormation || {},
          databaseProps.createDatazoneDatasource || false,
          datazoneResources?.lakeformationManageAccessRole,
          databaseBucket?.arnForObjects(databaseProps.locationPrefix || ''),
        );
      }

      // Required so we can auto-wire other stacks/resources to this project resource via SSM
      this.createProjectSSMParam(`ssm-database-name-${databaseName}`, `databaseName/${databaseName}`, dbResourceName);
    });
  }

  private createDataZoneDatasource(
    databaseName: string,
    databaseResourceName: string,
    database: CfnDatabase,
    datazoneResources?: DatazoneResources,
  ) {
    if (!datazoneResources || !datazoneResources?.datazoneEnv) {
      throw new Error('DataZone Project must be defined if creating a DataZone Data Source');
    }
    const datasourceProps: CfnDataSourceProps = {
      domainIdentifier: datazoneResources.datazoneProject.project.attrDomainId,
      environmentIdentifier: datazoneResources.datazoneEnv?.attrId,
      name: this.props.naming.resourceName(databaseName),
      projectIdentifier: datazoneResources.datazoneProject.project.attrId,
      type: 'glue',
      configuration: {
        glueRunConfiguration: {
          autoImportDataQualityResult: true,
          dataAccessRole: datazoneResources.lakeformationManageAccessRole.roleArn,
          relationalFilterConfigurations: [
            {
              databaseName: databaseResourceName,
            },
          ],
        },
      },
    };
    const datasource = new CfnDataSource(this, `${databaseName}-datazone-datasource`, datasourceProps);
    datasource.addDependency(database);
  }

  private createDatabaseLakeFormationConstruct(
    databaseName: string,
    dbResourceName: string,
    database: CfnDatabase,
    databaseLakeFormationProps: DatabaseLakeFormationProps,
    createDatazoneDatasource: boolean,
    datazoneManageAccessRole?: IRole,
    locationArn?: string,
  ) {
    // Provide Project Execution Roles (principal) data location permissions to create data catalog
    // tables that point to specified data-locations
    if (databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles && locationArn) {
      this.projectExecutionRoles.forEach(role => {
        const grantId = LakeFormationAccessControlL3Construct.generateIdentifier(databaseName, role.refId());
        const grant = new CfnPrincipalPermissions(this, `lf-data-location-grant-${grantId}`, {
          principal: {
            dataLakePrincipalIdentifier: role.arn(),
          },
          resource: {
            dataLocation: {
              catalogId: this.account,
              resourceArn: locationArn,
            },
          },
          permissions: ['DATA_LOCATION_ACCESS'],
          permissionsWithGrantOption: [],
        });
        grant.addDependency(database);
      });
    }

    const projectRoleGrantProps: { [key: string]: GrantProps } = {};
    if (databaseLakeFormationProps.createSuperGrantsForDataAdminRoles) {
      projectRoleGrantProps[`data-admins-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS,
        principals: Object.fromEntries(
          this.dataAdminRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS,
      };
    }
    if (databaseLakeFormationProps.createReadGrantsForDataEngineerRoles) {
      projectRoleGrantProps[`data-engineers-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
        principals: Object.fromEntries(
          this.dataEngineerRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      };
    }

    if (databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles) {
      projectRoleGrantProps[`execution-roles-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        principals: Object.fromEntries(
          this.projectExecutionRoles.map(x => {
            return [
              x.refId(),
              {
                role: {
                  arn: x.arn(),
                  id: x.id(),
                  name: x.name(),
                },
              },
            ];
          }),
        ),
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      };
    }

    if (createDatazoneDatasource && datazoneManageAccessRole) {
      projectRoleGrantProps[`datazone-roles-${databaseName}`] = {
        database: dbResourceName,
        databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        databaseGrantablePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
        principals: {
          datazone: {
            role: {
              refId: 'datazone',
              arn: datazoneManageAccessRole?.roleArn,
            },
          },
        },
        tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
        tableGrantablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      };
    }

    const lfGrantProps: NamedGrantProps =
      Object.fromEntries(
        Object.entries(databaseLakeFormationProps?.grants || {}).map(entry => {
          const dbGrantName = entry[0];
          const dbGrantProps = entry[1];
          const lakeFormationGrantProps = this.createLakeFormationGrantProps(dbResourceName, dbGrantProps);
          return [`${databaseName}-${dbGrantName}`, lakeFormationGrantProps];
        }),
      ) || {};

    const resourceLinkName = databaseLakeFormationProps.createCrossAccountResourceLinkName || dbResourceName;
    const resourceLinkProps: NamedResourceLinkProps = Object.fromEntries(
      databaseLakeFormationProps?.createCrossAccountResourceLinkAccounts?.map(account => {
        const accountPrincipalEntries = Object.entries(lfGrantProps)
          .map(lfGrantEntry => {
            const lfGrantProps = lfGrantEntry[1];
            return Object.entries(lfGrantProps.principals).filter(principalEntry => {
              const principalName = principalEntry[0];
              const principalProps = principalEntry[1];
              const principalAccount = this.determinePrincipalAccount(principalName, principalProps);
              return principalAccount == account;
            });
          })
          .flat();
        const namedAccountPrincipals: NamedPrincipalProps = Object.fromEntries(accountPrincipalEntries);
        const props: ResourceLinkProps = {
          targetDatabase: dbResourceName,
          targetAccount: this.account,
          fromAccount: account,
          grantPrincipals: namedAccountPrincipals,
        };
        return [resourceLinkName, props];
      }) || [],
    );

    const lakeFormationProps: LakeFormationAccessControlL3ConstructProps = {
      grants: { ...projectRoleGrantProps, ...lfGrantProps },
      resourceLinks: resourceLinkProps,
      externalDatabaseDependency: database,
      ...(this.props as MdaaL3ConstructProps),
    };

    //Use the LF Account Control construct to create all database grants and resource links
    const lf = new LakeFormationAccessControlL3Construct(this, `lf-grants-${databaseName}`, lakeFormationProps);
    lf.node.addDependency(database);
  }

  private determinePrincipalAccount(principalName: string, principalProps: PrincipalProps): string | undefined {
    if (principalProps.role instanceof MdaaResolvableRole) {
      return this.tryParseArn(principalProps.role.arn())?.account;
    } else if (principalProps.role) {
      return this.tryParseArn(this.props.roleHelper.resolveRoleRefWithRefId(principalProps.role, principalName).arn())
        ?.account;
    } else {
      return undefined;
    }
  }
  private tryParseArn(arnString: string): ArnComponents | undefined {
    try {
      return Arn.split(arnString, ArnFormat.NO_RESOURCE_NAME);
    } catch {
      return undefined;
    }
  }
  private createLakeFormationGrantProps(dbResourceName: string, dbGrantProps: DatabaseGrantProps): GrantProps {
    const databasePermissions =
      LakeFormationAccessControlL3Construct.DATABASE_PERMISSIONS_MAP[dbGrantProps.databasePermissions || 'read'];
    const tablePermissions =
      LakeFormationAccessControlL3Construct.TABLE_PERMISSIONS_MAP[dbGrantProps.tablePermissions || 'read'];
    const principalArns: NamedPrincipalProps = Object.fromEntries(
      Object.entries(dbGrantProps.principalArns || {}).map(entry => {
        const principalProps: PrincipalProps = {
          role: {
            arn: entry[1],
          },
        };
        return [entry[0], principalProps];
      }),
    );

    return {
      ...dbGrantProps,
      database: dbResourceName,
      databasePermissions: databasePermissions,
      tables: dbGrantProps.tables,
      tablePermissions: tablePermissions,
      principals: { ...(dbGrantProps.principals || {}), ...principalArns },
    };
  }

  private createProjectKmsKey(keyUserRoles: Role[]): IMdaaKmsKey {
    //Allow CloudWatch logs to us the project key to encrypt/decrypt log data using this key
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchLogsEncryption',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      resources: ['*'],
      //Limit access to use this key only for log groups within this account
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*`,
        },
      },
    });

    const projectDeploymentStatement = new PolicyStatement({
      sid: 'ProjectDeployment',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: keyUserRoles,
      resources: ['*'],
    });

    // Allow the account use the project KMS key for encrypting
    // messages into SQS Dead Letter Queues
    const sqsStatement = new PolicyStatement({
      sid: 'sqsEncryption',
      effect: Effect.ALLOW,
      // Actions required https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
      actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'kms:CallerAccount': this.account,
          'kms:ViaService': `sqs.${this.region}.amazonaws.com`,
        },
      },
    });
    sqsStatement.addAnyPrincipal();

    // Allow Eventbridge Service principal to use KMS key to publish to project SNS topic
    const eventBridgeStatement = new PolicyStatement({
      sid: 'eventBridgeEncryption',
      effect: Effect.ALLOW,
      actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
      principals: [new ServicePrincipal('events.amazonaws.com')],
      resources: ['*'],
    });

    // Create a KMS Key if we need to make one for the project.
    const kmsKey = new MdaaKmsKey(this.scope, 'ProjectKmsKey', {
      alias: 'cmk',
      naming: this.props.naming,
      keyAdminRoleIds: this.dataAdminRoleIds,
      keyUserRoleIds: [...this.getAllRoleIds(), ...keyUserRoles.map(x => x.roleId)],
    });
    kmsKey.addToResourcePolicy(cloudwatchStatement);
    kmsKey.addToResourcePolicy(projectDeploymentStatement);
    kmsKey.addToResourcePolicy(sqsStatement);
    kmsKey.addToResourcePolicy(eventBridgeStatement);

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam('ssm-kms-arn', `kmsArn/default`, kmsKey.keyArn);

    return kmsKey;
  }

  private createProjectDeploymentRole(): Role {
    const role = new MdaaRole(this.scope, `project-deployment-role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'deployment',
      naming: this.props.naming,
    });

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam(`ssm-deployment-role`, `deploymentRole/default`, role.roleArn);
    return role;
  }

  private createProjectBucket(
    projectKmsKey: IKey,
    s3OutputKmsKey: IKey,
    projectDeploymentRole: IRole,
    datazoneUserRole: Role,
    lakeFormationRole: Role,
  ): IBucket {
    const dataEngineerRoleIds = this.dataEngineerRoles.map(x => x.id());
    const dataAdminRoleIds = this.dataAdminRoles.map(x => x.id());
    const projectExecutionRoleIds = this.projectExecutionRoles.map(x => x.id());

    //This project bucket will be used for all project-specific data
    const projectBucket = new MdaaBucket(this.scope, `Bucketproject`, {
      encryptionKey: projectKmsKey,
      additionalKmsKeyArns: [s3OutputKmsKey.keyArn],
      naming: this.props.naming,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      projectBucket,
      [
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'MDAA DataOps bucket does not use bucket replication.',
        },
      ],
      true,
    );
    //Data Admins can read/write the entire bucket
    //Data Engineers can read the entire bucket
    const rootPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/',
      readRoleIds: dataEngineerRoleIds,
      readWriteSuperRoleIds: dataAdminRoleIds,
    });
    rootPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Datazone env role and Data Engineers can read/write /athena-results
    const athenaPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/athena-results',
      readRoleIds: dataEngineerRoleIds,
      readWritePrincipals: [datazoneUserRole],
    });
    athenaPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Deployment role can read/write /deployment
    //Execution role can read /deployment
    const deploymentPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/deployment',
      readRoleIds: projectExecutionRoleIds,
      readWritePrincipals: [projectDeploymentRole],
    });
    deploymentPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));
    //Data Engineers and can read/write under /data
    const dataPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/data',
      readWritePrincipals: [lakeFormationRole],
      readWriteRoleIds: [...dataEngineerRoleIds, ...projectExecutionRoleIds],
    });
    dataPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Execution role and can read/write under /temp
    const tempPolicy = new RestrictObjectPrefixToRoles({
      s3Bucket: projectBucket,
      s3Prefix: '/temp',
      readWriteRoleIds: projectExecutionRoleIds,
    });
    tempPolicy.statements().forEach(statement => projectBucket.addToResourcePolicy(statement));

    //Default Deny Policy
    //Any role not specified in props is explicitely denied access to the bucket
    const bucketRestrictPolicy = new RestrictBucketToRoles({
      s3Bucket: projectBucket,
      roleExcludeIds: [...this.getAllRoleIds(), lakeFormationRole.roleId, datazoneUserRole.roleId],
      principalExcludes: [projectDeploymentRole.roleArn],
    });
    projectBucket.addToResourcePolicy(bucketRestrictPolicy.denyStatement);
    projectBucket.addToResourcePolicy(bucketRestrictPolicy.allowStatement);

    // Required so we can auto-wire other stacks/resources to this project resource via SSM
    this.createProjectSSMParam('ssm-bucket-name', `projectBucket/default`, projectBucket.bucketName);

    new CfnResource(this.scope, `lf-resource-project-data`, {
      resourceArn: projectBucket.arnForObjects('data'),
      useServiceLinkedRole: false,
      roleArn: lakeFormationRole.roleArn,
    });

    return projectBucket;
  }

  private getAllRoles(): MdaaResolvableRole[] {
    return [...new Set([...this.dataAdminRoles, ...this.dataEngineerRoles, ...this.projectExecutionRoles])];
  }

  private getAllRoleIds(): string[] {
    return this.getAllRoles().map(x => x.id());
  }

  private createSNSTopic(projectKmsKey: IMdaaKmsKey): MdaaSnsTopic {
    // create SNS topic
    const snsProps: MdaaSnsTopicProps = {
      naming: this.props.naming,
      topicName: 'dataops-sns-topic',
      masterKey: projectKmsKey,
    };
    const topic = new MdaaSnsTopic(this.scope, 'dataops-sns-topic', snsProps);
    //Allow EventBridge events to be published to the Topic
    const publishPolicyStatement = new PolicyStatement({
      sid: 'Publish Policy',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal(`events.amazonaws.com`)],
      actions: ['sns:Publish'],
      resources: [topic.topicArn],
    });
    topic.addToResourcePolicy(publishPolicyStatement);
    this.createProjectSSMParam('ssm-topic-arn', `projectTopicArn/default`, topic.topicArn);

    return topic;
  }

  private subscribeSNSTopic(topic: MdaaSnsTopic, failureNotifications?: FailureNotificationsProps) {
    // subscribe to sns topic if email-ids are present
    failureNotifications?.email?.forEach(email => {
      topic.addSubscription(new EmailSubscription(email.trim()));
    });
  }

  private createProjectSSMParam(paramId: string, ssmPath: string, paramValue: string) {
    console.log(`Creating Project SSM Param: ${ssmPath}`);
    new StringParameter(this.scope, paramId, {
      parameterName: this.props.naming.ssmPath(ssmPath, true, false),
      stringValue: paramValue,
    });
  }
}
