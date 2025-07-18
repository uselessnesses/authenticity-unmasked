# PowerShell script to get Azure tenant ID and user ID
# Run this in PowerShell (Windows) or PowerShell Core (Mac/Linux)

# Install the Microsoft Graph PowerShell module if you haven't already
# Install-Module Microsoft.Graph -Scope CurrentUser

# Connect to Microsoft Graph
Connect-MgGraph -Scopes "User.Read"

# Get your tenant ID
$context = Get-MgContext
Write-Host "Tenant ID: $($context.TenantId)" -ForegroundColor Green

# Get your user ID
$user = Get-MgUser -UserId (Get-MgContext).Account
Write-Host "User ID: $($user.Id)" -ForegroundColor Green
Write-Host "Display Name: $($user.DisplayName)" -ForegroundColor Yellow
Write-Host "Email: $($user.UserPrincipalName)" -ForegroundColor Yellow

# Disconnect when done
Disconnect-MgGraph
