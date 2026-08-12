# --- Node service account — GKE nodes run as this identity. Only
# artifactregistry.reader is granted (the GCP equivalent of AKS's "AcrPull"
# role assignment / EKS's AmazonEC2ContainerRegistryReadOnly policy), not the
# broad default Compute Engine service account. ---
resource "google_service_account" "gke_node" {
  account_id   = "${var.gke_cluster_name}-node"
  display_name = "${var.gke_cluster_name} GKE node service account"
}

resource "google_project_iam_member" "gke_node_artifact_reader" {
  project = var.gcp_project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

resource "google_project_iam_member" "gke_node_logging" {
  project = var.gcp_project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

resource "google_project_iam_member" "gke_node_metrics" {
  project = var.gcp_project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

# --- Cluster ---
resource "google_container_cluster" "this" {
  name     = var.gke_cluster_name
  location = var.gcp_region

  network    = google_compute_network.this.id
  subnetwork = google_compute_subnetwork.this.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Lets pods assume GCP service accounts via a k8s ServiceAccount annotation
  # — the GCP equivalent of AKS's Secrets Store CSI driver identity / AWS's
  # IRSA. The actual k8s-side binding (ServiceAccount + Secret Manager CSI
  # driver install) belongs in infra/k8s/, same as Azure's SecretProviderClass.
  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }

  # Manage node pools separately (google_container_node_pool below) rather
  # than the cluster's built-in default pool.
  remove_default_node_pool = true
  initial_node_count       = 1

  deletion_protection = false
}

resource "google_container_node_pool" "default" {
  name       = "default"
  cluster    = google_container_cluster.this.id
  location   = var.gcp_region
  node_count = var.gke_node_count

  node_config {
    machine_type    = var.gke_node_machine_type
    service_account = google_service_account.gke_node.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
    labels          = var.labels

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# --- Workload Identity binding: lets a k8s ServiceAccount named
# smartwill-secrets-reader, created in each secret-consuming service's own
# namespace (infra/k8s/<service>/), impersonate this GCP service account to
# read Secret Manager. Only the services that actually mount secrets need
# this — mirrors which of infra/k8s/*/ has a secret-provider-class.yaml
# (api, chatbot, flags, rag; web and mcp don't need any secret). ---
resource "google_service_account" "secrets_reader" {
  account_id   = "${var.gke_cluster_name}-secrets-reader"
  display_name = "${var.gke_cluster_name} Secret Manager reader (Workload Identity)"
}

resource "google_project_iam_member" "secrets_reader_access" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.secrets_reader.email}"
}

resource "google_service_account_iam_member" "secrets_reader_workload_identity" {
  for_each           = toset(["smartwill-api", "smartwill-chatbot", "smartwill-flags", "smartwill-rag"])
  service_account_id = google_service_account.secrets_reader.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.gcp_project_id}.svc.id.goog[${each.value}/smartwill-secrets-reader]"
}
