/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from "@aws-mdaa/construct";
import { Duration } from "aws-cdk-lib";
import { ContainerDefinition, ContainerDefinitionProps, ContainerImage, EnvironmentFile, HealthCheck, LinuxParameters, LogDriver, PortMapping, Secret, SystemControl, TaskDefinition, Ulimit } from "aws-cdk-lib/aws-ecs";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";


/**
 * Properties for creating a Compliance ECS containerdefinition
 */

export interface MdaaECSContainerDefinitionProps extends MdaaConstructProps {
    /**
     * The name of the task definition that includes this container definition.
     *
     * [disable-awslint:ref-via-interface]
     */
    readonly taskDefinition: TaskDefinition;
    /**
     * The image used to start a container.
     *
     * This string is passed directly to the Docker daemon.
     * Images in the Docker Hub registry are available by default.
     * Other repositories are specified with either repository-url/image:tag or repository-url/image@digest.
     */
    readonly image: ContainerImage;
    /**
     * The name of the container.
     *
     * @default - id of node associated with ContainerDefinition.
     */
    readonly containerName?: string;
    /**
     * The command that is passed to the container.
     *
     * If you provide a shell command as a single string, you have to quote command-line arguments.
     *
     * @default - CMD value built into container image.
     */
    readonly command?: string[];
    /**
     * The minimum number of CPU units to reserve for the container.
     *
     * @default - No minimum CPU units reserved.
     */
    readonly cpu?: number;
    /**
     * Specifies whether networking is disabled within the container.
     *
     * When this parameter is true, networking is disabled within the container.
     *
     * @default false
     */
    readonly disableNetworking?: boolean;
    /**
     * A list of DNS search domains that are presented to the container.
     *
     * @default - No search domains.
     */
    readonly dnsSearchDomains?: string[];
    /**
     * A list of DNS servers that are presented to the container.
     *
     * @default - Default DNS servers.
     */
    readonly dnsServers?: string[];
    /**
     * A key/value map of labels to add to the container.
     *
     * @default - No labels.
     */
    readonly dockerLabels?: {
        [ key: string ]: string;
    };
    /**
     * A list of strings to provide custom labels for SELinux and AppArmor multi-level security systems.
     *
     * @default - No security labels.
     */
    readonly dockerSecurityOptions?: string[];
    /**
     * The ENTRYPOINT value to pass to the container.
     *
     * @see https://docs.docker.com/engine/reference/builder/#entrypoint
     *
     * @default - Entry point configured in container.
     */
    readonly entryPoint?: string[];
    /**
     * The environment variables to pass to the container.
     *
     * @default - No environment variables.
     */
    readonly environment?: {
        [ key: string ]: string;
    };
    /**
     * The environment files to pass to the container.
     *
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html
     *
     * @default - No environment files.
     */
    readonly environmentFiles?: EnvironmentFile[];
    /**
     * The secret environment variables to pass to the container.
     *
     * @default - No secret environment variables.
     */
    readonly secrets?: {
        [ key: string ]: Secret;
    };
    /**
     * Time duration (in seconds) to wait before giving up on resolving dependencies for a container.
     *
     * @default - none
     */
    readonly startTimeout?: Duration;
    /**
     * Time duration (in seconds) to wait before the container is forcefully killed if it doesn't exit normally on its own.
     *
     * @default - none
     */
    readonly stopTimeout?: Duration;
    /**
     * Specifies whether the container is marked essential.
     *
     * If the essential parameter of a container is marked as true, and that container fails
     * or stops for any reason, all other containers that are part of the task are stopped.
     * If the essential parameter of a container is marked as false, then its failure does not
     * affect the rest of the containers in a task. All tasks must have at least one essential container.
     *
     * If this parameter is omitted, a container is assumed to be essential.
     *
     * @default true
     */
    readonly essential?: boolean;
    /**
     * A list of hostnames and IP address mappings to append to the /etc/hosts file on the container.
     *
     * @default - No extra hosts.
     */
    readonly extraHosts?: {
        [ name: string ]: string;
    };
    /**
     * The health check command and associated configuration parameters for the container.
     *
     * @default - Health check configuration from container.
     */
    readonly healthCheck?: HealthCheck;
    /**
     * The hostname to use for your container.
     *
     * @default - Automatic hostname.
     */
    readonly hostname?: string;
    /**
     * The amount (in MiB) of memory to present to the container.
     *
     * If your container attempts to exceed the allocated memory, the container
     * is terminated.
     *
     * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
     *
     * @default - No memory limit.
     */
    readonly memoryLimitMiB?: number;
    /**
     * The soft limit (in MiB) of memory to reserve for the container.
     *
     * When system memory is under heavy contention, Docker attempts to keep the
     * container memory to this soft limit. However, your container can consume more
     * memory when it needs to, up to either the hard limit specified with the memory
     * parameter (if applicable), or all of the available memory on the container
     * instance, whichever comes first.
     *
     * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
     *
     * @default - No memory reserved.
     */
    readonly memoryReservationMiB?: number;
    /**
     * Specifies whether the container is marked as privileged.
     * When this parameter is true, the container is given elevated privileges on the host container instance (similar to the root user).
     *
     * @default false
     */
    readonly privileged?: boolean;
    /**
     * When this parameter is true, the container is given read-only access to its root file system.
     *
     * @default false
     */
    readonly readonlyRootFilesystem?: boolean;
    /**
     * The user name to use inside the container.
     *
     * @default root
     */
    readonly user?: string;
    /**
     * The working directory in which to run commands inside the container.
     *
     * @default /
     */
    readonly workingDirectory?: string;
    /**
     * Linux-specific modifications that are applied to the container, such as Linux kernel capabilities.
     * For more information see [KernelCapabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
     *
     * @default - No Linux parameters.
     */
    readonly linuxParameters?: LinuxParameters;
    /**
     * The number of GPUs assigned to the container.
     *
     * @default - No GPUs assigned.
     */
    readonly gpuCount?: number;
    /**
     * The port mappings to add to the container definition.
     * @default - No ports are mapped.
     */
    readonly portMappings?: PortMapping[];
    /**
     * The inference accelerators referenced by the container.
     * @default - No inference accelerators assigned.
     */
    readonly inferenceAcceleratorResources?: string[];
    /**
     * A list of namespaced kernel parameters to set in the container.
     *
     * @default - No system controls are set.
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-taskdefinition-systemcontrol.html
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_systemcontrols
     */
    readonly systemControls?: SystemControl[];
    /**
     * When this parameter is true, a TTY is allocated. This parameter maps to Tty in the "Create a container section" of the
     * Docker Remote API and the --tty option to `docker run`.
     *
     * @default - false
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_pseudoterminal
     */
    readonly pseudoTerminal?: boolean;
    /**
     * An array of ulimits to set in the container.
     */
    readonly ulimits?: Ulimit[];

    /**
     * Prefix for the log streams
     *
     * The awslogs-stream-prefix option allows you to associate a log stream
     * with the specified prefix, the container name, and the ID of the Amazon
     * ECS task to which the container belongs. If you specify a prefix with
     * this option, then the log stream takes the following format:
     *
     *     prefix-name/container-name/ecs-task-id
     */
    readonly streamPrefix: string;

    /**
     * The log group to log to
     *
     * @default - A log group is automatically created.
     */
    readonly logGroup: ILogGroup;

    /**
     * This option defines a multiline start pattern in Python strftime format.
     *
     * A log message consists of a line that matches the pattern and any
     * following lines that don’t match the pattern. Thus the matched line is
     * the delimiter between log messages.
     *
     * @default - No multiline matching.
     */
    readonly datetimeFormat?: string;

    /**
     * This option defines a multiline start pattern using a regular expression.
     *
     * A log message consists of a line that matches the pattern and any
     * following lines that don’t match the pattern. Thus the matched line is
     * the delimiter between log messages.
     *
     * This option is ignored if datetimeFormat is also configured.
     *
     * @default - No multiline matching.
     */
    readonly multilinePattern?: string;
}

/**
 * A construct for creating a compliant ECS containerdefinition resource.
 */
export class MdaaECSContainerDefinition extends ContainerDefinition {

    private static setProps ( props: MdaaECSContainerDefinitionProps ): ContainerDefinitionProps {
        const overrideProps = {
            containerName: props.naming.resourceName( props.containerName, 255 ),
            logging: LogDriver.awsLogs( {
                logGroup: props.logGroup,
                streamPrefix: props.streamPrefix,
                datetimeFormat: props.datetimeFormat,
                multilinePattern: props.multilinePattern
            } )
        }
        const allProps: ContainerDefinitionProps = {
            ...props, ...overrideProps
        }
        return allProps
    }

    constructor( scope: Construct, id: string, props: MdaaECSContainerDefinitionProps ) {
        super( scope, id, MdaaECSContainerDefinition.setProps( props ) )

        if ( this.taskDefinition.executionRole ) {
            NagSuppressions.addResourceSuppressions( this.taskDefinition.executionRole, [
                {
                    id: "AwsSolutions-IAM5",
                    reason: "Access limited to Log Group. Log Stream name not known at deployment time."
                },
                {
                    id: "NIST.800.53.R5-IAMNoInlinePolicy",
                    reason: "Inline policy is specific to task logging and is appropriate."
                },
                {
                    id: "HIPAA.Security-IAMNoInlinePolicy",
                    reason: "Inline policy is specific to task logging and is appropriate."
                },
                {
                    id: "PCI.DSS.321-IAMNoInlinePolicy",
                    reason: "Inline policy is specific to task logging and is appropriate."
                }
            ], true );
        }

        new MdaaParamAndOutput( this, {
            ...{
                resourceType: "containerdefinition",
                resourceId: props.containerName,
                name: "name",
                value: this.containerName
            }, ...props
        },scope )
    }
}
