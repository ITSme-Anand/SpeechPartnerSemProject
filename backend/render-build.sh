#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Upgrade pip
pip install --upgrade pip

# Install CPU-only PyTorch to save bandwidth, build time, and memory on Render
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install application dependencies
pip install --no-cache-dir -r requirements.txt
