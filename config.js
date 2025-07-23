// Client Configuration
// IMPORTANT: Update SERVER_URL with your deployed Railway URL

const AZURE_CONFIG = {
  // Railway server URL for file uploads
  SERVER_URL: "https://authenticity-unmasked-production.up.railway.app",

  // GitHub Pages URL for reference
  REDIRECT_URI: "https://uselessnesses.github.io/authenticity-unmasked",

  // Version info
  VERSION: "0.57.0",
  BUILD_DATE: "2025-07-23",
  BUILD_TIME: "10:00",
};

// Export for use in main script
window.AZURE_CONFIG = AZURE_CONFIG;
