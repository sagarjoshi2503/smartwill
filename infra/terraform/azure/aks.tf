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

  tags = var.tags
}

# Lets AKS nodes pull smartwill-api/smartwill-web images from ACR without any
# imagePullSecrets.
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}
