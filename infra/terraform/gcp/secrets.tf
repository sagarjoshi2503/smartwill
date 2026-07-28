# Provisions the secrets themselves — values are NOT set here. Set them
# manually afterward, e.g.:
#   printf '%s' 'the-value' | gcloud secrets versions add jwt-secret-key --data-file=-
resource "google_secret_manager_secret" "this" {
  for_each = toset(var.secret_names)

  secret_id = each.value
  labels    = var.labels

  replication {
    auto {}
  }
}
