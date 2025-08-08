class WebMConverter {
  constructor() {
    this.files = [];
    this.isConverting = false;
    this.outputFolder = "";
    this.currentConversion = null;
    this.currentFileDurationSeconds = 0;

    this.initializeElements();
    this.bindEvents();
    this.setupDragAndDrop();
  }

  initializeElements() {
    this.dropZone = document.getElementById("dropZone");
    this.fileInput = document.getElementById("fileInput");
    this.fileList = document.getElementById("fileList");
    this.convertBtn = document.getElementById("convertBtn");
    this.abortBtn = document.getElementById("abortBtn");
    this.openFolderBtn = document.getElementById("openFolderBtn");
    this.clearBtn = document.getElementById("clearBtn");
    this.selectFolderBtn = document.getElementById("selectFolder");
    this.outputPathInput = document.getElementById("outputPath");
    this.conversionPanel = document.getElementById("conversionPanel");
    this.conversionInfo = document.getElementById("conversionInfo");

    // Settings elements
    this.qualitySelect = document.getElementById("quality");
    this.fpsSelect = document.getElementById("fps");
    this.scaleSelect = document.getElementById("scale");
    this.audioCodecSelect = document.getElementById("audioCodec");
  }

  bindEvents() {
    this.dropZone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    this.convertBtn.addEventListener("click", () => this.startConversion());
    this.abortBtn.addEventListener("click", () => this.abortConversion());
    this.openFolderBtn.addEventListener("click", () => this.openOutputFolder());
    this.clearBtn.addEventListener("click", () => this.clearFiles());
    this.selectFolderBtn.addEventListener("click", () =>
      this.selectOutputFolder()
    );

    // IPC event listeners
    window.electronAPI.onConversionStarted(() => {
      this.showConversionPanel();
    });

    window.electronAPI.onConversionProgress((progress) => {
      this.updateProgress(progress);
    });

    window.electronAPI.onConversionComplete(() => {
      this.onConversionComplete();
    });

    window.electronAPI.onConversionError((error) => {
      this.onConversionError(error);
    });
  }

  setupDragAndDrop() {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      this.dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      this.dropZone.addEventListener(eventName, () => this.highlight(), false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.dropZone.addEventListener(
        eventName,
        () => this.unhighlight(),
        false
      );
    });

    this.dropZone.addEventListener("drop", (e) => this.handleDrop(e), false);
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight() {
    this.dropZone.classList.add("drag-over");
  }

  unhighlight() {
    this.dropZone.classList.remove("drag-over");
  }

  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.handleFiles(files);
  }

  async handleFileSelect(e) {
    await this.handleFiles(e.target.files);
    // Reset input so selecting the same file again triggers change
    this.fileInput.value = "";
  }

  async handleFiles(files) {
    const webmFiles = Array.from(files).filter(
      (file) =>
        file.type === "video/webm" || file.name.toLowerCase().endsWith(".webm")
    );

    if (webmFiles.length === 0) {
      this.showNotification("Please select WebM files only.", "error");
      return;
    }

    // Ensure files are fully processed (including metadata) before updating UI
    await Promise.all(webmFiles.map((file) => this.addFile(file)));
    this.updateUI();
  }

  async addFile(file) {
    const fileObj = {
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: this.formatFileSize(file.size),
      path: file.path || null,
      status: "ready",
    };

    // For files without path (both drag-drop and file input), create temp file
    if (!fileObj.path) {
      try {
        console.log("Creating temp file for:", file.name);
        const tempPath = await this.createTempFile(file);
        fileObj.path = tempPath;
        fileObj.isTemp = true;
        console.log("Temp file created at:", tempPath);
      } catch (error) {
        console.error("Failed to create temp file:", error);
        this.showNotification(`Failed to process ${file.name}`, "error");
        return;
      }
    }

    try {
      const metadata = await window.electronAPI.getFileInfo(fileObj.path);
      const durationSeconds = Number(metadata?.format?.duration) || 0;
      const videoStream =
        (metadata?.streams || []).find((s) => s.codec_type === "video") ||
        metadata?.streams?.[0] ||
        {};
      fileObj.durationSeconds = durationSeconds;
      fileObj.duration = this.formatDuration(durationSeconds);
      if (videoStream.width && videoStream.height) {
        fileObj.resolution = `${videoStream.width}x${videoStream.height}`;
      } else {
        fileObj.resolution = "Unknown";
      }
    } catch (error) {
      console.warn("Could not get file metadata:", error);
      fileObj.duration = "Unknown";
      fileObj.durationSeconds = 0;
      fileObj.resolution = "Unknown";
    }

    this.files.push(fileObj);
    console.log("File added successfully:", fileObj.name);
  }

  async createTempFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = new Uint8Array(e.target.result);
        const tempPath = await window.electronAPI.createTempFile(
          file.name,
          buffer
        );
        resolve(tempPath);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  removeFile(fileId) {
    this.files = this.files.filter((file) => file.id !== fileId);
    this.updateUI();
  }

  clearFiles() {
    this.files = [];
    this.updateUI();
    this.hideConversionPanel();
    this.openFolderBtn.style.display = "none";
  }

  updateUI() {
    if (this.files.length === 0) {
      this.fileList.style.display = "none";
      this.convertBtn.disabled = true;
    } else {
      this.fileList.style.display = "block";
      this.convertBtn.disabled = this.isConverting;
      this.renderFileList();
    }
  }

  renderFileList() {
    this.fileList.innerHTML = `
            <h3>Files to Convert (${this.files.length})</h3>
            ${this.files
              .map(
                (file) => `
                <div class="file-item">
                    <div class="file-info">
                        <div class="file-icon">WebM</div>
                        <div class="file-details">
                            <h4>${file.name}</h4>
                            <p>${file.size} • ${file.duration} • ${file.resolution}</p>
                        </div>
                    </div>
                    <button class="remove-file" onclick="converter.removeFile(${file.id})">Remove</button>
                </div>
            `
              )
              .join("")}
        `;
  }

  async selectOutputFolder() {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) {
      this.outputFolder = folder;
      this.outputPathInput.value = folder;
    }
  }

  async openOutputFolder() {
    if (this.outputFolder) {
      await window.electronAPI.openFolder(this.outputFolder);
    }
  }

  getConversionOptions() {
    return {
      quality: this.qualitySelect.value,
      fps: this.fpsSelect.value,
      scale: this.scaleSelect.value,
      audioCodec: this.audioCodecSelect.value,
    };
  }

  async startConversion() {
    if (this.files.length === 0) return;

    if (!this.outputFolder) {
      this.showNotification("Please select an output folder.", "error");
      return;
    }

    this.isConverting = true;
    this.convertBtn.disabled = true;
    this.convertBtn.style.display = "none";
    this.abortBtn.style.display = "inline-block";

    const options = this.getConversionOptions();
    let completedCount = 0;

    try {
      for (let i = 0; i < this.files.length; i++) {
        if (!this.isConverting) break; // Check if aborted

        const file = this.files[i];

        try {
          const outputFileName = file.name.replace(".webm", ".mp4");
          const outputPath = `${this.outputFolder}/${outputFileName}`;

          // Check if output file already exists
          try {
            const fileExists = await window.electronAPI.checkFileExists(
              outputPath
            );
            if (fileExists) {
              const shouldOverwrite = confirm(
                `File "${outputFileName}" already exists in the output folder.\n\nDo you want to overwrite it?`
              );
              if (!shouldOverwrite) {
                this.updateConversionInfo(
                  `Skipped: ${file.name} (file already exists)`
                );
                continue; // Skip this file
              }
            }
          } catch (error) {
            console.log(
              "Could not check if file exists, proceeding with conversion"
            );
          }

          // Store duration for progress computation via timemark if needed
          this.currentFileDurationSeconds = Number(file.durationSeconds) || 0;

          this.updateConversionInfo(
            `Converting: ${file.name} (${i + 1}/${this.files.length})`
          );

          this.currentConversion = window.electronAPI.convertFile(
            file.path,
            outputPath,
            options
          );
          await this.currentConversion;

          if (this.isConverting) {
            // Only count if not aborted
            completedCount++;
            file.status = "completed";
            this.updateConversionInfo(
              `Completed: ${file.name} (${completedCount}/${this.files.length})`
            );
          }
        } catch (error) {
          if (this.isConverting) {
            // Only show error if not aborted
            file.status = "error";
            console.error(`Error converting ${file.name}:`, error);
            this.showNotification(
              `Error converting ${file.name}: ${error.error || error}`,
              "error"
            );
          }
        }
      }
    } finally {
      this.finishConversion(completedCount);
    }
  }

  abortConversion() {
    if (!this.isConverting) return;

    this.isConverting = false;
    this.updateConversionInfo("⏹️ Conversion aborted by user");
    this.showNotification("Conversion process aborted", "info");

    // Kill the current conversion process
    if (this.currentConversion) {
      window.electronAPI.abortConversion();
    }

    this.finishConversion(0);
  }

  finishConversion(completedCount) {
    this.isConverting = false;
    this.currentConversion = null;
    this.convertBtn.disabled = false;
    this.convertBtn.textContent = "Convert Files";
    this.convertBtn.style.display = "inline-block";
    this.abortBtn.style.display = "none";

    if (completedCount > 0) {
      // Show "Open Output Folder" button when files are converted
      this.openFolderBtn.style.display = "inline-block";

      if (completedCount === this.files.length) {
        this.showNotification(
          `Successfully converted ${completedCount} file(s)!`,
          "success"
        );
        this.updateConversionInfo(
          `✅ All ${completedCount} files converted successfully!`
        );
      } else {
        this.updateConversionInfo(
          `⚠️ Converted ${completedCount} out of ${this.files.length} files.`
        );
      }
    }
  }

  showConversionPanel() {
    this.conversionPanel.style.display = "block";
    this.resetProgress();
  }

  hideConversionPanel() {
    this.conversionPanel.style.display = "none";
  }

  updateProgress(progress) {
    // Just show the conversion info without progress bar
    const frames = progress.frames || 0;
    const fps = Math.round(progress.currentFps || 0);
    const kbps = Math.round(progress.currentKbps || 0);
    const timemark = progress.timemark || "00:00:00";

    // Build comprehensive info text
    let infoText = `Processing: ${frames} frames`;

    if (timemark && timemark !== "00:00:00") {
      infoText += ` • ${timemark}`;
    }

    if (fps > 0) {
      infoText += ` • ${fps} fps`;
    }

    if (kbps > 0) {
      infoText += ` • ${kbps} kbps`;
    }

    if (progress.targetSize > 0) {
      const sizeMB = (progress.targetSize / 1024).toFixed(1);
      infoText += ` • ${sizeMB} MB`;
    }

    this.updateConversionInfo(infoText);
  }

  parseTimemarkToSeconds(timemark) {
    if (!timemark || typeof timemark !== "string") return 0;
    const parts = timemark.split(":");
    if (parts.length < 3) return 0;
    const h = Number(parts[0]) || 0;
    const m = Number(parts[1]) || 0;
    const s = Number(parts[2]) || 0; // may include decimals
    return h * 3600 + m * 60 + s;
  }

  resetProgress() {
    // No progress bar to reset anymore
  }

  updateConversionInfo(message) {
    this.conversionInfo.textContent = message;
  }

  onConversionComplete() {
    // Hide conversion panel when all files are done
    this.hideConversionPanel();
  }

  onConversionError(error) {
    this.showNotification(`Conversion error: ${error}`, "error");
  }

  showNotification(message, type = "info") {
    // Create a simple notification system
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "15px 20px",
      borderRadius: "8px",
      color: "white",
      fontWeight: "500",
      zIndex: "1000",
      maxWidth: "400px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      animation: "slideInRight 0.3s ease",
    });

    if (type === "success") {
      notification.style.background =
        "linear-gradient(135deg, #5cb85c, #449d44)";
    } else if (type === "error") {
      notification.style.background =
        "linear-gradient(135deg, #dc3545, #c82333)";
    } else {
      notification.style.background =
        "linear-gradient(135deg, #4a90e2, #357abd)";
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatDuration(seconds) {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}

// Add notification animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the converter when the page loads
const converter = new WebMConverter();
