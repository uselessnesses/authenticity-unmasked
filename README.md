# Voice Recording Interface

A streamlined, GDPR-compliant voice recording interface for exhibition touchscreens that saves recordings to Microsoft OneDrive.

## Features

- ✅ Clean, modern interface with white buttons and black text
- ✅ GDPR consent modal for data collection compliance
- ✅ Voice recording with button ID tracking
- ✅ Mobile-optimized PWA (Progressive Web App)
- ✅ Microsoft Forms integration as alternative option
- ✅ OneDrive integration for secure cloud storage
- ✅ Touch-optimized for exhibition kiosks

## Setup Instructions

### 1. Microsoft Forms Setup

1. Create a new Microsoft Form at https://forms.office.com
2. Copy the form URL
3. Replace `YOUR_FORM_ID` in `script.js` with your actual form URL

### 2. OneDrive Integration Setup

To enable automatic saving to OneDrive, you need to set up Azure AD authentication:

#### Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Name your app (e.g., "Exhibition Voice Recorder")
5. Set redirect URI to your GitHub Pages URL (e.g., `https://yourusername.github.io/authenticity-unmasked`)
6. Note down the Application (client) ID

#### Step 2: Configure API Permissions

1. In your app registration, go to "API permissions"
2. Add Microsoft Graph permissions:
   - `Files.ReadWrite` (to write to OneDrive)
   - `User.Read` (basic user info)
3. Grant admin consent

#### Step 3: Update JavaScript Code

Replace the placeholder OneDrive integration in `script.js` with actual Microsoft Graph API calls:

```javascript
// Add to the top of script.js
const CLIENT_ID = 'your-azure-app-client-id';
const SCOPES = ['https://graph.microsoft.com/Files.ReadWrite'];

// Replace the saveToOneDrive method with:
async saveToOneDrive(audioBlob, buttonId) {
  try {
    // Get access token
    const authResult = await this.getAccessToken();
    
    // Upload to OneDrive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `voice-recording-button-${buttonId}-${timestamp}.mp3`;
    
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authResult.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: filename,
        file: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    });
    
    const fileItem = await response.json();
    
    // Upload file content
    await fetch(fileItem.uploadUrl, {
      method: 'PUT',
      body: audioBlob
    });
    
    console.log('File uploaded to OneDrive:', filename);
  } catch (error) {
    console.error('OneDrive upload failed:', error);
    throw error;
  }
}
```

### 3. GitHub Pages Deployment

1. Push all files to your GitHub repository
2. Go to Repository Settings > Pages
3. Select source branch (usually `main`)
4. Your app will be available at `https://yourusername.github.io/repository-name`

### 4. Mobile PWA Installation

Users can install the app on their mobile devices:

1. Open the website in Safari (iOS) or Chrome (Android)
2. Tap "Add to Home Screen" or "Install App"
3. The app will work offline and feel like a native app

## File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Modern, mobile-optimized styling
├── script.js           # Voice recording and OneDrive integration
├── manifest.json       # PWA configuration
├── sw.js              # Service worker for offline functionality
└── README.md          # This file
```

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ Requires HTTPS for microphone access (GitHub Pages provides this)

## GDPR Compliance Features

- Explicit consent modal before any recording
- Clear data usage explanation
- Local storage of consent preferences
- Option to decline recording and use forms instead
- Recording metadata tracking for data subject requests

## Customization

### Button Labels

Edit the button text in `index.html`:

```html
<span class="btn-text">Your Custom Text</span>
```

### Styling

Modify colors and layout in `styles.css`. The current design uses:

- Background: Black (#000)
- Buttons: White (#fff) with black text
- Recording state: Red (#ff4444)

### Recording Settings

Adjust audio quality in `script.js`:

```javascript
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100  // Adjust as needed
}
```

## Security Notes

- Never commit Azure client secrets to public repositories
- Use environment variables or Azure Key Vault for sensitive data
- Consider implementing additional authentication for production use
- Regularly rotate access tokens and review permissions

## Support

For issues with:

- **Recording functionality**: Check browser permissions and HTTPS

- **OneDrive integration**: Verify Azure AD setup and permissions
- **Mobile compatibility**: Test PWA installation process
- **GDPR compliance**: Review consent flow and data handling
