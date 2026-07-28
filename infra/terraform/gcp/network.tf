# Dedicated VPC-native network for GKE (rather than the deprecated-in-spirit
# "default" auto-mode network) — one subnet with secondary ranges for pods
# and services.
resource "google_compute_network" "this" {
  name                    = "${var.gke_cluster_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "this" {
  name          = "${var.gke_cluster_name}-subnet"
  ip_cidr_range = var.vpc_cidr_subnet
  region        = var.gcp_region
  network       = google_compute_network.this.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }
}
