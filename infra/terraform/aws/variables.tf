variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-south-1"
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    project = "forwardlegacy"
  }
}

# --- ECR ---

variable "ecr_repository_names" {
  description = "Names of the ECR repositories to create (one per image)."
  type        = list(string)
  default     = ["forwardlegacy-api", "forwardlegacy-web", "forwardlegacy-mcp", "forwardlegacy-chatbot", "forwardlegacy-flags", "forwardlegacy-rag"]
}

# --- Networking (minimal VPC for EKS — public subnets only, no NAT gateway,
# to avoid its ~$32/mo fixed cost on a dev/learning cluster) ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets, one per AZ. EKS requires at least 2 AZs."
  type        = list(string)
  default     = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "availability_zones" {
  description = "AZs to spread the public subnets across."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

# --- EKS ---

variable "eks_cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "smartwillcluster"
}

variable "eks_kubernetes_version" {
  description = "Kubernetes version for the EKS control plane."
  type        = string
  default     = "1.30"
}

variable "eks_node_instance_type" {
  description = "EC2 instance type for the node group."
  type        = string
  default     = "t3.medium"
}

variable "eks_node_count" {
  description = "Desired (and min/max, since this is a single fixed-size dev node pool) node count."
  type        = number
  default     = 1
}

# --- Secrets Manager ---

variable "secret_names" {
  description = "Names of the app secrets to provision (values are NOT set by Terraform — set them manually afterward, e.g. via `aws secretsmanager put-secret-value`)."
  type        = list(string)
  default = [
    "JWT_SECRET_KEY",
    "MONGODB_URI",
    "DB_NAME",
    "ADMIN_REVIEW_EMAIL",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "SENDGRID_FROM_EMAIL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "VITE_GOOGLE_CLIENT_ID",
    "CORS_ALLOW_ORIGINS",
    "CHATBOT_CORS_ALLOW_ORIGINS",
    "ANTHROPIC_API_KEY",
    "VOYAGE_API_KEY",
    "FLAGS_SECRET",
    "FLAGS",
  ]
}
