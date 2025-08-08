# WebM to MP4 Converter

A simple, elegant desktop application for converting WebM files to MP4 format with drag-and-drop functionality and customizable parameters.

![WebM to MP4 Converter](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)

## Features

✨ **Drag & Drop Interface** - Simply drag WebM files into the application  
🎨 **Dark Modern UI** - Beautiful, responsive dark theme  
⚙️ **Customizable Parameters** - Adjust quality, frame rate, resolution, and audio codec  
📁 **Batch Processing** - Convert multiple files at once  
📊 **Real-time Progress** - Live conversion progress with detailed information  
🖥️ **Cross-platform** - Works on Windows, macOS, and Linux  
🚀 **No Internet Required** - Runs completely offline once installed

## Screenshots

The application features a sleek dark interface with:

- Intuitive drag-and-drop area
- File management with detailed metadata
- Customizable conversion settings
- Real-time progress tracking
- Modern, responsive design

## Prerequisites

Before installing, make sure you have:

- **Node.js 18 or higher** - [Download from nodejs.org](https://nodejs.org/)
- **FFmpeg** - The application will guide you through FFmpeg setup if needed

## Quick Start

### Option 1: Download Release (Recommended)

1. Go to the [Releases page](../../releases)
2. Download the appropriate installer for your operating system
3. Run the installer and follow the setup wizard
4. Launch the application from your desktop or applications folder

### Option 2: Build from Source

#### Windows

```bash
# Clone the repository
git clone https://github.com/yourusername/webm-to-mp4.git
cd webm-to-mp4

# Run the installation script
install.bat

# Start the application
npm start
```

#### macOS/Linux

```bash
# Clone the repository
git clone https://github.com/yourusername/webm-to-mp4.git
cd webm-to-mp4

# Run the installation script
./install.sh

# Start the application
npm start
```

## Usage

1. **Launch the Application**

   - Run `npm start` or use the installed desktop application

2. **Add Files**

   - Drag and drop WebM files into the drop zone, or
   - Click the drop zone to browse and select files

3. **Configure Settings** (Optional)

   - **Video Quality**: Choose from 500 kbps to 5000 kbps
   - **Frame Rate**: Set to 24, 30, or 60 fps
   - **Resolution**: Keep original or resize to common formats
   - **Audio Codec**: Choose AAC, MP3, or copy original

4. **Select Output Folder**

   - Click "Browse" to choose where converted files will be saved

5. **Start Conversion**
   - Click "Convert Files" to begin the process
   - Monitor progress in real-time
   - Files will be saved to your selected output folder

## Building Executables

Create standalone executables for distribution:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux

# Create installer packages
npm run dist
```

Built files will be in the `dist/` directory.

## Configuration

The application uses sensible defaults, but you can customize:

- **Video Quality**: Ranges from 500 kbps (low) to 5000 kbps (very high)
- **Frame Rates**: 24 fps (cinematic), 30 fps (standard), 60 fps (smooth)
- **Resolutions**: Original, 480p, 720p HD, 1080p Full HD
- **Audio Codecs**: AAC (recommended), MP3 (compatible), Copy (preserve original)

## FFmpeg Setup

The application requires FFmpeg for video conversion. If FFmpeg is not found:

### Windows

1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your system PATH

### macOS

```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Using MacPorts
sudo port install ffmpeg
```

### Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

## Troubleshooting

### Common Issues

**"FFmpeg not found" error**

- Ensure FFmpeg is installed and in your system PATH
- Restart the application after installing FFmpeg

**Files not converting**

- Check that input files are valid WebM format
- Ensure you have write permissions to the output folder
- Try with a different output location

**Application won't start**

- Verify Node.js 18+ is installed: `node --version`
- Run `npm install` to ensure all dependencies are installed
- Check the console for error messages

**Slow conversion**

- Lower the quality setting for faster processing
- Close other resource-intensive applications
- Consider using original resolution instead of upscaling

### Getting Help

If you encounter issues:

1. Check the [Issues page](../../issues) for known problems
2. Create a new issue with:
   - Your operating system and version
   - Node.js version (`node --version`)
   - Error messages or screenshots
   - Steps to reproduce the problem

## Development

Want to contribute or modify the application?

```bash
# Clone and setup
git clone https://github.com/yourusername/webm-to-mp4.git
cd webm-to-mp4
npm install

# Development mode (with auto-reload)
npm start

# Run with developer tools
NODE_ENV=development npm start
```

### Project Structure

```
webm-to-mp4/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── renderer.js      # Frontend logic
├── index.html       # Main UI
├── style.css        # Styling
├── package.json     # Dependencies and scripts
└── assets/          # Icons and resources
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://electronjs.org/) for cross-platform desktop apps
- Uses [FFmpeg](https://ffmpeg.org/) for video processing
- Powered by [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) Node.js wrapper

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ for the open source community**
