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
  LocationPackageOptions,
  MachineImageConfig,
  NamedPackageOptions,
  OperatingSystemType,
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
import { Duration } from 'aws-cdk-lib';
import { MdaaConfigRefValueTransformer, MdaaConfigRefValueTransformerProps } from '@aws-mdaa/config';

/**
 * Q-ENHANCED-INTERFACE
 * Named security group collection for organized EC2 network security management. Maps security group names to their configurations, enabling systematic security group deployment and reference management in multi-tier EC2 architectures.
 *
 * Use cases: Multi-tier application security groups; Named security group sets; Organized network security patterns
 *
 * AWS: EC2 security groups with named mappings for systematic network access control and security group management
 *
 * Validation: Names must be unique identifiers; each SecurityGroupProps must define valid VPC and rule configurations
 */
export interface NamedSecurityGroupProps {
  /** @jsii ignore */
  readonly [name: string]: SecurityGroupProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * EC2 security group configuration for VPC network access control. Defines security group properties including VPC targeting, ingress/egress rules, and self-reference capabilities for systematic network security in EC2 deployments.
 *
 * Use cases: Application tier security groups; Database access control; Web server security configuration
 *
 * AWS: EC2 SecurityGroup resource for VPC network access control with ingress/egress rule management
 *
 * Validation: vpcId must be valid VPC identifier; ingress/egress arrays must contain valid SecurityGroupRule configurations
 */
export interface SecurityGroupProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Target VPC identifier for security group deployment enabling VPC-specific network access control. Specifies the VPC where the security group will be created, establishing the network boundary for security rule application and instance association.
   *
   * Use cases: VPC network isolation; Security group placement; Network boundary definition; VPC-specific access control
   *
   * AWS: EC2 SecurityGroup VPC association for network boundary and access control scope
   *
   * Validation: Must be valid VPC ID; required; VPC must exist and be accessible for security group creation
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Inbound traffic rules for security group access control enabling controlled ingress to EC2 instances. Defines the network traffic patterns allowed into instances associated with this security group, supporting application-specific access requirements.
   *
   * Use cases: Application access control; Service port management; Client connectivity rules; Inbound traffic filtering
   *
   * AWS: EC2 SecurityGroup ingress rules for inbound traffic control and access management
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if specified; rules must define valid protocols, ports, and sources
   *   **/
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Outbound traffic rules for security group access control enabling controlled egress from EC2 instances. Defines the network traffic patterns allowed from instances associated with this security group, supporting secure outbound connectivity patterns.
   *
   * Use cases: Outbound access control; Service connectivity; External API access; Egress traffic filtering
   *
   * AWS: EC2 SecurityGroup egress rules for outbound traffic control and connectivity management
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if specified; rules must define valid protocols, ports, and destinations
   *   **/
  readonly egressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Self-reference rule enablement for intra-security-group communication allowing instances within the same security group to communicate. When enabled, automatically creates rules allowing traffic between instances in the same security group for cluster and application tier communication.
   *
   * Use cases: Cluster communication; Application tier connectivity; Database replication; Load balancer health checks
   *
   * AWS: EC2 SecurityGroup self-referencing rules for intra-group communication and cluster connectivity
   *
   * Validation: Boolean value; when true, creates bidirectional self-reference rules for intra-group communication
   **/
  readonly addSelfReferenceRule?: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * EC2 key pair configuration for SSH access with KMS encryption. Defines key pair properties including optional KMS key ARN for private key encryption, enabling secure SSH access management for EC2 instances.
 *
 * Use cases: SSH key management; Encrypted key pairs; Secure instance access
 *
 * AWS: EC2 KeyPair resource with optional KMS encryption for SSH private key protection
 *
 * Validation: kmsKeyArn must be valid KMS key ARN format if specified
 */
export interface KeyPairProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for private key encryption enabling enhanced security for SSH key pairs. When specified, encrypts the private key using the provided KMS key for additional security and compliance with encryption requirements.
   *
   * Use cases: Enhanced key security; Compliance requirements; Encrypted SSH keys; Key management security
   *
   * AWS: EC2 KeyPair KMS encryption for SSH private key protection and security compliance
   *
   * Validation: Must be valid KMS key ARN format if specified; key must exist and be accessible for encryption operations
   **/
  readonly kmsKeyArn?: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named key pair configuration interface for EC2 SSH access management with systematic key pair organization capabilities. Defines named key pair mappings for organized SSH key management in EC2 infrastructure deployments with KMS encryption and access control.
 *
 * Use cases: Named SSH key sets; Key pair organization; Multi-environment key management; Access control patterns; Infrastructure security
 *
 * AWS: EC2 key pair configuration with named mappings for systematic SSH key management and access control organization
 *
 * Validation: Names must be unique identifiers; each entry must map to valid KeyPairProps configuration
 */
export interface NamedKeyPairProps {
  /** @jsii ignore */
  readonly [name: string]: KeyPairProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named CloudFormation Init configuration interface for EC2 instance initialization with systematic configuration organization capabilities. Defines named Init configuration mappings for organized EC2 instance bootstrap configuration including packages, services, files, and commands for systematic infrastructure deployment.
 *
 * Use cases: Named initialization sets; Bootstrap configuration organization; Multi-environment init configs; Instance setup patterns; Infrastructure automation
 *
 * AWS: EC2 CloudFormation Init configuration with named mappings for systematic instance initialization and bootstrap management
 *
 * Validation: Names must be unique identifiers; each entry must map to valid InitProps configuration
 */
export interface NamedInitProps {
  /** @jsii ignore */
  readonly [name: string]: InitProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * CloudFormation Init configuration interface for EC2 instance bootstrap providing initialization and configuration management capabilities. Defines Init properties for EC2 instance startup configuration including config sets, configuration definitions, packages, services, files, and commands for automated instance setup.
 *
 * Use cases: Instance bootstrap configuration; Automated software installation; Service configuration; File deployment; Command execution; Infrastructure automation
 *
 * AWS: EC2 CloudFormation Init configuration for automated instance initialization with packages, services, files, and commands
 *
 * Validation: configSets and configs must be properly defined; configuration must be valid CloudFormation Init format
 */
export interface InitProps {
  /**
   * Set of configs in order they need to run
   */
  // readonly configSets: { [configSetName:string]: string[] };
  readonly configSets: NamedConfigSetsProps;
  /**
   * list of configs
   */
  readonly configs: NamedConfigProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named configuration sets interface for CloudFormation Init with systematic configuration organization capabilities. Defines named configuration set mappings for organized EC2 instance initialization sequences including ordered configuration execution and dependency management for systematic infrastructure deployment.
 *
 * Use cases: Named configuration sequences; Initialization order management; Configuration organization; Multi-stage setup; Infrastructure automation patterns
 *
 * AWS: CloudFormation Init configuration sets with named mappings for systematic initialization sequence management and execution order
 *
 * Validation: Names must be unique identifiers; each entry must map to valid ConfigSetsProps configuration
 */
export interface NamedConfigSetsProps {
  /** @jsii ignore */
  readonly [name: string]: ConfigSetsProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration sets interface for CloudFormation Init with ordered configuration execution and dependency management capabilities. Defines configuration set properties for EC2 instance initialization including configuration sequence ordering and execution dependencies for systematic infrastructure setup.
 *
 * Use cases: Configuration execution order; Initialization sequences; Dependency management; Multi-stage setup; Infrastructure automation
 *
 * AWS: CloudFormation Init configuration sets for ordered configuration execution and initialization sequence management
 *
 * Validation: configs must be valid configuration references; execution order must be properly defined for initialization sequence
 */
export interface ConfigSetsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Ordered list of configuration names for sequential execution during EC2 instance initialization. Defines the execution sequence for CloudFormation Init configurations, ensuring proper dependency order and systematic infrastructure setup during instance bootstrap.
   *
   * Use cases: Configuration execution order; Initialization sequences; Dependency management; Multi-stage setup; Infrastructure automation
   *
   * AWS: CloudFormation Init configuration set execution order for systematic instance initialization
   *
   * Validation: Must be array of valid configuration names; configurations must exist in the configs section; execution order determines initialization sequence
   **/
  readonly configs: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Named configuration interface for CloudFormation Init with systematic configuration organization capabilities. Defines named configuration mappings for organized EC2 instance initialization including packages, services, files, and commands for systematic infrastructure deployment.
 *
 * Use cases: Named configuration sets; Configuration organization; Multi-environment configs; Setup patterns; Infrastructure automation
 *
 * AWS: CloudFormation Init configuration with named mappings for systematic initialization configuration management and organization
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface NamedConfigProps {
  /** @jsii ignore */
  readonly [name: string]: ConfigProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudFormation Init providing package, service, file, and command management capabilities. Defines configuration properties for EC2 instance initialization including software packages, system services, file deployments, and command execution for automated infrastructure setup.
 *
 * Use cases: Package installation; Service configuration; File deployment; Command execution; System setup; Infrastructure automation
 *
 * AWS: CloudFormation Init configuration for EC2 instance initialization with packages, services, files, and commands
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface ConfigProps {
  /**
   * You can use the packages key to download and install pre-packaged applications and components. On Windows systems, the packages key supports only the MSI installer.
   * The cfn-init script currently supports the following package formats: apt, msi, python, rpm, rubygems, yum, and Zypper.
   */
  readonly packages?: NamedPackageProps;
  /**
   * You can use the groups key to create Linux/UNIX groups and to assign group IDs. The groups key isn't supported for Windows systems.
   */
  readonly groups?: NamedGroupProps;
  /**
   * You can use the users key to create Linux/UNIX users on the EC2 instance. The users key isn't supported for Windows systems.
   */
  readonly users?: NamedUserProps;
  /**
   * You can use the sources key to download an archive file and unpack it in a target directory on the EC2 instance.
   * This key is fully supported for both Linux and Windows systems.
   */
  readonly sources?: NamedSourceProps;
  /**
   * You can use the files key to create files on the EC2 instance.
   * Content is pulled from a given file
   */
  readonly files?: NamedFileProps;
  /**
   * You can use the commands key to run commands on the EC2 instance.
   * The commands are processed in alphabetical order by name.
   */
  readonly commands?: NamedCommandProps;
  /**
   * You can use the services key to define which services should be enabled or disabled when the instance is launched.
   * On Linux systems, this key is supported by using sysvinit or systemd.
   * On Windows systems, it's supported by using the Windows service manager.
   */
  readonly services?: NamedServiceProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named package configuration interface for CloudFormation Init with systematic package management capabilities. Defines named package mappings for organized software installation in EC2 instance initialization including package managers, versions, and installation options.
 *
 * Use cases: Named package sets; Software installation organization; Package management; Multi-environment packages; Infrastructure automation
 *
 * AWS: CloudFormation Init package configuration with named mappings for systematic software installation and package management
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
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
 * Q-ENHANCED-INTERFACE
 * Package configuration interface for CloudFormation Init providing software installation and package management capabilities. Defines package properties for EC2 instance initialization including package managers, installation locations, versions, and restart requirements for automated software deployment.
 *
 * Use cases: Software installation; Package management; Version control; Installation automation; System configuration; Infrastructure setup
 *
 * AWS: CloudFormation Init package configuration for automated software installation with package managers and version control
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface PackageProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Package manager type for software installation specifying the installation method and package format. Determines how the package will be installed on the EC2 instance, supporting various package managers for different operating systems and software types.
   *
   * Use cases: Cross-platform package installation; Package manager selection; Software deployment; Installation automation
   *
   * AWS: CloudFormation Init package manager specification for automated software installation
   *
   * Validation: Must be valid package manager value ('msi', 'rpm', 'gem', 'yum', 'python', 'apt'); required; determines installation method
   **/
  readonly packageManager: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Package location URL or path for MSI and RPM package installation enabling direct package file installation. Specifies the location where the package file can be downloaded or accessed for installation on the EC2 instance.
   *
   * Use cases: Direct package installation; Custom package deployment; MSI/RPM package installation; Package file distribution
   *
   * AWS: CloudFormation Init package location for MSI and RPM package file installation
   *
   * Validation: Must be valid URL or file path if specified; required for MSI and RPM packages; must be accessible during installation
   **/
  readonly packageLocation?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Package name for repository-based installation enabling package manager repository installation. Specifies the package name as it appears in the package manager repository for gem, yum, python, and apt package installations.
   *
   * Use cases: Repository package installation; Package manager integration; Standard package deployment; Software installation automation
   *
   * AWS: CloudFormation Init package name for repository-based package installation
   *
   * Validation: Must be valid package name if specified; required for gem, yum, python, apt packages; must exist in package repository
   **/
  readonly packageName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Specific package versions for version-controlled installation enabling precise software version management. Specifies exact package versions to install, supporting version pinning and controlled software deployment for consistency and compatibility.
   *
   * Use cases: Version pinning; Controlled deployment; Software compatibility; Version management; Consistent environments
   *
   * AWS: CloudFormation Init package version specification for controlled software version installation
   *
   * Validation: Must be array of valid version strings if specified; empty array installs latest version; versions must be available
   **/
  readonly packageVersions?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Package identifier key for MSI and RPM package installation enabling package identification and management. Provides unique identifier for the package installation, supporting package tracking and management in CloudFormation Init.
   *
   * Use cases: Package identification; Installation tracking; Package management; MSI/RPM package handling
   *
   * AWS: CloudFormation Init package key for MSI and RPM package identification and management
   *
   * Validation: Must be valid identifier string if specified; used for MSI and RPM packages; enables package tracking
   **/
  readonly key?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Service restart requirement flag for post-installation service management enabling automatic service restart after package installation. When enabled, automatically restarts specified services after package installation to ensure proper service configuration and functionality.
   *
   * Use cases: Service restart automation; Post-installation configuration; Service management; Installation completion
   *
   * AWS: CloudFormation Init service restart configuration for post-package installation service management
   *
   * Validation: Boolean value; when true, restarts services after package installation; ensures proper service configuration
   **/
  readonly restartRequired?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named group configuration interface for CloudFormation Init with systematic user group management capabilities. Defines named group mappings for organized system group creation in EC2 instance initialization including group IDs and group management for security and access control.
 *
 * Use cases: Named group sets; User group organization; System security; Access control; Multi-environment groups; Infrastructure automation
 *
 * AWS: CloudFormation Init group configuration with named mappings for systematic system group management and access control
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface NamedGroupProps {
  /** @jsii ignore */
  readonly [name: string]: GroupProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Group configuration interface for CloudFormation Init with system group creation and management capabilities. Defines group properties for EC2 instance initialization including group ID specification and system group configuration for user management and access control.
 *
 * Use cases: System group creation; User management; Access control; Group ID management; Security configuration; Infrastructure setup
 *
 * AWS: CloudFormation Init group configuration for system group creation with group ID management and access control
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface GroupProps {
  /**
   * Q-ENHANCED-PROPERTY
   * System group ID number for group creation enabling specific group ID assignment and system integration. When specified, creates the group with the exact group ID, supporting system integration requirements and group ID management for security and access control.
   *
   * Use cases: Specific group ID assignment; System integration; Group ID management; Security configuration; Access control
   *
   * AWS: CloudFormation Init group creation with specific group ID for system group management
   *
   * Validation: Must be valid group ID string if specified; group creation fails if group exists by name; OS may reject if ID conflicts
   **/
  readonly gid?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named user configuration interface for CloudFormation Init with systematic user account management capabilities. Defines named user mappings for organized system user creation in EC2 instance initialization including user accounts, groups, and home directories for security and access control.
 *
 * Use cases: Named user sets; User account organization; System security; Access control; Multi-environment users; Infrastructure automation
 *
 * AWS: CloudFormation Init user configuration with named mappings for systematic system user management and access control
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface NamedUserProps {
  /** @jsii ignore */
  readonly [name: string]: UserProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * User configuration interface for CloudFormation Init providing user account creation and management capabilities. Defines user properties for EC2 instance initialization including user IDs, group memberships, home directories, and user configuration for system security and access control.
 *
 * Use cases: User account creation; Group membership; Home directory management; User ID specification; System security; Access control
 *
 * AWS: CloudFormation Init user configuration for system user creation with group membership and home directory management
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface UserProps {
  /**
   * Q-ENHANCED-PROPERTY
   * System user ID number for user account creation enabling specific user ID assignment and system integration. When specified, creates the user with the exact user ID, supporting system integration requirements and user ID management for security and access control.
   *
   * Use cases: Specific user ID assignment; System integration; User ID management; Security configuration; Access control
   *
   * AWS: CloudFormation Init user creation with specific user ID for system user management
   *
   * Validation: Must be valid user ID string if specified; creation fails if username exists with different ID; OS may reject if ID conflicts
   **/
  readonly uid?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * List of group names for user group membership enabling user access control and permission management. Specifies the groups to which the user will be added, supporting role-based access control and system security through group-based permissions.
   *
   * Use cases: Group membership; Role-based access; Permission management; Security configuration; Access control
   *
   * AWS: CloudFormation Init user group membership for access control and permission management
   *
   * Validation: Must be array of valid group names; required; groups must exist or be created before user creation
   **/
  readonly groups: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * User home directory path for user account configuration enabling personalized user environment and file management. Specifies the home directory location for the user account, supporting user environment setup and file organization.
   *
   * Use cases: User environment setup; Home directory management; File organization; User configuration; Personal workspace
   *
   * AWS: CloudFormation Init user home directory configuration for user environment and file management
   *
   * Validation: Must be valid directory path; required; directory will be created if it doesn't exist
   **/
  readonly homeDir: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named source configuration interface for CloudFormation Init with systematic source file management capabilities. Defines named source mappings for organized file source configuration in EC2 instance initialization including remote sources and file deployment for infrastructure automation.
 *
 * Use cases: Named source sets; File source organization; Remote file management; Multi-environment sources; Infrastructure automation
 *
 * AWS: CloudFormation Init source configuration with named mappings for systematic file source management and deployment
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface NamedSourceProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [name: string]: SourceProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Source configuration interface for CloudFormation Init with file source specification and deployment capabilities. Defines source properties for EC2 instance initialization including source locations and file deployment configuration for automated file management and infrastructure setup.
 *
 * Use cases: File source specification; Remote file deployment; Source management; File automation; Infrastructure setup; Configuration deployment
 *
 * AWS: CloudFormation Init source configuration for file deployment with source location specification and file management
 *
 * Validation: Configuration must be valid CloudFormation Init format; properties must conform to EC2 initialization requirements
 */
export interface SourceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Source location URL for file download and deployment enabling remote file retrieval and automated file management. Specifies the URL from which files will be downloaded and deployed to the EC2 instance during initialization, supporting automated configuration and software deployment.
   *
   * Use cases: Remote file deployment; Configuration download; Software installation; Automated file retrieval; Infrastructure setup
   *
   * AWS: CloudFormation Init source location for file download and deployment automation
   *
   * Validation: Must be valid URL; required; source must be accessible during instance initialization for file download
   **/
  readonly source: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named file configuration interface for CloudFormation Init with systematic file deployment management capabilities. Defines named file mappings for organized file deployment in EC2 instance initialization including file paths, content, and permissions for infrastructure automation.
 *
 * Use cases: Named file sets; File deployment organization; Multi-environment files; Infrastructure automation; Configuration management
 *
 * AWS: CloudFormation Init file configuration with named mappings for systematic file deployment and management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface NamedFileProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [name: string]: FileProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * File configuration interface for CloudFormation Init providing file deployment and management capabilities. Defines file properties for EC2 instance initialization including file paths, content deployment, permissions, and restart requirements for automated file management and system configuration.
 *
 * Use cases: File deployment; Content management; Permission configuration; File automation; System setup; Infrastructure configuration
 *
 * AWS: CloudFormation Init file configuration for automated file deployment with path specification and permission management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface FileProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required source file path for CloudFormation Init file deployment enabling file content specification and deployment automation. Specifies the path to the source file that will be deployed to the EC2 instance during initialization for configuration file deployment and content management.
   *
   * Use cases: File deployment; Configuration files; Content deployment; File automation
   *
   * AWS: CloudFormation Init file source path for file deployment and content management
   *
   * Validation: Must be valid file path string; required for file deployment and content specification
   **/
  readonly filePath: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional restart requirement flag for service management after file deployment enabling automated service restart and configuration activation. Controls whether services should be restarted after file deployment to ensure configuration changes take effect.
   *
   * Use cases: Service restart; Configuration activation; Service management; Automated restart
   *
   * AWS: CloudFormation Init service restart control for configuration activation
   *
   * Validation: Must be boolean if provided; defaults to false; controls service restart behavior
   **/
  readonly restartRequired?: boolean;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named command configuration interface for CloudFormation Init with systematic command execution management capabilities. Defines named command mappings for organized command execution in EC2 instance initialization including shell commands, environment variables, and execution control for infrastructure automation.
 *
 * Use cases: Named command sets; Command execution organization; Multi-environment commands; Infrastructure automation; System configuration
 *
 * AWS: CloudFormation Init command configuration with named mappings for systematic command execution and management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
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
 * Q-ENHANCED-INTERFACE
 * Command configuration interface for CloudFormation Init providing command execution and process management capabilities. Defines command properties for EC2 instance initialization including shell commands, arguments, environment variables, working directories, and execution control for automated system configuration.
 *
 * Use cases: Command execution; Process management; Environment configuration; Working directory control; Test commands; Infrastructure automation
 *
 * AWS: CloudFormation Init command configuration for automated command execution with environment variables and process control
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface CommandProps {
  // readonly key?: string;
  /**
   * Shell command that needs to be run, either shell command or argvs should be provided.
   */
  readonly shellCommand?: string;
  /**
   * list of args that needs to be run as argvs, either shell command or argvs should be provided.
   */
  readonly argvs?: string[];
  /**
   * Sets environment variables for the command.
   * This property overwrites, rather than appends, the existing environment.
   */
  readonly env?: NamedEnvProps;
  /**
   * dir where command needs to be run.
   */
  readonly workingDir?: string;
  /**
   * Command to determine whether this command should be run.
   * If the test passes (exits with error code of 0), the command is run.
   */
  readonly testCommand?: string;
  /**
   * Continue running if this command fails. default is false
   */
  readonly ignoreErrors?: boolean;
  /**
   * The duration in minutes to wait after a command has finished in case the command causes a reboot.
   * Set this value to InitCommandWaitDuration.none() if you do not want to wait for every command; InitCommandWaitDuration.forever() directs cfn-init to exit and resume only after the reboot is complete.
   * For Windows systems only.
   * Default is 1 minute
   */
  readonly waitAfterCompletion?: number;
  /**
   * cfn-init will exit and resume only after a reboot.
   * Choose either waitAfterCompletion waitForever or waitNone, If choose none of these >> default wait time will be 1 minute
   */
  readonly waitForever?: boolean;
  /**
   * Do not wait for this command.
   * Choose either waitAfterCompletion waitForever or waitNone, If choose none of these >> default wait time will be 1 minute
   */
  readonly waitNone?: boolean;
  /**
   * Restart the given service(s) after this command has run, default: Do not restart any service
   */
  readonly restartRequired?: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named environment variable configuration interface for CloudFormation Init with systematic environment management capabilities. Defines named environment variable mappings for organized environment configuration in EC2 instance initialization including variable sets and environment management for infrastructure automation.
 *
 * Use cases: Named environment sets; Environment variable organization; Multi-environment configs; Infrastructure automation; System configuration
 *
 * AWS: CloudFormation Init environment configuration with named mappings for systematic environment variable management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface NamedEnvProps {
  /** @jsii ignore */
  readonly [name: string]: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named service configuration interface for CloudFormation Init with systematic service management capabilities. Defines named service mappings for organized system service configuration in EC2 instance initialization including service control and management for infrastructure automation.
 *
 * Use cases: Named service sets; Service management organization; Multi-environment services; Infrastructure automation; System configuration
 *
 * AWS: CloudFormation Init service configuration with named mappings for systematic system service management and control
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
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
 * Q-ENHANCED-INTERFACE
 * Service configuration interface for CloudFormation Init providing system service management and control capabilities. Defines service properties for EC2 instance initialization including service enablement, startup control, restart requirements, and service management for automated system configuration.
 *
 * Use cases: System service management; Service startup control; Service enablement; Restart management; Infrastructure automation; System configuration
 *
 * AWS: CloudFormation Init service configuration for automated system service management with startup control and service enablement
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface ServiceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to ensure the service is running after CloudFormation Init completion enabling service state control. Determines whether the service should be actively running after the initialization process completes, providing control over final service state.
   *
   * Use cases: Service state control; Post-initialization service management; Service availability; System readiness; Service lifecycle
   *
   * AWS: CloudFormation Init service running state control for post-initialization service management
   *
   * Validation: Must be boolean value if provided; optional for service running state control
   **/
  readonly ensureRunning?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to control service startup behavior on system boot enabling automatic service initialization. Determines whether the service will be automatically started when the EC2 instance boots up, providing control over service availability and system startup behavior.
   *
   * Use cases: Automatic service startup; Boot-time service control; Service availability; System initialization; Service management
   *
   * AWS: CloudFormation Init service enablement for automatic startup control on EC2 instance boot
   *
   * Validation: Must be boolean value if provided; optional for service startup control
   **/
  readonly enabled?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to disable and stop the specified service enabling service deactivation and shutdown. Provides ability to explicitly disable a service and ensure it is not running, useful for security hardening or resource optimization scenarios.
   *
   * Use cases: Service deactivation; Security hardening; Resource optimization; Service shutdown; System configuration
   *
   * AWS: CloudFormation Init service disabling for service deactivation and shutdown control
   *
   * Validation: Must be boolean value if provided; optional for service disabling control
   **/
  readonly disabled?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to restart the service after command execution enabling service refresh and configuration reload. Provides ability to restart services after configuration changes or command execution to ensure new settings take effect.
   *
   * Use cases: Service restart; Configuration reload; Service refresh; Post-command service management; Configuration application
   *
   * AWS: CloudFormation Init service restart control for post-command service refresh and configuration reload
   *
   * Validation: Must be boolean value if provided; optional for service restart control
   **/
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
 * Q-ENHANCED-INTERFACE
 * CloudFormation Init options configuration interface providing initialization control and execution management capabilities. Defines Init options for EC2 instance initialization including config sets, execution parameters, timeout control, and initialization behavior for automated infrastructure deployment.
 *
 * Use cases: Initialization control; Config set execution; Timeout management; Execution parameters; Infrastructure automation; Deployment control
 *
 * AWS: CloudFormation Init options configuration for initialization control with config set execution and timeout management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface InitOptionsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of configuration set names for CloudFormation Init execution control enabling selective initialization configuration. Defines which configuration sets will be activated during EC2 instance initialization, providing granular control over which initialization steps are executed.
   *
   * Use cases: Selective initialization; Config set activation; Initialization control; Deployment customization; Environment-specific setup
   *
   * AWS: CloudFormation Init configuration sets for selective initialization execution and deployment control
   *
   * Validation: Must be array of valid configuration set names if provided; defaults to ['default']; optional for config set control
   **/
  readonly configSets?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to embed configuration fingerprint in UserData for automatic instance replacement on configuration changes. Controls whether a hash of the CloudFormation Init configuration will be embedded in UserData, enabling automatic instance replacement when configuration changes occur.
   *
   * Use cases: Automatic configuration updates; Instance replacement control; Configuration change detection; Deployment automation; Infrastructure updates
   *
   * AWS: CloudFormation Init configuration fingerprint embedding for automatic instance replacement on configuration changes
   *
   * Validation: Must be boolean value if provided; defaults to true; optional for configuration change handling
   **/
  readonly embedFingerprint?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to prevent CloudFormation rollback on cfn-init failures enabling debugging and troubleshooting. Controls whether instance creation will continue even if CloudFormation Init fails, allowing for debugging and troubleshooting of initialization issues without triggering stack rollback.
   *
   * Use cases: Debugging initialization issues; Troubleshooting deployment problems; Development testing; Error investigation; Deployment resilience
   *
   * AWS: CloudFormation Init failure handling for debugging and troubleshooting with rollback prevention
   *
   * Validation: Must be boolean value if provided; defaults to false; optional for failure handling control
   **/
  readonly ignoreFailures?: boolean;
  /**
   * Include --role argument when running cfn-init and cfn-signal commands.
   * This will be the IAM instance profile attached to the EC2 instance
   */
  readonly includeRole?: boolean;
  /**
   * Include --url argument when running cfn-init and cfn-signal commands.
   * This will be the cloudformation endpoint in the deployed region
   */
  readonly includeUrl?: boolean;
  /**
   * Print the results of running cfn-init to the Instance System Log.
   * By default, the output of running cfn-init is written to a log file on the instance.
   * Set this to true to print it to the System Log (visible from the EC2 Console), false to not print it.
   * (Be aware that the system log is refreshed at certain points in time of the instance life cycle, and successful execution may not always show up).
   */
  readonly printLog?: boolean;
  /**
   * Timeout waiting for the configuration to be applied.
   * in minutes
   * default is 5 mins
   */
  readonly timeout?: number;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named EC2 instance configuration interface with systematic instance deployment management capabilities. Defines named instance mappings for organized EC2 instance deployment including instance specifications, security configuration, and deployment parameters for infrastructure automation.
 *
 * Use cases: Named instance sets; Instance deployment organization; Multi-environment instances; Infrastructure automation; Compute management
 *
 * AWS: EC2 instance configuration with named mappings for systematic instance deployment and management
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface NamedInstanceProps {
  /** @jsii ignore */
  readonly [name: string]: InstanceProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * EC2 instance configuration interface providing compute infrastructure deployment and management capabilities. Defines instance properties for EC2 deployment including instance types, AMI selection, VPC configuration, security groups, storage, IAM roles, and initialization for secure compute infrastructure.
 *
 * Use cases: Instance deployment; Compute infrastructure; Security configuration; Storage management; Network configuration; Infrastructure automation
 *
 * AWS: EC2 instance configuration for compute infrastructure deployment with security groups, storage, and network configuration
 *
 * Validation: Configuration must be valid for EC2 deployment; properties must conform to AWS EC2 requirements and MDAA standards
 */
export interface InstanceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group name reference for EC2 instance network access control enabling project-generated security group integration. Specifies a security group generated within the project configuration for instance network access control and security management.
   *
   * Use cases: Project security groups; Network access control; Security integration; Instance security
   *
   * AWS: Project-generated security group name for EC2 instance network access control
   *
   * Validation: Must be valid security group name if provided; references project-generated security groups
   **/
  readonly securityGroup?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group ID for EC2 instance network access control enabling external security group integration. Specifies an existing security group ID for instance network access control and integration with external VPC security configurations.
   *
   * Use cases: External security groups; VPC integration; Network access control; Security group reuse
   *
   * AWS: AWS security group ID for EC2 instance network access control and security
   *
   * Validation: Must be valid security group ID if provided; must exist in the specified VPC
   **/
  readonly securityGroupId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required EC2 instance type specification for compute resource allocation enabling performance and cost optimization. Defines the instance type affecting compute capacity, memory, network performance, and cost for workload-appropriate resource allocation.
   *
   * Use cases: Compute capacity; Performance optimization; Cost control; Resource allocation
   *
   * AWS: AWS EC2 instance type for compute resource specification and performance
   *
   * Validation: Must be valid EC2 instance type string; required for instance creation and resource allocation
   **/
  readonly instanceType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Amazon Machine Image (AMI) ID for EC2 instance operating system and software configuration. Specifies the AMI that defines the instance's operating system, software packages, and initial configuration for consistent infrastructure deployment.
   *
   * Use cases: Operating system selection; Software configuration; Image standardization; Infrastructure consistency
   *
   * AWS: AWS AMI ID for EC2 instance operating system and software configuration
   *
   * Validation: Must be valid AMI ID string; required for instance creation and OS configuration
   **/
  readonly amiId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for EC2 instance network placement enabling VPC-specific deployment and network isolation. Specifies the VPC where the instance will be deployed affecting network boundaries and connectivity for secure infrastructure deployment.
   *
   * Use cases: VPC deployment; Network isolation; Network boundaries; Secure deployment
   *
   * AWS: AWS VPC ID for EC2 instance network placement and isolation
   *
   * Validation: Must be valid VPC ID string; required for instance network placement and security
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required subnet ID for EC2 instance placement within VPC enabling availability zone targeting and network segmentation. Specifies the subnet where the instance will be deployed affecting availability zone placement and network access patterns.
   *
   * Use cases: Subnet placement; Availability zone targeting; Network segmentation; Instance placement
   *
   * AWS: AWS VPC subnet ID for EC2 instance placement and network configuration
   *
   * Validation: Must be valid subnet ID string; required for instance placement and network configuration
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of block device configurations for EC2 instance storage management enabling storage configuration. Defines storage devices attached to the instance including EBS volumes, instance store, and storage configuration for data management and performance optimization.
   *
   * Use cases: Storage configuration; Volume management; Data storage; Performance optimization
   *
   * AWS: AWS EBS and instance store configuration for EC2 instance storage management
   *
   * Validation: Must be array of valid BlockDeviceProps objects; required for instance storage configuration
   **/
  readonly blockDevices: BlockDeviceProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role reference for EC2 instance permissions enabling secure access to AWS services and resources. Provides the IAM role that the instance assumes for accessing AWS services, resources, and performing operations with appropriate permissions.
   *
   * Use cases: Instance permissions; Service access; Security roles; Resource authorization
   *
   * AWS: AWS IAM role for EC2 instance permissions and service access
   *
   * Validation: Must be valid MdaaRoleRef object; required for instance permissions and resource access
   **/
  readonly instanceRole: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for EC2 instance encryption enabling data protection and compliance. Provides customer-managed encryption key for EBS volumes and instance encryption ensuring data protection and regulatory compliance.
   *
   * Use cases: Data encryption; Compliance requirements; Security enhancement; Key management
   *
   * AWS: AWS KMS key ARN for EC2 instance and EBS volume encryption
   *
   * Validation: Must be valid KMS key ARN if provided; enables encryption when specified
   **/
  readonly kmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required availability zone specification for EC2 instance placement enabling zone-specific deployment and high availability design. Defines the specific AZ within the VPC where the instance will be deployed affecting availability, latency, and disaster recovery planning.
   *
   * Use cases: Availability zone targeting; High availability design; Disaster recovery; Zone-specific placement
   *
   * AWS: AWS Availability Zone for EC2 instance placement and availability management
   *
   * Validation: Must be valid availability zone string; required for instance placement and availability design
   **/
  readonly availabilityZone: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required operating system type specification for EC2 instance configuration enabling OS-specific management and automation. Defines the operating system type affecting instance configuration, user data scripts, and management operations for platform-appropriate deployment.
   *
   * Use cases: OS-specific configuration; Platform management; Automation targeting; Configuration management
   *
   * AWS: Operating system type for EC2 instance configuration and management
   *
   * Validation: Must be 'linux', 'windows', or 'unknown'; required for OS-specific configuration and management
   *   **/
  readonly osType: 'linux' | 'windows' | 'unknown';
  /**
   * Q-ENHANCED-PROPERTY
   * Optional user data script path for EC2 instance initialization enabling custom bootstrap configuration and automation. Specifies the path to a user data script that will be executed during instance startup for custom configuration and software installation.
   *
   * Use cases: Custom bootstrap; Instance initialization; Software installation; Configuration automation
   *
   * AWS: EC2 user data script for instance initialization and bootstrap configuration
   *
   * Validation: Must be valid file path if provided; enables custom initialization when specified
   **/
  readonly userDataScriptPath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional user data replacement control for EC2 instance update behavior enabling deployment strategy management. Controls whether changes to user data force instance replacement or restart affecting deployment behavior and instance lifecycle management.
   *
   * Use cases: Deployment strategy; Update behavior; Instance lifecycle; Change management
   *
   * AWS: CloudFormation instance replacement behavior for user data changes
   *
   * Validation: Must be boolean if provided; defaults based on init configuration; affects instance update behavior
   **/
  readonly userDataCausesReplacement?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudFormation Init configuration for EC2 instance bootstrap enabling initialization and configuration management. Provides Init configuration for automated instance setup including packages, services, files, and commands for infrastructure automation.
   *
   * Use cases: Instance bootstrap; Automated configuration; Infrastructure setup; Initialization management
   *
   * AWS: CloudFormation Init for EC2 instance bootstrap and configuration management
   *
   * Validation: Must be valid InitProps object if provided; enables automated initialization when specified
   **/
  readonly init?: InitProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Init configuration name reference for CloudFormation Init enabling named configuration selection and management. Specifies the name of the Init configuration to be applied from the configuration collection for organized initialization management.
   *
   * Use cases: Named configuration selection; Init management; Configuration organization; Initialization control
   *
   * AWS: CloudFormation Init configuration name for initialization management
   *
   * Validation: Must be valid Init configuration name if provided; references named Init configurations
   **/
  readonly initName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudFormation Init options for initialization control enabling Init execution management. Defines Init execution options including config sets, timeout control, and execution parameters for automated infrastructure deployment.
   *
   * Use cases: Init execution control; Timeout management; Configuration execution; Deployment control
   *
   * AWS: CloudFormation Init options for execution control and initialization management
   *
   * Validation: Must be valid InitOptionsProps object if provided; configures Init execution when specified
   **/
  readonly initOptions?: InitOptionsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional signal count for CloudFormation creation policy enabling deployment validation and success confirmation. Defines the number of successful signals required for instance creation completion ensuring proper initialization and deployment validation.
   *
   * Use cases: Deployment validation; Success confirmation; Creation policy; Initialization verification
   *
   * AWS: CloudFormation creation policy signal count for deployment validation
   *
   * Validation: Must be positive integer if provided; enables deployment validation when specified
   **/
  readonly signalCount?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional creation timeout for CloudFormation creation policy enabling deployment time control and failure management. Defines the maximum time to wait for instance creation signals ensuring timely deployment completion and failure detection.
   *
   * Use cases: Deployment timeout; Time control; Failure detection; Creation management
   *
   * AWS: CloudFormation creation policy timeout for deployment time control
   *
   * Validation: Must be valid timeout string if provided; controls deployment timing when specified
   **/
  readonly creationTimeOut?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional source/destination check control for EC2 instance NAT functionality enabling network address translation and routing capabilities. Controls whether the instance can perform NAT operations affecting network routing and connectivity for specialized networking scenarios.
   *
   * Use cases: NAT functionality; Network routing; Connectivity management; Specialized networking
   *
   * AWS: EC2 source/destination check for NAT functionality and network routing
   *
   * Validation: Must be boolean if provided; enables NAT functionality when disabled (false)
   **/
  readonly sourceDestCheck?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SSH key pair name reference for EC2 instance access enabling project-generated key pair integration. Specifies a key pair generated within the project configuration for SSH access to the instance for secure remote access management.
   *
   * Use cases: Project key pairs; SSH access; Secure access; Key management
   *
   * AWS: Project-generated SSH key pair name for EC2 instance access
   *
   * Validation: Must be valid key pair name if provided; references project-generated key pairs
   **/
  readonly keyPairName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing SSH key pair name for EC2 instance access enabling external key pair integration. Specifies an existing key pair for SSH access to the instance enabling integration with external key management and existing access patterns.
   *
   * Use cases: Existing key pairs; External key integration; SSH access; Key reuse
   *
   * AWS: Existing SSH key pair name for EC2 instance access and authentication
   *
   * Validation: Must be valid existing key pair name if provided; key pair must exist in the region
   **/
  readonly existingKeyPairName?: string;
}

export interface Ec2L3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of admin role references for EC2 infrastructure administration enabling administrative access to KMS keys and KeyPair secrets. Provides IAM roles that will be granted administrative access to EC2 infrastructure resources including encryption keys and key pair secrets for secure management.
   *
   * Use cases: Administrative access; Key management; Secret access; Infrastructure administration
   *
   * AWS: IAM role references for EC2 infrastructure administrative access and key management
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required for EC2 infrastructure administration and key access
   **/
  readonly adminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of security group names to security group definitions for network security and access control enabling VPC-level security management. Provides security group configurations for controlling network access, traffic rules, and security policies for EC2 instances and infrastructure.
   *
   * Use cases: Network security; Access control; Traffic rules; VPC security management
   *
   * AWS: EC2 security groups for network security and access control configuration
   *
   * Validation: Must be valid NamedSecurityGroupProps if provided; enables network security and access control management
   *   **/
  readonly securityGroups?: NamedSecurityGroupProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of key pair names to key pair definitions for EC2 instance access enabling secure SSH access and instance connectivity. Provides key pair configurations for creating encrypted SSH key pairs for secure instance access and administrative connectivity.
   *
   * Use cases: SSH access; Instance connectivity; Secure access; Key pair management
   *
   * AWS: EC2 key pairs for secure SSH access and instance connectivity
   *
   * Validation: Must be valid NamedKeyPairProps if provided; enables secure SSH access and instance connectivity
   **/
  readonly keyPairs?: NamedKeyPairProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of CloudFormation init configuration names to init definitions for instance initialization and configuration management. Provides cfn-init configurations for automated instance setup, software installation, and configuration management during instance launch.
   *
   * Use cases: Instance initialization; Configuration management; Automated setup; Software installation
   *
   * AWS: CloudFormation init configurations for automated instance setup and configuration management
   *
   * Validation: Must be valid NamedInitProps if provided; enables automated instance initialization and configuration
   **/
  readonly cfnInit?: NamedInitProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of instance names to instance definitions for EC2 compute resource deployment enabling scalable compute infrastructure and application hosting. Provides instance configurations for deploying EC2 instances with specific configurations, security settings, and initialization scripts.
   *
   * Use cases: Compute deployment; Instance configuration; Application hosting; Scalable infrastructure
   *
   * AWS: EC2 instances for compute resource deployment and application hosting
   *
   * Validation: Must be valid NamedInstanceProps if provided; enables EC2 instance deployment and compute infrastructure
   **/
  readonly instances?: NamedInstanceProps;
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
  public readonly instances: { [key: string]: Instance } = {};
  public readonly cfnInit: { [key: string]: CloudFormationInit } = {};
  constructor(scope: Construct, id: string, props: Ec2L3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.adminRoles = props.roleHelper.resolveRoleRefsWithOrdinals(props.adminRoles, 'admin');

    this.createKeyPairs(props.keyPairs || {});
    this.createSecurityGroups(props.securityGroups || {});
    this.cfnInit = this.createInit(props.cfnInit || {});
    this.createInstances(props.instances || {});
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
    });
  }

  private getMachineImage(instanceProps: InstanceProps): IMachineImage {
    const osType = Ec2L3Construct.osTypeMap[instanceProps.osType];

    const userDataScript = instanceProps.userDataScriptPath
      ? readFileSync(instanceProps.userDataScriptPath, 'utf8')
      : undefined;

    const configRefValueTranformerProps: MdaaConfigRefValueTransformerProps = {
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
      };

      this.securityGroups[securityGroupName] = new MdaaSecurityGroup(this, securityGroupName, securityGroupCreateProps);
    });
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
