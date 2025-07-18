# Server-Based OneDrive Upload Setup

This approach uses a Node.js server to handle OneDrive uploads, so your exhibition devices don't need any authentication. All files are uploaded to YOUR OneDrive account.

## Architecture

```
Exhibition Device (Browser) → Your Server → Your OneDrive
```

- **Exhibition devices**: No authentication required, just upload files to your server
- **Your server**: Handles authentication with Microsoft Graph API
- **Your OneDrive**: Receives all recordings in an organized folder structure

## Setup Instructions

### Step 1: Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Use your existing app or create a new one:
   - **Name**: `Authenticity Unmasked Server`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave blank (not needed for server-to-server)

4. **API Permissions**: Add these **application permissions**:
   - `Microsoft Graph` > `Files.ReadWrite.All` (application)
   - `Microsoft Graph` > `Sites.ReadWrite.All` (application)

5. **Grant admin consent** for these permissions

6. **Certificates & secrets**: Create a new client secret
   - Copy the secret value (you'll need it for the server)

### Step 2: Get Your User ID

You need your Microsoft user ID to upload files to your OneDrive:

```bash
# Using Microsoft Graph Explorer (easiest)
# Go to https://developer.microsoft.com/en-us/graph/graph-explorer
# Sign in and run this query:
GET https://graph.microsoft.com/v1.0/me

# Or using PowerShell:
Connect-MgGraph -Scopes "User.Read"
Get-MgUser -UserId "your-email@domain.com" | Select-Object Id
```

### Step 3: Server Setup

1. **Install Node.js** (version 16 or higher)

2. **Setup the server**:
   ```bash
   cd server
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file**:
   ```env
   AZURE_CLIENT_ID=cf187f7d-56fa-43ed-81f9-886671237afe
   AZURE_CLIENT_SECRET=your_client_secret_here
   AZURE_TENANT_ID=2e9f06b0-1669-4589-8789-10a06934dc61
   AZURE_USER_ID=your_user_id_here
   PORT=3000
   ```

5. **Test the server**:
   ```bash
   npm start
   ```

   Visit `http://localhost:3000/health` to verify it's running.

### Step 4: Client Configuration

Update `config.js` with your server URL:

```javascript
const AZURE_CONFIG = {
  SERVER_URL: "http://localhost:3000", // For local testing
  // SERVER_URL: "https://your-server.herokuapp.com", // For production
  // ... other config
};
```

### Step 5: Deploy the Server

#### Option A: Heroku (Recommended)

1. **Install Heroku CLI**
2. **Create Heroku app**:
   ```bash
   cd server
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set AZURE_CLIENT_ID=cf187f7d-56fa-43ed-81f9-886671237afe
   heroku config:set AZURE_CLIENT_SECRET=your_client_secret_here
   heroku config:set AZURE_TENANT_ID=2e9f06b0-1669-4589-8789-10a06934dc61
   heroku config:set AZURE_USER_ID=your_user_id_here
   ```

4. **Deploy**:
   ```bash
   git add .
   git commit -m "Initial server deployment"
   git push heroku main
   ```

5. **Update client config**:
   ```javascript
   const AZURE_CONFIG = {
     SERVER_URL: "https://your-app-name.herokuapp.com",
     // ... other config
   };
   ```

#### Option B: Railway

1. **Connect Railway to your GitHub repo**
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically**

#### Option C: Azure App Service

1. **Create Azure App Service**
2. **Configure deployment from GitHub**
3. **Set environment variables in App Service configuration**

### Step 6: Test End-to-End

1. **Start your server** (local or deployed)
2. **Open your exhibition app** in browser
3. **Record audio** - it should upload to your OneDrive
4. **Check your OneDrive** - look for `Exhibition-Recordings` folder

## File Organization

Files will be saved to your OneDrive with this structure:

```
OneDrive/
└── Exhibition-Recordings/
    ├── exhibition-voice-q1-how-has-this-exhibition-2025-01-27T16-30-00-000Z.mp3
    ├── exhibition-voice-q2-do-you-feel-more-optimistic-2025-01-27T16-31-15-000Z.mp3
    └── ...
```

## Benefits

✅ **No authentication needed on exhibition devices**
✅ **All files go to your OneDrive**
✅ **Centralized control and management**
✅ **Works on any device with internet**
✅ **Secure - credentials only on your server**
✅ **Scalable - can handle multiple devices**

## Security Notes

- Server credentials are stored securely in environment variables
- No sensitive data exposed to client devices
- Files are uploaded directly to your OneDrive account
- Server can be protected with rate limiting and other security measures

## Troubleshooting

- **Server not starting**: Check environment variables and port availability
- **Upload failing**: Verify Azure permissions and user ID
- **CORS errors**: Server includes CORS middleware for cross-origin requests
- **File size limits**: Server accepts files up to 50MB

This approach gives you complete control over where files are stored while keeping the exhibition devices simple and secure.
