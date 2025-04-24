# Copyright © Amazon.com and Affiliates: This deliverable is considered Developed Content as defined in the AWS Service Terms

// Variables
variable "region" {
  description = "The region to be deployed to"
  type        = string
}

variable "org" {
  description = "The org name used in the naming convention"
  type        = string
}

variable "domain" {
  description = "The domain name used in the naming convention"
  type        = string
}

variable "env" {
  description = "The env name used in the naming convention"
  type        = string
}

variable "module_name" {
  description = "The module_name name used in the naming convention"
  type        = string
}


data "aws_caller_identity" "current" {}

locals {

  account_id = data.aws_caller_identity.current.account_id
  team_name  = "ds-team-one"

  # Roles
  data_admin_role_arn = "arn:aws:iam::${local.account_id}:role/Admin"
  sso_group_name      = "DataScientist"
  team_user_role_arn  = "arn:aws:iam::${local.account_id}:role/DataScientist"
  team_exec_role_arn  = "arn:aws:iam::${local.account_id}:role/<your-team-exec-role>" # Team Execution Role 

  # Define a policy prefix that works across environments. 
  # These policies may be attached to Permission sets
  policy_prefix = lower(format(
    "%s-%s-%s-%s",
    var.org,
    var.domain,
    var.module_name,
    local.team_name
  ))

  ## Provide information about Identity Store ID and Network configuration where the Sagemaker Domain will be created
  identity_store_id = "<Identity Store Id>" # Example: "d-012345abcd"
  network = {
    vpc_id  = "<vpc id>"
    subnets = ["<subnet-id1>", "<subnet-id2>"],
    #(OPTIONAL) S3 Prefix list for various regions. 
    s3_prefix_list = {
      "ca-central-1" = "pl-7da54014",
      "us-east-1"    = "pl-63a5400a"
    }
  }
}

module "mdaa_ds_team" {
  # checkov:skip=CKV_TF_1:Ensure Terraform module sources use a commit hash:Not required.
  # checkov:skip=CKV_TF_2:Ensure Terraform module sources use a tag with a version number:Not required.
  source                      = "<your-git-url>/datascience-team"
  module_name                 = var.module_name
  base_name                   = local.team_name
  data_admin_role_arn         = local.data_admin_role_arn
  team_user_role_arn          = local.team_user_role_arn
  team_exec_role_arn          = local.team_exec_role_arn
  verbatim_policy_name_prefix = local.policy_prefix
  sagemaker_domain_config = {
    auth = {
      mode                   = "SSO",
      identity_store_id      = local.identity_store_id
      assign_sso_group_names = [local.sso_group_name]

    }
    vpc_id         = local.network.vpc_id
    app_subnet_ids = local.network.subnets

    # Provide Ingress/Egress rules based on your network configuration
    # Below Sample Security Group Ingress/Egress rules allow the following traffic:
    # - Ingress: Traffic from the VPC CIDR block and within the SG
    # - Egress: Traffic to the VPC CIDR block, S3 prefix list CIDRs, and within the SG
    security_group_ingress_egress_rules = {
      # Ingress Rules
      cidr_block_ingress_rules = [
        {
          description = "Traffic originating from the VPC CIDR block"
          from_port   = 443,
          to_port     = 443,
          protocol    = "tcp",
          cidr_blocks = ["10.0.0.0/16"]
        }
      ]
      self_ingress_rules = [
        {
          description = "Self-Ref: Traffic from within the SG"
          from_port   = 0,
          to_port     = 0,
          protocol    = "all",
        }
      ]
      # Outbound Rules
      cidr_block_egress_rules = [
        {
          description = "Outbound: Traffic to the VPC CIDR block",
          from_port   = 443,
          to_port     = 443,
          protocol    = "tcp",
          cidr_blocks = ["10.0.0.0/16"]
        }
      ]

      self_egress_rules = [
        {
          description = "Self-Ref: Traffic from within the SG",
          from_port   = 0,
          to_port     = 0,
          protocol    = "all",
        }
      ]
      prefix_list_egress_rules = [{
        description     = "Outbound to s3 prefix list CIDRs"
        from_port       = 443,
        to_port         = 443,
        protocol        = "tcp",
        prefix_list_ids = ["${local.network.s3_prefix_list[var.region]}"]
      }]
    }

  }

}
