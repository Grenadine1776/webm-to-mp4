#!/bin/bash

echo "Installing WebM to MP4 Converter..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    echo
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not available."
    echo "Please make sure Node.js is properly installed."
    echo
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo

echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo
    echo "Error: Failed to install dependencies."
    echo "Please check your internet connection and try again."
    echo
    exit 1
fi

echo
echo "Installation completed successfully!"
echo
echo "To start the application, run: npm start"
echo "To build the application, run: npm run build"
echo
