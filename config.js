// Client Configuration
// IMPORTANT: Update SERVER_URL with your deployed Railway URL

const AZURE_CONFIG = {
  // Railway server URL for file uploads
  SERVER_URL: "https://authenticity-unmasked-production.up.railway.app",

  // GitHub Pages URL for reference
  REDIRECT_URI: "https://uselessnesses.github.io/authenticity-unmasked",

  // Version info
  VERSION: "0.60.0",
  BUILD_DATE: "2025-07-25",
  BUILD_TIME: "16:30",
};

// Export for use in main script
window.AZURE_CONFIG = AZURE_CONFIG;
