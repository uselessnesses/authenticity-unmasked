// Simple script to get a personal access token for OneDrive
// This generates a URL you can visit to get a token manually

const CLIENT_ID = "2a2d18c8-31ab-44f9-bb7a-619b4742c6b9";
const REDIRECT_URI = "http://localhost:3000/auth/callback";
const SCOPES =
  "https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read offline_access";

// Generate the authorization URL using your specific tenant
const TENANT_ID = "2e9f06b0-1669-4589-8789-10a06934dc61";
const authUrl =
  `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `response_type=code&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=${encodeURIComponent(SCOPES)}&` +
  `response_mode=query&` +
  `state=12345`;

console.log("🔗 Visit this URL to authorize the application:");
console.log(authUrl);
console.log(
  "\nAfter authorization, you'll be redirected to a URL that starts with:"
);
console.log("http://localhost:3000/auth/callback?code=...");
console.log(
  "\nCopy the 'code' parameter from that URL and use it to get your token."
);
