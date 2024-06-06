/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from "@aws-mdaa/app";
import { NamedInitProps, NamedInstanceProps, NamedKeyPairProps, NamedSecurityGroupProps } from "@aws-mdaa/ec2-l3-construct";
import { MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";
import * as configSchema from './config-schema.json';

export interface InstanceConfigContents extends MdaaBaseConfigContents {
    /**
     * List of roles which will be granted access to the EC2 KMS Key
     * and KeyPair Secrets
     */
    readonly adminRoles: MdaaRoleRef[]
    /**
     * List of ec2 key pairs to be created.
     */
    readonly keyPairs?: NamedKeyPairProps
    /**
     * List of ec2 security groups to be created.
     */
    readonly securityGroups?: NamedSecurityGroupProps
    /**
     * List of  init objects to be created.
     */
    readonly cfnInit?: NamedInitProps
    /**
     * List of ec2 instances to be launched.
     */
    readonly instances?: NamedInstanceProps
}

export class InstanceConfigParser extends MdaaAppConfigParser<InstanceConfigContents> {
    public readonly keyPairs?: NamedKeyPairProps
    public readonly securityGroups?: NamedSecurityGroupProps
    public readonly cfnInit?: NamedInitProps
    public readonly instances?: NamedInstanceProps
    public readonly adminRoles: MdaaRoleRef[];
    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.adminRoles = this.configContents.adminRoles
        this.keyPairs = this.configContents.keyPairs
        this.cfnInit = this.configContents.cfnInit
        this.instances = this.configContents.instances
        this.securityGroups = this.configContents.securityGroups
    }
}

