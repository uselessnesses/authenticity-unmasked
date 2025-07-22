const express = require("express");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Use built-in fetch if available (Node.js 18+), otherwise use node-fetch v2
const fetch = globalThis.fetch || require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"), false);
    }
  },
});

// Store access token in memory (in production, use Redis or database)
let accessToken = null;
let tokenExpiry = null;

// Get access token for Microsoft Graph API
async function getAccessToken() {
  try {
    // Check if we have a valid cached token
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      return accessToken;
    }

    console.log("Getting new access token...");

    // Try the device code flow for delegated permissions
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    // First, try with a refresh token if available
    if (process.env.AZURE_REFRESH_TOKEN) {
      const tokenData = new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: process.env.AZURE_REFRESH_TOKEN,
        scope:
          "https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read",
      });

      const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenData,
      });

      if (tokenResponse.ok) {
        const tokenResult = await tokenResponse.json();
        accessToken = tokenResult.access_token;
        tokenExpiry = Date.now() + tokenResult.expires_in * 1000 - 300000; // 5 minutes buffer
        return accessToken;
      }
    }

    // If no refresh token or it failed, throw an error with instructions
    throw new Error(
      "No valid authentication method available. Please set up delegated permissions or use personal access token."
    );
  } catch (error) {
    console.error("Failed to get access token:", error);
    throw error;
  }
}

// Upload file to OneDrive
async function uploadToOneDrive(fileBuffer, filename, mimeType) {
  try {
    const token = await getAccessToken();

    // Create the upload URL - uploads to your OneDrive
    const uploadUrl = `https://graph.microsoft.com/v1.0/users/${process.env.AZURE_USER_ID}/drive/root:/Exhibition-Recordings/${filename}:/content`;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("OneDrive upload failed:", error);
    throw error;
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "authenticity-unmasked-server",
  });
});

// Auth callback endpoint for getting tokens
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No authorization code provided" });
  }

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const tokenData = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      code: code,
      redirect_uri: "http://localhost:3000/auth/callback",
      grant_type: "authorization_code",
      scope:
        "https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read offline_access",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenData,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return res
        .status(400)
        .json({ error: `Token request failed: ${errorData}` });
    }

    const tokenResult = await tokenResponse.json();

    res.json({
      message: "Success! Add this to your .env file:",
      refresh_token: tokenResult.refresh_token,
      instructions: `Add this line to your .env file:\nAZURE_REFRESH_TOKEN=${tokenResult.refresh_token}`,
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// Upload endpoint
app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { questionIndex, questionText, pageName } = req.body;

    // Create filename with page name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeQuestionText = (questionText || "unknown-question")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .substring(0, 50);

    const safePageName = (pageName || "Exhibition-Questions")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const filename = `${safePageName}-voice-q${
      questionIndex || "unknown"
    }-${safeQuestionText}-${timestamp}.mp3`;

    console.log(
      `Uploading file: ${filename} (${req.file.size} bytes) from ${pageName}`
    );

    // Upload to OneDrive
    const result = await uploadToOneDrive(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    console.log(`Upload successful: ${filename}`);

    res.json({
      success: true,
      filename: filename,
      size: req.file.size,
      oneDriveUrl: result.webUrl,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large" });
    }
  }

  console.error("Server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload`);
  console.log(`🎯 Environment: ${process.env.NODE_ENV || "development"}`);

  // Verify environment variables
  const requiredEnvVars = [
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "AZURE_TENANT_ID",
    "AZURE_USER_ID",
  ];
  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length > 0) {
    console.warn("⚠️  Missing environment variables:", missingEnvVars);
    console.warn(
      "⚠️  Server may not function correctly without these variables"
    );
  } else {
    console.log("✅ All required environment variables are set");
  }
});

module.exports = app;
