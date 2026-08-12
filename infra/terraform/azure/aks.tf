resource "azurerm_kubernetes_cluster" "this" {
  name                = var.aks_cluster_name
  location            = var.acr_location
  resource_group_name = data.azurerm_resource_group.this.name
  dns_prefix          = var.aks_dns_prefix
  sku_tier            = "Free"

  default_node_pool {
    name       = "default"
    node_count = var.aks_node_count
    vm_size    = var.aks_vm_size
  }

  identity {
    type = "SystemAssigned"
  }

  # Enables the AKS Secrets Store CSI Driver add-on, which provisions its own
  # managed identity for reading secrets out of Key Vault into pods (see
  # key_vault.tf's kv_secrets_user_aks role assignment).
  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  # Both found enabled live but missing from this file (discovered via a
  # `terraform plan` drift check against rg-test-deletelater) — declared here
  # so `apply` doesn't silently turn them back off. Note: the cluster's own
  # OIDC issuer is distinct from the GitHub Actions OIDC federation in
  # cicd/CLAUDE.md (that's a separate, tenant-level app registration); AKS
  # workload_identity is NOT enabled alongside it, so today this issuer has
  # no federated credential actually trusting it — confirm with whoever
  # enabled it whether pod workload identity is coming, or whether this
  # should be turned off instead.
  oidc_issuer_enabled = true

  workload_autoscaler_profile {
    keda_enabled = true
  }

  tags = var.tags
}

# Lets AKS nodes pull any smartwill-* image (api, web, mcp, chatbot, flags,
# rag) from ACR without any imagePullSecrets.
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}
