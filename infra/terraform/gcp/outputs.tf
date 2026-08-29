output "project_id" {
  description = "GCP project ID these resources were created in."
  value       = var.gcp_project_id
}

output "artifact_registry_repository" {
  description = "Full Artifact Registry repository path, for `docker tag`/`docker push`, e.g. asia-south1-docker.pkg.dev/<project>/forwardlegacy/forwardlegacy-api."
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.this.repository_id}"
}

output "gke_cluster_name" {
  description = "Name of the GKE cluster."
  value       = google_container_cluster.this.name
}

output "gke_cluster_endpoint" {
  description = "GKE API server endpoint."
  value       = google_container_cluster.this.endpoint
  sensitive   = true
}

output "secrets_reader_service_account_email" {
  description = "GCP service account pods impersonate (via Workload Identity) to read Secret Manager — bind a k8s ServiceAccount named forwardlegacy-secrets-reader in the forwardlegacy-api namespace to this."
  value       = google_service_account.secrets_reader.email
}
