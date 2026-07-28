output "account_id" {
  description = "AWS account ID these resources were created in."
  value       = data.aws_caller_identity.current.account_id
}

output "ecr_repository_urls" {
  description = "Map of repository name -> URL, for `docker tag`/`docker push`."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster."
  value       = aws_eks_cluster.this.name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "secrets_reader_role_arn" {
  description = "IAM role ARN pods assume (via IRSA) to read Secrets Manager — annotate the k8s ServiceAccount with this."
  value       = aws_iam_role.secrets_reader.arn
}

output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.this.id
}
