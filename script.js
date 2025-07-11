// Initialize MSAL instance variable
let msalInstance = null;
let msalConfig = null;

const loginRequest = {
  scopes: [
    "https://graph.microsoft.com/Files.ReadWrite",
    "https://graph.microsoft.com/User.Read",
  ],
  prompt: "select_account", // Force account selection
};

// Azure AD Configuration - using values from config.js
class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.currentButton = null;
    this.hasConsent = false;
    this.hasRecordingConsent = false;
    this.consentTimer = null;
    this.audioContext = null;
    this.stream = null;
    this.questions = [
      "How has this exhibition influenced your perception of AI and its role in shaping authentic human experiences?",
      "Do you feel more optimistic or more concerned about AI after experiencing this exhibition? Why?",
      'What does "authenticity" mean to you in an age where AI can create art, music, and even mimic people?',
      "Has the exhibition challenged or reinforced your previous beliefs about AI and its creative potential?",
      "In what ways did the exhibition make you reflect on what is real versus what is generated or simulated?",
      "What emotions did you feel while engaging with the exhibition? Awe, unease, curiosity, hope...?",
      "Did any particular part of the exhibition make you question the boundaries between human and machine creativity?",
      "Do you see a place for AI in your own creative or personal life after visiting this exhibition?",
      'What, if anything, felt particularly "authentic" to you in the experience—despite the involvement of AI?',
      "Do you think AI enhances or diminishes authenticity in art and culture? Why?",
      "What questions are you leaving with that you didn't have before visiting this exhibition?",
    ];

    // Shuffle questions and pick a random starting question
    this.shuffleQuestions();
    this.currentQuestionIndex = Math.floor(
      Math.random() * this.questions.length
    );

    // Initialize Microsoft Graph authentication
    this.initializeMSAL();

    this.initializeApp();
  }

  initializeMSAL() {
    try {
      // Ensure Azure config is available
      if (!window.AZURE_CONFIG) {
        throw new Error("Azure configuration not loaded");
      }

      // Create MSAL configuration
      msalConfig = {
        auth: {
          clientId: window.AZURE_CONFIG.CLIENT_ID,
          authority: `https://login.microsoftonline.com/${window.AZURE_CONFIG.TENANT_ID}`,
          redirectUri: window.AZURE_CONFIG.REDIRECT_URI,
        },
        cache: {
          cacheLocation: "localStorage",
          storeAuthStateInCookie: false,
        },
        system: {
          loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
              console.log("MSAL Log:", message);
            },
            piiLoggingEnabled: false,
            logLevel: 3, // Verbose logging
          },
        },
      };

      console.log("Initializing MSAL with config:", msalConfig);
      msalInstance = new msal.PublicClientApplication(msalConfig);
      console.log("MSAL initialized successfully", msalInstance);

      // Add error event handler
      msalInstance.addEventCallback((message) => {
        console.log("MSAL Event:", message);
      });
    } catch (error) {
      console.error("MSAL initialization failed:", error);
      this.showStatus(
        "Authentication setup failed. Please refresh the page.",
        5000
      );
    }
  }

  async getAccessToken() {
    try {
      console.log("Starting authentication process...");

      // Check if MSAL instance exists
      if (!msalInstance) {
        console.error("MSAL instance not initialized");
        throw new Error(
          "Authentication not properly initialized. Please refresh the page."
        );
      }

      console.log("MSAL instance:", msalInstance);
      console.log("Config:", msalConfig);

      // Try to get token silently first
      const accounts = msalInstance.getAllAccounts();
      console.log("Existing accounts:", accounts.length);

      if (accounts.length > 0) {
        const silentRequest = {
          ...loginRequest,
          account: accounts[0],
        };

        try {
          console.log("Attempting silent token acquisition...");
          const response = await msalInstance.acquireTokenSilent(silentRequest);
          console.log("Silent token acquisition successful");
          return response.accessToken;
        } catch (silentError) {
          console.log("Silent token acquisition failed:", silentError);
          console.log("Error code:", silentError.errorCode);
          console.log("Error message:", silentError.errorMessage);
        }
      }

      // If silent fails, use popup
      console.log("Attempting popup login...");
      const response = await msalInstance.loginPopup(loginRequest);
      console.log("Popup login successful:", response);
      return response.accessToken;
    } catch (error) {
      console.error("Authentication failed - Full error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.errorCode);
      console.error("Error description:", error.errorDescription);

      // Provide more specific error messages
      let userMessage = "OneDrive authentication failed. ";

      if (error.errorCode === "invalid_client") {
        userMessage +=
          "Invalid client ID. Please check Azure app registration.";
      } else if (error.errorCode === "redirect_uri_mismatch") {
        userMessage +=
          "Redirect URI mismatch. Please check Azure app authentication settings.";
      } else if (error.errorCode === "access_denied") {
        userMessage +=
          "Access denied. Please ensure you have the required permissions.";
      } else if (error.errorCode === "interaction_required") {
        userMessage += "User interaction required. Please try again.";
      } else {
        userMessage += `Error: ${error.message || "Unknown error occurred"}`;
      }

      throw new Error(userMessage);
    }
  }

  async initializeApp() {
    // Always show GDPR consent modal on app start
    this.showGDPRModal();

    // Initialize recording buttons
    this.setupEventListeners();

    // Load a random question
    this.loadRandomQuestion();
  }

  showGDPRModal() {
    const modal = document.getElementById("gdpr-modal");
    modal.style.display = "block";

    document.getElementById("consent-yes").onclick = () => {
      this.hasConsent = true;
      modal.style.display = "none";
      this.checkMicrophonePermissions();
    };

    document.getElementById("consent-no").onclick = () => {
      this.hasConsent = false;
      modal.style.display = "none";
      // Don't allow access to the interface
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; color: #fff;">
          <div>
            <h2>Thank you for your time</h2>
            <p>You have chosen not to participate in this study.</p>
            <p>You can close this window or refresh to start again.</p>
          </div>
        </div>
      `;
    };
  }

  setupEventListeners() {
    // Main recording button
    const recordBtn = document.getElementById("main-record-btn");
    if (recordBtn) {
      recordBtn.addEventListener("click", (e) => this.handleButtonClick(e));
    }

    // Recording confirmation modal buttons
    document
      .getElementById("confirm-recording")
      ?.addEventListener("click", () => {
        this.hideRecordingConfirmation();
        this.hasRecordingConsent = true;
        this.handleRecordClick();
      });

    document
      .getElementById("cancel-recording")
      ?.addEventListener("click", () => {
        this.hideRecordingConfirmation();
      });

    // Continue modal buttons
    document.getElementById("continue-yes")?.addEventListener("click", () => {
      this.hideContinueModal();
      this.startConsentTimer();
      this.moveToNextQuestion();
    });

    document.getElementById("continue-no")?.addEventListener("click", () => {
      this.hideContinueModal();
      this.showThankYouAndRestart();
    });

    // Skip question button
    document
      .getElementById("skip-question-btn")
      ?.addEventListener("click", () => {
        this.skipQuestion();
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

  async handleRecordClick() {
    console.log("Button clicked, isRecording:", this.isRecording);

    if (!this.hasConsent) {
      this.showGDPRModal();
      return;
    }

    const button = document.getElementById("main-record-btn");
    const questionIndex = this.currentQuestionIndex; // Use current question index as ID

    console.log(
      "Question Index:",
      questionIndex,
      "Current recording state:",
      this.isRecording
    );

    if (!this.isRecording) {
      console.log("Starting recording...");
      await this.startRecording(button, questionIndex);
    } else {
      console.log("Stopping recording...");
      await this.stopRecording();
    }
  }

  handleButtonClick(event) {
    if (!this.hasConsent) {
      this.showGDPRModal();
      return;
    }

    // If currently recording, stop immediately without confirmation
    if (this.isRecording) {
      this.handleRecordClick();
    } else {
      // Check if we have recording consent (within 10 seconds)
      if (!this.hasRecordingConsent) {
        this.showRecordingConfirmation(event);
      } else {
        this.handleRecordClick();
      }
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

      // Show continue modal after successful recording
      setTimeout(() => {
        this.showContinueModal();
      }, 2000);
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

  async saveToOneDrive(audioBlob, questionIndex) {
    try {
      this.showStatus("Authenticating with OneDrive...");

      // Get access token
      const accessToken = await this.getAccessToken();

      this.showStatus("Uploading to OneDrive...");

      // Create filename with timestamp and question info
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const questionText = this.questions[questionIndex] || "unknown-question";

      // Create a safe filename by removing special characters and limiting length
      const safeQuestionText = questionText
        .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars except spaces
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .toLowerCase()
        .substring(0, 50); // Limit length to 50 chars

      const filename = `voice-recording-q${
        questionIndex + 1
      }-${safeQuestionText}-${timestamp}.mp3`;

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
        questionIndex,
        filename,
        audioBlob.size,
        result.webUrl,
        questionText
      );
    } catch (error) {
      console.error("OneDrive upload failed:", error);

      // Fallback: create download link for manual saving with safe filename
      const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const questionText = this.questions[questionIndex] || "unknown-question";
      const safeQuestionText = questionText
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .substring(0, 50);
      const fallbackFilename = `voice-recording-q${
        questionIndex + 1
      }-${safeQuestionText}-${safeTimestamp}.mp3`;

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

  storeRecordingMetadata(
    questionIndex,
    filename,
    fileSize,
    oneDriveUrl = null,
    questionText = ""
  ) {
    const recordings = JSON.parse(localStorage.getItem("recordings") || "[]");
    recordings.push({
      questionIndex,
      questionText,
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
      this.currentButton.querySelector(".btn-text").textContent =
        "Tap to Record Your Response";
      this.currentButton = null;
    }
    this.isRecording = false;
    this.audioChunks = [];
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

  loadRandomQuestion(animated = false) {
    // Shuffle questions if we've gone through all of them
    if (this.currentQuestionIndex >= this.questions.length) {
      this.currentQuestionIndex = 0;
      this.shuffleQuestions();
    }

    const questionElement = document.getElementById("current-question");
    if (questionElement) {
      if (animated) {
        // Add slide-in animation
        questionElement.classList.add("question-slide-in-left");

        // Remove animation class after animation completes
        setTimeout(() => {
          questionElement.classList.remove("question-slide-in-left");
        }, 400);
      }

      questionElement.textContent = this.questions[this.currentQuestionIndex];
    }
  }

  shuffleQuestions() {
    for (let i = this.questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.questions[i], this.questions[j]] = [
        this.questions[j],
        this.questions[i],
      ];
    }
  }

  moveToNextQuestion() {
    this.currentQuestionIndex++;
  }

  showRecordingConfirmation(event) {
    const modal = document.getElementById("recording-confirmation-modal");
    modal.style.display = "block";
  }

  hideRecordingConfirmation() {
    const modal = document.getElementById("recording-confirmation-modal");
    modal.style.display = "none";
  }

  skipQuestion() {
    // Prevent skipping during recording
    if (this.isRecording) {
      this.showStatus("Cannot skip question while recording", 2000);
      return;
    }

    const questionElement = document.getElementById("current-question");
    if (questionElement) {
      // Add slide-out animation
      questionElement.classList.add("question-slide-out-right");

      // After slide-out completes, load new question with slide-in
      setTimeout(() => {
        questionElement.classList.remove("question-slide-out-right");
        this.moveToNextQuestion();
        this.loadRandomQuestion(true);
      }, 400);
    }
  }

  showContinueModal() {
    const modal = document.getElementById("continue-modal");
    modal.style.display = "block";
  }

  hideContinueModal() {
    const modal = document.getElementById("continue-modal");
    modal.style.display = "none";
  }

  startConsentTimer() {
    // Clear any existing timer
    if (this.consentTimer) {
      clearTimeout(this.consentTimer);
    }

    // Set timer for 10 seconds
    this.consentTimer = setTimeout(() => {
      this.hasRecordingConsent = false;
      this.showStatus(
        "Recording consent expired. You'll need to consent again.",
        3000
      );
    }, 10000);
  }

  showThankYouAndRestart() {
    // Clear any consent timer
    if (this.consentTimer) {
      clearTimeout(this.consentTimer);
    }

    // Reset consent states
    this.hasRecordingConsent = false;

    // Show thank you message
    this.showStatus("Thank you for your participation!", 3000);

    // Restart the flow by showing GDPR modal again after a delay
    setTimeout(() => {
      this.showGDPRModal();
    }, 3500);
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

  // Display version information - fully automatic
  const versionElement = document.getElementById("version-text");
  if (versionElement) {
    // Generate automatic version based on current timestamp
    const now = new Date();

    // Create version: YYYY.MM.DD.HHMM format
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");

    const autoVersion = `${year}.${month}.${day}.${hour}${minute}`;
    const displayTime = now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Try to get GitHub commit info if available
    getGitHubCommitInfo().then((commitInfo) => {
      if (commitInfo) {
        versionElement.textContent = `v${autoVersion} (${commitInfo.sha.slice(
          0,
          7
        )})`;
        versionElement.title = `Build: ${displayTime} | Commit: ${commitInfo.sha.slice(
          0,
          7
        )} | ${commitInfo.message}`;
      } else {
        versionElement.textContent = `v${autoVersion}`;
        versionElement.title = `Build: ${displayTime} | Auto-generated version`;
      }
    });
  }
});

// Function to fetch GitHub commit information
async function getGitHubCommitInfo() {
  try {
    // Get the latest commit from GitHub API
    const response = await fetch(
      "https://api.github.com/repos/uselessnesses/authenticity-unmasked/commits/main"
    );
    if (!response.ok) throw new Error("GitHub API request failed");

    const commit = await response.json();
    return {
      sha: commit.sha,
      message: commit.commit.message.split("\n")[0], // First line only
      date: commit.commit.author.date,
    };
  } catch (error) {
    console.log("Could not fetch GitHub commit info:", error);
    return null;
  }
}

// Service Worker registration for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Try multiple paths for service worker registration
    const swPaths = ["./sw.js", "/authenticity-unmasked/sw.js", "sw.js"];

    async function tryRegisterSW() {
      for (const path of swPaths) {
        try {
          const registration = await navigator.serviceWorker.register(path);
          console.log("SW registered successfully:", registration);
          return; // Success, exit the loop
        } catch (error) {
          console.log(`SW registration failed for ${path}:`, error.message);
        }
      }
      console.log(
        "All SW registration attempts failed. PWA features disabled."
      );
    }

    tryRegisterSW();
  });
}
