/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AccountPrincipal, ArnPrincipal, Condition, Effect, IPrincipal, IRole, ISamlProvider, ManagedPolicy, PolicyDocument, PolicyStatement, PrincipalWithConditions, SamlMetadataDocument, SamlPrincipal, SamlProvider, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { readFileSync } from 'fs';

/**
 * Define UsageProfile types 
 */
export enum BasePersona {
    DATA_ADMIN     = "data-admin",
    DATA_ENGINEER  = "data-engineer",
    DATA_SCIENTIST = "data-scientist"
}

export interface PersonaConfigProps {
    readonly personas: { [ key: string]: Array<string>}
}

export interface FederationProps {
    /**
     * Arn of an existing provider
     */
    readonly providerArn?: string
    /**
     * Path to a SAML doc to be used to create a new provider
     */
    readonly samlDoc?: string
}

export interface GenerateManagedPolicyWithNameProps extends GenerateManagedPolicyProps {
    /**
     * Name of the managed policy.
     */
    readonly name: string
}

export interface GenerateManagedPolicyProps {
    /**
     * Managed policy document contents.
     */
    readonly policyDocument: PolicyDocument,
    /**
     * CDK Nag suppressions if policyDocument generates Nags.
     */
    readonly suppressions?: SuppressionProps[]
    /**
     * If true (default false), policy name will be set verbatim instead of using the naming class
     */
    readonly verbatimPolicyName?: boolean
    /**
     * Additional policy statements that may be added to policyDocument
     */
    readonly statements?: PolicyStatement[];
}
export interface SuppressionProps {
    readonly id: string
    readonly reason: string
}
export interface GenerateRoleWithNameProps extends GenerateRoleProps {
    /**
     * Name of the role.
     */
    readonly name: string,
}

export interface TrustedPrincipalProps {
    /**
     * The assume role trust config.
     */
    readonly trustedPrincipal: string,
    readonly additionalTrustedActions?: string[]
}

export interface GenerateRoleProps {
    /**
     * Intended base persona that the generated role should mimic
     * All the policies associated with specified persona will get associated with the generated role
     */
    readonly basePersona?: BasePersona,
    /**
     * The assume role trust config.
     */
    readonly trustedPrincipal: string,
    /**
     * Additional assume role trust configs.
     */
    readonly additionalTrustedPrincipals?: TrustedPrincipalProps[],
    /**
     * Conditions to apply to the assume role trust policy
     */
    readonly assumeRoleTrustConditions?: { [ key: string ]: Condition }
    /**
   * List of AWS Managed policies to associate to the role.
   */
    readonly awsManagedPolicies?: string[],
    /**
    * List of AWS Managed policies to associate to the role.
    */
    readonly customerManagedPolicies?: string[],
    /**
     * List of generated policies to associate to the role.
     */
    readonly generatedPolicies?: string[],
    /**
     * Suppressions if required by the role configuration.
     */
    readonly suppressions?: SuppressionProps[]
}

export interface RolesL3ConstructProps extends MdaaL3ConstructProps {
    /**
     * A map of federation names to federation definitions.
     */
    readonly federations?: { [ key: string ]: FederationProps };
    /**
     * A list of Managed Policies which will be created.
     */
    readonly generatePolicies?: GenerateManagedPolicyWithNameProps[];
    /**
     * A list of IAM roles which will be created.
     */
    readonly generateRoles?: GenerateRoleWithNameProps[];

}

interface MdaaPersonaAndManagedPolicies {
    /**
     * Map of persona names to list of managed policy names
     */
    readonly personaToMdaaPolicyMap: { [ personaName: string ]: string[] };
    /**
     * Map of managed policy-name to MDAA Managed Policy
     */
    readonly mdaaPolicies: { [ policyName: string ]: MdaaManagedPolicy };
}

export class RolesL3Construct extends MdaaL3Construct {
    protected readonly props: RolesL3ConstructProps
    protected readonly personaToMdaaPolicyMap: { [ personaName: string ]: string[] }
    protected readonly mdaaManagedPolicies: { [ policyName: string ]: MdaaManagedPolicy }

    public readonly generatedRoles: { [ key: string ]: IRole }

    constructor( scope: Construct, id: string, props: RolesL3ConstructProps ) {
        super( scope, id, props )
        this.props = props
        const mdaaPersonaAndManagedPolicies = this.createMdaaManagedPolicies()
        this.personaToMdaaPolicyMap = mdaaPersonaAndManagedPolicies.personaToMdaaPolicyMap
        this.mdaaManagedPolicies = mdaaPersonaAndManagedPolicies.mdaaPolicies
        const federationProviders = this.createFederations()
        const generatedPolicies = this.createManagedPolicies()
        this.generatedRoles = this.createRoles( federationProviders, generatedPolicies ) || {}
    }

    private createFederations (): { [ key: string ]: ISamlProvider } {
        const federations: { [ key: string ]: ISamlProvider } = {}
        Object.keys( this.props.federations || {} ).forEach( fedConfigName => {
            const fedConfig = ( this.props.federations || {} )[ fedConfigName ]
            if ( fedConfig.providerArn ) {
                if ( fedConfig.samlDoc ) {
                    throw new Error( "Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config" )
                }
                federations[ fedConfigName ] = SamlProvider.fromSamlProviderArn( this.scope, `resolved-provider-${ fedConfigName }`, fedConfig.providerArn )
            } else if ( fedConfig.samlDoc ) {
                if ( fedConfig.providerArn ) {
                    throw new Error( "Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config" )
                }
                const identityProvider = new SamlProvider( this.scope, `saml-provider-${ fedConfigName }`, {
                    name: this.props.naming.resourceName( fedConfigName ),
                    metadataDocument: SamlMetadataDocument.fromFile( fedConfig.samlDoc )
                } )
                federations[ fedConfigName ] = identityProvider
            } else {
                throw new Error( "Exactly one of 'providerArn' or 'samlDoc' should be specified in a Federation Config" )
            }
        } )
        return federations
    }

    private createManagedPolicies (): { [ key: string ]: ManagedPolicy } {
        const generatedPolicies: { [ key: string ]: ManagedPolicy } = {}
        this.props.generatePolicies?.forEach( policyProps => {

            const policy = new MdaaManagedPolicy( this.scope, `policy-${ policyProps.name }`, {
                naming: this.props.naming,
                managedPolicyName: policyProps.name,
                verbatimPolicyName: policyProps.verbatimPolicyName,
                document: policyProps.policyDocument
            } )
            generatedPolicies[ policyProps.name ] = policy
            if ( policyProps.suppressions ) {
                NagSuppressions.addResourceSuppressions(
                    policy,
                    policyProps.suppressions,
                    true
                );
            }
        } )
        return generatedPolicies
    }

    private createMdaaManagedPolicies (): MdaaPersonaAndManagedPolicies  {
        const personaToMdaaPolicyMap: { [ key: string ]: string[] } = {}
        const personaConfig = this.loadPolicyConfig("../policy-statements/persona-map.yaml") as PersonaConfigProps
        const mdaaPolicySet = new Set<string>()
        Object.entries(personaConfig.personas).map( ([ basePersona, personaProps]) => {
            personaProps.forEach( policyConfigFile => {
                mdaaPolicySet.add(policyConfigFile)
                if ( this.getFileName(policyConfigFile) ) {
                    if ( !personaToMdaaPolicyMap[ basePersona ] ) {
                        personaToMdaaPolicyMap[ basePersona ] = []
                    }
                    personaToMdaaPolicyMap[ basePersona ].push( this.getFileName(policyConfigFile) )                
                }
            })
        })

        const mdaaGeneratedPolicies: { [ key: string ]: MdaaManagedPolicy } = {}
        mdaaPolicySet.forEach( policyConfigFile => {
            const name = this.getFileName(policyConfigFile)
            if ( name ) {
                const managedPolicyProps = this.loadPolicyConfig(`../policy-statements/${policyConfigFile}.yaml`) as {statements?:PolicyStatement[]; suppressions? : SuppressionProps[] }
                const policyStatements: PolicyStatement[] = ( managedPolicyProps.statements || [] ).map( statement => {
                    return PolicyStatement.fromJson( statement )
                })
                // Create MDAA Managed Policy
                const mdaaPolicy = new MdaaManagedPolicy( this.scope, `mdaa-managed-policy-${name}`,{
                    naming: this.props.naming,
                    managedPolicyName: name,
                    document: new PolicyDocument({
                        statements: policyStatements
                    }),
                })
                
                // Add Suppression
                if ( managedPolicyProps.suppressions ) {
                    NagSuppressions.addResourceSuppressions(
                        mdaaPolicy,
                        managedPolicyProps.suppressions,
                        true
                    );
                }
                mdaaGeneratedPolicies[ name ] = mdaaPolicy
            }
        })

        return {
            personaToMdaaPolicyMap: personaToMdaaPolicyMap,
            mdaaPolicies: mdaaGeneratedPolicies
        }
    }

    private getFileName(policyConfigFile: string) {
        return policyConfigFile.split('/').pop() || '';
    }

    private createRoles ( federationProviders: { [ key: string ]: ISamlProvider }, generatedPolicies: { [ key: string ]: ManagedPolicy } ): { [ key: string ]: IRole } | undefined {
        const generatedRoles = this.props.generateRoles?.map( generateRole => {

            const awsManagedPolicies = generateRole.awsManagedPolicies?.map( policyName => MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition( this, policyName ) )
            const customerManagedPolicies = generateRole.customerManagedPolicies?.map( policyName => ManagedPolicy.fromManagedPolicyName( this.scope, `${ generateRole.name }-${ policyName }`, policyName ) )
            const managedPolicies = [ ...awsManagedPolicies || [], ...customerManagedPolicies || [] ]

            const resolvedTrustPrincipal = this.resolveTrustedPrincipal( generateRole.trustedPrincipal, federationProviders )
            const trustPrincipal = generateRole.assumeRoleTrustConditions ? new PrincipalWithConditions( resolvedTrustPrincipal, generateRole.assumeRoleTrustConditions ) : resolvedTrustPrincipal
            const role = new MdaaRole( this.scope, generateRole.name, {
                assumedBy: trustPrincipal,
                roleName: generateRole.name,
                managedPolicies: managedPolicies,
                naming: this.props.naming
            } )

            generateRole.additionalTrustedPrincipals?.forEach( trustPrincipalProps => {
                if ( role.assumeRolePolicy ) {
                    const trustPrincipal = this.resolveTrustedPrincipal( trustPrincipalProps.trustedPrincipal, federationProviders )
                    role.assumeRolePolicy.addStatements( new PolicyStatement( {
                        actions: [ trustPrincipal.assumeRoleAction, ...trustPrincipalProps.additionalTrustedActions || [] ],
                        principals: [ trustPrincipal ],
                        effect: Effect.ALLOW
                    } ) )
                }
            } )

            if ( generateRole.basePersona ){
                // Attach Mdaa Generated Policies to the roles based on the persona defined in 'persona-map.yaml'
                this.personaToMdaaPolicyMap[ generateRole.basePersona ].forEach( policyName => {
                    this.mdaaManagedPolicies[ policyName ].attachToRole( role )
                })
            }

            if ( generateRole.generatedPolicies ) {
                generateRole.generatedPolicies.forEach( policyNamRef => {
                    if ( !generatedPolicies[ policyNamRef ] ) {
                        throw new Error( `Role ${ generateRole.name } references non-existent policy: ${ policyNamRef }` )
                    } else {
                        generatedPolicies[ policyNamRef ].attachToRole( role )
                    }
                } )
            }

            if ( generateRole.suppressions ) {
                NagSuppressions.addResourceSuppressions(
                    role,
                    generateRole.suppressions,
                    true
                );
            }

            new StringParameter( role, `${ generateRole.name }-ssm-generated-role-arn`, {
                parameterName: this.props.naming.ssmPath( `generated-role/${ generateRole.name }/arn`, false ),
                stringValue: role.roleArn
            } )
            new StringParameter( role, `${ generateRole.name }-ssm-generated-role-id`, {
                parameterName: this.props.naming.ssmPath( `generated-role/${ generateRole.name }/id`, false ),
                stringValue: role.roleId
            } )
            return [ generateRole.name, role ]
        } )
        return Object.fromEntries( generatedRoles || [] )
    }

    private resolveTrustedPrincipal ( ref: string, federationProviders: { [ key: string ]: ISamlProvider } ): IPrincipal {
        if ( ref.startsWith( "service:" ) ) {
            return new ServicePrincipal( ref.replace( /^service:\s*/, "" ) )
        } else if ( ref.startsWith( "account:" ) ) {
            return new AccountPrincipal( ref.replace( /^account:\s*/, "" ) )
        } else if ( ref.startsWith( "arn:" ) ) {
            return new ArnPrincipal( ref )
        } else if ( ref.startsWith( "federation:" ) ) {
            const federation = federationProviders[ ref.replace( /^federation:\s*/, "" ) ]
            if ( !federation ) {
                throw new Error( `Role references non-existent federation in config: ${ ref }` )
            }
            return new SamlPrincipal( federation, {} )
        } else if ( ref == 'this_account' ) {
            return new AccountPrincipal( this.account )
        } else {
            throw new Error( "Trusted principal must start with service:, account:, federation: or equal 'this_account'" )
        }
    }

    private loadPolicyConfig(fileName: string) {
        const configFilePath = resolve(__dirname, fileName);
        console.log("Reading config file from path" + configFilePath);
        try {
    
            //  Read the configuration file
            const rawConfigFile = readFileSync(configFilePath, 'utf8');
            const rawConfig:{ [x: string]: any } = parse(rawConfigFile);
            return rawConfig
        }
        catch (err) {
            console.log(err);
            throw err;
        }
        
    }

    
}




