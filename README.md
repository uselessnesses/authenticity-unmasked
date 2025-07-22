# Authenticity Unmasked - Voice Recording Interface

## Quick Start

**Live Exhibition Interface:** https://uselessnesses.github.io/authenticity-unmasked

## 🎯 Available Interfaces

- **[Kinnari Saraiya](https://uselessnesses.github.io/authenticity-unmasked/kinnari-saraiya.html)** - Artist-specific questions
- **[dmstfctn](https://uselessnesses.github.io/authenticity-unmasked/dmstfctn.html)** - Artist-specific questions  
- **[Georgia Gardner](https://uselessnesses.github.io/authenticity-unmasked/georgia-gardner.html)** - Artist-specific questions
- **[Exhibition Questions](https://uselessnesses.github.io/authenticity-unmasked/exhibition-questions.html)** - General exhibition feedback

## 📁 Project Structure

```
authenticity-unmasked/
├── index.html                      # Directory page
├── kinnari-saraiya.html            # Kinnari Saraiya interface
├── dmstfctn.html                   # dmstfctn interface
├── georgia-gardner.html            # Georgia Gardner interface  
├── exhibition-questions.html       # General questions interface
├── script.js                       # Shared recording logic
├── styles.css                      # Shared styling
├── questions-data.js               # All question sets
├── config-*.js                     # Page-specific configs
├── config.js                       # Server configuration
├── manifest.json                   # PWA settings
├── sw.js                           # Offline functionality
├── server/                         # Backend (deployed to Railway)
│   ├── server.js                   # OneDrive upload server
│   ├── package.json                # Server dependencies
│   └── .env                        # Server credentials (private)
└── docs/                           # Documentation
    ├── Questions.csv               # Source question data
    ├── SETUP_INSTRUCTIONS.md      # Detailed setup guide
    └── SERVER_SETUP.md             # Server deployment guide
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

### Updating Questions

**To update questions from CSV:**

```bash
# 1. Edit docs/Questions.csv
# 2. Run the update script
npm run update-questions

# 3. Deploy changes  
git add .
git commit -m "Update questions from CSV"
git push origin main
```

**The questions will automatically update on all interfaces!**

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
