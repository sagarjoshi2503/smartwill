terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
  }

  # Remote state in a GCS bucket (bootstrap out-of-band via gcloud/gsutil
  # before first `terraform init`, same pattern as the Azure/AWS configs —
  # Terraform can't create the backend it's about to store its own state in):
  #   gcloud storage buckets create gs://smartwill-tfstate \
  #     --project=<gcp_project_id> --location=asia-south1 \
  #     --uniform-bucket-level-access
  #   gcloud storage buckets update gs://smartwill-tfstate --versioning
  backend "gcs" {
    bucket = "smartwill-tfstate"
    prefix = "gcp/smartwill"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

data "google_client_config" "current" {}
