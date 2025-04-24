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


module "glue-catalog" {
  # checkov:skip=CKV_TF_1:Ensure Terraform module sources use a commit hash:Not required.
  # checkov:skip=CKV_TF_2:Ensure Terraform module sources use a tag with a version number:Not required.

  # TODO: Point to the MDAA Terraform Git Repo
  # If using Git SSH, be sure to use the git::ssh://<url> syntax. Otherwise TF might download the module, but checkov will fail to.
  source        = "<your-git-url>//modules/glue-catalog-setting"
  module_name = var.module_name
}