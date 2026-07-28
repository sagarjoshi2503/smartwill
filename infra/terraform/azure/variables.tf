variable "resource_group_name" {
  description = "Name of the pre-existing Azure resource group the registry is created in."
  type        = string
  default     = "rg-test-deletelater"
}

variable "acr_location" {
  description = "Azure region for the registry. Independent of the resource group's region since ACR isn't available in every region (e.g. westindia)."
  type        = string
  default     = "centralindia"
}

variable "acr_name" {
  description = "Globally unique name of the Azure Container Registry (alphanumeric only, 5-50 chars)."
  type        = string
  default     = "smartwillacr"

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "acr_name must be 5-50 alphanumeric characters (no hyphens/underscores) — Azure Container Registry naming requirement."
  }
}

variable "acr_sku" {
  description = "Azure Container Registry SKU: Basic, Standard, or Premium."
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "acr_sku must be one of: Basic, Standard, Premium."
  }
}

variable "admin_enabled" {
  description = "Whether the ACR admin user/password login is enabled. Prefer az acr login / managed identity over this in real deployments."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    project = "smartwill"
  }
}

variable "aks_cluster_name" {
  description = "Name of the AKS cluster."
  type        = string
  default     = "smartwillcluster"
}

variable "aks_dns_prefix" {
  description = "DNS prefix for the AKS cluster's API server hostname."
  type        = string
  default     = "smartwillcluster"
}

variable "aks_node_count" {
  description = "Number of nodes in the default node pool."
  type        = number
  default     = 1
}

variable "aks_vm_size" {
  description = "VM size for the default node pool. B-series (burstable, cheapest) has 0 vCPU quota on this subscription in centralindia; Standard_D2s_v6 is the smallest size actually within quota (Dsv6 family has 10 vCPUs available)."
  type        = string
  default     = "Standard_D2s_v6"
}

variable "key_vault_name" {
  description = "Globally unique name of the Key Vault (3-24 chars, alphanumeric + hyphens)."
  type        = string
  default     = "smartwill-kv"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{3,24}$", var.key_vault_name))
    error_message = "key_vault_name must be 3-24 characters, alphanumeric and hyphens only — Azure Key Vault naming requirement."
  }
}
