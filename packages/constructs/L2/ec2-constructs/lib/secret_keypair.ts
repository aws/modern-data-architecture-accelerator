/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps } from "@aws-caef/construct";
import { CaefCustomResourceProps, CaefCustomResource } from "@aws-caef/custom-constructs";
import { Duration, RemovalPolicy, SecretValue, Stack } from "aws-cdk-lib";
import { Effect, PolicyStatement, PrincipalBase } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { Secret, SecretProps } from "aws-cdk-lib/aws-secretsmanager";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

/**
 * Properties for creating a Secret Ec2 KeyPair 
 */
export interface CaefEC2SecretKeyPairProps extends CaefConstructProps {
    readonly name: string
    readonly kmsKey: IKey
    readonly readPrincipals?: PrincipalBase[]
}

/**
 * Construct for creating an Ec2 KeyPair which stores its key material in a Secret.
 * This can be used instead of the CfnKeyPair, which stores the key material in an SSM parameter.
 */
export class CaefEC2SecretKeyPair extends Construct {
    public readonly secret: Secret;
    public readonly name: string
    constructor( scope: Construct, id: string, props: CaefEC2SecretKeyPairProps ) {
        super( scope, id )

        this.name = props.naming.resourceName( props.name, 255 )

        const statement = new PolicyStatement( {
            effect: Effect.ALLOW,
            actions: [ 'ec2:CreateKeyPair' ],
            resources: [ `arn:${ Stack.of( scope ).partition }:ec2:${ Stack.of( scope ).region }:${ Stack.of( scope ).account }:key-pair/${ this.name }` ]
        } )

        const handlerProps = {
            keypairName: this.name
        }

        const crProps: CaefCustomResourceProps = {
            resourceType: "SecretKeyPair",
            code: Code.fromAsset( `${ __dirname }/../src/lambda/keypair` ),
            runtime: Runtime.PYTHON_3_12,
            handler: "keypair.lambda_handler",
            handlerRolePolicyStatements: [ statement ],
            handlerProps: handlerProps,
            naming: props.naming,
            handlerTimeout: Duration.seconds( 120 )
        }

        const cr = new CaefCustomResource( this, 'custom-resource', crProps )

        const keyPairId = cr.getAttString( 'key_pair_id' )
        const keyMaterial = cr.getAttString( 'key_material' )

        const secretProps: SecretProps = {
            secretName: this.name,
            encryptionKey: props.kmsKey,
            removalPolicy: RemovalPolicy.RETAIN,
            secretStringValue: new SecretValue( keyMaterial ),
            description: `Private key material for EC2 key pair ${ this.name }/${ keyPairId }`
        }

        this.secret = new Secret( this, `secret`, secretProps )

        if ( props.readPrincipals && props.readPrincipals.length > 0 ) {
            const secretAccessStatement = new PolicyStatement( {
                actions: [
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:GetSecretValue",
                ],
                resources: [
                    this.secret.secretArn
                ],
                principals: props.readPrincipals
            } )
            this.secret.addToResourcePolicy( secretAccessStatement )
        }

        NagSuppressions.addResourceSuppressions(
            this.secret,
            [
                {
                    id: 'AwsSolutions-SMG4',
                    reason: 'Secret is for EC2 Key Pair, which does not support rotation.',
                },
                {
                    id: 'NIST.800.53.R5-SecretsManagerRotationEnabled',
                    reason: 'Secret is for EC2 Key Pair, which does not support rotation.',
                },
                {
                    id: 'HIPAA.Security-SecretsManagerRotationEnabled',
                    reason: 'Secret is for EC2 Key Pair, which does not support rotation.',
                },
            ] );
    }
}
