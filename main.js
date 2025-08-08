const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

// Set FFmpeg path for different platforms
const isDev = process.env.NODE_ENV === "development";
const platform = process.platform;

// Set FFmpeg binary path - handle both development and packaged app
let ffmpegPath;
if (app.isPackaged) {
  // In packaged app, use the unpacked version
  ffmpegPath = ffmpegInstaller.path.replace("app.asar", "app.asar.unpacked");
} else {
  // In development, use the normal path
  ffmpegPath = ffmpegInstaller.path;
}

console.log("FFmpeg path:", ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    titleBarStyle: "default",
    backgroundColor: "#1a1a1a",
    show: false,
  });

  mainWindow.loadFile("index.html");

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Reduce Electron GPU errors on some Windows setups
app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu'); // uncomment if errors persist

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Global variable to track current conversion process
let currentFFmpegProcess = null;

// IPC handlers for file conversion
ipcMain.handle(
  "convert-file",
  async (event, { inputPath, outputPath, options }) => {
    return new Promise((resolve, reject) => {
      let totalDurationSeconds = 0;

      // Start conversion immediately since we're using frame-based progress
      startConversion();

      function startConversion() {
        let command = ffmpeg(inputPath);

        // Enable verbose logging for debugging
        command = command.addOption("-v", "info"); // or try "debug" for even more verbose

        // Optimize FFmpeg settings to reduce CPU usage
        if (options.quality) {
          // Use faster preset for quality modes
          command = command
            .videoCodec("libx264")
            .addOption("-preset", "fast")
            .addOption("-threads", "2")
            .videoBitrate(options.quality);
        } else {
          // Use ultra-fast preset for default mode to minimize CPU usage
          command = command
            .videoCodec("libx264")
            .addOption("-preset", "ultrafast") // Fastest possible encoding
            .addOption("-threads", "1") // Single thread to reduce CPU load
            .addOption("-crf", "30"); // Higher CRF for faster encoding
        }

        command = command
          .addOption("-movflags", "+faststart") // Optimize for web playback
          .addOption("-tune", "fastdecode"); // Optimize for faster decoding

        if (options.fps) {
          command = command.fps(options.fps);
        }

        if (options.scale && options.scale !== "") {
          command = command.size(options.scale);
        }

        // Audio codec handling
        if (options.audioCodec === "copy") {
          command = command.audioCodec("copy");
        } else if (options.audioCodec && options.audioCodec !== "") {
          command = command.audioCodec(options.audioCodec);
        } else {
          command = command.audioCodec("aac").audioBitrate("128k");
        }

        // Store the command for potential abortion
        currentFFmpegProcess = command;

        let progressTimeout;
        let lastProgressTime = Date.now();

        const parseTimemarkToSeconds = (timemark) => {
          if (!timemark || typeof timemark !== "string") return 0;
          const parts = timemark.split(":");
          if (parts.length < 3) return 0;
          const h = Number(parts[0]) || 0;
          const m = Number(parts[1]) || 0;
          const s = Number(parts[2]) || 0;
          return h * 3600 + m * 60 + s;
        };

        command
          .format("mp4")
          .on("start", (commandLine) => {
            console.log("FFmpeg command: " + commandLine);
            event.sender.send("conversion-started", {
              durationSeconds: totalDurationSeconds,
            });

            // Set up progress timeout to detect stuck conversions
            progressTimeout = setInterval(() => {
              const now = Date.now();
              if (now - lastProgressTime > 30000) {
                // 30 seconds without progress
                console.log("Conversion appears stuck, aborting...");
                if (currentFFmpegProcess) {
                  currentFFmpegProcess.kill("SIGKILL");
                }
              }
            }, 10000); // Check every 10 seconds
          })
          .on("stderr", (stderrLine) => {
            // Only log errors and important info, not every progress line
            if (
              stderrLine.includes("error") ||
              stderrLine.includes("Error") ||
              stderrLine.includes("Duration:")
            ) {
              console.log("FFmpeg:", stderrLine);
            }
          })
          .on("progress", (progress) => {
            lastProgressTime = Date.now();

            // Since we can't reliably get total duration, let's provide useful progress info
            const elapsed = parseTimemarkToSeconds(progress.timemark);

            // Create a progress object with available data
            const validProgress = {
              // Instead of percentage, we'll use frames and time as progress indicators
              frames: progress.frames || 0,
              elapsed: elapsed,
              currentFps: progress.currentFps || 0,
              currentKbps: progress.currentKbps || 0,
              targetSize: progress.targetSize || 0,
              timemark: progress.timemark || "00:00:00",
              // We'll calculate a rough progress estimate based on processing speed
              isProgressing: elapsed > 0 && progress.frames > 0,
            };

            console.log(
              `Progress: ${validProgress.frames} frames, ${validProgress.timemark} processed at ${validProgress.currentFps}fps`
            );
            event.sender.send("conversion-progress", validProgress);
          })
          .on("end", () => {
            console.log("Conversion finished");
            if (progressTimeout) clearInterval(progressTimeout);
            currentFFmpegProcess = null;
            event.sender.send("conversion-complete");
            resolve({ success: true });
          })
          .on("error", (err) => {
            console.error("Conversion error:", err);
            if (progressTimeout) clearInterval(progressTimeout);
            currentFFmpegProcess = null;

            // Don't send error if it was intentionally killed
            if (!err.message.includes("SIGKILL")) {
              event.sender.send("conversion-error", err.message);
            }

            reject({ success: false, error: err.message });
          })
          .save(outputPath);
      }
    });
  }
);

ipcMain.handle("abort-conversion", async () => {
  if (currentFFmpegProcess) {
    try {
      // Try graceful termination first
      currentFFmpegProcess.kill("SIGTERM");

      // If process doesn't exit within 3 seconds, force kill
      setTimeout(() => {
        if (currentFFmpegProcess) {
          console.log("Force killing FFmpeg process...");
          currentFFmpegProcess.kill("SIGKILL");
          currentFFmpegProcess = null;
        }
      }, 3000);

      console.log("Conversion process abort requested");
      return { success: true };
    } catch (error) {
      console.error("Error aborting conversion:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "No active conversion to abort" };
});

ipcMain.handle("select-output-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("get-file-info", async (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
});

ipcMain.handle("create-temp-file", async (event, fileName, buffer) => {
  const os = require("os");
  const tempDir = os.tmpdir();
  const tempPath = path.join(
    tempDir,
    `webm-converter-${Date.now()}-${fileName}`
  );

  try {
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    return tempPath;
  } catch (error) {
    throw new Error(`Failed to create temp file: ${error.message}`);
  }
});

ipcMain.handle("check-file-exists", async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});

ipcMain.handle("open-folder", async (event, folderPath) => {
  try {
    shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
