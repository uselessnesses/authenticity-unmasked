# Authenticity Unmasked - Voice Recording Interface

## Quick Start

**Live Exhibition Interface:** https://uselessnesses.github.io/authenticity-unmasked

## 📁 Project Structure

```
authenticity-unmasked/
├── index.html              # Exhibition interface
├── script.js               # Voice recording logic  
├── styles.css              # Interface styling
├── config.js               # Server configuration
├── manifest.json           # PWA settings
├── sw.js                   # Offline functionality
├── server/                 # Backend (deployed to Railway)
│   ├── server.js           # OneDrive upload server
│   ├── package.json        # Server dependencies
│   └── .env                # Server credentials (private)
└── docs/                   # Documentation
    ├── SETUP_INSTRUCTIONS.md # Detailed setup guide
    └── SERVER_SETUP.md      # Server deployment guide
```

## 🚀 How It Works

1. **User visits website** → GDPR consent modal appears
2. **User records audio** → Audio uploaded to Railway server
3. **Server authenticates with Azure** → Saves file to OneDrive
4. **Files organized** → Stored in "Exhibition-Recordings" folder

## 🔧 Technology Stack

**Client Side:**
- Vanilla JavaScript (no frameworks)
- Progressive Web App (PWA) capabilities
- Responsive design for all devices

**Server Side:**
- Node.js + Express server
- Azure AD authentication with refresh tokens
- Microsoft Graph API for OneDrive uploads
- Deployed on Railway cloud platform

## 📝 For Developers

### Making Client Changes
1. Edit files in root directory
2. Test locally by opening `index.html`
3. Commit and push to GitHub
4. GitHub Pages automatically deploys

### Server Already Deployed
The server is already deployed and configured. No changes needed unless modifying upload functionality.

### Key Configuration
- **Server URL:** Set in `config.js`
- **Azure Credentials:** Configured in server environment
- **OneDrive Folder:** "Exhibition-Recordings"

## 📚 Documentation

See `/docs` folder for:
- Complete setup instructions
- Server deployment guide
- Azure configuration details

## 🎨 Exhibition Context

Part of research project "Authenticity Unmasked: Unveiling AI-Driven Realities Through Art" led by Dr Caterina Moruzzi at the University of Edinburgh, supported by the Arts and Humanities Research Council.

## 📧 Contact

For technical questions: [Repository Issues](https://github.com/uselessnesses/authenticity-unmasked/issues)
For research questions: cmoruzzi@ed.ac.uk
