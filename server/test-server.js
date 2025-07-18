#!/usr/bin/env node

// Simple test script to verify server setup
const fetch = require("node-fetch");
const fs = require("fs");
const FormData = require("form-data");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

async function testServer() {
  console.log("Testing server setup...");

  try {
    // Test 1: Health check
    console.log("\n1. Testing health endpoint...");
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check passed:", healthData);

    // Test 2: Create a test audio file
    console.log("\n2. Creating test audio file...");
    const testAudioData = Buffer.from("test audio data");

    // Test 3: Upload test file
    console.log("\n3. Testing file upload...");
    const formData = new FormData();
    formData.append("audio", testAudioData, {
      filename: "test.mp3",
      contentType: "audio/mp3",
    });
    formData.append("questionIndex", "1");
    formData.append("questionText", "Test question");

    const uploadResponse = await fetch(`${SERVER_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log("✅ Upload test passed:", uploadData);
    } else {
      const errorData = await uploadResponse.json();
      console.log("❌ Upload test failed:", errorData);
    }

    console.log("\n✅ Server test completed successfully!");
  } catch (error) {
    console.error("❌ Server test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testServer();
