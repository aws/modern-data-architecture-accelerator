# Configure the AWS Provider
# Naming convention module requires 'org', 'env' and 'domain' tags
provider "aws" {
  region = var.region
  default_tags {
    tags = {
      org    = var.org
      env    = var.env
      domain = var.domain
    }
  }
}
