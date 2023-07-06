/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockDeviceProps, CaefEC2Instance, CaefEC2InstanceProps, CaefEC2SecretKeyPair, CaefEC2SecretKeyPairProps, CaefSecurityGroup, CaefSecurityGroupProps, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefResolvableRole, CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from "@aws-caef/l3-construct";
import { ApplyCloudFormationInitOptions, CloudFormationInit, InitConfig, InitPackage, InitServiceRestartHandle, InitCommandWaitDuration, NamedPackageOptions, ConfigSetProps, IMachineImage, Instance, CfnInstance, InstanceType, ISecurityGroup, MachineImageConfig, OperatingSystemType, SecurityGroup, Subnet, UserData, Vpc, InitElement, LocationPackageOptions, InitCommand, InitCommandOptions, InitFile, InitServiceOptions, InitService, InitFileAssetOptions } from "aws-cdk-lib/aws-ec2";
import { ArnPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { readFileSync } from 'fs';
import { NagSuppressions } from 'cdk-nag';
import { Duration } from 'aws-cdk-lib';
import { CaefConfigRefValueTransformer } from '@aws-caef/config';


export interface NamedSecurityGroupProps {
  /** @jsii ignore */
  readonly [ name: string ]: SecurityGroupProps
}

export interface SecurityGroupProps {
  /**
   * id of VPC to launch the instance in.
   */
  readonly vpcId: string;
  /**
   * List of ingress rules to be added to the function SG
   */
  readonly ingressRules?: CaefSecurityGroupRuleProps
  /**
   * List of egress rules to be added to the function SG
   */
  readonly egressRules?: CaefSecurityGroupRuleProps
  /**
   * If true, the SG will allow traffic to and from itself
   */
  readonly addSelfReferenceRule?: boolean
}
export interface KeyPairProps {
  readonly kmsKeyArn?: string
}
export interface NamedKeyPairProps {
  /** @jsii ignore */
  readonly [ name: string ]: KeyPairProps
}

export interface NamedInitProps {
  /** @jsii ignore */
  readonly [ name: string ]: InitProps
}

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

export interface NamedConfigSetsProps {
  /** @jsii ignore */
  readonly [ name: string ]: ConfigSetsProps
}

export interface ConfigSetsProps {
  readonly configs: string[]
}

export interface NamedConfigProps {
  /** @jsii ignore */
  readonly [ name: string ]: ConfigProps
}

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

export interface NamedPackageProps {
  /**
    * Refers to package to be installed
    * key could be any string, and is just a reference, not used for package itself.
    */
  /** @jsii ignore */
  readonly [ name: string ]: PackageProps
}

export interface PackageProps {
  /**
    * Package Manager to be used
    * Available package manager values: msi, rpm, gem, yum, python, apt
    */
  readonly packageManager: string;
  /**
    * Package location
    * to be provided for msi & rpm packages
    */
  readonly packageLocation?: string;
  /**
    * Package name
    * to be provided for gem, yum, python, apt packages
    */
  readonly packageName?: string;
  /**
    * Empty list if latest version is required
    * default is latest
    */
  readonly packageVersions?: string[];
  /**
   * Identifier key for this package. part of LocationPackageOptions, for msi and rpm packages
   */
  readonly key?: string;
  /**
   * Restart the given service after this package is installed.
   */
  readonly restartRequired?: boolean;
}

export interface NamedGroupProps {
  /** @jsii ignore */
  readonly [ name: string ]: GroupProps
}

export interface GroupProps {
  /**
   * 
   * A group ID number
   * If a group ID is specified, and the group already exists by name, the group creation will fail. 
   * If another group has the specified group ID, the OS may reject the group creation.
   */
  readonly gid?: string;
}

export interface NamedUserProps {
  /** @jsii ignore */
  readonly [ name: string ]: UserProps
}

export interface UserProps {
  /**
   * A user ID. 
   * The creation process fails if the user name exists with a different user ID.
   * If the user ID is already assigned to an existing user the operating system may reject the creation request.
   */
  readonly uid?: string;
  /**
   * A list of group names. The user will be added to each group in the list.
   */
  readonly groups: string[];
  /**
   * The user's home directory.
   */
  readonly homeDir: string;
}

export interface NamedSourceProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [ name: string ]: SourceProps
}

export interface SourceProps {
  /**
   * source location url
   */
  readonly source: string;
}

export interface NamedFileProps {
  /**
   * Key is the directory where sources file needs to be stored.
   */
  /** @jsii ignore */
  readonly [ name: string ]: FileProps
}

export interface FileProps {
  /**
   * source file path
   */
  readonly filePath: string;
  /**
   * Restart the given service(s) after this command has run, default: Do not restart any service
   */
  readonly restartRequired?: boolean;
}

export interface NamedCommandProps {
  /**
   * Identifier key for this command.
   * Commands are executed in lexicographical order of their key names.
   */
  /** @jsii ignore */
  readonly [ name: string ]: CommandProps
}

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

export interface NamedEnvProps {
  /** @jsii ignore */
  readonly [ name: string ]: string
}

export interface NamedServiceProps {
  /**
   * Identifier key for this service.
   * key should be the name of the service.
   * For Windows can be retrieved using Get-Service powershell command
   * https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service?view=powershell-7.3
   */
  /** @jsii ignore */
  readonly [ name: string ]: ServiceProps
}

export interface ServiceProps {
  /**
   * Set to true to ensure that the service is running after cfn-init finishes.
   * Set to false to ensure that the service isn't running after cfn-init finishes.
   * Omit this key to make no changes to the service state.
   */
  readonly ensureRunning?: boolean;
  /**
   * Set to true to ensure that the service will be started automatically upon boot.
   * Set to false to ensure that the service won't be started automatically upon boot.
   * Omit this key to make no changes to this property.
   */
  readonly enabled?: boolean;
  /**
   * Disable and stop the given service
   */
  readonly disabled?: boolean;
  /**
   * Restart the given service(s) after this command has run, default: Do not restart any service
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

export interface InitOptionsProps {
  /**
   * ConfigSet to activate.
   * default value is ['default']
   */
  readonly configSets?: string[];
  /**
   * Force instance replacement by embedding a config fingerprint.
   * If true (the default), a hash of the config will be embedded into the UserData, so that if the config changes, the UserData changes.
   * If the EC2 instance is instance-store backed or userDataCausesReplacement is set, this will cause the instance to be replaced and the new configuration to be applied.
   * If the instance is EBS-backed and userDataCausesReplacement is not set, the change of UserData will make the instance restart but not be replaced, and the configuration will not be applied automatically.
   * If false, no hash will be embedded, and if the CloudFormation Init config changes nothing will happen to the running instance. If a config update introduces errors, you will not notice until after the CloudFormation deployment successfully finishes and the next instance fails to launch.
   */
  readonly embedFingerprint?: boolean;
  /**
   * Don't fail the instance creation when cfn-init fails.
   * You can use this to prevent CloudFormation from rolling back when instances fail to start up, to help in debugging.
   */
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

export interface NamedInstanceProps {
  /** @jsii ignore */
  readonly [ name: string ]: InstanceProps
}

export interface InstanceProps {
  readonly securityGroup?: string
  readonly securityGroupId?: string
  /**
   * Type of instance to launch.
   */
  readonly instanceType: string;
  /**
   * AMI to launch.
   */
  readonly amiId: string;
  /**
   * id of VPC to launch the instance in.
   */
  readonly vpcId: string;
  /**
   * Where to place the instance within the VPC.
   */
  readonly subnetId: string;
  /**
   * list of configs for block device to be mapped to instance
   */
  readonly blockDevices: BlockDeviceProps[];
  /**
   * Role used by instance
   */
  readonly instanceRole: CaefRoleRef,
  /**
   * Specific key to use.
   */
  readonly kmsKeyArn?: string;
  /**
   * In which AZ to place the instance within the VPC.
   */
  readonly availabilityZone: string;
  /**
   * Type of OS for the AMI.
   */
  readonly osType: 'linux' | 'windows' | 'unknown';
  /**
    * Specific UserData to use.
    */
  readonly userDataScriptPath?: string;
  /**
   * Changes to the UserData force replacement.
   * Depending the EC2 instance type, changing UserData either restarts the instance or replaces the instance.
   * Instance store-backed instances are replaced.
   * EBS-backed instances are restarted.
   * By default, restarting does not execute the new UserData so you will need a different mechanism to ensure the instance is restarted.
   * Setting this to true will make the instance's Logical ID depend on the UserData, which will cause CloudFormation to replace it if the UserData changes.
   * default: true iff initOptions is specified, false otherwise.
   */
  readonly userDataCausesReplacement?: boolean;
  /**
  * Apply the given CloudFormation Init configuration to the instance at startup.
  * For Linux
  * @link https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
  * For Windows
  * @link https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/ec2-windows-user-data.html
  */
  // readonly init?: CloudFormationInit;
  readonly init?: InitProps;
  /**
  *  Name of init to be implemented , name can be referred from init object in config
  */
  readonly initName?: string;
  /**
  * Use the given options for applying CloudFormation Init.
  * 
  * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ApplyCloudFormationInitOptions.html
  */
  // readonly initOptions?: ApplyCloudFormationInitOptions;
  readonly initOptions?: InitOptionsProps;
  /**
    * count of Successful signals required for creation policy .
    */
  readonly signalCount?: number;
  /**
    * Timeout for creation policy .
    */
  readonly creationTimeOut?: string;
  /**
    *  Specifies whether to enable an instance launched in a VPC to perform NAT.
    */
  readonly sourceDestCheck?: boolean;
  /**
    * Name of SSH keypair (created by this construct) to grant access to instance.
    */
  readonly keyPairName?: string;
  /**
    * Name of existing SSH keypair to grant access to instance.
    */
  readonly existingKeyPairName?: string;
}

export interface Ec2L3ConstructProps extends CaefL3ConstructProps {
  /**
   * Roles which will be provided Admin access to the 
   * KMS key, and KeyPair secrets.
   */
  readonly adminRoles: CaefRoleRef[]
  /**
   * List of  security groups to be created.
   */
  readonly securityGroups?: NamedSecurityGroupProps
  /**
   * List of key pairs to be created.
   */
  readonly keyPairs?: NamedKeyPairProps
  /**
   * List of  init objects to be created.
   */
  readonly cfnInit?: NamedInitProps
  /**
   * List of  instances to be launched.
   */
  readonly instances?: NamedInstanceProps
}

//This stack creates and manages an EC2 instance
export class Ec2L3Construct extends CaefL3Construct {
  protected readonly props: Ec2L3ConstructProps

  private static osTypeMap: { [ key: string ]: OperatingSystemType } = {
    'linux': OperatingSystemType.LINUX,
    'windows': OperatingSystemType.WINDOWS,
    'unknown': OperatingSystemType.UNKNOWN
  }

  private readonly adminRoles: CaefResolvableRole[]
  private kmsKey?: Key

  initServiceRestartHandle = new InitServiceRestartHandle();

  public readonly keyPairs: { [ key: string ]: CaefEC2SecretKeyPair } = {}
  public readonly securityGroups: { [ key: string ]: CaefSecurityGroup } = {}
  public readonly instances: { [ key: string ]: Instance } = {}
  public readonly cfnInit: { [ key: string ]: CloudFormationInit } = {}
  constructor( scope: Construct, id: string, props: Ec2L3ConstructProps ) {
    super( scope, id, props )
    this.props = props

    this.adminRoles = props.roleHelper.resolveRoleRefsWithOrdinals( props.adminRoles, "admin" )

    this.createKeyPairs( props.keyPairs || {} )
    this.createSecurityGroups( props.securityGroups || {} )
    // this.createInit(props.cfnInit || {})
    this.cfnInit = this.createInit( props.cfnInit || {} )
    this.createInstances( props.instances || {} )

  }

  private createKeyPairs ( namedKeyPairProps: NamedKeyPairProps ) {
    Object.entries( namedKeyPairProps ).forEach( entry => {
      const keyPairName = entry[ 0 ]
      const keyPairProps = entry[ 1 ]
      const kmsKey = keyPairProps.kmsKeyArn ? Key.fromKeyArn( this, `kms-keypair-${ keyPairName }`, keyPairProps.kmsKeyArn ) : this.getKmsKey()
      const createKeyPairProps: CaefEC2SecretKeyPairProps = {
        name: keyPairName,
        kmsKey: kmsKey,
        naming: this.props.naming,
        readPrincipals: this.adminRoles.map( x => new ArnPrincipal( x.arn() ) )
      }
      this.keyPairs[ keyPairName ] = new CaefEC2SecretKeyPair( this, `key-pair-${ keyPairName }`, createKeyPairProps )
    } )
  }


  private createConfigSet ( namedConfigSetsProps: NamedConfigSetsProps ) {
    /** @jsii ignore */
    const configSetMap: { [ name: string ]: string[] } = {}
    Object.entries( namedConfigSetsProps ).forEach( entry => {

      const configSetName = entry[ 0 ]
      const configSetProps = entry[ 1 ]
      configSetMap[ configSetName ] = configSetProps.configs
    } )
    return configSetMap
  }


  private createConfig ( namedConfigProps: NamedConfigProps ) {
    /** @jsii ignore */
    const configMap: { [ name: string ]: InitConfig } = {}
    Object.entries( namedConfigProps ).forEach( entry => {

      const configName = entry[ 0 ]
      const configProps = entry[ 1 ]
      const configList: InitElement[] = []
      if ( configProps.packages ) {
        configList.push( ...this.createPackages( configProps.packages ) )
      }
      if ( configProps.commands ) {
        configList.push( ...this.createCommands( configProps.commands ) )
      }
      if ( configProps.files ) {
        configList.push( ...this.createFiles( configProps.files ) )
      }
      if ( configProps.services ) {
        configList.push( ...this.createServices( configProps.services ) )
      }
      configMap[ configName ] = new InitConfig( configList )
    } )
    return configMap
  }

  private createPackages ( namedPackageProps: NamedPackageProps ) {
    const packageList: InitElement[] = []
    Object.entries( namedPackageProps ).forEach( entry => {
      // // 
      //       const packageType = entry[ 0 ]
      const packageProps = entry[ 1 ]

      const namedPackageOptions: NamedPackageOptions = packageProps.restartRequired
        ?
        {
          serviceRestartHandles: [ this.initServiceRestartHandle ],
          version: packageProps.packageVersions,
        }
        : {
          version: packageProps.packageVersions,
        }
      const locationPackageOptions: LocationPackageOptions = packageProps.restartRequired
        ?
        {
          serviceRestartHandles: [ this.initServiceRestartHandle ],
          key: packageProps.key
        }
        // : undefined
        : {
          key: packageProps.key
        }
      if ( packageProps.packageManager == 'yum' ) {
        packageList.push( InitPackage.yum( packageProps.packageName!, namedPackageOptions ) )
      }
      if ( packageProps.packageManager == 'apt' ) {
        packageList.push( InitPackage.apt( packageProps.packageName!, namedPackageOptions ) )
      }
      if ( packageProps.packageManager == 'python' ) {
        packageList.push( InitPackage.python( packageProps.packageName!, namedPackageOptions ) )
      }
      if ( packageProps.packageManager == 'rubyGem' ) {
        packageList.push( InitPackage.rubyGem( packageProps.packageName!, namedPackageOptions ) )
      }
      if ( packageProps.packageManager == 'msi' ) {
        packageList.push( InitPackage.msi( packageProps.packageLocation!, locationPackageOptions ) )
      }
      if ( packageProps.packageManager == 'rpm' ) {
        packageList.push( InitPackage.rpm( packageProps.packageLocation!, locationPackageOptions ) )
      }
    } )
    return packageList
  }


  private toWaitOrNotToWait ( duration?: Duration, waitForever?: boolean, waitNone?: boolean ) {
    if ( duration )
      return InitCommandWaitDuration.of( duration )
    if ( waitForever )
      return InitCommandWaitDuration.forever()
    if ( waitNone )
      return InitCommandWaitDuration.none()
    else {
      return undefined
    }
  }

  private createCommands ( namedCommandProps: NamedCommandProps ) {
    const commandList: InitElement[] = []
    Object.entries( namedCommandProps ).forEach( entry => {
      const commandKey = entry[ 0 ]
      const commandProps = entry[ 1 ]
      const duration = commandProps.waitAfterCompletion
        ? Duration.minutes( commandProps.waitAfterCompletion )
        : undefined

      const waitAfterCompletion = this.toWaitOrNotToWait( duration, commandProps.waitForever, commandProps.waitNone )

      const commandOptions: InitCommandOptions =
      {
        cwd: commandProps.workingDir,
        env: commandProps.env,
        ignoreErrors: commandProps.ignoreErrors,
        key: commandKey,
        serviceRestartHandles: commandProps.restartRequired
          ?
          [ this.initServiceRestartHandle ]
          : undefined,
        testCmd: commandProps.testCommand,
        waitAfterCompletion: waitAfterCompletion,
      }

      if ( commandProps.shellCommand ) {
        commandList.push( InitCommand.shellCommand( commandProps.shellCommand, commandOptions ) )
      }
      if ( commandProps.argvs ) {
        commandList.push( InitCommand.argvCommand( commandProps.argvs, commandOptions ) )
      }
    } )
    return commandList
  }


  private createFiles ( namedFileProps: NamedFileProps ) {
    const fileList: InitElement[] = []
    Object.entries( namedFileProps ).forEach( entry => {
      const fileName = entry[ 0 ]
      const fileProps = entry[ 1 ]

      // TO BE IMPLEMENTED
      // const initFileAssetOptions: InitFileAssetOptions =
      // {
      //   assetHash: fileProps,
      //   assetHashType: fileProps,
      //   base64Encoded: fileProps,
      //   bundling: fileProps,
      //   deployTime:fileProps,
      //   exclude: fileProps,
      //   followSymlinks: fileProps,
      //   ignoreMode: fileProps,
      //   group: fileProps,
      //   mode: fileProps,
      //   owner: fileProps,
      //   readers: fileProps,
      //   serviceRestartHandles:commandProps.restartRequired
      //   ?
      //   [handle]
      //   : undefined,
      // }

      const initFileAssetOptions: InitFileAssetOptions =
      {
        serviceRestartHandles: fileProps.restartRequired
          ?
          [ this.initServiceRestartHandle ]
          : undefined,
      }

      fileList.push( InitFile.fromAsset( fileName, fileProps.filePath, initFileAssetOptions ) )
    } )
    return fileList;
  }


  private createServices ( namedServiceProps: NamedServiceProps ) {
    const serviceList: InitElement[] = []
    Object.entries( namedServiceProps ).forEach( entry => {
      const serviceName = entry[ 0 ]
      const serviceProps = entry[ 1 ]

      const serviceInitOptions: InitServiceOptions =
      {
        enabled: serviceProps.enabled,
        ensureRunning: serviceProps.ensureRunning,
        serviceRestartHandle: serviceProps.restartRequired
          ?
          this.initServiceRestartHandle
          : undefined,
      }
      if ( serviceProps.enabled ) {
        serviceList.push( InitService.enable( serviceName, serviceInitOptions ) )
      }
      if ( serviceProps.disabled ) {
        serviceList.push( InitService.disable( serviceName ) )
      }
    } )
    return serviceList
  }

  private createInit ( namedInitProps: NamedInitProps ) {
    /** @jsii ignore */
    const initMap: { [ name: string ]: CloudFormationInit } = {}
    Object.entries( namedInitProps ).forEach( entry => {

      const initName = entry[ 0 ]
      const initProps = entry[ 1 ]


      const configMap = this.createConfig( initProps.configs )


      const configSetMap = this.createConfigSet( initProps.configSets )

      const cfnconfigSets: ConfigSetProps = {
        configSets: configSetMap,
        configs: configMap
      }

      const cfnInit = CloudFormationInit.fromConfigSets( cfnconfigSets )

      initMap[ initName ] = cfnInit
    } )
    return initMap
  }

  private createInstances ( namedInstanceProps: NamedInstanceProps ) {
    Object.entries( namedInstanceProps ).forEach( entry => {

      const instanceName = entry[ 0 ]
      const instanceProps = entry[ 1 ]

      const resolvedInstanceRole = this.props.roleHelper.resolveRoleRefWithRefId( instanceProps.instanceRole, "instanceRole" )
      const roleArn = resolvedInstanceRole.arn()
      const instanceRole = CaefRole.fromRoleArn( this, 'role for' + instanceName, roleArn )

      const kmsKey = instanceProps.kmsKeyArn
        ? CaefKmsKey.fromKeyArn( this, 'key for' + instanceName, instanceProps.kmsKeyArn )
        : this.getKmsKey()

      if ( !instanceProps.kmsKeyArn ) {
        this.addRoleToKmsKey( roleArn )
      }

      const machineImage: IMachineImage = this.getMachineImage( instanceProps )

      const vpc = Vpc.fromVpcAttributes( this, 'vpc of' + instanceName, {
        availabilityZones: [ "dummy" ],
        vpcId: instanceProps.vpcId,
      } );

      const instanceType = new InstanceType( instanceProps.instanceType )
      const instanceSubnet = Subnet.fromSubnetAttributes( this, 'Subnet for' + instanceName, {
        subnetId: instanceProps.subnetId,
        availabilityZone: instanceProps.availabilityZone
      } );

      const securityGroup = this.getInstanceSecurityGroup( instanceName, instanceProps )

      const keyPairName = this.getInstanceKeyPairName( instanceProps )


      const cfnInitNew = instanceProps.initName
        ? this.cfnInit[ instanceProps.initName ]
        : undefined

      const initDuration = instanceProps.initOptions?.timeout
        ? Duration.minutes( instanceProps.initOptions.timeout )
        : undefined

      const initOptions: ApplyCloudFormationInitOptions | undefined = instanceProps.initOptions
        ? {
          configSets: instanceProps.initOptions.configSets,
          embedFingerprint: instanceProps.initOptions.embedFingerprint,
          ignoreFailures: instanceProps.initOptions.ignoreFailures,
          includeRole: instanceProps.initOptions.includeRole,
          includeUrl: instanceProps.initOptions.includeUrl,
          printLog: instanceProps.initOptions.printLog,
          timeout: initDuration
        }
        : undefined

      const createInstanceProps: CaefEC2InstanceProps = {
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
        naming: this.props.naming
      }
      this.instances[ instanceName ] = new CaefEC2Instance( this, instanceName + "instance", createInstanceProps )
      NagSuppressions.addResourceSuppressions(
        this.instances[ instanceName ].role,
        [
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Adding cfn init adds inline policy to instance role to describe stack' },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Adding cfn init adds inline policy to instance role to describe stack' },
          { id: 'AwsSolutions-IAM5', reason: 'Adding files section for cfn init, adds permission for cdk bootstrap bucket with wildcard to store the file' },
        ],
        true
      );
      const cfnInstance = this.instances[ instanceName ].node.defaultChild as CfnInstance;
      if ( instanceProps.signalCount || instanceProps.creationTimeOut ) {
        cfnInstance.cfnOptions.creationPolicy = {
          resourceSignal: {
            count: instanceProps.signalCount,
            timeout: instanceProps.creationTimeOut,
          }
        };
      }
    } )
  }

  private getMachineImage ( instanceProps: InstanceProps ): IMachineImage {
    const osType = Ec2L3Construct.osTypeMap[ instanceProps.osType ]

    const userDataScript = instanceProps.userDataScriptPath
      ? readFileSync( instanceProps.userDataScriptPath, 'utf8' )
      : undefined

    const transformedUserDataScript = userDataScript ? new CaefConfigRefValueTransformer( this ).transformValue( userDataScript ) : undefined

    return {
      getImage: function (): MachineImageConfig {
        const userData: UserData = UserData.forOperatingSystem( osType )
        if ( transformedUserDataScript ) {
          userData.addCommands( transformedUserDataScript.toString() )
        }
        const imageConfig: MachineImageConfig = {
          imageId: instanceProps.amiId,
          osType: osType,
          userData: userData
        }
        return imageConfig
      }
    }
  }

  private getInstanceKeyPairName ( instanceProps: InstanceProps ): string | undefined {

    if ( instanceProps.keyPairName && instanceProps.existingKeyPairName ) {
      throw new Error( "At most one of keyPairName or existingKeyPairName must be specified" )
    } else if ( instanceProps.keyPairName ) {
      const keyPairName = this.keyPairs[ instanceProps.keyPairName ].name
      if ( !keyPairName ) {
        throw new Error( `Non-existent key pair name specified: ${ instanceProps.keyPairName }` )
      }
      return keyPairName
    } else if ( instanceProps.existingKeyPairName ) {
      return instanceProps.existingKeyPairName
    }
    return undefined

  }

  private getInstanceSecurityGroup ( instanceName: string, instanceProps: InstanceProps ): ISecurityGroup {

    if ( ( !instanceProps.securityGroup && !instanceProps.securityGroupId ) || ( instanceProps.securityGroup && instanceProps.securityGroupId ) ) {
      throw new Error( "Exactly one of securityGroup or securityGroupId must be specified" )
    } else {
      if ( instanceProps.securityGroup ) {
        const sg = this.securityGroups[ instanceProps.securityGroup ]
        if ( !sg ) {
          throw new Error( `Security Group ${ instanceProps.securityGroup } is not known to this module.` )
        }
        return sg
      } else {
        return SecurityGroup.fromSecurityGroupId( this, 'SG for' + instanceName, instanceProps.securityGroupId || "" )
      }
    }
  }

  private createSecurityGroups ( securityGroups: NamedSecurityGroupProps ) {
    Object.entries( securityGroups ).forEach( entry => {

      const securityGroupName = entry[ 0 ]
      const securityGroupProps = entry[ 1 ]

      const vpc = Vpc.fromVpcAttributes( this, 'vpc of' + securityGroupName, {
        availabilityZones: [ "dummy" ],
        vpcId: securityGroupProps.vpcId,
      } );

      const customEgress: boolean = ( securityGroupProps.egressRules?.ipv4 && securityGroupProps.egressRules?.ipv4.length > 0 ) ||
        ( securityGroupProps.egressRules?.prefixList && securityGroupProps.egressRules?.prefixList.length > 0 ) ||
        ( securityGroupProps.egressRules?.sg && securityGroupProps.egressRules?.sg.length > 0 ) || false

      const securityGroupCreateProps: CaefSecurityGroupProps = {
        securityGroupName: securityGroupName,
        vpc: vpc,
        naming: this.props.naming,
        ingressRules: securityGroupProps.ingressRules,
        egressRules: securityGroupProps.egressRules,
        allowAllOutbound: !customEgress,
        addSelfReferenceRule: securityGroupProps.addSelfReferenceRule
      }

      const securityGroup = new CaefSecurityGroup( this, securityGroupName, securityGroupCreateProps )
      this.securityGroups[ securityGroupName ] = securityGroup
    } )
  }

  private getKmsKey (): IKey {
    const kmsKey = this.kmsKey ? this.kmsKey : new CaefKmsKey( this, 'kms-key', {
      naming: this.props.naming,
      keyAdminRoleIds: this.adminRoles.map( x => x.id() ),
      keyUserRoleIds: this.adminRoles.map( x => x.id() )
    } )
    this.kmsKey = kmsKey
    return kmsKey
  }

  private addRoleToKmsKey ( roleArn: string ) {
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
    kmsEncryptDecryptPolicy.addArnPrincipal( roleArn )
    this.getKmsKey().addToResourcePolicy( kmsEncryptDecryptPolicy )
  }
}
