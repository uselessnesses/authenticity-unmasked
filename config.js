// Azure AD Configuration
// IMPORTANT: Replace these values with your actual Azure App Registration details

const AZURE_CONFIG = {
  // Get this from Azure Portal > App Registrations > Your App > Overview
  CLIENT_ID: "YOUR_AZURE_CLIENT_ID_HERE",

  // Your GitHub Pages URL (e.g., 'https://yourusername.github.io/authenticity-unmasked')
  REDIRECT_URI: "YOUR_GITHUB_PAGES_URL_HERE",

  // Microsoft Forms URL (replace with your actual form)
  FORMS_URL:
    "https://forms.office.com/Pages/ResponsePage.aspx?id=YOUR_FORM_ID_HERE",
};

// Export for use in main script
window.AZURE_CONFIG = AZURE_CONFIG;
