# Copyright © Amazon.com and Affiliates: This deliverable is considered Developed Content as defined in the AWS Service Terms.

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

variable "force_destroy" {
  description = "If true, the resources will be force destroyed"
  type        = bool
  default = false
}

locals {
  # Sample Roles
  data_admin_role_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Admin"
  data_engineer_role_arn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/DataEngineer"
  data_scientist_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/DataScientist"
}

module "mdaa_datalake" {
  # checkov:skip=CKV_TF_1:Ensure Terraform module sources use a commit hash:Not required.
  # checkov:skip=CKV_TF_2:Ensure Terraform module sources use a tag with a version number:Not required.

  # TODO: Point to the MDAA Terraform Git Repo  
  # If using Git SSH, be sure to use the git::ssh://<url> syntax. Otherwise TF might download the module, but checkov will fail to.
  source        = "<your-git-url>///datalake"
  force_destroy = var.force_destroy
  region        = var.region
  org          = var.org
  env          = var.env
  domain       = var.domain
  module_name = var.module_name
  bucket_definitions = {
    # RAW BUCKET
    "raw" = {
      base_name = "raw"
      access_policies = {
        "root" = {
          READWRITESUPER = {
            role_arns = [local.data_admin_role_arn],
          }
        }
        "data" = {
          READ = {
            role_arns = [local.data_scientist_role_arn],
          }
          READWRITE = {
            role_arns = [local.data_engineer_role_arn],
          }
        }
      }
    }
    # CURATED BUCKET
    "curated" = {
      base_name = "curated"
      access_policies = {
        "root" = {
          READWRITESUPER = {
            role_arns = [local.data_admin_role_arn],
          },

        }
        "data-product-A" = {
          READWRITE = {
            role_arns = [local.data_engineer_role_arn, local.data_scientist_role_arn],
          }
        }
        "data-product-B" = {
          READ = {
            role_arns = [local.data_scientist_role_arn],
          }
          READWRITE = {
            role_arns = [local.data_engineer_role_arn],
          }

        }
      }
    }
  }
}

data "aws_caller_identity" "current" {}

# Creates a Data Engineer Athena Workgroup
module "example_workgroup" {
  # checkov:skip=CKV_TF_1:Ensure Terraform module sources use a commit hash:Not required.
  # checkov:skip=CKV_TF_2:Ensure Terraform module sources use a tag with a version number:Not required.
  
  
  # TODO: Point to the MDAA Terraform Git Repo  
  # If using Git SSH, be sure to use the git::ssh://<url> syntax. Otherwise TF might download the module, but checkov will fail to.
  source        = "<your-git-url>////athena-workgroup"
  region = var.region
  org          = var.org
  env          = var.env
  domain       = var.domain
  module_name = var.module_name
  base_name                      = "data-engineer"
  force_destroy                  = var.force_destroy
  bytes_scanned_cutoff_per_query = 10000000000
  data_admin_role_arn            = local.data_admin_role_arn
  service_execution_role_arns    = [local.data_engineer_role_arn, local.data_scientist_role_arn]
}