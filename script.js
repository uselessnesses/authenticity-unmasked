class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.currentButton = null;
    this.hasConsent = false;
    this.audioContext = null;
    this.stream = null;

    this.initializeApp();
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
    if (!this.hasConsent) {
      this.showGDPRModal();
      return;
    }

    const button = event.currentTarget;
    const buttonId = button.getAttribute("data-button-id");

    if (!this.isRecording) {
      await this.startRecording(button, buttonId);
    } else {
      await this.stopRecording();
    }
  }

  async startRecording(button, buttonId) {
    try {
      // Request fresh stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      this.audioChunks = [];
      this.currentButton = button;
      this.isRecording = true;

      // Create MediaRecorder with MP3-compatible settings
      const options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "audio/mp4";
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "audio/webm";
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording(buttonId);
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

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

  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach((track) => track.stop());
      this.isRecording = false;

      this.showStatus("Processing recording...");
    }
  }

  async processRecording(buttonId) {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

      // Convert to MP3
      const mp3Blob = await this.convertToMp3(audioBlob);

      // Save to OneDrive
      await this.saveToOneDrive(mp3Blob, buttonId);

      this.showStatus("Recording saved successfully!", 3000);
    } catch (error) {
      console.error("Error processing recording:", error);
      this.showStatus("Error saving recording. Please try again.", 3000);
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
    // Create filename with timestamp and button ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `voice-recording-button-${buttonId}-${timestamp}.mp3`;

    // For GitHub Pages deployment, we'll use Microsoft Graph API
    // You'll need to set up Azure AD app registration and get access tokens

    // Placeholder for OneDrive integration
    // In production, you would:
    // 1. Get access token from Azure AD
    // 2. Upload file to OneDrive using Microsoft Graph API

    console.log("Saving to OneDrive:", filename, audioBlob.size, "bytes");

    // For demonstration, we'll create a download link
    this.createDownloadLink(audioBlob, filename);

    // Store recording metadata
    this.storeRecordingMetadata(buttonId, filename, audioBlob.size);
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

  storeRecordingMetadata(buttonId, filename, fileSize) {
    const recordings = JSON.parse(localStorage.getItem("recordings") || "[]");
    recordings.push({
      buttonId,
      filename,
      fileSize,
      timestamp: new Date().toISOString(),
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
  // Replace with your actual Microsoft Forms URL
  const formsUrl =
    "https://forms.office.com/Pages/ResponsePage.aspx?id=YOUR_FORM_ID";
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
