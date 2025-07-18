// Device code flow - no redirect URI needed
const CLIENT_ID = "2a2d18c8-31ab-44f9-bb7a-619b4742c6b9";
const TENANT_ID = "2e9f06b0-1669-4589-8789-10a06934dc61";
const SCOPES = "Files.ReadWrite offline_access User.Read";

async function getDeviceCode() {
  const deviceCodeUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/devicecode`;

  const response = await fetch(deviceCodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPES,
    }),
  });

  const result = await response.json();

  if (result.error) {
    console.error("Error getting device code:", result.error_description);
    return;
  }

  console.log("📱 Device Code Authentication");
  console.log("=".repeat(50));
  console.log(`🔗 Visit: ${result.verification_uri}`);
  console.log(`🔢 Enter code: ${result.user_code}`);
  console.log("=".repeat(50));
  console.log("After entering the code, press Enter to continue...");

  // Wait for user input
  process.stdin.once("data", async () => {
    console.log("🔄 Checking for authorization...");

    // Poll for token
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: CLIENT_ID,
        device_code: result.device_code,
      }),
    });

    const tokenResult = await tokenResponse.json();

    if (tokenResult.error) {
      console.error("❌ Token error:", tokenResult.error_description);
      return;
    }

    console.log("✅ Success! Add this to your .env file:");
    console.log(`AZURE_REFRESH_TOKEN=${tokenResult.refresh_token}`);
    process.exit(0);
  });
}

getDeviceCode().catch(console.error);
