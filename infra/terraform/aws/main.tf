terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote state in S3 (bootstrap out-of-band via aws cli before first
  # `terraform init`, same pattern as the Azure config's storage account —
  # Terraform can't create the backend it's about to store its own state in):
  #   aws s3api create-bucket --bucket forwardlegacy-tfstate --region ap-south-1 \
  #     --create-bucket-configuration LocationConstraint=ap-south-1
  #   aws s3api put-bucket-versioning --bucket forwardlegacy-tfstate \
  #     --versioning-configuration Status=Enabled
  #   aws s3api put-bucket-encryption --bucket forwardlegacy-tfstate \
  #     --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  #   aws dynamodb create-table --table-name forwardlegacy-tfstate-lock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST
  backend "s3" {
    bucket         = "forwardlegacy-tfstate"
    key            = "aws/smartwill.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "forwardlegacy-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
