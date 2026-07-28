variable "gcp_project_id" {
  description = "GCP project ID all resources are created in. Required — no sensible default. Set via terraform.tfvars, -var, or TF_VAR_gcp_project_id."
  type        = string
}

variable "gcp_region" {
  description = "GCP region for all resources."
  type        = string
  default     = "asia-south1"
}

variable "labels" {
  description = "Labels applied to all resources (GCP's equivalent of tags)."
  type        = map(string)
  default = {
    project = "smartwill"
  }
}

# --- Artifact Registry ---

variable "artifact_repository_name" {
  description = "Name of the single Artifact Registry Docker repository (holds both images, distinguished by tag/path, e.g. smartwill-api, smartwill-web — unlike ECR's one-repo-per-image model)."
  type        = string
  default     = "smartwill"
}

# --- Networking ---

variable "vpc_cidr_subnet" {
  description = "CIDR block for the GKE subnetwork's primary IP range."
  type        = string
  default     = "10.10.0.0/24"
}

variable "pods_cidr" {
  description = "Secondary IP range (CIDR) for GKE pods (VPC-native cluster)."
  type        = string
  default     = "10.20.0.0/16"
}

variable "services_cidr" {
  description = "Secondary IP range (CIDR) for GKE services (VPC-native cluster)."
  type        = string
  default     = "10.30.0.0/20"
}

# --- GKE ---

variable "gke_cluster_name" {
  description = "Name of the GKE cluster."
  type        = string
  default     = "smartwillcluster"
}

variable "gke_node_machine_type" {
  description = "Machine type for the node pool."
  type        = string
  default     = "e2-medium"
}

variable "gke_node_count" {
  description = "Fixed node count for the single-zone node pool."
  type        = number
  default     = 1
}

# --- Secret Manager ---

variable "secret_names" {
  description = "Names of the app secrets to provision (values are NOT set by Terraform — set them manually afterward, e.g. via `gcloud secrets versions add`)."
  type        = list(string)
  default = [
    "jwt-secret-key",
    "mongodb-uri",
    "db-name",
    "admin-review-email",
    "resend-api-key",
    "resend-from-email",
    "sendgrid-from-email",
    "twilio-account-sid",
    "twilio-auth-token",
    "twilio-from-number",
    "razorpay-key-id",
    "razorpay-key-secret",
    "vite-google-client-id",
    "cors-allow-origins",
  ]
}
