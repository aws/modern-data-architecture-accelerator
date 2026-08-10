# Stub Terraform module used only by the CLI command-baseline tests
# (packages/cli/sample_configs/terraform). It is never initialized, planned or
# applied: the CLI runs in --testing mode, which prints the terraform/checkov
# commands instead of executing them. The file exists so that module_path
# resolution and the working-dir copy have a real directory to point at.
#
# The variables below mirror the standard -var arguments the CLI injects for an
# mdaa_compliant Terraform module, plus the module_config_data keys the sample
# config sets, so the stub stays a faithful (if inert) target.

variable "org" {
  type        = string
  description = "MDAA organization name, injected by the CLI."
}

variable "domain" {
  type        = string
  description = "MDAA domain name, injected by the CLI."
}

variable "env" {
  type        = string
  description = "MDAA environment name, injected by the CLI."
}

variable "module_name" {
  type        = string
  description = "MDAA module name, injected by the CLI."
}

variable "region" {
  type        = string
  description = "Target AWS region, injected by the CLI."
}
