/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';

import { AccessPolicyProps, BucketDefinition, InventoryDefinition, LifecycleConfigurationRuleProps, LifecycleTransitionProps } from '@aws-caef/datalake-l3-construct';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface BucketConfig {
    /**
     * List of access policies names which will be applied to the bucket
     */
    readonly accessPolicies: string[]
    /**
     * List of inventory configurations to be applied to the bucket
     */
    readonly inventories?: { [ key: string ]: InventoryDefinition }
    /**
     * If true, EventBridgeNotifications will be enabled on the bucket, allowing bucket data events to be matched and actioned by EventBridge rules
     */
    readonly enableEventBridgeNotifications?: boolean
    /**
     * Locations which will be created as LakeFormation resources using the specified role.
     */
    readonly lakeFormationLocations?: { [ key: string ]: LakeFormationLocationConfig }
    /**
     * If true (default), a "folder" object will be created on the bucket for each applied access policy.
     */
    readonly createFolderSkeleton?: boolean
    /**
     * S3 Lifecycle configuration .
     */
    readonly lifecycleConfiguration?: string
    /**
     * If true (default), any roles not explicitely listed in the config will be blocked from reading/writing objects from this s3 bucket.
     */
    readonly defaultDeny?: boolean
}

export interface LakeFormationLocationConfig {
    /**
     * The S3 prefix of the location
     */
    readonly prefix: string
}

export interface AccessPolicyRuleConfig {
    /**
     * The S3 Prefix where the policy will be applied.
     */
    readonly prefix: string,
    /**
     * List of config roles which will be provided readonly access via this policy.
     */
    readonly ReadRoles?: string[],
    /**
     * List of config roles which will be provided readwrite access via this policy.
     */
    readonly ReadWriteRoles?: string[],
    /**
     * List of config roles which will be provided superuser access via this policy.
     */
    readonly ReadWriteSuperRoles?: string[],
}

export interface AccessPolicyConfig {
    /**
     * The access policy rule
     */
    readonly rule: AccessPolicyRuleConfig
}

export interface LifecycleTransitionConfig {
    /**
     * Lifecycle Transition Rule
     */
    readonly Days: number,
    readonly StorageClass: string,
    readonly NewerNoncurrentVersions?: number
}

export interface LifecycleConfigurationRuleConfig {
    /**
     * Lifecycle configuration rule
     */
    readonly Status: string,
    readonly Prefix?: string,
    readonly ObjectSizeGreaterThan?: number,
    readonly ObjectSizeLessThan?: number,
    readonly AbortIncompleteMultipartUploadAfter?: number,
    readonly Transitions?: LifecycleTransitionConfig[],
    readonly ExpirationDays?: number,
    readonly ExpiredObjectDeleteMarker?: boolean,
    readonly NoncurrentVersionTransitions?: LifecycleTransitionConfig[],
    readonly NoncurrentVersionExpirationDays?: number,
    readonly NoncurrentVersionsToRetain?: number
}

export interface LifecycleConfigurationConfig {
    [ ruleName: string ]: LifecycleConfigurationRuleConfig
}

export interface DataLakeConfigContents extends CaefBaseConfigContents {
    /**
     * Map of named role references to be used within accessPolicies. A single config role
     * can reference multiple physical roles.
     */
    readonly roles: { [ key: string ]: CaefRoleRef[] }
    /**
     * Map of named accessPolicies which will be referenced by bucket definitions.
     */
    readonly accessPolicies: { [ key: string ]: AccessPolicyConfig }
    /**
    /**
     * Map of named lifecycleConfigurations which will be referenced by bucket definitions.
     */
    readonly lifecycleConfigurations?: { [ configName: string ]: LifecycleConfigurationConfig }
    /**
     * List of bucket definitions
     */
    readonly buckets: { [ key: string ]: BucketConfig }
}



export class DataLakeConfigParser extends CaefAppConfigParser<DataLakeConfigContents> {

    public readonly roles: { [ key: string ]: CaefRoleRef[] }
    public readonly buckets: BucketDefinition[]
    public readonly accessPolicies: { [ name: string ]: AccessPolicyProps }
    public readonly lifecycleConfigurations?: { [ configName: string ]: LifecycleConfigurationRuleProps[] }
    public readonly inventories?: { [ key: string ]: string }

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.roles = this.configContents.hasOwnProperty( 'roles' ) ? this.configContents[ 'roles' ] : {}
        this.accessPolicies = this.configContents.hasOwnProperty( 'accessPolicies' ) ? this.buildAccessPolicies( this.configContents.accessPolicies ) : {}
        this.lifecycleConfigurations = this.configContents.lifecycleConfigurations ? this.buildLifecycleConfigurations( this.configContents.lifecycleConfigurations ) : undefined

        this.buckets = Object.entries( this.configContents.buckets ).map( zoneAndBucketConfig => {
            const bucketZone: string = zoneAndBucketConfig[ 0 ]
            const configBucketProps: BucketConfig = zoneAndBucketConfig[ 1 ]
            const accessPolicies = configBucketProps.accessPolicies.map( accessPolicyName => {
                if ( !this.accessPolicies.hasOwnProperty( accessPolicyName ) ) {
                    throw new Error( `${ accessPolicyName } is required in 'buckets' definition ${ bucketZone } but not defined in 'accessPolicies'` )
                }
                return {
                    ...this.accessPolicies[ accessPolicyName ], ...{
                        name: accessPolicyName,
                    }
                }
            } )
            const lakeFormationLocations = Object.fromEntries( Object.keys( configBucketProps.lakeFormationLocations || {} ).map( lfLocationName => {
                const lfLocation = ( configBucketProps.lakeFormationLocations || {} )[ lfLocationName ]
                return [ lfLocationName, {
                    prefix: lfLocation.prefix
                } ]
            } ) )

            const lifecycleConfiguration: LifecycleConfigurationRuleProps[] =
                configBucketProps.lifecycleConfiguration && this.lifecycleConfigurations ?
                    this.lifecycleConfigurations[ configBucketProps.lifecycleConfiguration ] : []


            return {
                ...configBucketProps, ...{
                    bucketZone: bucketZone,
                    accessPolicies: accessPolicies,
                    lakeFormationLocations: lakeFormationLocations,
                    lifecycleConfiguration: lifecycleConfiguration
                }
            }
        } )
    }

    private buildAccessPolicies ( accessPolicyConfigs: { [ key: string ]: AccessPolicyConfig } ): { [ name: string ]: AccessPolicyProps } {
        const accessPolicies: { [ name: string ]: AccessPolicyProps } = {}
        Object.entries( accessPolicyConfigs ).forEach( nameAndPolicyConfig => {
            const policyName: string = nameAndPolicyConfig[ 0 ]
            const policyConfig: AccessPolicyConfig = nameAndPolicyConfig[ 1 ]

            const readRoles: string[] = policyConfig.rule.ReadRoles || []
            const readWriteRoles: string[] = policyConfig.rule.ReadWriteRoles || []
            const readWriteSuperRoles: string[] = policyConfig.rule.ReadWriteSuperRoles || []

            const s3Prefix: string = policyConfig.rule.prefix

            const accessPolicy: AccessPolicyProps = {
                name: policyName,
                s3Prefix: s3Prefix,
                readRoleRefs: readRoles.map( x => this.roles[ x ] ).flat(),
                readWriteRoleRefs: readWriteRoles.map( x => this.roles[ x ] ).flat(),
                readWriteSuperRoleRefs: readWriteSuperRoles.map( x => this.roles[ x ] ).flat()
            }

            accessPolicies[ policyName ] = accessPolicy
        } )
        return accessPolicies;
    }

    private buildLifecycleConfigurations ( arglifecycleConfigurations: { [ configName: string ]: LifecycleConfigurationConfig } ): { [ configName: string ]: LifecycleConfigurationRuleProps[] } {
        let lifecycleConfigurationProps: { [ configName: string ]: LifecycleConfigurationRuleProps[] } = {}
        Object.entries( arglifecycleConfigurations ).forEach( nameAndLifecycleConfig => {
            const lifecycleConfigName: string = nameAndLifecycleConfig[ 0 ]
            const lifecycleConfigConfig: LifecycleConfigurationConfig = nameAndLifecycleConfig[ 1 ]
            const lifecycleConfigurationRules: LifecycleConfigurationRuleProps[] = Object.entries( lifecycleConfigConfig ).map( ruleNameAndRuleConfig => {
                const ruleName: string = ruleNameAndRuleConfig[ 0 ]
                const ruleConfig: LifecycleConfigurationRuleConfig = ruleNameAndRuleConfig[ 1 ]
                let transitions: LifecycleTransitionProps[] = []
                ruleConfig.Transitions?.forEach( transitionConfig => {
                    let transition: LifecycleTransitionProps = {
                        days: transitionConfig.Days,
                        storageClass: transitionConfig.StorageClass
                    }
                    transitions.push( transition )
                } )

                const noncurrentVersionTransitions: LifecycleTransitionProps[] | undefined = ruleConfig.NoncurrentVersionTransitions?.map( transitionConfig => {
                    let transition: LifecycleTransitionProps = {
                        days: transitionConfig.Days,
                        storageClass: transitionConfig.StorageClass,
                        newerNoncurrentVersions: transitionConfig.NewerNoncurrentVersions
                    }
                    return transition
                } )

                const lifecycleConfigRule: LifecycleConfigurationRuleProps = {
                    id: ruleName,
                    status: ruleConfig.Status,
                    prefix: ruleConfig.Prefix,
                    objectSizeGreaterThan: ruleConfig.ObjectSizeGreaterThan,
                    objectSizeLessThan: ruleConfig.ObjectSizeLessThan,
                    abortIncompleteMultipartUploadAfter: ruleConfig.AbortIncompleteMultipartUploadAfter,
                    expirationdays: ruleConfig.ExpirationDays,
                    expiredObjectDeleteMarker: ruleConfig.ExpiredObjectDeleteMarker,
                    noncurrentVersionExpirationDays: ruleConfig.NoncurrentVersionExpirationDays,
                    noncurrentVersionsToRetain: ruleConfig.NoncurrentVersionsToRetain,
                    transitions: transitions,
                    noncurrentVersionTransitions: noncurrentVersionTransitions
                }

                return lifecycleConfigRule
            } )
            lifecycleConfigurationProps[ lifecycleConfigName ] = lifecycleConfigurationRules
        } )
        return lifecycleConfigurationProps;
    }
}