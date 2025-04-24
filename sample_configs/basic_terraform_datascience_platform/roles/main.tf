# Create Sagemaker Team Execution Role

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
  account   = data.aws_caller_identity.current.account_id
  team_name = "ds-team-one" # Provide a Suitable name for your team
}

module "role_name" {
  # checkov:skip=CKV_TF_1:Ensure Terraform module sources use a commit hash:Not required.
  # checkov:skip=CKV_TF_2:Ensure Terraform module sources use a tag with a version number:Not required.

  source      = "<your-git-url>/naming_convention"
  base_name   = "${local.team_name}-exec-role"
  module_name = var.module_name
}

resource "aws_iam_policy" "datascience_user_policy" {
  name        = "${module.role_name.base_resource_name}-exec-policy"
  path        = "/"
  description = "Provides basic service access to the team execution role"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBedrockAccess"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels*",
          "bedrock:ListCustomModels*",
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetFoundationModel*",
          "bedrock:GetGuardrail"
        ]
        Resource = [
          "arn:aws:bedrock:${var.region}::*-model",
          "arn:aws:bedrock:${var.region}:${local.account}:*",

        ]
      },
      {
        Sid      = "SageMakerLaunchProfileAccess"
        Effect   = "Allow"
        Action   = ["sagemaker:CreatePresignedDomainUrl"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "sagemaker:ResourceTag/userid" = "$${aws:userid}"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role" "sagemaker_team_exec_role" {
  name = module.role_name.base_resource_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "sagemaker.amazonaws.com",
            "bedrock.amazonaws.com",
            "ec2.amazonaws.com"
          ]
        }
      }
    ]
  })

}

resource "aws_iam_role_policy_attachment" "datascience_user_policy_attachment" {
  role       = aws_iam_role.sagemaker_team_exec_role.name
  policy_arn = aws_iam_policy.datascience_user_policy.arn
}
