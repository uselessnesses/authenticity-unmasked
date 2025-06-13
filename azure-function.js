const { app } = require("@azure/functions");
const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");

// Azure Function to handle anonymous OneDrive uploads
app.http("uploadToOneDrive", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log("HTTP trigger function processed a request.");

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      };
    }

    try {
      // Get environment variables
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("Missing Azure credentials in environment variables");
      }

      // Parse the form data
      const formData = await request.formData();
      const audioFile = formData.get("audio");
      const filename = formData.get("filename");
      const timestamp = formData.get("timestamp");

      if (!audioFile || !filename) {
        return {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ error: "Missing audio file or filename" }),
        };
      }

      // Create credential and Graph client
      const credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );
      const graphClient = Client.initWithMiddleware({
        authProvider: credential,
      });

      // Convert audio file to buffer
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

      // Upload to OneDrive
      const uploadPath = `/me/drive/root:/Exhibition-Recordings/${filename}:/content`;

      const uploadResult = await graphClient.api(uploadPath).put(audioBuffer);

      context.log(`File uploaded successfully: ${filename}`);

      return {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          success: true,
          filename: filename,
          uploadId: uploadResult.id,
          timestamp: timestamp,
          message: "Recording saved to OneDrive successfully",
        }),
      };
    } catch (error) {
      context.log.error("Upload failed:", error);

      return {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Upload failed",
          message: error.message,
        }),
      };
    }
  },
});
