resource "azurerm_key_vault" "this" {
  name                = var.key_vault_name
  location            = var.acr_location
  resource_group_name = data.azurerm_resource_group.this.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enable_rbac_authorization = true

  # Purge protection off (rather than the usual production default) so this
  # dev/learning-subscription vault can be cleanly destroyed via
  # `terraform destroy` instead of sitting in a 90-day soft-deleted state.
  purge_protection_enabled   = false
  soft_delete_retention_days = 7

  tags = var.tags
}

# Lets the Terraform operator's own account manage secret values after
# `apply` (Terraform only provisions the vault, never the secret values
# themselves — those are set manually via `az keyvault secret set`).
resource "azurerm_role_assignment" "kv_admin_current_user" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Lets the AKS Secrets Store CSI driver's addon identity read secret values
# into pods.
resource "azurerm_role_assignment" "kv_secrets_user_aks" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_kubernetes_cluster.this.key_vault_secrets_provider[0].secret_identity[0].object_id
}
