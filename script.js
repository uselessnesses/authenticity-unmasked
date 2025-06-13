class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.currentButton = null;
    this.hasConsent = false;
    this.audioContext = null;
    this.stream = null;

    // Initialize Microsoft Graph authentication
    this.initializeMSAL();

    this.initializeApp();
  }

  initializeMSAL() {
    try {
      msalInstance = new msal.PublicClientApplication(msalConfig);
      console.log("MSAL initialized successfully");
    } catch (error) {
      console.error("MSAL initialization failed:", error);
    }
  }

  async getAccessToken() {
    try {
      // Try to get token silently first
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const silentRequest = {
          ...loginRequest,
          account: accounts[0],
        };

        try {
          const response = await msalInstance.acquireTokenSilent(silentRequest);
          return response.accessToken;
        } catch (silentError) {
          console.log("Silent token acquisition failed, trying popup...");
        }
      }

      // If silent fails, use popup
      const response = await msalInstance.loginPopup(loginRequest);
      return response.accessToken;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error("OneDrive authentication failed. Please try again.");
    }
  }

  async initializeApp() {
    // Show GDPR consent modal on first visit
    if (!localStorage.getItem("gdpr-consent")) {
      this.showGDPRModal();
    } else {
      this.hasConsent = localStorage.getItem("gdpr-consent") === "true";
    }

    // Initialize recording buttons
    this.setupEventListeners();

    // Check for microphone permissions
    if (this.hasConsent) {
      await this.checkMicrophonePermissions();
    }
  }

  showGDPRModal() {
    const modal = document.getElementById("gdpr-modal");
    modal.style.display = "block";

    document.getElementById("consent-yes").onclick = () => {
      this.hasConsent = true;
      localStorage.setItem("gdpr-consent", "true");
      modal.style.display = "none";
      this.checkMicrophonePermissions();
    };

    document.getElementById("consent-no").onclick = () => {
      this.hasConsent = false;
      localStorage.setItem("gdpr-consent", "false");
      modal.style.display = "none";
      this.showStatus(
        "Recording disabled. You can still use the survey option."
      );
    };
  }

  setupEventListeners() {
    // Recording buttons
    document.querySelectorAll(".record-btn").forEach((button) => {
      button.addEventListener("click", (e) => this.handleRecordClick(e));
    });

    // Prevent double-tap zoom on mobile
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      false
    );
  }

  async checkMicrophonePermissions() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
      this.showStatus("Ready to record!", 2000);

      // Stop the stream for now, we'll request it again when needed
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    } catch (error) {
      console.error("Microphone access denied:", error);
      this.showStatus("Microphone access required for recording.", 5000);
    }
  }

  async handleRecordClick(event) {
    console.log("Button clicked, isRecording:", this.isRecording);

    if (!this.hasConsent) {
      this.showGDPRModal();
      return;
    }

    const button = event.currentTarget;
    const buttonId = button.getAttribute("data-button-id");

    console.log(
      "Button ID:",
      buttonId,
      "Current recording state:",
      this.isRecording
    );

    if (!this.isRecording) {
      console.log("Starting recording...");
      await this.startRecording(button, buttonId);
    } else {
      console.log("Stopping recording...");
      await this.stopRecording();
    }
  }

  async startRecording(button, buttonId) {
    try {
      // Request fresh stream with better constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Turn off for better sensitivity
          noiseSuppression: false, // Turn off for better sensitivity
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1, // Mono recording
          volume: 1.0, // Maximum volume
        },
      });

      this.audioChunks = [];
      this.currentButton = button;
      this.isRecording = true;

      // Create MediaRecorder with better settings
      let options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/mp4" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/webm" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {}; // Use default
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Add better event handling
      this.mediaRecorder.ondataavailable = (event) => {
        console.log("Audio data received:", event.data.size, "bytes");
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log(
          "Recording stopped, total chunks:",
          this.audioChunks.length
        );
        this.processRecording(buttonId);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        this.showStatus("Recording error occurred", 3000);
        this.resetButton();
      };

      // Start recording with larger chunks for better capture
      this.mediaRecorder.start(1000); // Collect data every 1 second

      // Add audio level monitoring
      this.monitorAudioLevel();

      // Update UI
      button.classList.add("recording");
      button.querySelector(".btn-text").textContent =
        "Recording... (Tap to Stop)";
      this.showStatus("Recording in progress...");
    } catch (error) {
      console.error("Error starting recording:", error);
      this.showStatus(
        "Error accessing microphone. Please check permissions.",
        3000
      );
      this.resetButton();
    }
  }

  monitorAudioLevel() {
    if (!this.stream) return;

    try {
      // Create audio context for monitoring
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      const analyser = this.audioContext.createAnalyser();

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      const checkLevel = () => {
        if (!this.isRecording) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;

        // Log audio level for debugging
        if (average > 5) {
          // Only log when there's some audio
          console.log("Audio level:", average);
        }

        if (this.isRecording) {
          requestAnimationFrame(checkLevel);
        }
      };

      checkLevel();
    } catch (error) {
      console.warn("Audio monitoring not available:", error);
    }
  }

  async stopRecording() {
    console.log(
      "stopRecording called, mediaRecorder state:",
      this.mediaRecorder?.state
    );

    if (this.mediaRecorder && this.isRecording) {
      console.log("Actually stopping recording...");

      // Set flag first to prevent race conditions
      this.isRecording = false;

      // Stop the media recorder
      if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
        console.log("MediaRecorder stopped");
      }

      // Stop all audio tracks
      if (this.stream) {
        this.stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Audio track stopped");
        });
        this.stream = null;
      }

      // Clean up audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.showStatus("Processing recording...");
    } else {
      console.log("stopRecording called but not recording or no mediaRecorder");
    }
  }

  async processRecording(buttonId) {
    try {
      // Check if we have any audio data
      if (this.audioChunks.length === 0) {
        throw new Error("No audio data recorded");
      }

      const totalSize = this.audioChunks.reduce(
        (size, chunk) => size + chunk.size,
        0
      );
      console.log(
        "Processing recording:",
        this.audioChunks.length,
        "chunks, total size:",
        totalSize,
        "bytes"
      );

      if (totalSize === 0) {
        throw new Error("Audio recording is empty");
      }

      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
      console.log("Created audio blob:", audioBlob.size, "bytes");

      // Convert to MP3
      const mp3Blob = await this.convertToMp3(audioBlob);

      // Save to OneDrive
      await this.saveToOneDrive(mp3Blob, buttonId);

      this.showStatus("Recording saved successfully!", 3000);
    } catch (error) {
      console.error("Error processing recording:", error);
      this.showStatus(`Error: ${error.message}`, 5000);
    }

    this.resetButton();
  }

  async convertToMp3(audioBlob) {
    // For production, you would use a library like lamejs or ffmpeg.wasm
    // For now, we'll rename the file but keep the original format
    // This is a placeholder for actual MP3 conversion

    return new Blob([audioBlob], { type: "audio/mp3" });
  }

  async saveToOneDrive(audioBlob, buttonId) {
    try {
      this.showStatus("Authenticating with OneDrive...");

      // Get access token
      const accessToken = await this.getAccessToken();

      this.showStatus("Uploading to OneDrive...");

      // Create filename with timestamp and button ID - add error checking
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeButtonId = buttonId || "unknown";
      const filename = `voice-recording-button-${safeButtonId}-${timestamp}.mp3`;

      console.log("Creating filename:", filename);

      // Upload file directly to OneDrive using Microsoft Graph API
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Exhibition-Recordings/${filename}:/content`;

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "audio/mp3",
        },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("File uploaded to OneDrive successfully:", result);

      // Store recording metadata
      this.storeRecordingMetadata(
        buttonId,
        filename,
        audioBlob.size,
        result.webUrl
      );
    } catch (error) {
      console.error("OneDrive upload failed:", error);

      // Fallback: create download link for manual saving with safe filename
      const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeButtonId = buttonId || "unknown";
      const fallbackFilename = `voice-recording-button-${safeButtonId}-${safeTimestamp}.mp3`;

      this.showStatus(
        "OneDrive upload failed. Downloading file locally...",
        3000
      );
      this.createDownloadLink(audioBlob, fallbackFilename);

      throw error;
    }
  }

  createDownloadLink(blob, filename) {
    // Create temporary download link for testing
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  storeRecordingMetadata(buttonId, filename, fileSize, oneDriveUrl = null) {
    const recordings = JSON.parse(localStorage.getItem("recordings") || "[]");
    recordings.push({
      buttonId,
      filename,
      fileSize,
      timestamp: new Date().toISOString(),
      oneDriveUrl,
      uploaded: !!oneDriveUrl,
    });
    localStorage.setItem("recordings", JSON.stringify(recordings));
  }

  resetButton() {
    if (this.currentButton) {
      this.currentButton.classList.remove("recording");
      const originalText = `Record Response ${this.currentButton.getAttribute(
        "data-button-id"
      )}`;
      this.currentButton.querySelector(".btn-text").textContent = originalText;
      this.currentButton = null;
    }
  }

  showStatus(message, duration = null) {
    const statusDisplay = document.getElementById("status-display");
    const statusText = document.getElementById("status-text");

    statusText.textContent = message;
    statusDisplay.classList.remove("status-hidden");

    if (duration) {
      setTimeout(() => {
        statusDisplay.classList.add("status-hidden");
      }, duration);
    }
  }
}

// Microsoft Forms integration
function openForms() {
  // Use the Forms URL from config
  const formsUrl = window.AZURE_CONFIG.FORMS_URL;
  window.open(formsUrl, "_blank");
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VoiceRecorder();
});

// Service Worker registration for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Azure AD Configuration - using values from config.js
const msalConfig = {
  auth: {
    clientId: window.AZURE_CONFIG.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${window.AZURE_CONFIG.TENANT_ID}`,
    redirectUri: window.AZURE_CONFIG.REDIRECT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: ["Files.ReadWrite", "User.Read"],
};

// Initialize MSAL instance
let msalInstance;
