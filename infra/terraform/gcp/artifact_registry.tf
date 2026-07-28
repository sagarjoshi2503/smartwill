resource "google_artifact_registry_repository" "this" {
  repository_id = var.artifact_repository_name
  location      = var.gcp_region
  format        = "DOCKER"
  labels        = var.labels
}
