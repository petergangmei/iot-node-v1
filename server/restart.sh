#!/bin/bash

# Exit immediately if any command fails
set -e

# Prompt for project name and server name
read -p "📁 Project name (e.g. hotel-api): " PROJECT_NAME

echo "🔄 Restarting $PROJECT_NAME..."
pm2 restart $PROJECT_NAME

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx