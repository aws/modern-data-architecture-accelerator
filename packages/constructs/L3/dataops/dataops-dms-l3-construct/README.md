# Construct Overview

AWS DMS is an online data transfer service that simplifies, automates, and accelerates moving data between storage systems and services.
The DMS CDK L3 construct is used to deploy the resources for an DMS domain inside an account/VPC.

***

## Deployed Resources

![DMS](docs/DMS-Deployment.png)

* **DMS Agent Activation** - An AWS DMS agent is a virtual machine (VM) that you own. The type of agent you needs depends on the hypervisor you're using and where you're copying data (such as on-premises or cloud storage systems). You can reuse an agent if it can access your storage system and has been activated in the same AWS Region.
After you deploy your AWS DMS agent and specify the service endpoint that it will connect to, you need to activate the agent. This process associates the agent with your AWS account.


* **DMS Storage Location** - A storage location defines the storage system or service where you want AWS DMS to transfer data from or to.
This L3 construct currently supports four types of storage location: S3 bucket, SMB, NFS, and cloud-based storage. 

* **DMS Task** - A task describes where and how AWS DMS transfers data. Tasks consist of the following:

* Source location – The storage system or service where DMS transfers data from.

* Destination location – The storage system or service where DMS transfers data to.

* Task settings – Options for configuring how your task behaves, such as how it verifies data, when it runs, and more. Some task settings are optional. For instance, you don't have to give your task a name.

* Task executions – When you run a task, it's called a task execution.