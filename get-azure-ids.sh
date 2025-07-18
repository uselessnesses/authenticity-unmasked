#!/bin/bash
# Azure CLI script to get tenant ID and user ID

# Login to Azure
az login

# Get tenant ID
echo "Tenant ID:"
az account show --query tenantId -o tsv

# Get user ID
echo "User ID:"
az ad signed-in-user show --query id -o tsv

# Get user details
echo "User Details:"
az ad signed-in-user show --query "{id:id, displayName:displayName, userPrincipalName:userPrincipalName}" -o table
