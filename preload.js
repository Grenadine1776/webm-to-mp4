const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  convertFile: (inputPath, outputPath, options) =>
    ipcRenderer.invoke("convert-file", { inputPath, outputPath, options }),

  selectOutputFolder: () => ipcRenderer.invoke("select-output-folder"),

  getFileInfo: (filePath) => ipcRenderer.invoke("get-file-info", filePath),

  onConversionStarted: (callback) =>
    ipcRenderer.on("conversion-started", callback),

  onConversionProgress: (callback) =>
    ipcRenderer.on("conversion-progress", (event, progress) =>
      callback(progress)
    ),

  onConversionComplete: (callback) =>
    ipcRenderer.on("conversion-complete", callback),

  onConversionError: (callback) =>
    ipcRenderer.on("conversion-error", (event, error) => callback(error)),

  createTempFile: (fileName, buffer) =>
    ipcRenderer.invoke("create-temp-file", fileName, buffer),

  abortConversion: () => ipcRenderer.invoke("abort-conversion"),

  checkFileExists: (filePath) =>
    ipcRenderer.invoke("check-file-exists", filePath),

  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),
});
