/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefParamAndOutput } from '@aws-caef/construct';
import { CaefSecurityGroup, CaefSecurityGroupProps, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefResolvableRole, CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from "@aws-caef/l3-construct";
import { CaefNoteBook, CaefNoteBookProps } from '@aws-caef/sagemaker-constructs';
import { AssetDeploymentProps, AssetProps, LifeCycleConfigHelper, LifecycleScriptProps } from "@aws-caef/sm-shared";
import { Stack } from "aws-cdk-lib";
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CfnNotebookInstanceLifecycleConfig, CfnNotebookInstanceLifecycleConfigProps } from 'aws-cdk-lib/aws-sagemaker';

export interface NotebookLifeCycleConfigProps {
  readonly onCreate?: LifecycleScriptProps
  readonly onStart?: LifecycleScriptProps
}

export interface NotebookAssetDeploymentConfig {
  readonly assetBucketName: string
  readonly assetDeploymentRoleArn: string
  readonly assetPrefix?: string
  readonly memoryLimitMB?: number
}

export interface NamedAssetProps {
  /** @jsii ignore */
  readonly [ name: string ]: AssetProps
}

export interface SagemakerNotebookL3ConstructProps extends CaefL3ConstructProps {
  readonly assetDeployment?: NotebookAssetDeploymentConfig
  readonly lifecycleConfigs?: NamedLifecycleConfigProps
  /**
   * List of sagemaker notebook instances to be launched.
   */
  readonly notebooks?: NotebookWithIdProps
  /**
   * Optional KMS key to encrypt the notebooks. If not specified, one will be created.
   */
  readonly kmsKeyArn?: string
}

export interface InstanceMetadataServiceConfiguration {
  readonly minimumInstanceMetadataServiceVersion: string;
}

export interface NamedLifecycleConfigProps {
  /**
 * Lifecycle config scripts
 */
  /** @jsii ignore */
  readonly [ name: string ]: NotebookLifeCycleConfigProps
}

export interface NotebookWithIdProps {
  /** @jsii ignore */
  readonly [ name: string ]: NotebookProps
}

export interface NotebookProps {
  readonly notebookName?: string
  readonly vpcId: string
  readonly subnetId: string
  readonly instanceType: string
  readonly securityGroupId?: string
  readonly securityGroupIngress?: CaefSecurityGroupRuleProps
  readonly securityGroupEgress?: CaefSecurityGroupRuleProps
  readonly notebookRole: CaefRoleRef
  readonly acceleratorTypes?: string[]
  readonly additionalCodeRepositories?: string[]
  readonly defaultCodeRepository?: string
  readonly instanceMetadataServiceConfiguration?: InstanceMetadataServiceConfiguration
  readonly platformIdentifier?: string
  readonly volumeSizeInGb?: number
  readonly rootAccess?: boolean
  readonly lifecycleConfigName?: string
}


//This stack creates and manages a SageMaker Studio Domain
export class SagemakerNotebookL3Construct extends CaefL3Construct {
  protected readonly props: SagemakerNotebookL3ConstructProps


  constructor( stack: Stack, id: string, props: SagemakerNotebookL3ConstructProps ) {
    super( stack, id, props );
    this.props = props
    const lifecycleConfigsMap = props.lifecycleConfigs ? this.createLifecycleConfigs( props.lifecycleConfigs ) : {}
    if ( this.props.notebooks ) this.createNotebooks( this.props.notebooks, lifecycleConfigsMap )

  }

  private createLifecycleConfigs ( lifecycleConfigs: NamedLifecycleConfigProps ): { [ k: string ]: CfnNotebookInstanceLifecycleConfig } {
    return Object.fromEntries( Object.entries( lifecycleConfigs ).map( entry => {
      const lifecycleName = entry[ 0 ]
      const lifecycleProps = entry[ 1 ]
      const lifecycleConfig = this.createLifecycleConfig( lifecycleName, lifecycleProps )
      return [ lifecycleName, lifecycleConfig ]
    } ) )
  }

  private createNotebooks ( notebooks: NotebookWithIdProps,
    lifecycleConfigsMap: { [ k: string ]: CfnNotebookInstanceLifecycleConfig } ) {
    if ( Object.keys( notebooks ).length > 0 ) {
      const resolvedRoles = Object.fromEntries( Object.entries( notebooks ).map( entry => {
        const resolved = this.props.roleHelper.resolveRoleRefWithRefId( entry[ 1 ].notebookRole, entry[ 0 ] )
        return [ entry[ 0 ], resolved ]
      } ) || [] )

      const kmsKey = this.props.kmsKeyArn ? Key.fromKeyArn( this, `imported-key`, this.props.kmsKeyArn ) :
        this.createKMSKey( 'notebooks', Object.entries( resolvedRoles ).map( x => x[ 1 ].arn() ) )

      Object.entries( notebooks ).forEach( entry => {
        const notebookId = entry[ 0 ]
        const notebookProps = entry[ 1 ]
        this.createNotebook( notebookId, notebookProps, kmsKey, lifecycleConfigsMap, resolvedRoles )
      } )
    }
  }

  private createNotebook ( notebookId: string,
    notebookProps: NotebookProps,
    kmsKey: IKey,
    lifecycleConfigsMap: { [ k: string ]: CfnNotebookInstanceLifecycleConfig },
    resolvedRoles: { [ k: string ]: CaefResolvableRole } ) {

    const securityGroup = notebookProps.securityGroupId ?
      SecurityGroup.fromSecurityGroupId( this, `${ notebookId }-sg`, notebookProps.securityGroupId ) :
      this.createSecurityGroup( notebookId, notebookProps )

    const lifecycleConfigName: string | undefined = notebookProps.lifecycleConfigName ?
      this.resolveLifecycleConfigName( notebookProps.lifecycleConfigName, lifecycleConfigsMap ) : undefined

    // Create notebook instance
    const createNotebookProps: CaefNoteBookProps = {
      notebookInstanceId: notebookId,
      naming: this.props.naming,
      notebookInstanceName: notebookProps.notebookName ?? notebookId,
      instanceType: notebookProps.instanceType,
      roleArn: resolvedRoles[ notebookId ].arn(),
      kmsKeyId: kmsKey.keyArn,
      acceleratorTypes: notebookProps.acceleratorTypes,
      additionalCodeRepositories: notebookProps.additionalCodeRepositories,
      defaultCodeRepository: notebookProps.defaultCodeRepository,
      instanceMetadataServiceConfiguration: notebookProps.instanceMetadataServiceConfiguration,
      lifecycleConfigName: lifecycleConfigName,
      platformIdentifier: notebookProps.platformIdentifier,
      volumeSizeInGb: notebookProps.volumeSizeInGb,
      securityGroupIds: [ securityGroup.securityGroupId ],
      subnetId: notebookProps.subnetId,
      rootAccess: notebookProps.rootAccess != undefined && notebookProps.rootAccess ? "Enabled" : undefined
    }

    new CaefNoteBook( this, notebookId, createNotebookProps )
  }

  /** @jsii ignore */
  private resolveLifecycleConfigName ( lifecycleConfigName: string, lifecycleConfigsMap: { [ name: string ]: CfnNotebookInstanceLifecycleConfig } ): string {
    if ( lifecycleConfigName.startsWith( "external:" ) ) {
      return lifecycleConfigName.replace( /^external:/, "" )
    } else {
      const nameRef = lifecycleConfigsMap[ lifecycleConfigName ]?.notebookInstanceLifecycleConfigName
      if ( !nameRef ) {
        throw new Error( `Non-existant lifecycle config referenced: ${ lifecycleConfigName }` )
      }
      return nameRef
    }
  }

  private createSecurityGroup ( notebookId: string, notebookProps: NotebookProps ): SecurityGroup {
    const notebookVpc = Vpc.fromVpcAttributes( this, 'vpc of' + notebookId, {
      availabilityZones: [ "dummy" ],
      vpcId: notebookProps.vpcId,
    } );
    const customEgress: boolean = ( notebookProps.securityGroupEgress?.ipv4 && notebookProps.securityGroupEgress?.ipv4.length > 0 ) ||
      ( notebookProps.securityGroupEgress?.prefixList && notebookProps.securityGroupEgress?.prefixList.length > 0 ) ||
      ( notebookProps.securityGroupEgress?.sg && notebookProps.securityGroupEgress?.sg.length > 0 ) || false

    const securityGroupProps: CaefSecurityGroupProps = {
      securityGroupName: notebookId,
      vpc: notebookVpc,
      naming: this.props.naming,
      ingressRules: notebookProps.securityGroupIngress,
      egressRules: notebookProps.securityGroupEgress,
      allowAllOutbound: !customEgress,
      addSelfReferenceRule: false
    }

    const securityGroup = new CaefSecurityGroup( this, `${ notebookId }-sg`, securityGroupProps )
    return securityGroup
  }

  private createKMSKey ( notebookName: string, roleArns: string[] ): IKey {
    const kmsKey = new CaefKmsKey( this, `kmskey-${ notebookName }`, {
      alias: `kmskey-${ notebookName }`,
      naming: this.props.naming
    } )

    // Allow execution role to use the key
    const kmsEncryptDecryptPolicy = new PolicyStatement( {
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: [ '*' ],
      actions: [
        ...DECRYPT_ACTIONS,
        ...ENCRYPT_ACTIONS,
        "kms:GenerateDataKeyWithoutPlaintext",
        "kms:CreateGrant",
        "kms:DescribeKey",
        "kms:ListAliases"
      ]
    } )
    roleArns.forEach( roleArn => kmsEncryptDecryptPolicy.addArnPrincipal( roleArn ) )
    kmsKey.addToResourcePolicy( kmsEncryptDecryptPolicy )
    return kmsKey
  }

  private createLifecycleConfig ( lifecycleName: string, lifecycleConfigProps: NotebookLifeCycleConfigProps ): CfnNotebookInstanceLifecycleConfig {

    const assetDeployment: AssetDeploymentProps | undefined = this.props.assetDeployment ? {
      scope: this,
      assetBucket: Bucket.fromBucketName( this, `asset-bucket-${ lifecycleName }`, this.props.assetDeployment.assetBucketName ),
      assetDeploymentRole: Role.fromRoleArn( this, `asset-role-${ lifecycleName }`, this.props.assetDeployment.assetDeploymentRoleArn ),
      assetPrefix: this.props.assetDeployment?.assetPrefix || `sagemaker-lifecycle-assets/notebooks`,
      memoryLimitMB: this.props.assetDeployment?.memoryLimitMB
    } : undefined

    const onStartContent = lifecycleConfigProps.onStart ? LifeCycleConfigHelper.createLifecycleConfigContents( lifecycleConfigProps.onStart, "onStart", assetDeployment ) : undefined
    const onCreateContent = lifecycleConfigProps.onCreate ? LifeCycleConfigHelper.createLifecycleConfigContents( lifecycleConfigProps.onCreate, "onCreate", assetDeployment ) : undefined

    const cfnLifecycleConfigProps: CfnNotebookInstanceLifecycleConfigProps = {
      notebookInstanceLifecycleConfigName: this.props.naming.resourceName( lifecycleName ),
      onStart: onStartContent ? [ { content: onStartContent } ] : undefined,
      onCreate: onCreateContent ? [ { content: onCreateContent } ] : undefined
    }
    const lifecycleConfig = new CfnNotebookInstanceLifecycleConfig( this, `${ lifecycleName }-lifecycle`, cfnLifecycleConfigProps )
    new CaefParamAndOutput( this, {
      naming: this.props.naming,
      resourceId: lifecycleName,
      resourceType: "lifecycle-config",
      name: "name",
      value: lifecycleConfig.getAtt( "NotebookInstanceLifecycleConfigName" ).toString()
    } )
    return lifecycleConfig
  }
}
