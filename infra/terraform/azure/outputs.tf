output "resource_group_name" {
  description = "Name of the (pre-existing) resource group the registry is created in."
  value       = data.azurerm_resource_group.this.name
}

output "acr_name" {
  description = "Name of the Azure Container Registry."
  value       = azurerm_container_registry.this.name
}

output "acr_login_server" {
  description = "Login server hostname, e.g. smartwillacr.azurecr.io — use this to tag/push images."
  value       = azurerm_container_registry.this.login_server
}

output "acr_id" {
  description = "Resource ID of the Azure Container Registry."
  value       = azurerm_container_registry.this.id
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster."
  value       = azurerm_kubernetes_cluster.this.name
}

output "aks_node_resource_group" {
  description = "Auto-created resource group AKS manages its node VMs/disks/etc. in."
  value       = azurerm_kubernetes_cluster.this.node_resource_group
}

output "key_vault_name" {
  description = "Name of the Key Vault."
  value       = azurerm_key_vault.this.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault, e.g. https://smartwill-kv.vault.azure.net/"
  value       = azurerm_key_vault.this.vault_uri
}
