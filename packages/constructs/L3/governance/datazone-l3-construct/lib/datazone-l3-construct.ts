/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { CfnDomain, CfnEnvironmentBlueprintConfiguration } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { PolicyStatement, Effect, ServicePrincipal, Conditions } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';

export interface EnvironmentBlueprintConfig {
    readonly enabledRegions: string[];
}

export interface EnvironmentBlueprints {
    readonly dataLake?: EnvironmentBlueprintConfig;
    readonly dataWarehouse?: EnvironmentBlueprintConfig;
}

export interface DomainProps {
    readonly description?: string;
    readonly singleSignOnType: string;
    readonly userAssignment: string;

    readonly environmentBlueprints?: EnvironmentBlueprints;
}
export interface NamedDomainsProps {
    /** @jsii ignore */
    readonly [ name: string ]: DomainProps;
}
export interface DataZoneL3ConstructProps extends MdaaL3ConstructProps {
    readonly domains?: NamedDomainsProps;
}

enum EnvironmentBlueprintIdentifier {
    DataLake = "DefaultDataLake",
    DataWarehouse = "DefaultDataWarehouse"
}

const DEFAULT_SSO_TYPE = "DISABLED"
const DEFAULT_USER_ASSIGNMENT = "MANUAL"

export class DataZoneL3Construct extends MdaaL3Construct {
    protected readonly props: DataZoneL3ConstructProps;

    constructor( scope: Construct, id: string, props: DataZoneL3ConstructProps ) {
        super( scope, id, props );
        this.props = props;

        Object.entries(this.props.domains || {}).forEach(entry => {
            const domainName = entry[0];
            const domainProps = entry[1];

            // Create KMS Key
            const kmsKey = new MdaaKmsKey(this.scope, `${domainName}-cmk`, {
                naming: this.props.naming,
            });
            
            // Resolve Execution Role
            const executionRole = this.createExecutionRole(`${domainName}-execution-role`, kmsKey.keyArn)

            const singleSignOn: CfnDomain.SingleSignOnProperty =  {
                type: domainProps.singleSignOnType ?? DEFAULT_SSO_TYPE,
                userAssignment: domainProps.userAssignment ?? DEFAULT_USER_ASSIGNMENT
            };

            // Create domain
            const domain = new CfnDomain(this.scope, `${domainName}-domain`, {
                domainExecutionRole: executionRole.roleArn,
                name: this.props.naming.resourceName(domainName),
                kmsKeyIdentifier: kmsKey.keyArn,
                description: domainProps.description,
                singleSignOn: singleSignOn
            });

            // Enable blueprints
            if (domainProps.environmentBlueprints) {
                const provisioningRole = this.createProvisioningRole(`${domainName}-provisioning-role`)

                if (domainProps.environmentBlueprints.dataLake) {
                    const dataLakeManageAccessRole = this.createDataLakeManageAccessRole(`${domainName}-datalake-manage-role`, domain)

                    new CfnEnvironmentBlueprintConfiguration(this.scope, `${domainName}-${EnvironmentBlueprintIdentifier.DataLake}-blueprint`, {
                        domainIdentifier: domain.attrId,
                        enabledRegions: domainProps.environmentBlueprints.dataLake.enabledRegions,
                        environmentBlueprintIdentifier: EnvironmentBlueprintIdentifier.DataLake,
                        manageAccessRoleArn: dataLakeManageAccessRole.roleArn,
                        provisioningRoleArn: provisioningRole.roleArn
                    });
                }
    
                if (domainProps.environmentBlueprints.dataWarehouse) {
                    const dataWarehouseManageAccessRole = this.createDataWarehouseManageAccessRole(`${domainName}-datawarehouse-manage-role`, domain)

                    new CfnEnvironmentBlueprintConfiguration(this.scope, `${domainName}-${EnvironmentBlueprintIdentifier.DataWarehouse}-blueprint`, {
                        domainIdentifier: domain.attrId,
                        enabledRegions: domainProps.environmentBlueprints.dataWarehouse.enabledRegions,
                        environmentBlueprintIdentifier: EnvironmentBlueprintIdentifier.DataWarehouse,
                        manageAccessRoleArn: dataWarehouseManageAccessRole.roleArn,
                        provisioningRoleArn: provisioningRole.roleArn
                    });
                }
            }
        })
    }

    /**
     * Creates an Execution Role for a DataZone Domain
     * @param roleName name to use for the role
     * @param kmsArn KMS key ARN created for the domain
     * @returns a Role
     */
    private createExecutionRole(roleName: string, kmsArn: string): MdaaRole {
        const executionRoleCondition: Conditions = {
            "StringEquals": {
                "aws:SourceAccount": this.account
            },
            "ForAllValues:StringLike": {
                "aws:TagKeys": "datazone*"
            }
        }

        const executionRole = new MdaaRole(this.scope, roleName, {
            naming: this.props.naming,
            roleName: roleName,
            assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition),
            managedPolicies: [
                MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy')
            ]
        });

        executionRole.assumeRolePolicy?.addStatements(new PolicyStatement({
            actions: ['sts:TagSession'],
            principals: [
                new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition)
            ],
          }))

        executionRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "kms:Decrypt",
                "kms:GenerateDataKey"
            ],
            resources: [kmsArn]
        }))

        NagSuppressions.addResourceSuppressions(executionRole, [
            { 
                id: 'AwsSolutions-IAM4', 
                reason: 'Permissions are related DataZone and only one permission is given to RAM to get share associations.'
            },
            {
                id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                reason: 'Permission to use Key for DataZone. No other role requires this.'
            },
            {
                id: 'HIPAA.Security-IAMNoInlinePolicy',
                reason: 'Permission to use Key for DataZone. No other role requires this.'
            }
        ], true)

        return executionRole;
    }

    /**
     * Creates the Provisioning Role for a domain. This role is needed when at least one blueprint is used.
     *
     * @param roleName name to use for the role
     * @returns a Role
     */
    private createProvisioningRole(roleName: string): MdaaRole {
        const provisioningRole = new MdaaRole(this.scope, roleName, {
            naming: this.props.naming,
            roleName: roleName,
            assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions({
                "StringEquals": {
                    "aws:SourceAccount": this.account
                }
            }),
            managedPolicies: [
                MdaaManagedPolicy.fromAwsManagedPolicyName('AmazonDataZoneRedshiftGlueProvisioningPolicy')
            ],
        });

        NagSuppressions.addResourceSuppressions(provisioningRole, [
            { 
                id: 'AwsSolutions-IAM4', 
                reason: 'Permissions are restricted one AWS Account.'
            }
        ])

        return provisioningRole;
    }

    /**
     * Creates the Manage Access Role for Data Lake Blueprint.
     *
     * @param roleName name to use for the role
     * @param domain domain to authorize
     * @returns a Role
     */
    private createDataLakeManageAccessRole(roleName: string, domain: CfnDomain): MdaaRole {
        const manageAccessRole = new MdaaRole(this.scope, roleName, {
            naming: this.props.naming,
            roleName: roleName,
            assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions({
                "StringEquals": {
                    "aws:SourceAccount": this.account
                },
                "ArnEquals": {
                    "aws:SourceArn": domain.attrArn
                }
            }),
            managedPolicies: [
                MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneGlueManageAccessRolePolicy')
            ],
        });

        NagSuppressions.addResourceSuppressions(manageAccessRole, [
            { 
                id: 'AwsSolutions-IAM4', 
                reason: 'Permissions are restricted to one DataZone Domain and to one AWS Account.'
            }
        ])

        return manageAccessRole;
    }

    /**
     * Creates the Manage Access Role for Data Warehouse Blueprint.
     *
     * @param roleName name to use for the role
     * @param domain domain to authorize
     * @returns a Role
     */
    private createDataWarehouseManageAccessRole(roleName: string, domain: CfnDomain): MdaaRole {
        const manageAccessRole = new MdaaRole(this.scope, roleName, {
            naming: this.props.naming,
            roleName: roleName,
            assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions({
                "StringEquals": {
                    "aws:SourceAccount": this.account
                },
                "ArnEquals": {
                    "aws:SourceArn": domain.attrArn
                }
            }),
            managedPolicies: [
                MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneRedshiftManageAccessRolePolicy')
            ],
        });

        manageAccessRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "secretsmanager:GetSecretValue"
            ],
            resources: ["*"],
            conditions: {
                "StringEquals": {
                    "secretsmanager:ResourceTag/AmazonDataZoneDomain": domain.attrId
                },
                "Null": {
                    "secretsmanager:ResourceTag/AmazonDataZoneProject": "false"
                }
            } 
        }))

        NagSuppressions.addResourceSuppressions(manageAccessRole, [
            { 
                id: 'AwsSolutions-IAM4', 
                reason: 'Permissions are restricted to one DataZone Domain and to one AWS Account.'
            },
            {
                id: 'NIST.800.53.R5-IAMNoInlinePolicy',
                reason: 'Permission to get a secret and restricted to tagged resource. Specific to data warehouse blueprint.'
            },
            {
                id: 'HIPAA.Security-IAMNoInlinePolicy',
                reason: 'Permission to get a secret and restricted to tagged resource. Specific to data warehouse blueprint.'
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Resource names are not known and this is restricted to only resources tagged with DataZone domain specific tag.'
            }
        ], true)

        return manageAccessRole;
    }
}
