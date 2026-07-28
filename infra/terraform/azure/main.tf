terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }

  # Remote state in Azure Blob Storage (bootstrapped out-of-band via az cli,
  # same pattern as the pre-existing resource group — Terraform can't create
  # the backend it's about to store its own state in). Auths via the same
  # `az login` session used for the azurerm provider (use_azuread_auth),
  # not a storage account key.
  backend "azurerm" {
    resource_group_name  = "rg-test-deletelater"
    storage_account_name = "smartwilltfstate"
    container_name       = "tfstate"
    key                  = "smartwill.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
}

# Pre-existing resource group — referenced, not managed/created/destroyed by
# this config.
data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

# Caller's tenant/object ID — used to grant the Terraform operator's own
# account Key Vault access (see key_vault.tf).
data "azurerm_client_config" "current" {}

resource "azurerm_container_registry" "this" {
  name                = var.acr_name
  resource_group_name = data.azurerm_resource_group.this.name
  location            = var.acr_location
  sku                 = var.acr_sku
  admin_enabled       = var.admin_enabled
  tags                = var.tags
}
