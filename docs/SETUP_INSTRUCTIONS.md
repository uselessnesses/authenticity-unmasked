# Service Authentication Setup Instructions

## Overview
The app now uses **service-to-service authentication** (client credentials flow) instead of requiring individual user login. This means:
- ✅ Works on any device without login
- ✅ All recordings go to YOUR OneDrive
- ✅ No user authentication popups
- ✅ Perfect for exhibition kiosks

## Required Setup Steps

### 1. Update Azure App Registration

1. **Go to Azure Portal** → App Registrations → Your App (`cf187f7d-56fa-43ed-81f9-886671237afe`)

2. **Create Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Choose expiration (recommend 24 months)
   - Copy the secret value (you'll only see it once!)

3. **Update API Permissions**:
   - Go to "API permissions"
   - Remove all existing permissions
   - Add **Application permissions** (not delegated):
     - `Sites.ReadWrite.All` (to access your OneDrive)
   - Click "Grant admin consent for [your tenant]"

4. **Get Your User ID**:
   - Go to Microsoft Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer
   - Sign in with your account
   - Run this query: `GET https://graph.microsoft.com/v1.0/me`
   - Copy the "id" value from the response

### 2. Update Configuration

Edit `config.js` and replace these values:

```javascript
CLIENT_SECRET: "your_client_secret_here", // From step 2 above
TARGET_USER_ID: "your_user_id_here", // From step 4 above
```

### 3. Security Considerations

⚠️ **Important**: The client secret is now visible in your code. For production:

1. **GitHub Private Repository**: Make sure your repository is private
2. **Environment Variables**: Consider using GitHub Actions secrets for deployment
3. **Azure Key Vault**: For enhanced security, store secrets in Azure Key Vault

### 4. Testing

1. Deploy to GitHub Pages
2. Test on different devices (no login required)
3. Check that recordings appear in your OneDrive under "Exhibition-Recordings" folder

## How It Works

1. **Service Authentication**: App authenticates as itself using client credentials
2. **Your OneDrive**: All recordings are saved to your personal OneDrive
3. **Application Permissions**: App has permission to access your OneDrive without user interaction
4. **No User Context**: Users don't need Microsoft accounts or any login

## Troubleshooting

### Error: "Invalid client credentials"
- Check that CLIENT_SECRET is correct
- Ensure the secret hasn't expired

### Error: "Access denied"
- Verify API permissions are set to **Application** (not Delegated)
- Ensure admin consent has been granted

### Error: "User not found"
- Check that TARGET_USER_ID is correct
- Use Microsoft Graph Explorer to verify your user ID

### Files Not Appearing
- Check that you have the correct user ID
- Verify the OneDrive folder permissions
- Look for files in: Your OneDrive → Exhibition-Recordings

## Security Notes

- This setup is appropriate for controlled environments (exhibitions, kiosks)
- All recordings are stored in your personal OneDrive
- No user data is collected (only audio recordings)
- App can only access your OneDrive, not other users' data
