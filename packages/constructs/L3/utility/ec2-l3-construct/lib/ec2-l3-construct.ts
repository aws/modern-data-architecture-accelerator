/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockDeviceProps,
  MdaaEC2Instance,
  MdaaEC2InstanceProps,
  MdaaEC2SecretKeyPair,
  MdaaEC2SecretKeyPairProps,
  MdaaNetworkInterface,
  MdaaNetworkInterfaceProps,
  MdaaSecurityGroup,
  MdaaSecurityGroupProps,
  MdaaSecurityGroupRuleProps,
} from '@aws-mdaa/ec2-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  ApplyCloudFormationInitOptions,
  CfnInstance,
  CfnNetworkInterfaceAttachment,
  CloudFormationInit,
  ConfigSetProps,
  IMachineImage,
  InitCommand,
  InitCommandOptions,
  InitCommandWaitDuration,
  InitConfig,
  InitElement,
  InitFile,
  InitFileOptions,
  InitPackage,
  InitService,
  InitServiceOptions,
  InitServiceRestartHandle,
  Instance,
  InstanceType,
  ISecurityGroup,
  CfnSecurityGroupEgress,
  CfnSecurityGroupIngress,
  IPeer,
  LocationPackageOptions,
  MachineImageConfig,
  NamedPackageOptions,
  OperatingSystemType,
  Peer,
  Port,
  SecurityGroup,
  Subnet,
  UserData,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { NagPackSuppression } from 'cdk-nag';
import { Annotations, Duration, Token } from 'aws-cdk-lib';
import { MdaaConfigRefValueTransformer, MdaaConfigRefValueTransformerProps } from '@aws-mdaa/config';

/**
 * Map of security group names to their configurations.
 */
export interface NamedSecurityGroupProps {
  /** @jsii ignore */
  readonly [name: string]: SecurityGroupProps;
}
/**
 * Security group configuration for VPC network access control.
 */
export interface SecurityGroupProps {
  /**
   * VPC where the security group will be created.
   *
   * Use cases: VPC-scoped network isolation; Multi-tier application security
   *
   * AWS: EC2 SecurityGroup VpcId
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Inbound traffic rules. Supports ipv4 CIDR, prefix list, and security group sources.
   *
   * Use cases: Application port access; Client connectivity; Service ingress
   *
   * AWS: EC2 SecurityGroup ingress rules
   *
   * Validation: Optional; valid MdaaSecurityGroupRuleProps
   */
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Outbound traffic rules. All egress is allowed by default.
   * Supports ipv4 CIDR, prefix list, and security group destinations.
   *
   * Use cases: VPC endpoint access via prefix lists; Restricted outbound connectivity
   *
   * AWS: EC2 SecurityGroup egress rules
   *
   * Validation: Optional; valid MdaaSecurityGroupRuleProps
   */
  readonly egressRules?: MdaaSecurityGroupRuleProps;
  /**
   * When true, adds bidirectional rules allowing instances in this security group
   * to communicate with each other.
   *
   * Use cases: Cluster node communication; Application tier internal traffic
   *
   * AWS: EC2 SecurityGroup self-referencing ingress rule
   *
   * Validation: Optional; boolean
   */
  readonly addSelfReferenceRule?: boolean;
}
/**
 * Map of rule-set names to ingress/egress rules added to a pre-existing security group.
 */
export interface NamedSecurityGroupRulesProps {
  /** @jsii ignore */
  readonly [name: string]: SecurityGroupRulesProps;
}
/**
 * Ingress/egress rules added to a security group that already exists (created by another
 * module). Unlike securityGroups, this does not create a security group; it only authorizes
 * additional rules on an existing one referenced by id. This is the declarative way to wire
 * connectivity between two security groups owned by different modules without creating a
 * circular cross-stack dependency, since each rule references the peer group only by id.
 */
export interface SecurityGroupRulesProps {
  /**
   * Id of the existing security group to which the rules will be added.
   *
   * Use cases: Cross-module security group wiring; Connectivity to externally-owned groups
   *
   * AWS: EC2 SecurityGroupIngress/SecurityGroupEgress GroupId
   *
   * Validation: Required; existing security group id (supports ssm: references)
   */
  readonly securityGroupId: string;
  /**
   * Inbound traffic rules added to the existing security group. Supports ipv4 CIDR, prefix
   * list, and security group sources.
   *
   * Use cases: Allowing an externally-owned peer group to reach this group
   *
   * AWS: EC2 SecurityGroupIngress
   *
   * Validation: Optional; valid MdaaSecurityGroupRuleProps
   */
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Outbound traffic rules added to the existing security group. Supports ipv4 CIDR, prefix
   * list, and security group destinations.
   *
   * Use cases: Allowing this group to reach an externally-owned peer group
   *
   * AWS: EC2 SecurityGroupEgress
   *
   * Validation: Optional; valid MdaaSecurityGroupRuleProps
   */
  readonly egressRules?: MdaaSecurityGroupRuleProps;
}
/**
 * EC2 key pair configuration with optional KMS encryption for the private key secret.
 */
export interface KeyPairProps {
  /**
   * KMS key ARN to encrypt the key pair's private key in Secrets Manager.
   * If omitted, the module's KMS CMK is used.
   *
   * Use cases: Bring-your-own-key encryption; Compliance-specific key management
   *
   * AWS: KMS key for Secrets Manager secret encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly kmsKeyArn?: string;
}
/**
 * Map of key pair names to their configurations.
 */
export interface NamedKeyPairProps {
  /** @jsii ignore */
  readonly [name: string]: KeyPairProps;
}
/**
 * Map of CloudFormation Init configuration names to their definitions.
 */
export interface NamedInitProps {
  /** @jsii ignore */
  readonly [name: string]: InitProps;
}
/**
 * CloudFormation Init definition containing ordered config sets and config definitions.
 */
export interface InitProps {
  /**
   * Named config sets defining ordered execution sequences of configs.
   * If initOptions.configSets is not specified, the "default" config set runs.
   *
   * Use cases: Multi-stage bootstrap ordering; Environment-specific init sequences
   *
   * AWS: CloudFormation::Init configSets
   *
   * Validation: Required; map of config set name to ConfigSetsProps
   */
  readonly configSets: NamedConfigSetsProps;
  /**
   * Named config definitions containing packages, files, commands, and services.
   * Referenced by name from configSets.
   *
   * Use cases: Modular bootstrap definitions; Reusable config blocks
   *
   * AWS: CloudFormation::Init configs
   *
   * Validation: Required; map of config name to ConfigProps
   */
  readonly configs: NamedConfigProps;
}
/**
 * Map of config set names to their ordered config lists.
 */
export interface NamedConfigSetsProps {
  /** @jsii ignore */
  readonly [name: string]: ConfigSetsProps;
}
/**
 * A config set defining an ordered list of config names to execute.
 */
export interface ConfigSetsProps {
  /**
   * Ordered list of config names to execute. Names must match entries in the
   * configs section. Execution follows the listed order.
   *
   * Use cases: Multi-stage bootstrap ordering; Dependency-aware initialization
   *
   * AWS: CloudFormation::Init configSets
   *
   * Validation: Required; array of config name strings
   */
  readonly configs: string[];
}

/**
 * Map of config names to their definitions.
 */
export interface NamedConfigProps {
  /** @jsii ignore */
  readonly [name: string]: ConfigProps;
}
/**
 * A single CloudFormation Init config containing packages, groups, users,
 * sources, files, commands, and services to apply during bootstrap.
 */
export interface ConfigProps {
  /**
   * Software packages to install. Supports apt, msi, python, rpm, rubygems, yum, and Zypper.
   * On Windows, only the MSI installer is supported.
   *
   * Use cases: Automated software installation; OS-level dependency management
   *
   * AWS: CloudFormation::Init packages
   *
   * Validation: Optional; map of package identifier to PackageProps
   */
  readonly packages?: NamedPackageProps;
  /**
   * Linux/UNIX groups to create. Not supported on Windows.
   *
   * Use cases: Application-specific group creation; GID management
   *
   * AWS: CloudFormation::Init groups
   *
   * Validation: Optional; map of group name to GroupProps
   */
  readonly groups?: NamedGroupProps;
  /**
   * Linux/UNIX user accounts to create. Not supported on Windows.
   *
   * Use cases: Application service accounts; User provisioning with group membership
   *
   * AWS: CloudFormation::Init users
   *
   * Validation: Optional; map of username to UserProps
   */
  readonly users?: NamedUserProps;
  /**
   * Archive files to download and extract into target directories.
   * Supported on both Linux and Windows.
   *
   * Use cases: Application artifact extraction; Config archive deployment
   *
   * AWS: CloudFormation::Init sources
   *
   * Validation: Optional; map of target directory path to SourceProps
   */
  readonly sources?: NamedSourceProps;
  /**
   * Files to create on the instance. Content is pulled from a local source file.
   *
   * Use cases: Configuration file deployment; Script placement
   *
   * AWS: CloudFormation::Init files
   *
   * Validation: Optional; map of filename to FileProps
   */
  readonly files?: NamedFileProps;
  /**
   * Commands to execute on the instance, processed in alphabetical order of their key names.
   *
   * Use cases: Post-install configuration; Custom setup scripts
   *
   * AWS: CloudFormation::Init commands
   *
   * Validation: Optional; map of command identifier to CommandProps
   */
  readonly commands?: NamedCommandProps;
  /**
   * System services to enable, disable, or restart.
   * Uses sysvinit/systemd on Linux, Windows Service Manager on Windows.
   *
   * Use cases: Service lifecycle management; Boot-time service configuration
   *
   * AWS: CloudFormation::Init services
   *
   * Validation: Optional; map of OS service name to ServiceProps
   */
  readonly services?: NamedServiceProps;
}
/**
 * Map of package identifiers to their configurations.
 */
export interface NamedPackageProps {
  /**
   * Refers to package to be installed
   * key could be any string, and is just a reference, not used for package itself.
   */
  /** @jsii ignore */
  readonly [name: string]: PackageProps;
}
/**
 * Package installation configuration for CloudFormation Init.
 * Supports msi, rpm, gem, yum, python, and apt package managers.
 */
export interface PackageProps {
  /**
   * Package manager to use for installation.
   *
   * Use cases: Cross-platform package installation; OS-specific package management
   *
   * AWS: CloudFormation::Init packages
   *
   * Validation: Required; msi | rpm | gem | yum | python | apt
   */
  readonly packageManager: string;
  /**
   * URL or path for MSI/RPM package file installation.
   * Required for msi and rpm package managers.
   *
   * Use cases: Direct MSI/RPM installation; Custom package deployment
   *
   * AWS: CloudFormation::Init package location
   *
   * Validation: Optional; valid URL or path; required for msi/rpm
   */
  readonly packageLocation?: string;
  /**
   * Repository package name for gem, yum, python, and apt managers.
   *
   * Use cases: Repository-based package installation; Standard package deployment
   *
   * AWS: CloudFormation::Init package name
   *
   * Validation: Optional; required for gem/yum/python/apt
   */
  readonly packageName?: string;
  /**
   * Specific versions to install. Empty array installs latest.
   *
   * Use cases: Version pinning; Controlled software deployment
   *
   * AWS: CloudFormation::Init package versions
   *
   * Validation: Optional; array of version strings
   */
  readonly packageVersions?: string[];
  /**
   * Identifier key for MSI/RPM packages. Free-form reference string.
   *
   * Use cases: Package tracking; MSI/RPM package identification
   *
   * AWS: CloudFormation::Init package key
   *
   * Validation: Optional; string
   */
  readonly key?: string;
  /**
   * When true, restarts associated services after package installation.
   *
   * Use cases: Post-install service refresh; Configuration activation
   *
   * AWS: CloudFormation::Init restart handle
   *
   * Validation: Optional; boolean
   */
  readonly restartRequired?: boolean;
}

/**
 * Map of group names to their configurations. Linux/UNIX only.
 */
export interface NamedGroupProps {
  /** @jsii ignore */
  readonly [name: string]: GroupProps;
}
/**
 * Linux/UNIX group configuration for CloudFormation Init.
 */
export interface GroupProps {
  /**
   * Specific numeric group ID. If omitted, the OS assigns one automatically.
   *
   * Use cases: Fixed GID for NFS mounts; System integration with specific GID requirements
   *
   * AWS: CloudFormation::Init groups
   *
   * Validation: Optional; numeric string
   */
  readonly gid?: string;
}

/**
 * Map of user names to their configurations. Linux/UNIX only.
 */
export interface NamedUserProps {
  /** @jsii ignore */
  readonly [name: string]: UserProps;
}
/**
 * Linux/UNIX user account configuration for CloudFormation Init.
 */
export interface UserProps {
  /**
   * Specific numeric user ID. If omitted, the OS assigns one automatically.
   *
   * Use cases: Fixed UID for file ownership; System integration with specific UID requirements
   *
   * AWS: CloudFormation::Init users
   *
   * Validation: Optional; numeric string
   */
  readonly uid?: string;
  /**
   * Groups the user will be added to.
   *
   * Use cases: Role-based access via group membership; Multi-group user setup
   *
   * AWS: CloudFormation::Init user groups
   *
   * Validation: Required; array of group name strings; groups must exist or be created in the groups section
   */
  readonly groups: string[];
  /**
   * Home directory path for the user account.
   *
   * Use cases: Custom home directory location; Application-specific user workspace
   *
   * AWS: CloudFormation::Init user homeDir
   *
   * Validation: Required; valid directory path
   */
  readonly homeDir: string;
}

/**
 * Map of target directory paths to source archive configurations.
 */
export interface NamedSourceProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [name: string]: SourceProps;
}
/**
 * Source archive configuration for CloudFormation Init file extraction.
 */
export interface SourceProps {
  /**
   * URL of the archive to download and extract into the target directory.
   *
   * Use cases: Application artifact deployment; Configuration archive extraction
   *
   * AWS: CloudFormation::Init sources
   *
   * Validation: Required; valid URL accessible during instance initialization
   */
  readonly source: string;
}

/**
 * Map of file names to their deployment configurations.
 */
export interface NamedFileProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [name: string]: FileProps;
}
/**
 * File deployment configuration for CloudFormation Init.
 */
export interface FileProps {
  /**
   * Path to the local source file whose content will be deployed to the instance.
   *
   * Use cases: Configuration file deployment; Script deployment
   *
   * AWS: CloudFormation::Init files
   *
   * Validation: Required; valid file path relative to the config
   */
  readonly filePath: string;
  /**
   * When true, restarts associated services after file deployment.
   *
   * Use cases: Config file change triggers service reload
   *
   * AWS: CloudFormation::Init restart handle
   *
   * Validation: Optional; boolean
   */
  readonly restartRequired?: boolean;
}

/**
 * Map of command identifiers to their configurations.
 * Commands execute in lexicographical order of their key names.
 */
export interface NamedCommandProps {
  /**
   * Identifier key for this command.
   * Commands are executed in lexicographical order of their key names.
   */
  /** @jsii ignore */
  readonly [name: string]: CommandProps;
}
/**
 * Command execution configuration for CloudFormation Init.
 * Provide either shellCommand or argvs. Commands run in lexicographical order of their key.
 */
export interface CommandProps {
  // readonly key?: string;
  /**
   * Shell command string to execute. Provide either shellCommand or argvs, not both.
   *
   * Use cases: Inline shell scripts; One-liner setup commands
   *
   * AWS: CloudFormation::Init commands (shell form)
   *
   * Validation: Optional; string; mutually exclusive with argvs
   */
  readonly shellCommand?: string;
  /**
   * Command as an argument vector. Provide either argvs or shellCommand, not both.
   *
   * Use cases: Commands with complex quoting; Explicit argument passing
   *
   * AWS: CloudFormation::Init commands (argv form)
   *
   * Validation: Optional; array of strings; mutually exclusive with shellCommand
   */
  readonly argvs?: string[];
  /**
   * Environment variables for the command. Overwrites (not appends) the existing environment.
   *
   * Use cases: Injecting config values; Isolated command environments
   *
   * AWS: CloudFormation::Init command env
   *
   * Validation: Optional; map of variable name to value
   */
  readonly env?: NamedEnvProps;
  /**
   * Working directory for command execution.
   *
   * Use cases: Running commands in application directories
   *
   * AWS: CloudFormation::Init command cwd
   *
   * Validation: Optional; valid directory path
   */
  readonly workingDir?: string;
  /**
   * Test command run before the main command. If the test exits with code 0,
   * the main command is skipped (test success = already done).
   *
   * Use cases: Idempotent commands; Conditional execution
   *
   * AWS: CloudFormation::Init command test
   *
   * Validation: Optional; shell command string
   */
  readonly testCommand?: string;
  /**
   * Continue running subsequent commands if this one fails.
   *
   * Use cases: Non-critical setup steps; Best-effort commands
   *
   * AWS: CloudFormation::Init command ignoreErrors
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly ignoreErrors?: boolean;
  /**
   * Minutes to wait after command completion (Windows only).
   * Use waitForever or waitNone for reboot-aware alternatives.
   *
   * Use cases: Post-reboot wait on Windows; Timed command completion
   *
   * AWS: CloudFormation::Init command waitAfterCompletion
   *
   * Validation: Optional; number (minutes)
   * @default 1
   */
  readonly waitAfterCompletion?: number;
  /**
   * Wait indefinitely for the instance to reboot and resume cfn-init.
   * Mutually exclusive with waitAfterCompletion and waitNone.
   *
   * Use cases: Commands that trigger a reboot (e.g. Windows updates)
   *
   * AWS: CloudFormation::Init command waitAfterCompletion=forever
   *
   * Validation: Optional; boolean
   */
  readonly waitForever?: boolean;
  /**
   * Do not wait after this command completes.
   * Mutually exclusive with waitAfterCompletion and waitForever.
   *
   * Use cases: Fire-and-forget commands; Fast sequential execution
   *
   * AWS: CloudFormation::Init command waitAfterCompletion=none
   *
   * Validation: Optional; boolean
   */
  readonly waitNone?: boolean;
  /**
   * When true, restarts associated services after this command runs.
   *
   * Use cases: Config changes requiring service reload
   *
   * AWS: CloudFormation::Init restart handle
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly restartRequired?: boolean;
}
/**
 * Map of environment variable names to values.
 */
export interface NamedEnvProps {
  /** @jsii ignore */
  readonly [name: string]: string;
}
/**
 * Map of service names to their configurations.
 * Key should be the OS service name (e.g. cfn-hup, httpd).
 */
export interface NamedServiceProps {
  /**
   * Identifier key for this service.
   * key should be the name of the service.
   * For Windows can be retrieved using Get-Service powershell command
   * https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service?view=powershell-7.3
   */
  /** @jsii ignore */
  readonly [name: string]: ServiceProps;
}
/**
 * System service configuration for CloudFormation Init.
 * Supports sysvinit/systemd on Linux and Windows Service Manager on Windows.
 */
export interface ServiceProps {
  /**
   * Ensure the service is running after init completes.
   *
   * Use cases: Service availability verification; Post-init service state
   *
   * AWS: CloudFormation::Init services ensureRunning
   *
   * Validation: Optional; boolean
   */
  readonly ensureRunning?: boolean;
  /**
   * Enable the service to start automatically on boot.
   *
   * Use cases: Persistent service startup; Boot-time service availability
   *
   * AWS: CloudFormation::Init services enabled
   *
   * Validation: Optional; boolean
   */
  readonly enabled?: boolean;
  /**
   * Explicitly disable and stop the service.
   *
   * Use cases: Security hardening; Disabling unnecessary services
   *
   * AWS: CloudFormation::Init services disabled
   *
   * Validation: Optional; boolean
   */
  readonly disabled?: boolean;
  /**
   * When true, restarts this service after associated commands, files, or packages complete.
   * The service must also have restartRequired: true in the triggering element.
   *
   * Use cases: Config-driven service reload; Post-deployment service refresh
   *
   * AWS: CloudFormation::Init restart handle
   *
   * Validation: Optional; boolean
   */
  readonly restartRequired?: boolean;
  //following params are Utilized in a later release of aws-cdk-lib, with service manager explicitly declared in a prop, and option to choose systemd for AL2
  // Need to upgrade from cdk 2.54.0 for the same
  //which introduces breaking changes requiring update to remaining constructs as well
  //While using current setup for 2.54.0, restart can still be triggered by declaring initrestarthandle in remaining init props
  // /**
  //  * A list of files. If cfn-init changes one directly through the files block, this service will be restarted.
  //  */
  // readonly files?: string[];
  // /**
  //  * A list of directories. If cfn-init expands an archive into one of these directories, this service will be restarted.
  //  */
  // readonly sources?: string[];
  // /**
  //  * A map of package manager to list of package names. If cfn-init installs or updates one of these packages, this service will be restarted.
  //  * e.g. { "yum" : ["php", "spawn-fcgi"] }
  //  */
  // readonly packages?: {[name:string]:string[]};
  // /**
  //  * A list of command names. If cfn-init runs the specified command, this service will be restarted.
  //  */
  // readonly commands?: string[]
}
/**
 * Options controlling CloudFormation Init execution behavior.
 */
export interface InitOptionsProps {
  /**
   * Config set names to execute. If omitted, the "default" config set runs.
   *
   * Use cases: Selective bootstrap; Environment-specific init sequences
   *
   * AWS: CloudFormation::Init ApplyCloudFormationInitOptions configSets
   *
   * Validation: Optional; array of config set name strings
   */
  readonly configSets?: string[];
  /**
   * Embed a config fingerprint in UserData so the instance is replaced when
   * the init configuration changes.
   *
   * Use cases: Immutable infrastructure; Automatic replacement on config drift
   *
   * AWS: CloudFormation::Init fingerprint in UserData
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly embedFingerprint?: boolean;
  /**
   * When true, instance creation continues even if cfn-init fails.
   * Useful for debugging initialization issues without triggering rollback.
   *
   * Use cases: Init debugging; Development troubleshooting
   *
   * AWS: CloudFormation::Init ignoreFailures
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly ignoreFailures?: boolean;
  /**
   * Include --role argument when running cfn-init and cfn-signal commands,
   * using the IAM instance profile attached to the EC2 instance.
   *
   * Use cases: Authenticated cfn-init calls; Instance profile credential passing
   *
   * AWS: cfn-init --role / cfn-signal --role
   *
   * Validation: Optional; boolean
   */
  readonly includeRole?: boolean;
  /**
   * Include --url argument when running cfn-init and cfn-signal commands,
   * pointing to the CloudFormation endpoint in the deployed region.
   *
   * Use cases: Custom CloudFormation endpoint; VPC endpoint routing
   *
   * AWS: cfn-init --url / cfn-signal --url
   *
   * Validation: Optional; boolean
   */
  readonly includeUrl?: boolean;
  /**
   * Print cfn-init output to the Instance System Log (visible in EC2 Console).
   * By default output goes to a log file on the instance only.
   * System log refreshes at certain lifecycle points so results may not always appear.
   *
   * Use cases: Init debugging via EC2 Console; Troubleshooting without SSH
   *
   * AWS: EC2 System Log
   *
   * Validation: Optional; boolean
   */
  readonly printLog?: boolean;
  /**
   * Maximum time in minutes to wait for the init configuration to be applied.
   *
   * Use cases: Long-running init timeout; Fast-fail on stuck init
   *
   * AWS: CloudFormation CreationPolicy timeout
   *
   * Validation: Optional; number (minutes)
   * @default 5
   */
  readonly timeout?: number;
}
/**
 * Map of network interface names to their configurations.
 */
export interface NamedNetworkInterfaceProps {
  /** @jsii ignore */
  readonly [name: string]: NetworkInterfaceProps;
}
/**
 * Elastic network interface (ENI) configuration. An interface is a resource in its own right,
 * attached to instances as a secondary interface only (see InstanceProps.networkInterfaces) with
 * deleteOnTermination false, which is what carries its private IP and MAC across the instances it
 * is attached to. A secondary interface is not the instance's default route: routing traffic over
 * it is OS-level configuration on the instance.
 */
export interface NetworkInterfaceProps {
  /**
   * Subnet in which the interface is created. Determines the interface's availability zone,
   * which must match the availability zone of any instance it is attached to. May differ from
   * the instance's own subnetId to multi-home the instance within that zone.
   *
   * Use cases: Multi-homed instances; Dedicated data-path subnet placement
   *
   * AWS: EC2 NetworkInterface SubnetId
   *
   * Validation: Required; valid subnet ID (supports ssm: references)
   */
  readonly subnetId: string;
  /**
   * Description surfaced in the EC2 console to help operators identify the interface.
   *
   * Use cases: Identifying a persistent proxy data-path interface among ephemeral ones
   *
   * AWS: EC2 NetworkInterface Description
   *
   * Validation: Optional; string
   */
  readonly description?: string;
  /**
   * Fixed primary private IPv4 address for the interface. This is the address that survives
   * instance replacement, so it is the address to allowlist on downstream firewalls. AWS assigns
   * an address from the subnet when omitted.
   *
   * Changing this on an already-deployed interface replaces it. Because interfaces are retained,
   * the previous interface survives the replacement still holding the old address, so reusing that
   * address elsewhere requires deleting the retained interface out of band first.
   *
   * Use cases: Allowlisted proxy IP; MAC/IP-stable network appliance
   *
   * AWS: EC2 NetworkInterface PrivateIpAddress
   *
   * Validation: Optional; IPv4 address inside the subnet CIDR and not already in use
   */
  readonly privateIpAddress?: string;
  /**
   * Names of security groups from the securityGroups section of this config. Combined with
   * securityGroupIds. These groups govern traffic on this interface independently of the
   * security group applied to the instance itself.
   *
   * At least one of securityGroups or securityGroupIds is required. Omitting both is rejected at
   * synth, because EC2 would place the interface in the VPC default security group, which permits
   * all traffic between its members and all outbound traffic. To use the default group
   * deliberately, name it in securityGroupIds.
   *
   * Use cases: Reference project-managed security groups by name
   *
   * AWS: EC2 NetworkInterface GroupSet
   *
   * Validation: Optional if securityGroupIds is set; each entry must match a key in the
   * securityGroups config section
   */
  readonly securityGroups?: string[];
  /**
   * IDs of security groups created outside this config. Combined with securityGroups.
   *
   * At least one of securityGroups or securityGroupIds is required; omitting both is rejected at
   * synth rather than leaving the interface in the permissive VPC default security group.
   *
   * Use cases: Reuse pre-existing VPC security groups on the interface
   *
   * AWS: EC2 NetworkInterface GroupSet
   *
   * Validation: Optional if securityGroups is set; valid security group IDs (supports ssm:
   * references)
   */
  readonly securityGroupIds?: string[];
  /**
   * When false, disables source/destination checking on this interface so it can forward
   * traffic it is neither the source nor the destination of. Source/destination checking is
   * per interface: the instance-level sourceDestCheck does not cover a secondary interface.
   *
   * Use cases: Proxy instance; NAT instance; Traffic inspection appliance
   *
   * AWS: EC2 NetworkInterface SourceDestCheck
   *
   * Validation: Optional; boolean
   */
  readonly sourceDestCheck?: boolean;
}
/**
 * Attachment of an existing or config-declared network interface to an instance as a secondary
 * interface. Rendered as a standalone NetworkInterfaceAttachment resource, which is what allows
 * an instance-replacing update to detach the interface from the old instance before attaching it
 * to the new one. The instance's primary interface cannot be customized.
 */
export interface NetworkInterfaceAttachmentProps {
  /**
   * Name of a network interface from the networkInterfaces section of this config.
   * Mutually exclusive with networkInterfaceId.
   *
   * Use cases: Attach an interface declared and managed by this config
   *
   * AWS: EC2 NetworkInterfaceAttachment NetworkInterfaceId
   *
   * Validation: Optional; must match a key in the networkInterfaces config section;
   * exactly one of networkInterface or networkInterfaceId is required
   */
  readonly networkInterface?: string;
  /**
   * ID of a network interface created outside this config.
   * Mutually exclusive with networkInterface.
   *
   * Use cases: Attach an interface created by another module or by hand
   *
   * AWS: EC2 NetworkInterfaceAttachment NetworkInterfaceId
   *
   * Validation: Optional; valid network interface ID (eni-...; supports ssm: references);
   * exactly one of networkInterface or networkInterfaceId is required
   */
  readonly networkInterfaceId?: string;
  /**
   * Device index at which the interface is attached.
   *
   * Use cases: Ordering multiple secondary interfaces on one instance
   *
   * AWS: EC2 NetworkInterfaceAttachment DeviceIndex
   *
   * Validation: Required; integer >= 1, unique per instance. Index 0 is the instance's primary
   * interface and is rejected, because a primary interface cannot be detached and would make the
   * instance un-updatable
   *
   * Changing the index of an already-deployed networkInterface attachment replaces the attachment,
   * which CloudFormation performs delete-then-create for this resource type, so the interface
   * detaches and re-attaches at the new index in a single deploy. Two edits still need two deploys
   * -- remove the entry, deploy, then add it back: changing the index of a networkInterfaceId
   * attachment, and moving an interface onto an index that another interface still holds.
   *
   * @minimum 1
   * @TJS-type integer
   */
  readonly deviceIndex: number;
  /**
   * Whether the interface is deleted when the instance terminates. Defaults to false, overriding
   * CloudFormation's own default of true, so that the interface and its private IP survive
   * termination and can be attached to a replacement instance.
   *
   * Use cases: Preserving an allowlisted private IP across instance replacement
   *
   * AWS: EC2 NetworkInterfaceAttachment DeleteOnTermination
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly deleteOnTermination?: boolean;
}
/**
 * Map of instance names to their configurations.
 */
export interface NamedInstanceProps {
  /** @jsii ignore */
  readonly [name: string]: InstanceProps;
}
/**
 * EC2 instance configuration. Instances have termination protection enabled
 * and are retained post stack deletion. EBS volumes are encrypted with the
 * module KMS CMK unless a custom kmsKeyArn is specified.
 */
export interface InstanceProps {
  /**
   * Name of a security group from the securityGroups section of this config.
   * Mutually exclusive with securityGroupId.
   *
   * Use cases: Reference project-managed security groups by name
   *
   * AWS: EC2 instance security group association
   *
   * Validation: Optional; must match a key in the securityGroups config section
   */
  readonly securityGroup?: string;
  /**
   * ID of an existing security group created outside this config.
   * Mutually exclusive with securityGroup.
   *
   * Use cases: Reuse pre-existing VPC security groups
   *
   * AWS: EC2 instance security group association
   *
   * Validation: Optional; valid security group ID (sg-...)
   */
  readonly securityGroupId?: string;
  /**
   * EC2 instance type (e.g. t3.medium, m5.large).
   *
   * Use cases: Compute capacity sizing; Cost optimization
   *
   * AWS: EC2 InstanceType
   *
   * Validation: Required; valid EC2 instance type string
   */
  readonly instanceType: string;
  /**
   * AMI ID for the instance OS and software. AMI root volumes must be listed
   * in blockDevices to ensure encryption.
   *
   * Use cases: OS selection; Golden image deployment
   *
   * AWS: EC2 ImageId
   *
   * Validation: Required; valid AMI ID (ami-...)
   */
  readonly amiId: string;
  /**
   * VPC where the instance will be deployed.
   *
   * Use cases: VPC-scoped instance placement; Network isolation
   *
   * AWS: EC2 instance VPC
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet for instance placement within the VPC.
   *
   * Use cases: AZ targeting; Network segmentation
   *
   * AWS: EC2 instance SubnetId
   *
   * Validation: Required; valid subnet ID
   */
  readonly subnetId: string;
  /**
   * EBS block device configurations. Must include the AMI root volume deviceName
   * to ensure it is encrypted.
   *
   * Use cases: Root volume encryption; Additional data volumes
   *
   * AWS: EC2 BlockDeviceMappings
   *
   * Validation: Required; array of BlockDeviceProps
   */
  readonly blockDevices: BlockDeviceProps[];
  /**
   * IAM role used as the instance profile. Supports arn, name, or id references.
   *
   * Use cases: Instance service access; Least-privilege compute permissions
   *
   * AWS: EC2 IamInstanceProfile
   *
   * Validation: Required; valid MdaaRoleRef
   */
  readonly instanceRole: MdaaRoleRef;
  /**
   * KMS key ARN for EBS volume encryption. If omitted, the module's KMS CMK is used.
   *
   * Use cases: Bring-your-own-key EBS encryption; Compliance-specific key management
   *
   * AWS: KMS key for EBS encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly kmsKeyArn?: string;
  /**
   * Availability zone for instance placement (e.g. us-east-1a).
   *
   * Use cases: AZ-specific placement; HA architecture
   *
   * AWS: EC2 AvailabilityZone
   *
   * Validation: Required; valid AZ string
   */
  readonly availabilityZone: string;
  /**
   * Operating system type. Affects user data script handling and cfn-init behavior.
   *
   * Use cases: OS-specific bootstrap; Platform-appropriate configuration
   *
   * AWS: EC2 instance OS type
   *
   * Validation: Required; "linux" | "windows" | "unknown"
   */
  readonly osType: 'linux' | 'windows' | 'unknown';
  /**
   * Path to a user data script relative to this config file.
   * Shell script for Linux (.sh), PowerShell for Windows (.ps1).
   *
   * Use cases: Custom bootstrap scripts; Instance initialization
   *
   * AWS: EC2 UserData
   *
   * Validation: Optional; valid file path
   */
  readonly userDataScriptPath?: string;
  /**
   * Whether user data changes force instance replacement.
   *
   * Use cases: Immutable deployments; In-place update control
   *
   * AWS: CloudFormation UpdateReplacePolicy behavior
   *
   * Validation: Optional; boolean
   */
  readonly userDataCausesReplacement?: boolean;
  /**
   * Inline CloudFormation Init configuration for this instance.
   * Alternative to referencing a named init via initName.
   *
   * Use cases: Instance-specific bootstrap; One-off init configs
   *
   * AWS: CloudFormation::Init
   *
   * Validation: Optional; valid InitProps
   */
  readonly init?: InitProps;
  /**
   * Name of a CloudFormation Init configuration from the cfnInit section.
   *
   * Use cases: Shared init config reuse across instances
   *
   * AWS: CloudFormation::Init
   *
   * Validation: Optional; must match a key in the cfnInit config section
   */
  readonly initName?: string;
  /**
   * Options controlling CloudFormation Init execution for this instance.
   *
   * Use cases: Config set selection; Init timeout tuning; Debug mode
   *
   * AWS: ApplyCloudFormationInitOptions
   *
   * Validation: Optional; valid InitOptionsProps
   */
  readonly initOptions?: InitOptionsProps;
  /**
   * Number of success signals required before CloudFormation considers
   * the instance creation complete.
   *
   * Use cases: Multi-step init validation; Deployment gate
   *
   * AWS: CloudFormation CreationPolicy ResourceSignal Count
   *
   * Validation: Optional; positive integer
   */
  readonly signalCount?: number;
  /**
   * Maximum time to wait for creation signals (ISO 8601 duration, e.g. PT25M).
   *
   * Use cases: Long-running init timeout; Deployment time control
   *
   * AWS: CloudFormation CreationPolicy ResourceSignal Timeout
   *
   * Validation: Optional; ISO 8601 duration string
   */
  readonly creationTimeOut?: string;
  /**
   * When false, disables source/destination checking to allow NAT or routing. Applies to the
   * instance's primary network interface only; a secondary interface attached via
   * networkInterfaces carries its own sourceDestCheck.
   *
   * Use cases: NAT instance; Custom routing; Network appliance
   *
   * AWS: EC2 SourceDestCheck
   *
   * Validation: Optional; boolean
   */
  readonly sourceDestCheck?: boolean;
  /**
   * Name of a key pair from the keyPairs section of this config for SSH access.
   *
   * Use cases: Project-managed SSH key pair reference
   *
   * AWS: EC2 KeyName
   *
   * Validation: Optional; must match a key in the keyPairs config section
   */
  readonly keyPairName?: string;
  /**
   * Name of a pre-existing EC2 key pair (created outside this config).
   *
   * Use cases: Reuse existing SSH key pairs; External key management
   *
   * AWS: EC2 KeyName
   *
   * Validation: Optional; key pair must exist in the region
   */
  readonly existingKeyPairName?: string;
  /**
   * Secondary network interfaces to attach to this instance, either declared in the
   * networkInterfaces section of this config or referenced by id. The instance always gets its
   * own primary interface at device index 0; these are attached at index 1 and above. Each
   * attachment defaults to deleteOnTermination: false so the interface outlives the instance.
   *
   * Use cases: Stable allowlisted private IP for a proxy; Multi-homed instance
   *
   * AWS: EC2 NetworkInterfaceAttachment
   *
   * Validation: Optional; array of NetworkInterfaceAttachmentProps. Each interface may be
   * attached at most once across the config, and each deviceIndex must be unique per instance
   */
  readonly networkInterfaces?: NetworkInterfaceAttachmentProps[];
}

/** Internal props for the EC2 L3 construct. */
export interface Ec2L3ConstructProps extends MdaaL3ConstructProps {
  /** Admin roles with access to KMS keys and KeyPair secrets. */
  readonly adminRoles: MdaaRoleRef[];
  /** Security group configurations by name. */
  readonly securityGroups?: NamedSecurityGroupProps;
  /** Rules added to pre-existing (externally-owned) security groups, by rule-set name. */
  readonly rules?: NamedSecurityGroupRulesProps;
  /** Key pair configurations by name. */
  readonly keyPairs?: NamedKeyPairProps;
  /** CloudFormation Init configurations by name. */
  readonly cfnInit?: NamedInitProps;
  /** Elastic network interface configurations by name. */
  readonly networkInterfaces?: NamedNetworkInterfaceProps;
  /** EC2 instance configurations by name. */
  readonly instances?: NamedInstanceProps;
}

/**
 * Stable, token-free label for a security-group peer used when building a rule's logical id.
 * When the source id is a concrete value (e.g. a literal sg-... id) it is used directly. When it
 * is an unresolved CDK token (e.g. an ssm: reference resolved to ${Token[TOKEN.NN]}, whose index
 * varies between synths) we fall back to a deterministic positional placeholder so the logical id
 * stays stable across synths, mirroring how CDK's own SecurityGroup.renderPeer substitutes
 * {IndirectPeer} for token peers.
 */
function sgPeerLabel(sgId: string, index: number): string {
  return Token.isUnresolved(sgId) ? `sgref-${index}` : sgId;
}

/**
 * Names an attachment's interface reference in an error message. An `ssm:` networkInterfaceId
 * reaches this module already resolved to a CloudFormation token, whose ${Token[TOKEN.NN]} form
 * identifies nothing to a reader, so those are described by how they were referenced instead.
 */
function networkInterfaceRefLabel(networkInterfaceRef: string): string {
  return Token.isUnresolved(networkInterfaceRef) ? '<ssm: networkInterfaceId reference>' : networkInterfaceRef;
}

//This stack creates and manages an EC2 instance
export class Ec2L3Construct extends MdaaL3Construct {
  protected readonly props: Ec2L3ConstructProps;

  private static osTypeMap: { [key: string]: OperatingSystemType } = {
    linux: OperatingSystemType.LINUX,
    windows: OperatingSystemType.WINDOWS,
    unknown: OperatingSystemType.UNKNOWN,
  };

  private readonly adminRoles: MdaaResolvableRole[];
  private kmsKey?: Key;

  initServiceRestartHandle = new InitServiceRestartHandle();

  public readonly keyPairs: { [key: string]: MdaaEC2SecretKeyPair } = {};
  public readonly securityGroups: { [key: string]: MdaaSecurityGroup } = {};
  public readonly networkInterfaces: { [key: string]: MdaaNetworkInterface } = {};
  public readonly instances: { [key: string]: Instance } = {};
  public readonly cfnInit: { [key: string]: CloudFormationInit } = {};
  /**
   * Network interfaces already claimed by an attachment, keyed by the config value that
   * identifies them (interface name or id), valued by the instance that claimed them. An
   * interface can only be attached to one instance at a time, so a second claim is a config
   * error rather than something CloudFormation should be asked to attempt.
   */
  private readonly attachedNetworkInterfaces: Map<string, string> = new Map();
  /**
   * Scope holding the interface and attachment resources. Construct ids here become the logical IDs
   * of retained interfaces, so they are kept out of the namespace shared with config-keyed security
   * groups and instances, where a security group named `eni-proxy` alongside an interface named
   * `proxy` would otherwise collide.
   */
  private readonly networkInterfaceScope = new Construct(this, 'network-interfaces');
  constructor(scope: Construct, id: string, props: Ec2L3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.adminRoles = props.roleHelper.resolveRoleRefsWithOrdinals(props.adminRoles, 'admin');

    this.createKeyPairs(props.keyPairs || {});
    this.createSecurityGroups(props.securityGroups || {});
    this.createSecurityGroupRules(props.rules || {});
    this.createNetworkInterfaces(props.networkInterfaces || {});
    this.cfnInit = this.createInit(props.cfnInit || {});
    this.createInstances(props.instances || {});
    this.warnOnUnattachedNetworkInterfaces();
  }

  private createKeyPairs(namedKeyPairProps: NamedKeyPairProps) {
    Object.entries(namedKeyPairProps).forEach(entry => {
      const keyPairName = entry[0];
      const keyPairProps = entry[1];
      const kmsKey = keyPairProps.kmsKeyArn
        ? Key.fromKeyArn(this, `kms-keypair-${keyPairName}`, keyPairProps.kmsKeyArn)
        : this.getKmsKey();
      const createKeyPairProps: MdaaEC2SecretKeyPairProps = {
        name: keyPairName,
        kmsKey: kmsKey,
        naming: this.props.naming,
        readPrincipals: this.adminRoles.map(x => new ArnPrincipal(x.arn())),
      };
      this.keyPairs[keyPairName] = new MdaaEC2SecretKeyPair(this, `key-pair-${keyPairName}`, createKeyPairProps);
    });
  }

  private createConfigSet(namedConfigSetsProps: NamedConfigSetsProps) {
    /** @jsii ignore */
    const configSetMap: { [name: string]: string[] } = {};
    Object.entries(namedConfigSetsProps).forEach(entry => {
      const configSetName = entry[0];
      const configSetProps = entry[1];
      configSetMap[configSetName] = configSetProps.configs;
    });
    return configSetMap;
  }

  private createConfig(namedConfigProps: NamedConfigProps) {
    /** @jsii ignore */
    const configMap: { [name: string]: InitConfig } = {};
    Object.entries(namedConfigProps).forEach(entry => {
      const configName = entry[0];
      const configProps = entry[1];
      const configList: InitElement[] = [];
      if (configProps.packages) {
        configList.push(...this.createPackages(configProps.packages));
      }
      if (configProps.commands) {
        configList.push(...this.createCommands(configProps.commands));
      }
      if (configProps.files) {
        configList.push(...this.createFiles(configProps.files));
      }
      if (configProps.services) {
        configList.push(...this.createServices(configProps.services));
      }
      configMap[configName] = new InitConfig(configList);
    });
    return configMap;
  }

  private createPackages(namedPackageProps: NamedPackageProps) {
    const packageList: InitElement[] = [];
    Object.entries(namedPackageProps).forEach(entry => {
      const packageProps = entry[1];

      const namedPackageOptions: NamedPackageOptions = packageProps.restartRequired
        ? {
            serviceRestartHandles: [this.initServiceRestartHandle],
            version: packageProps.packageVersions,
          }
        : {
            version: packageProps.packageVersions,
          };
      const locationPackageOptions: LocationPackageOptions = packageProps.restartRequired
        ? {
            serviceRestartHandles: [this.initServiceRestartHandle],
            key: packageProps.key,
          }
        : {
            key: packageProps.key,
          };
      if (packageProps.packageManager == 'yum') {
        packageList.push(InitPackage.yum(packageProps.packageName!, namedPackageOptions));
      }
      if (packageProps.packageManager == 'apt') {
        packageList.push(InitPackage.apt(packageProps.packageName!, namedPackageOptions));
      }
      if (packageProps.packageManager == 'python') {
        packageList.push(InitPackage.python(packageProps.packageName!, namedPackageOptions));
      }
      if (packageProps.packageManager == 'rubyGem') {
        packageList.push(InitPackage.rubyGem(packageProps.packageName!, namedPackageOptions));
      }
      if (packageProps.packageManager == 'msi') {
        packageList.push(InitPackage.msi(packageProps.packageLocation!, locationPackageOptions));
      }
      if (packageProps.packageManager == 'rpm') {
        packageList.push(InitPackage.rpm(packageProps.packageLocation!, locationPackageOptions));
      }
    });
    return packageList;
  }

  private toWaitOrNotToWait(duration?: Duration, waitForever?: boolean, waitNone?: boolean) {
    if (duration) return InitCommandWaitDuration.of(duration);
    if (waitForever) return InitCommandWaitDuration.forever();
    if (waitNone) return InitCommandWaitDuration.none();
    else {
      return undefined;
    }
  }

  private createCommands(namedCommandProps: NamedCommandProps) {
    const commandList: InitElement[] = [];
    Object.entries(namedCommandProps).forEach(entry => {
      const commandKey = entry[0];
      const commandProps = entry[1];
      const duration = commandProps.waitAfterCompletion
        ? Duration.minutes(commandProps.waitAfterCompletion)
        : undefined;

      const waitAfterCompletion = this.toWaitOrNotToWait(duration, commandProps.waitForever, commandProps.waitNone);

      const commandOptions: InitCommandOptions = {
        cwd: commandProps.workingDir,
        env: commandProps.env,
        ignoreErrors: commandProps.ignoreErrors,
        key: commandKey,
        serviceRestartHandles: commandProps.restartRequired ? [this.initServiceRestartHandle] : undefined,
        testCmd: commandProps.testCommand,
        waitAfterCompletion: waitAfterCompletion,
      };

      if (commandProps.shellCommand) {
        commandList.push(InitCommand.shellCommand(commandProps.shellCommand, commandOptions));
      }
      if (commandProps.argvs) {
        commandList.push(InitCommand.argvCommand(commandProps.argvs, commandOptions));
      }
    });
    return commandList;
  }

  private createFiles(namedFileProps: NamedFileProps) {
    const fileList: InitElement[] = [];
    Object.entries(namedFileProps).forEach(entry => {
      const fileName = entry[0];
      const fileProps = entry[1];

      const initFileOptions: InitFileOptions = {
        // not supported for windows , to be added later
        //   group: fileProps,
        //   mode: fileProps,
        //   owner: fileProps,
        serviceRestartHandles: fileProps.restartRequired ? [this.initServiceRestartHandle] : undefined,
      };

      // fileList.push( InitFile.fromAsset( fileName, fileProps.filePath, initFileAssetOptions ) )
      // fromAsset creates a construct to store file in s3 with id `${targetFileName}Asset`.
      // Thus if more than one instance using the same target file name in stack, it will cause name collision.
      //Open Issue: https://github.com/aws/aws-cdk/issues/16891
      fileList.push(InitFile.fromFileInline(fileName, fileProps.filePath, initFileOptions));
    });
    return fileList;
  }

  private createServices(namedServiceProps: NamedServiceProps) {
    const serviceList: InitElement[] = [];
    Object.entries(namedServiceProps).forEach(entry => {
      const serviceName = entry[0];
      const serviceProps = entry[1];

      const serviceInitOptions: InitServiceOptions = {
        enabled: serviceProps.enabled,
        ensureRunning: serviceProps.ensureRunning,
        serviceRestartHandle: serviceProps.restartRequired ? this.initServiceRestartHandle : undefined,
      };
      if (serviceProps.enabled) {
        serviceList.push(InitService.enable(serviceName, serviceInitOptions));
      }
      if (serviceProps.disabled) {
        serviceList.push(InitService.disable(serviceName));
      }
    });
    return serviceList;
  }

  private createInit(namedInitProps: NamedInitProps) {
    /** @jsii ignore */
    const initMap: { [name: string]: CloudFormationInit } = {};
    Object.entries(namedInitProps).forEach(entry => {
      const initName = entry[0];
      const initProps = entry[1];

      const configMap = this.createConfig(initProps.configs);

      const configSetMap = this.createConfigSet(initProps.configSets);

      const cfnconfigSets: ConfigSetProps = {
        configSets: configSetMap,
        configs: configMap,
      };

      initMap[initName] = CloudFormationInit.fromConfigSets(cfnconfigSets);
    });
    return initMap;
  }

  /**
   * Creates the config-declared elastic network interfaces. Runs after createSecurityGroups so
   * that an interface can reference a security group from this config by name.
   */
  private createNetworkInterfaces(namedNetworkInterfaceProps: NamedNetworkInterfaceProps) {
    Object.entries(namedNetworkInterfaceProps).forEach(entry => {
      const networkInterfaceName = entry[0];
      const networkInterfaceProps = entry[1];

      const securityGroupIds = [
        ...(networkInterfaceProps.securityGroups ?? []).map(securityGroupName => {
          const securityGroup = Ec2L3Construct.lookupByName(this.securityGroups, securityGroupName);
          if (!securityGroup) {
            throw new Error(
              `Network Interface ${networkInterfaceName} securityGroups references Security Group ${securityGroupName}, which is not known to this module.`,
            );
          }
          return securityGroup.securityGroupId;
        }),
        ...(networkInterfaceProps.securityGroupIds ?? []),
      ];

      if (securityGroupIds.length === 0) {
        // EC2 makes the default-group association itself, so it appears in neither the template nor
        // CDK Nag. Rejected here, as getInstanceSecurityGroup does for an instance.
        throw new Error(
          `Network Interface ${networkInterfaceName} specifies neither securityGroups nor securityGroupIds. At least one is required, because EC2 places an interface with no group in the VPC default security group, which permits all traffic between its members and all outbound traffic. To use the default group deliberately, name it in securityGroupIds.`,
        );
      }

      const createNetworkInterfaceProps: MdaaNetworkInterfaceProps = {
        networkInterfaceName: networkInterfaceName,
        subnetId: networkInterfaceProps.subnetId,
        description: networkInterfaceProps.description,
        privateIpAddress: networkInterfaceProps.privateIpAddress,
        securityGroupIds: securityGroupIds,
        sourceDestCheck: networkInterfaceProps.sourceDestCheck,
        naming: this.props.naming,
      };

      this.networkInterfaces[networkInterfaceName] = new MdaaNetworkInterface(
        this.networkInterfaceScope,
        `eni-${networkInterfaceName}`,
        createNetworkInterfaceProps,
      );
    });
  }

  /**
   * Attaches the instance's configured secondary network interfaces. Each attachment is a
   * standalone NetworkInterfaceAttachment rather than an interface baked into the instance's own
   * network configuration, so that an instance-replacing update can detach the interface from the
   * outgoing instance before attaching it to the replacement.
   */
  private createNetworkInterfaceAttachments(instanceName: string, attachments: NetworkInterfaceAttachmentProps[]) {
    const instanceDeviceIndexes = new Set<number>();
    attachments.forEach(attachment => {
      this.validateDeviceIndex(instanceName, attachment.deviceIndex, instanceDeviceIndexes);
      const resolved = this.resolveAttachmentNetworkInterface(instanceName, attachment);

      new CfnNetworkInterfaceAttachment(this.networkInterfaceScope, resolved.constructId, {
        instanceId: this.instances[instanceName].instanceId,
        networkInterfaceId: resolved.networkInterfaceId,
        deviceIndex: attachment.deviceIndex.toString(),
        // CloudFormation's own default is true, which would destroy the interface along with the
        // instance.
        deleteOnTermination: attachment.deleteOnTermination ?? false,
      });
    });
  }

  /**
   * Validates an attachment's device index. Index 0 is the instance's primary interface, which
   * cannot be detached, so customizing it would leave the instance un-updatable through a normal
   * deploy.
   */
  private validateDeviceIndex(instanceName: string, deviceIndex: number, instanceDeviceIndexes: Set<number>) {
    if (!Number.isInteger(deviceIndex) || deviceIndex < 1) {
      throw new Error(
        `Instance ${instanceName} networkInterfaces deviceIndex must be an integer >= 1, got ${deviceIndex}. Device index 0 is the instance primary network interface, which cannot be detached and so cannot be customized.`,
      );
    }
    if (instanceDeviceIndexes.has(deviceIndex)) {
      throw new Error(
        `Instance ${instanceName} networkInterfaces specifies deviceIndex ${deviceIndex} more than once.`,
      );
    }
    instanceDeviceIndexes.add(deviceIndex);
  }

  /**
   * Resolves an attachment to the interface it attaches and the construct id of the attachment
   * resource, enforcing the module's create-by-name vs. reference-by-id convention and that no
   * interface is claimed twice.
   *
   * The construct id becomes the logical ID of the deployed attachment, so a config-declared
   * interface is keyed on its own name -- unique across the config, per claimNetworkInterface --
   * which keeps a deviceIndex change, a move to another instance and an instance rename as
   * replacements of one resource, performed delete-then-create for this type. An ssm:
   * networkInterfaceId is an unresolved token here and cannot be part of a construct id, so those
   * attachments stay keyed on the instance name and device index.
   */
  private resolveAttachmentNetworkInterface(
    instanceName: string,
    attachment: NetworkInterfaceAttachmentProps,
  ): { networkInterfaceId: string; constructId: string } {
    if (attachment.networkInterface && attachment.networkInterfaceId) {
      throw new Error(
        `Instance ${instanceName} networkInterfaces entry specifies both networkInterface and networkInterfaceId. Exactly one must be specified.`,
      );
    }
    if (attachment.networkInterface) {
      const networkInterface = Ec2L3Construct.lookupByName(this.networkInterfaces, attachment.networkInterface);
      if (!networkInterface) {
        throw new Error(
          `Instance ${instanceName} networkInterfaces references Network Interface ${attachment.networkInterface}, which is not known to this module.`,
        );
      }
      // Namespaced so that an interface *named* like an id cannot collide with an interface
      // *referenced* by that id.
      this.claimNetworkInterface(instanceName, `name:${attachment.networkInterface}`, attachment.networkInterface);
      return {
        networkInterfaceId: networkInterface.attrId,
        constructId: `attachment-name-${attachment.networkInterface}`,
      };
    }
    if (attachment.networkInterfaceId) {
      this.claimNetworkInterface(instanceName, `id:${attachment.networkInterfaceId}`, attachment.networkInterfaceId);
      return {
        networkInterfaceId: attachment.networkInterfaceId,
        constructId: `attachment-id-${instanceName}-${attachment.deviceIndex}`,
      };
    }
    throw new Error(
      `Instance ${instanceName} networkInterfaces entry specifies neither networkInterface nor networkInterfaceId. Exactly one must be specified.`,
    );
  }

  /**
   * Records that an instance has claimed an interface, rejecting a second claim. `claimKey` is the
   * namespaced identity used for collision detection; `networkInterfaceRef` is the config value it
   * was derived from, named in the error so the message identifies the entry at fault.
   */
  private claimNetworkInterface(instanceName: string, claimKey: string, networkInterfaceRef: string) {
    const claimedBy = this.attachedNetworkInterfaces.get(claimKey);
    const label = networkInterfaceRefLabel(networkInterfaceRef);
    if (claimedBy === instanceName) {
      throw new Error(
        `Instance ${instanceName} networkInterfaces attaches Network Interface ${label} more than once. An interface can occupy only one device index.`,
      );
    }
    if (claimedBy) {
      throw new Error(
        `Network Interface ${label} is attached to both instance ${claimedBy} and instance ${instanceName}. A network interface can be attached to only one instance.`,
      );
    }
    this.attachedNetworkInterfaces.set(claimKey, instanceName);
  }

  /**
   * Own-property lookup into a config-keyed map. A plain object inherits from Object.prototype, so
   * a config key such as `constructor` or `toString` would otherwise resolve to an inherited member
   * and satisfy a truthiness guard.
   */
  private static lookupByName<T>(entries: { [name: string]: T }, name: string): T | undefined {
    return Object.prototype.hasOwnProperty.call(entries, name) ? entries[name] : undefined;
  }

  /**
   * Warns about interfaces declared in the networkInterfaces section that no instance in this
   * config attaches. Legitimate -- another module can consume an interface through the SSM
   * parameters published for it -- but because interfaces are retained, a declaration nothing
   * references also persists in the account indefinitely.
   */
  private warnOnUnattachedNetworkInterfaces() {
    const unattached = Object.keys(this.networkInterfaces).filter(
      networkInterfaceName => !this.attachedNetworkInterfaces.has(`name:${networkInterfaceName}`),
    );
    if (unattached.length > 0) {
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/ec2:unattachedNetworkInterface',
        `networkInterfaces declares ${unattached.join(', ')}, which no instance in this config attaches. ` +
          `They are still created, and are retained post stack deletion, so they persist in the account until ` +
          `deleted out of band. This is expected if they are consumed by another module via their SSM parameters; ` +
          `otherwise remove the declaration.`,
      );
    }
  }

  private createInstances(namedInstanceProps: NamedInstanceProps) {
    Object.entries(namedInstanceProps).forEach(entry => {
      const instanceName = entry[0];
      const instanceProps = entry[1];

      const resolvedInstanceRole = this.props.roleHelper.resolveRoleRefWithRefId(
        instanceProps.instanceRole,
        'instanceRole',
      );
      const roleArn = resolvedInstanceRole.arn();
      const instanceRole = MdaaRole.fromRoleArn(this, 'role for' + instanceName, roleArn);

      const kmsKey = instanceProps.kmsKeyArn
        ? MdaaKmsKey.fromKeyArn(this, 'key for' + instanceName, instanceProps.kmsKeyArn)
        : this.getKmsKey();

      if (!instanceProps.kmsKeyArn) {
        this.addRoleToKmsKey(roleArn);
      }

      const machineImage: IMachineImage = this.getMachineImage(instanceProps);

      const vpc = Vpc.fromVpcAttributes(this, 'vpc of' + instanceName, {
        availabilityZones: ['dummy'],
        vpcId: instanceProps.vpcId,
      });

      const instanceType = new InstanceType(instanceProps.instanceType);
      const instanceSubnet = Subnet.fromSubnetAttributes(this, 'Subnet for' + instanceName, {
        subnetId: instanceProps.subnetId,
        availabilityZone: instanceProps.availabilityZone,
      });

      const securityGroup = this.getInstanceSecurityGroup(instanceName, instanceProps);

      const keyPairName = this.getInstanceKeyPairName(instanceProps);

      const cfnInitNew = instanceProps.initName ? this.cfnInit[instanceProps.initName] : undefined;

      const initDuration = instanceProps.initOptions?.timeout
        ? Duration.minutes(instanceProps.initOptions.timeout)
        : undefined;

      const initOptions: ApplyCloudFormationInitOptions | undefined = instanceProps.initOptions
        ? {
            configSets: instanceProps.initOptions.configSets,
            embedFingerprint: instanceProps.initOptions.embedFingerprint,
            ignoreFailures: instanceProps.initOptions.ignoreFailures,
            includeRole: instanceProps.initOptions.includeRole,
            includeUrl: instanceProps.initOptions.includeUrl,
            printLog: instanceProps.initOptions.printLog,
            timeout: initDuration,
          }
        : undefined;

      const createInstanceProps: MdaaEC2InstanceProps = {
        role: instanceRole,
        securityGroup: securityGroup,
        instanceType: instanceType,
        machineImage: machineImage,
        vpc: vpc,
        instanceSubnet: instanceSubnet,
        instanceName: instanceName,
        userDataCausesReplacement: instanceProps.userDataCausesReplacement,
        init: cfnInitNew,
        initOptions: initOptions,
        sourceDestCheck: instanceProps.sourceDestCheck,
        kmsKey: kmsKey,
        blockDeviceProps: instanceProps.blockDevices,
        keyName: keyPairName,
        naming: this.props.naming,
      };
      this.instances[instanceName] = new MdaaEC2Instance(this, instanceName + 'instance', createInstanceProps);
      MdaaNagSuppressions.addCodeResourceSuppressions(
        this.instances[instanceName].role,
        [
          {
            id: 'NIST.800.53.R5-IAMNoInlinePolicy',
            reason: 'Adding cfn init adds inline policy to instance role to describe stack',
          },
          {
            id: 'HIPAA.Security-IAMNoInlinePolicy',
            reason: 'Adding cfn init adds inline policy to instance role to describe stack',
          },
          {
            id: 'PCI.DSS.321-IAMNoInlinePolicy',
            reason: 'Adding cfn init adds inline policy to instance role to describe stack',
          },
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'Adding files section for cfn init, adds permission for cdk bootstrap bucket with wildcard to store the file',
          },
        ],
        true,
      );
      const cfnInstance = this.instances[instanceName].node.defaultChild as CfnInstance;
      if (instanceProps.signalCount || instanceProps.creationTimeOut) {
        cfnInstance.cfnOptions.creationPolicy = {
          resourceSignal: {
            count: instanceProps.signalCount,
            timeout: instanceProps.creationTimeOut,
          },
        };
      }

      if (instanceProps.networkInterfaces) {
        this.createNetworkInterfaceAttachments(instanceName, instanceProps.networkInterfaces);
      }
    });
  }

  private getMachineImage(instanceProps: InstanceProps): IMachineImage {
    const osType = Ec2L3Construct.osTypeMap[instanceProps.osType];

    const userDataScript = instanceProps.userDataScriptPath
      ? readFileSync(instanceProps.userDataScriptPath, 'utf8')
      : undefined;

    const configRefValueTranformerProps: MdaaConfigRefValueTransformerProps = {
      naming: this.props.naming,
      org: this.node.tryGetContext('org'),
      domain: this.node.tryGetContext('domain'),
      env: this.node.tryGetContext('env'),
      module_name: this.node.tryGetContext('module_name'),
      scope: this,
    };
    const transformedUserDataScript = userDataScript
      ? new MdaaConfigRefValueTransformer(configRefValueTranformerProps).transformValue(userDataScript)
      : undefined;

    return {
      getImage: function (): MachineImageConfig {
        const userData: UserData = UserData.forOperatingSystem(osType);
        if (transformedUserDataScript) {
          userData.addCommands(transformedUserDataScript.toString());
        }
        return {
          imageId: instanceProps.amiId,
          osType: osType,
          userData: userData,
        };
      },
    };
  }

  private getInstanceKeyPairName(instanceProps: InstanceProps): string | undefined {
    if (instanceProps.keyPairName && instanceProps.existingKeyPairName) {
      throw new Error('At most one of keyPairName or existingKeyPairName must be specified');
    } else if (instanceProps.keyPairName) {
      const keyPairName = this.keyPairs[instanceProps.keyPairName].name;
      if (!keyPairName) {
        throw new Error(`Non-existent key pair name specified: ${instanceProps.keyPairName}`);
      }
      return keyPairName;
    } else if (instanceProps.existingKeyPairName) {
      return instanceProps.existingKeyPairName;
    }
    return undefined;
  }

  private getInstanceSecurityGroup(instanceName: string, instanceProps: InstanceProps): ISecurityGroup {
    if (
      (!instanceProps.securityGroup && !instanceProps.securityGroupId) ||
      (instanceProps.securityGroup && instanceProps.securityGroupId)
    ) {
      throw new Error('Exactly one of securityGroup or securityGroupId must be specified');
    } else {
      if (instanceProps.securityGroup) {
        const sg = this.securityGroups[instanceProps.securityGroup];
        if (!sg) {
          throw new Error(`Security Group ${instanceProps.securityGroup} is not known to this module.`);
        }
        return sg;
      } else {
        return SecurityGroup.fromSecurityGroupId(this, 'SG for' + instanceName, instanceProps.securityGroupId || '');
      }
    }
  }

  private createSecurityGroups(securityGroups: NamedSecurityGroupProps) {
    Object.entries(securityGroups).forEach(entry => {
      const securityGroupName = entry[0];
      const securityGroupProps = entry[1];

      const vpc = Vpc.fromVpcAttributes(this, 'vpc of' + securityGroupName, {
        availabilityZones: ['dummy'],
        vpcId: securityGroupProps.vpcId,
      });

      const customEgress: boolean =
        (securityGroupProps.egressRules?.ipv4 && securityGroupProps.egressRules?.ipv4.length > 0) ||
        (securityGroupProps.egressRules?.prefixList && securityGroupProps.egressRules?.prefixList.length > 0) ||
        (securityGroupProps.egressRules?.sg && securityGroupProps.egressRules?.sg.length > 0) ||
        false;

      const securityGroupCreateProps: MdaaSecurityGroupProps = {
        securityGroupName: securityGroupName,
        vpc: vpc,
        naming: this.props.naming,
        ingressRules: securityGroupProps.ingressRules,
        egressRules: securityGroupProps.egressRules,
        allowAllOutbound: !customEgress,
        addSelfReferenceRule: securityGroupProps.addSelfReferenceRule,
        useParentSSMScope: true,
      };

      this.securityGroups[securityGroupName] = new MdaaSecurityGroup(this, securityGroupName, securityGroupCreateProps);
    });
  }

  /**
   * Adds ingress/egress rules to pre-existing (externally-owned) security groups referenced by
   * id. Does not create any security group. Each rule renders to a standalone
   * SecurityGroupIngress/SecurityGroupEgress resource referencing both groups by id, which is how
   * connectivity between two groups owned by different modules is wired without a circular
   * cross-stack dependency. The group is imported with allowAllOutbound=false so that egress rules
   * are emitted (CDK silently drops egress rules on an imported group when allowAllOutbound=true).
   */
  private createSecurityGroupRules(rules: NamedSecurityGroupRulesProps) {
    Object.entries(rules).forEach(entry => {
      const ruleSetName = entry[0];
      const ruleSetProps = entry[1];
      const securityGroupId = ruleSetProps.securityGroupId;

      ruleSetProps.ingressRules?.ipv4?.forEach(rule => {
        this.addSuppressableRule(ruleSetName, securityGroupId, 'ingress', Peer.ipv4(rule.cidr), rule.cidr, rule);
      });
      ruleSetProps.ingressRules?.sg?.forEach((rule, index) => {
        this.addSuppressableRule(
          ruleSetName,
          securityGroupId,
          'ingress',
          Peer.securityGroupId(rule.sgId),
          sgPeerLabel(rule.sgId, index),
          rule,
        );
      });
      ruleSetProps.ingressRules?.prefixList?.forEach(rule => {
        this.addSuppressableRule(
          ruleSetName,
          securityGroupId,
          'ingress',
          Peer.prefixList(rule.prefixList),
          rule.prefixList,
          rule,
        );
      });

      ruleSetProps.egressRules?.ipv4?.forEach(rule => {
        this.addSuppressableRule(ruleSetName, securityGroupId, 'egress', Peer.ipv4(rule.cidr), rule.cidr, rule);
      });
      ruleSetProps.egressRules?.sg?.forEach((rule, index) => {
        this.addSuppressableRule(
          ruleSetName,
          securityGroupId,
          'egress',
          Peer.securityGroupId(rule.sgId),
          sgPeerLabel(rule.sgId, index),
          rule,
        );
      });
      ruleSetProps.egressRules?.prefixList?.forEach(rule => {
        this.addSuppressableRule(
          ruleSetName,
          securityGroupId,
          'egress',
          Peer.prefixList(rule.prefixList),
          rule.prefixList,
          rule,
        );
      });
    });
  }

  /**
   * Adds a single ingress/egress rule to an externally-owned security group (referenced by id).
   * Emits a CfnSecurityGroupIngress/Egress directly (rather than the plain CDK
   * addIngressRule/addEgressRule on an imported group) so that per-rule CDK Nag suppressions
   * configured on the rule can be applied, mirroring MdaaSecurityGroup.addSuppressable*Rule.
   */
  private addSuppressableRule(
    ruleSetName: string,
    securityGroupId: string,
    direction: 'ingress' | 'egress',
    peer: IPeer,
    peerSource: string,
    rule: {
      port?: number;
      toPort?: number;
      protocol: string;
      description?: string;
      suppressions?: NagPackSuppression[];
    },
  ) {
    const connection: Port = MdaaSecurityGroup.resolvePeerToPort(rule);
    const verb = direction === 'ingress' ? 'from' : 'to';
    // peer.uniqueId for a security-group peer sourced from an unresolved reference (e.g. an
    // ssm: lookup) is a CDK token like ${Token[TOKEN.42]} whose index varies between synths,
    // which would make both the description and the logical id non-deterministic. Fall back to
    // the raw config source string (e.g. the ssm path) for the stable part of those.
    const peerLabel = Token.isUnresolved(peer.uniqueId) ? peerSource : peer.uniqueId;
    const description = rule.description ?? `${verb} ${peerLabel}:${connection}`;
    // Deterministic, collision-free logical id per rule set + direction + peer + port.
    const id = `rules-${ruleSetName}-${direction}-${peerLabel}-${connection}`.replace(/[^a-zA-Z0-9-]/g, '-');

    const cfnRule =
      direction === 'ingress'
        ? new CfnSecurityGroupIngress(this, id, {
            groupId: securityGroupId,
            ...peer.toIngressRuleConfig(),
            ...connection.toRuleJson(),
            description,
          })
        : new CfnSecurityGroupEgress(this, id, {
            groupId: securityGroupId,
            ...peer.toEgressRuleConfig(),
            ...connection.toRuleJson(),
            description,
          });

    if (rule.suppressions) {
      MdaaNagSuppressions.addConfigResourceSuppressions(cfnRule, rule.suppressions, true);
    }
  }

  private getKmsKey(): IKey {
    const kmsKey = this.kmsKey
      ? this.kmsKey
      : new MdaaKmsKey(this, 'kms-key', {
          naming: this.props.naming,
          keyAdminRoleIds: this.adminRoles.map(x => x.id()),
          keyUserRoleIds: this.adminRoles.map(x => x.id()),
        });
    this.kmsKey = kmsKey;
    return kmsKey;
  }

  private addRoleToKmsKey(roleArn: string) {
    // Allow execution role to use the key
    const kmsEncryptDecryptPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: ['*'],
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS, 'kms:CreateGrant', 'kms:DescribeKey', 'kms:ListAliases'],
    });
    kmsEncryptDecryptPolicy.addArnPrincipal(roleArn);
    this.getKmsKey().addToResourcePolicy(kmsEncryptDecryptPolicy);
  }
}
