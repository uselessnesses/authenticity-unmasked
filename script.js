// Server-based OneDrive Upload System
// Files are uploaded to a Node.js server which handles authentication and OneDrive upload
// No authentication required on client devices - perfect for exhibition kiosks

// Configuration from config.js
class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.currentButton = null;
    this.hasConsent = false;
    this.hasRecordingConsent = false;
    this.consentTimer = null;
    this.recordingTimer = null; // Add recording timeout timer
    this.sessionConsentTimer = null; // Add session consent timer
    this.inactivityTimer = null; // Add inactivity timer for consent expiry
    this.audioContext = null;
    this.stream = null;
    this.recentQuestions = []; // Track recent questions to avoid immediate repetition
    this.isSkipping = false; // Add debounce flag for skip button
    this.isUploading = false; // Track upload state to prevent navigation
    this.pendingUploads = new Set(); // Track multiple uploads if needed
    this.uploadCompleteCallback = null; // Callback for when upload finishes

    // Load questions based on page configuration
    this.initializeQuestions();

    // Shuffle questions and pick a random starting question
    this.shuffleQuestions();
    this.currentQuestionIndex = Math.floor(
      Math.random() * this.questions.length
    );
    this.recentQuestions.push(this.currentQuestionIndex);

    // Initialize the app with server-based uploads (no authentication needed on client)
    this.initializeApp();
  }

  initializeQuestions() {
    // Get the question set from page configuration
    const questionSet =
      window.PAGE_CONFIG?.questionSet || "Exhibition-Questions";

    // Load questions from the data file
    if (window.QUESTION_DATA && window.QUESTION_DATA[questionSet]) {
      this.questions = [...window.QUESTION_DATA[questionSet]].filter(
        (q) => q && q.trim()
      );
    } else {
      // Fallback questions if configuration fails
      console.warn(
        `Question set "${questionSet}" not found, using fallback questions`
      );
      this.questions = [
        "What does authenticity mean to you in the context of digital media?",
        "How do you determine if digital content is authentic or not?",
        "What responsibilities do creators have regarding authenticity?",
      ];
    }

    // Ensure we have at least one question
    if (this.questions.length === 0) {
      this.questions = ["Please share your thoughts about the exhibition."];
    }

    console.log(`Loaded ${this.questions.length} questions for ${questionSet}`);

    // Initialize the app with server-based uploads (no authentication needed on client)
    this.initializeApp();
  }

  async initializeApp() {
    // Enable buttons for recording (no authentication required on client)
    this.enableButtons();

    // Initialize recording buttons
    this.setupEventListeners();

    // Add beforeunload protection to prevent data loss during uploads
    this.setupUploadProtection();

    // Load a random question
    this.loadRandomQuestion();
  }

  setupUploadProtection() {
    // Prevent page unload during uploads
    window.addEventListener("beforeunload", (e) => {
      if (this.isUploading || this.pendingUploads.size > 0) {
        e.preventDefault();
        e.returnValue =
          "Your recording is still being saved. Are you sure you want to leave?";
        return e.returnValue;
      }
    });

    // Also prevent navigation during uploads
    window.addEventListener("pagehide", (e) => {
      if (this.isUploading || this.pendingUploads.size > 0) {
        e.preventDefault();
      }
    });
  }
  showGDPRModal() {
    const modal = document.getElementById("gdpr-modal");

    // Reset scroll position to top
    this.resetModalScroll();

    modal.style.display = "block";

    document.getElementById("consent-yes").onclick = () => {
      this.hasConsent = true;
      this.resetModalScroll(); // Reset scroll when closing
      modal.style.display = "none";
      this.enableButtons(); // Re-enable buttons when consent is given
      this.startInactivityTimer(); // Start inactivity timer
      this.checkMicrophonePermissions();
    };

    document.getElementById("consent-no").onclick = () => {
      this.hasConsent = false;
      this.resetModalScroll(); // Reset scroll when closing
      modal.style.display = "none";
      // Show thank you modal instead of replacing page content
      this.showThankYouModal(
        "You have chosen not to participate in this study."
      );
    };
  }
  showRecordingConsent() {
    const modal = document.getElementById("gdpr-modal");

    // Reset scroll position to top
    this.resetModalScroll();

    modal.style.display = "block";

    document.getElementById("consent-yes").onclick = () => {
      this.hasConsent = true;
      this.hasRecordingConsent = true;
      this.resetModalScroll(); // Reset scroll when closing
      modal.style.display = "none";
      this.startSessionConsentTimer(); // Start session consent timer
      this.startInactivityTimer(); // Start inactivity timer
      this.handleRecordClick();
    };

    document.getElementById("consent-no").onclick = () => {
      this.hasConsent = false;
      this.resetModalScroll(); // Reset scroll when closing
      modal.style.display = "none";
      // Show thank you modal instead of just hiding modal
      this.showThankYouModal(
        "You have chosen not to participate in this study."
      );
    };
  }

  setupEventListeners() {
    console.log("🔗 Setting up event listeners...");

    // Main recording button - remove existing listeners first to prevent duplicates
    const recordBtn = document.getElementById("main-record-btn");
    if (recordBtn) {
      // Clone node to remove all event listeners
      const newRecordBtn = recordBtn.cloneNode(true);
      recordBtn.parentNode.replaceChild(newRecordBtn, recordBtn);

      newRecordBtn.addEventListener("click", (e) => {
        console.log("🖱️ Record button clicked");
        this.resetInactivityTimer(); // Reset timer on user interaction
        this.handleButtonClick(e);
      });
      console.log("✅ Record button event listener attached");
    } else {
      console.log("⚠️ Record button not found");
    }

    // Continue modal buttons
    document.getElementById("continue-yes")?.addEventListener("click", () => {
      this.resetInactivityTimer(); // Reset timer on user interaction
      this.hideContinueModal();
      // Start session consent timer (extends the consent window)
      this.startSessionConsentTimer();
      this.startInactivityTimer(); // Ensure inactivity timer is running
      this.moveToNextQuestion();
      this.loadRandomQuestion(true); // Load the new question with animation
    });

    document.getElementById("continue-no")?.addEventListener("click", () => {
      this.resetInactivityTimer(); // Reset timer on user interaction

      // Check if there are any pending uploads before allowing exit
      if (this.isUploading || this.pendingUploads.size > 0) {
        this.showStatus(
          "Please wait while your recording is being saved...",
          3000
        );

        // Set up callback to execute when upload completes
        this.uploadCompleteCallback = () => {
          this.hideContinueModal();
          this.showThankYouAndExit();
        };

        // Disable the button temporarily to prevent multiple clicks
        const continueNoBtn = document.getElementById("continue-no");
        if (continueNoBtn) {
          continueNoBtn.disabled = true;
          continueNoBtn.textContent = "Saving...";

          // Re-enable button after a timeout as fallback
          setTimeout(() => {
            continueNoBtn.disabled = false;
            continueNoBtn.textContent = "No, Thank you";
          }, 10000);
        }

        return;
      }

      this.hideContinueModal();
      this.showThankYouAndExit();
    });

    // Skip question button
    document
      .getElementById("skip-question-btn")
      ?.addEventListener("click", () => {
        this.resetInactivityTimer(); // Reset timer on user interaction
        this.skipQuestion();
      });

    // Prevent double-tap zoom on mobile
    document.addEventListener("touchstart", (e) => {
      this.resetInactivityTimer(); // Reset timer on any touch
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        this.resetInactivityTimer(); // Reset timer on touch end
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      false
    );

    // Add general activity listeners to reset timer
    document.addEventListener("click", () => {
      this.resetInactivityTimer();
    });

    document.addEventListener("keydown", () => {
      this.resetInactivityTimer();
    });

    document.addEventListener("mousemove", () => {
      this.resetInactivityTimer();
    });
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
    console.log("🎙️ handleRecordClick() called");
    console.log("📊 Current state:", {
      isRecording: this.isRecording,
      hasConsent: this.hasConsent,
      mediaRecorderState: this.mediaRecorder?.state || "null",
      audioChunksLength: this.audioChunks.length,
      currentButtonExists: !!this.currentButton,
    });

    if (!this.hasConsent) {
      console.log("❌ No consent, showing GDPR modal");
      this.showGDPRModal();
      return;
    }

    // Prevent double-clicking by checking if we're already in a recording process
    if (
      this.isRecording &&
      this.mediaRecorder &&
      this.mediaRecorder.state === "recording"
    ) {
      console.log("⚠️ Already recording, ignoring duplicate click");
      return;
    }

    const button = document.getElementById("main-record-btn");
    const questionIndex = this.currentQuestionIndex; // Use current question index as ID

    console.log("🔢 Question Index:", questionIndex, "Button found:", !!button);

    if (!this.isRecording) {
      console.log("▶️ Starting new recording...");
      await this.startRecording(button, questionIndex);
    } else {
      console.log("⏹️ Stopping current recording...");
      await this.stopRecording();
    }
  }

  handleButtonClick(event) {
    // Prevent action if button is disabled
    if (event.target.disabled) {
      return;
    }

    // If currently recording, stop immediately without confirmation
    if (this.isRecording) {
      this.handleRecordClick();
      return;
    }

    // Check if we have session consent (broader consent window)
    if (!this.hasConsent) {
      this.showRecordingConsent();
    } else {
      // We have session consent, proceed with recording
      this.handleRecordClick();
    }
  }

  async startRecording(button, buttonId) {
    console.log("🚀 startRecording() called", {
      buttonId,
      hasButton: !!button,
    });

    try {
      // Ensure we're fully cleaned up before starting
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        console.log("⚠️ Found active MediaRecorder, stopping it first");
        this.mediaRecorder.stop();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Brief delay
      }

      if (this.stream) {
        console.log("⚠️ Found existing stream, closing it first");
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      console.log("🎤 Requesting microphone access...");
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

      console.log("✅ Microphone access granted, setting up recording...");
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

      console.log("🔧 Creating MediaRecorder with options:", options);
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Add better event handling
      this.mediaRecorder.ondataavailable = (event) => {
        console.log(
          "📊 Audio data received:",
          event.data.size,
          "bytes",
          "Total chunks:",
          this.audioChunks.length + 1
        );
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        } else {
          console.log("⚠️ Received empty audio chunk");
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log("⏹️ MediaRecorder stopped. Processing recording...", {
          totalChunks: this.audioChunks.length,
          totalSize: this.audioChunks.reduce(
            (size, chunk) => size + chunk.size,
            0
          ),
          buttonId: buttonId,
        });
        this.processRecording(buttonId);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event.error);
        this.showStatus("Recording error occurred", 3000);
        this.resetButton();
      };

      // Start recording with larger chunks for better capture
      this.mediaRecorder.start(1000); // Collect data every 1 second

      // Set up 5-minute timeout for recording
      this.recordingTimer = setTimeout(() => {
        if (this.isRecording) {
          console.log("Recording timeout reached (5 minutes)");
          this.showStatus(
            "Recording automatically stopped after 5 minutes",
            3000
          );
          this.stopRecording();
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds

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

      // Clear recording timeout timer
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }

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
    console.log("🔄 processRecording() called", {
      buttonId,
      chunksLength: this.audioChunks.length,
      isUploading: this.isUploading,
    });

    // Prevent duplicate processing
    if (this.isUploading) {
      console.log("⚠️ Already processing/uploading, ignoring duplicate call");
      return;
    }

    // Disable buttons immediately to prevent double-clicking
    this.disableButtons();
    this.isUploading = true;

    try {
      // Check if we have any audio data
      if (this.audioChunks.length === 0) {
        throw new Error("No audio data recorded");
      }

      const totalSize = this.audioChunks.reduce(
        (size, chunk) => size + chunk.size,
        0
      );
      console.log("📊 Processing recording:", {
        chunks: this.audioChunks.length,
        totalSize: totalSize,
        buttonId: buttonId,
      });

      if (totalSize === 0) {
        throw new Error("Audio recording is empty");
      }

      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
      console.log("🎵 Created audio blob:", audioBlob.size, "bytes");

      // Convert to MP3
      console.log("🔄 Converting to MP3...");
      const mp3Blob = await this.convertToMp3(audioBlob);

      // Save to OneDrive
      console.log("☁️ Saving to OneDrive...");
      await this.saveToOneDrive(mp3Blob, buttonId);

      console.log("✅ Recording processed successfully");
      this.showStatus("Recording saved successfully!", 2000);

      // Show continue modal immediately after processing
      this.showContinueModal();
    } catch (error) {
      console.error("❌ Error processing recording:", error);
      this.showStatus(`Error: ${error.message}`, 5000);
      // Re-enable buttons if there was an error
      this.enableButtons();
    } finally {
      // Always reset upload flag and button state
      this.isUploading = false;
      this.resetButton();
    }
  }

  async convertToMp3(audioBlob) {
    // For production, you would use a library like lamejs or ffmpeg.wasm
    // For now, we'll change the MIME type to audio/mpeg so OneDrive treats it as an audio file
    // The actual format is still WebM, but this makes it appear as audio in OneDrive

    return new Blob([audioBlob], { type: "audio/mpeg" });
  }

  async saveToOneDrive(audioBlob, questionIndex) {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;

    try {
      // Mark upload as starting
      this.isUploading = true;
      this.pendingUploads.add(uploadId);

      this.showStatus("Uploading to OneDrive...");

      // Get server URL from config
      const serverUrl =
        window.AZURE_CONFIG.SERVER_URL || "http://localhost:3000";

      // Create filename info
      const questionText = this.questions[questionIndex] || "unknown-question";
      const pageName = window.PAGE_CONFIG?.pageName || "Exhibition-Questions";

      // Get CSV position for this question
      const csvPosition = this.getQuestionCSVPosition(questionIndex, pageName);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.mp3");
      formData.append("questionIndex", questionIndex + 1);
      formData.append("questionText", questionText);
      formData.append("pageName", pageName);
      formData.append("csvPosition", csvPosition);

      console.log(
        `Uploading to server: ${serverUrl}/upload (${pageName}, CSV: ${csvPosition})`
      );

      const response = await fetch(`${serverUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText} - ${
            errorData.message || ""
          }`
        );
      }

      const result = await response.json();
      console.log("File uploaded successfully:", result);

      // Store recording metadata
      this.storeRecordingMetadata(
        questionIndex,
        result.filename,
        result.size,
        result.oneDriveUrl,
        questionText
      );

      this.showStatus("Recording saved to OneDrive successfully!", 3000);
      console.log("File saved successfully:", result.filename);
    } catch (error) {
      console.error("Upload failed:", error);

      // Fallback: create download link for manual saving
      const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const questionText = this.questions[questionIndex] || "unknown-question";
      const pageName = window.PAGE_CONFIG?.pageName || "Exhibition-Questions";
      const safeQuestionText = questionText
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .substring(0, 50);
      const fallbackFilename = `${pageName}-voice-q${
        questionIndex + 1
      }-${safeQuestionText}-${safeTimestamp}.mp3`;

      this.showStatus(
        "Server upload failed. Downloading file locally...",
        3000
      );
      this.createDownloadLink(audioBlob, fallbackFilename);

      throw error;
    } finally {
      // Always clean up upload state
      this.pendingUploads.delete(uploadId);

      // Check if all uploads are complete
      if (this.pendingUploads.size === 0) {
        this.isUploading = false;

        // Execute any pending callback (like exit action)
        if (this.uploadCompleteCallback) {
          const callback = this.uploadCompleteCallback;
          this.uploadCompleteCallback = null;

          // Reset continue-no button state
          const continueNoBtn = document.getElementById("continue-no");
          if (continueNoBtn) {
            continueNoBtn.disabled = false;
            continueNoBtn.textContent = "No, Thank you";
          }

          // Execute the callback after a short delay to ensure UI updates
          setTimeout(callback, 100);
        }
      }
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
    console.log("🔄 resetButton() called", {
      hasCurrentButton: !!this.currentButton,
      isRecording: this.isRecording,
      mediaRecorderState: this.mediaRecorder?.state || "null",
      audioChunksLength: this.audioChunks.length,
    });

    if (this.currentButton) {
      this.currentButton.classList.remove("recording");
      this.currentButton.querySelector(".btn-text").textContent =
        "Tap to Record Your Response";
      this.currentButton = null;
    }
    this.isRecording = false;
    this.audioChunks = [];

    // Clean up MediaRecorder
    if (this.mediaRecorder) {
      console.log(
        "🧹 Cleaning up MediaRecorder, current state:",
        this.mediaRecorder.state
      );
      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch (error) {
          console.log("⚠️ Error stopping MediaRecorder:", error.message);
        }
      }
      // Remove event listeners to prevent memory leaks
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder = null;
    }

    // Clean up audio stream
    if (this.stream) {
      console.log("🧹 Cleaning up audio stream");
      this.stream.getTracks().forEach((track) => {
        console.log("🛑 Stopping track:", track.kind, track.label);
        track.stop();
      });
      this.stream = null;
    }

    // Clean up audio context
    if (this.audioContext) {
      console.log("🧹 Cleaning up audio context");
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear recording timer if it exists
    if (this.recordingTimer) {
      console.log("🧹 Clearing recording timer");
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    console.log("✅ Button reset complete");
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

  getQuestionCSVPosition(questionIndex, pageName) {
    // Map page names to CSV column letters and calculate row position
    const columnMapping = {
      "Kinnari-Saraiya": "A",
      dmstfctn: "B",
      "Georgia-Gardner": "C",
      "Exhibition-Questions": "D-G", // Multiple columns for exhibition questions
    };

    const columnLetter = columnMapping[pageName] || "X";

    // Row numbers start from 2 (row 1 is headers)
    const rowNumber = questionIndex + 2;

    // For exhibition questions, distribute across columns D-G
    if (pageName === "Exhibition-Questions") {
      const exhibitionColumns = ["D", "E", "F", "G"];
      const columnIndex = questionIndex % exhibitionColumns.length;
      const adjustedRow =
        Math.floor(questionIndex / exhibitionColumns.length) + 2;
      return `${exhibitionColumns[columnIndex]}${adjustedRow}`;
    }

    return `${columnLetter}${rowNumber}`;
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
    // If we only have one question, we can't avoid repetition
    if (this.questions.length <= 1) {
      return;
    }

    const previousIndex = this.currentQuestionIndex;

    // For 2 questions, just alternate. For more questions, avoid recent ones.
    if (this.questions.length === 2) {
      // Simple alternation for 2 questions
      this.currentQuestionIndex = this.currentQuestionIndex === 0 ? 1 : 0;
      console.log(
        `2-question alternation: ${previousIndex} → ${this.currentQuestionIndex}`
      );
    } else {
      // For 3+ questions, use recent question tracking
      const maxRecentQuestions = Math.min(this.questions.length - 1, 2);

      // Create array of all possible indices except recent ones
      const availableIndices = [];
      for (let i = 0; i < this.questions.length; i++) {
        if (!this.recentQuestions.includes(i)) {
          availableIndices.push(i);
        }
      }

      // If no available indices (all questions are recent), reset and exclude only current
      if (availableIndices.length === 0) {
        this.recentQuestions = [this.currentQuestionIndex];
        for (let i = 0; i < this.questions.length; i++) {
          if (i !== this.currentQuestionIndex) {
            availableIndices.push(i);
          }
        }
      }

      // Select randomly from available indices
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      this.currentQuestionIndex = availableIndices[randomIndex];

      // Add to recent questions and maintain size limit
      this.recentQuestions.push(this.currentQuestionIndex);
      if (this.recentQuestions.length > maxRecentQuestions) {
        this.recentQuestions.shift(); // Remove oldest
      }
    }

    console.log(
      `Question changed to index: ${
        this.currentQuestionIndex
      }, recent: [${this.recentQuestions.join(", ")}]`
    );
  }

  skipQuestion() {
    // Prevent skipping during recording
    if (this.isRecording) {
      this.showStatus("Cannot skip question while recording", 2000);
      return;
    }

    // Prevent double-clicking/rapid clicking
    if (this.isSkipping) {
      console.log("Skip already in progress, ignoring duplicate click");
      return;
    }

    // Check if skip button is disabled
    const skipBtn = document.getElementById("skip-question-btn");
    if (skipBtn && skipBtn.disabled) {
      return;
    }

    console.log(
      `Before skip: currentQuestionIndex = ${
        this.currentQuestionIndex
      }, question = "${this.questions[this.currentQuestionIndex]}"`
    );

    // Set the debounce flag
    this.isSkipping = true;

    const questionElement = document.getElementById("current-question");
    if (questionElement) {
      // Add slide-out animation
      questionElement.classList.add("question-slide-out-right");

      // After slide-out completes, load new question with slide-in
      setTimeout(() => {
        questionElement.classList.remove("question-slide-out-right");
        this.moveToNextQuestion();
        console.log(
          `After moveToNextQuestion: currentQuestionIndex = ${
            this.currentQuestionIndex
          }, question = "${this.questions[this.currentQuestionIndex]}"`
        );
        this.loadRandomQuestion(true);

        // Reset the debounce flag after animation completes
        setTimeout(() => {
          this.isSkipping = false;
        }, 100);
      }, 400);
    } else {
      // If no question element, reset flag immediately
      this.isSkipping = false;
    }
  }

  showContinueModal() {
    const modal = document.getElementById("continue-modal");
    const uploadIndicator = document.getElementById("upload-status-indicator");
    modal.style.display = "block";

    // Check if upload is still in progress and update UI accordingly
    const continueNoBtn = document.getElementById("continue-no");
    if (this.isUploading || this.pendingUploads.size > 0) {
      // Show upload indicator
      if (uploadIndicator) {
        uploadIndicator.style.display = "block";
      }

      if (continueNoBtn) {
        continueNoBtn.textContent = "Saving...";
        continueNoBtn.disabled = true;
      }

      // Set up a check to re-enable the button when upload completes
      const checkUploadComplete = () => {
        if (!this.isUploading && this.pendingUploads.size === 0) {
          // Hide upload indicator
          if (uploadIndicator) {
            uploadIndicator.style.display = "none";
          }

          if (continueNoBtn) {
            continueNoBtn.textContent = "No, Thank you";
            continueNoBtn.disabled = false;
          }
        } else {
          // Check again after a short delay
          setTimeout(checkUploadComplete, 500);
        }
      };

      setTimeout(checkUploadComplete, 500);
    } else {
      // Hide upload indicator if no uploads pending
      if (uploadIndicator) {
        uploadIndicator.style.display = "none";
      }
    }

    // Re-enable buttons when modal is shown
    this.enableButtons();
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

  showThankYouModal(message = "Thank you for your time!") {
    // Clear any consent timers
    if (this.consentTimer) {
      clearTimeout(this.consentTimer);
    }
    if (this.sessionConsentTimer) {
      clearTimeout(this.sessionConsentTimer);
    }

    // Reset all consent states immediately
    this.hasConsent = false;
    this.hasRecordingConsent = false;

    // Get the thank you modal elements
    const modal = document.getElementById("thank-you-modal");
    const messageElement = document.getElementById("thank-you-message");
    const countdownElement = document.getElementById("thank-you-countdown");
    const refreshBtn = document.getElementById("thank-you-refresh-btn");

    if (!modal) {
      console.error("Thank you modal not found in HTML");
      // Fallback to the old method
      this.showThankYouAndExit();
      return;
    }

    // Set the custom message
    if (messageElement) {
      messageElement.textContent = message;
    }

    // Show the modal
    modal.style.display = "block";

    // Set up refresh button if it exists
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        window.location.reload();
      };
    }

    // Start countdown - 5 seconds for consent decline
    let countdown = 5;
    if (countdownElement) {
      countdownElement.textContent = `Returning to start in ${countdown} seconds...`;
    }

    const timer = setInterval(() => {
      countdown--;
      if (countdownElement) {
        countdownElement.textContent = `Returning to start in ${countdown} seconds...`;
      }

      if (countdown <= 0) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);
  }

  showThankYouAndExit() {
    // Clear any consent timers
    if (this.consentTimer) {
      clearTimeout(this.consentTimer);
    }
    if (this.sessionConsentTimer) {
      clearTimeout(this.sessionConsentTimer);
    }

    // Reset all consent states immediately
    this.hasConsent = false;
    this.hasRecordingConsent = false;

    // Show thank you message with countdown
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; color: #fff; font-family: Arial, sans-serif;">
        <div>
          <h2 style="margin-bottom: 30px; font-size: 2rem;">Thank you for your time</h2>
          <p id="countdown" style="font-size: 1.2rem; color: #ccc; margin-bottom: 20px;">Returning to home screen in 5 seconds...</p>
          <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin: 20px auto; overflow: hidden;">
            <div id="progress-bar" style="width: 100%; height: 100%; background: #fff; border-radius: 2px; transition: width 0.1s linear;"></div>
          </div>
          <button id="new-user-btn" style="
            background: #fff;
            color: #000;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.2s ease;
            margin-top: 20px;
          ">I'm a new user - Start now</button>
        </div>
      </div>
    `;

    // Add new user button functionality
    document.getElementById("new-user-btn").onclick = () => {
      window.location.reload();
    };

    // Auto-refresh after 5 seconds with countdown
    let countdown = 5;
    const countdownElement = document.getElementById("countdown");
    const progressBar = document.getElementById("progress-bar");

    const timer = setInterval(() => {
      countdown--;
      countdownElement.textContent = `Returning to home screen in ${countdown} seconds...`;

      // Update progress bar
      const progress = (countdown / 5) * 100;
      progressBar.style.width = `${progress}%`;

      if (countdown <= 0) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);
  }

  startSessionConsentTimer() {
    // Clear any existing session timer
    if (this.sessionConsentTimer) {
      clearTimeout(this.sessionConsentTimer);
    }

    // Set timer for 30 seconds (shorter session consent window)
    this.sessionConsentTimer = setTimeout(() => {
      this.hasConsent = false;
      this.hasRecordingConsent = false;
      console.log("Session consent expired after 30 seconds of inactivity.");
      this.showConsentExpiredNotice();
    }, 30 * 1000); // 30 seconds in milliseconds
  }

  startInactivityTimer() {
    // Clear any existing inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Set timer for 30 seconds of inactivity
    this.inactivityTimer = setTimeout(() => {
      this.hasConsent = false;
      this.hasRecordingConsent = false;
      console.log("Consent expired due to inactivity.");
      this.showConsentExpiredNotice();
    }, 30 * 1000); // 30 seconds in milliseconds
  }

  resetInactivityTimer() {
    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Only start new timer if we have consent
    if (this.hasConsent) {
      this.startInactivityTimer();
    }
  }

  showConsentExpiredNotice() {
    // Show a subtle notice that consent has expired
    this.showStatus("New consent required for next user", 3000);

    // Add a subtle visual indicator
    const statusDisplay = document.getElementById("status-display");
    if (statusDisplay) {
      statusDisplay.style.backgroundColor = "rgba(255, 255, 0, 0.1)";
      statusDisplay.style.border = "1px solid rgba(255, 255, 0, 0.3)";
      statusDisplay.style.color = "white"; // Ensure text is white

      // Reset styling after 3 seconds
      setTimeout(() => {
        statusDisplay.style.backgroundColor = "";
        statusDisplay.style.border = "";
        statusDisplay.style.color = ""; // Reset text color
      }, 3000);
    }
  }

  disableButtons() {
    const recordBtn = document.getElementById("main-record-btn");
    const skipBtn = document.getElementById("skip-question-btn");

    if (recordBtn) {
      recordBtn.disabled = true;
      recordBtn.style.opacity = "0.5";
      recordBtn.style.cursor = "not-allowed";
    }

    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.style.opacity = "0.5";
      skipBtn.style.cursor = "not-allowed";
    }
  }

  enableButtons() {
    const recordBtn = document.getElementById("main-record-btn");
    const skipBtn = document.getElementById("skip-question-btn");

    if (recordBtn) {
      recordBtn.disabled = false;
      recordBtn.style.opacity = "1";
      recordBtn.style.cursor = "pointer";
    }

    if (skipBtn) {
      skipBtn.disabled = false;
      skipBtn.style.opacity = "1";
      skipBtn.style.cursor = "pointer";
    }
  }

  resetModalScroll() {
    const modal = document.getElementById("gdpr-modal");
    const modalContent = modal.querySelector(".modal-content");

    if (modalContent) {
      modalContent.scrollTop = 0;
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
