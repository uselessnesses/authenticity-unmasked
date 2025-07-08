// Azure AD Configuration
// IMPORTANT: Replace these values with your actual Azure App Registration details

const AZURE_CONFIG = {
  // Get this from Azure Portal > App Registrations > Your App > Overview
  CLIENT_ID: "cf187f7d-56fa-43ed-81f9-886671237afe",

  // Your GitHub Pages URL (e.g., 'https://yourusername.github.io/authenticity-unmasked')
  REDIRECT_URI: "https://uselessnesses.github.io/authenticity-unmasked", // UPDATE WITH YOUR ACTUAL GITHUB USERNAME

  // Your tenant ID (since your app is "My organization only")
  TENANT_ID: "2e9f06b0-1669-4589-8789-10a06934dc61",

  // Microsoft Forms URL (replace with your actual form)
  FORMS_URL:
    "https://forms.office.com/Pages/ResponsePage.aspx?id=YOUR_FORM_ID_HERE",

  // Version info - update this with each deployment
  VERSION: "2.3.0", // Added skip question functionality with slide animations
  BUILD_DATE: "2025-07-08",
  BUILD_TIME: "16:00", // Add specific time for same-day deployments
  COMMIT_HASH: "main", // You can update this with actual git commit hash
};

// Export for use in main script
window.AZURE_CONFIG = AZURE_CONFIG;
