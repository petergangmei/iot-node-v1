#!/bin/bash

# Exit immediately if any command fails
set -e

# Define project and server
PROJECT_NAME="iot"
SERVER_NAME="iot.ruangmei.com"

# Default Node.js app port
APP_PORT=3000

echo "🔧 Updating package list..."
sudo apt update

echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

sudo npm install -g pm2

echo "📦 Installing Nginx..."
sudo apt install -y nginx

echo "🚀 Starting and enabling Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ Nginx is: $(sudo systemctl is-active nginx)"

echo "📝 Copying Nginx configuration file..."
# Copy the nginx.conf file to sites-available
sudo cp "$(dirname "$0")/nginx.conf" "/etc/nginx/sites-available/$PROJECT_NAME"

echo "🔗 Enabling $PROJECT_NAME site..."
sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/

echo "⚙️ Testing Nginx configuration..."
sudo nginx -t

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "🚫 Disabling default Nginx site..."
sudo rm -f /etc/nginx/sites-enabled/default

echo "✅ Setup complete. Node.js and Nginx are configured for $PROJECT_NAME at http://$SERVER_NAME/"
