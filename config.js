// Server Configuration
// IMPORTANT: Update SERVER_URL with your deployed server URL

const AZURE_CONFIG = {
  // Server URL for file uploads (your backend server)
  SERVER_URL: "https://authenticity-unmasked-production.up.railway.app", // Change this to your deployed server URL

  // GitHub Pages URL for reference
  REDIRECT_URI: "https://uselessnesses.github.io/authenticity-unmasked",

  // Microsoft Forms URL (replace with your actual form)
  FORMS_URL:
    "https://forms.office.com/Pages/ResponsePage.aspx?id=YOUR_FORM_ID_HERE",

  // Version info - update this with each deployment
  VERSION: "2.4.0", // Legacy version for reference
  MANUAL_VERSION: "0.45", // Manual version - increment with each code change
  BUILD_DATE: "2025-01-27", // Updated date
  BUILD_TIME: "16:30", // Add specific time for same-day deployments
  COMMIT_HASH: "server-upload", // Manually update this with actual git commit hash
};

// Export for use in main script
window.AZURE_CONFIG = AZURE_CONFIG;
