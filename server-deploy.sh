#!/bin/bash

# ============================================
# Server Deployment Script
# To be run on the server after upload
# ============================================

set -euo pipefail

echo "🚀 Secure-Messenger Server Deployment"
echo "===================================="
echo ""

# Check if running with sudo access
if ! sudo -n true 2>/dev/null; then 
    echo "⚠️  This script requires sudo privileges"
    echo "Please run: sudo ./server-deploy.sh"
    exit 1
fi

echo "📂 Creating application directory..."
sudo mkdir -p /opt/secure-messenger
sudo chown $USER:$USER /opt/secure-messenger

echo "📦 Extracting deployment package..."
cd /opt/secure-messenger
tar -xzf /tmp/secure-messenger-deploy.tar.gz
rm /tmp/secure-messenger-deploy.tar.gz

echo "🔧 Setting up permissions..."
chmod +x deployment/scripts/*.sh
chmod +x quick-deploy.sh

echo "📋 Checking system requirements..."
# Check for required commands
for cmd in docker docker-compose git node npm; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ $cmd is not installed"
        echo "Running installation script..."
        sudo ./deployment/scripts/install-server.sh
        break
    fi
done

echo "📝 Setting up environment..."
if [ ! -f .env.production ]; then
    cp env.production.example .env.production
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.production with your configuration:"
    echo ""
    echo "Required settings:"
    echo "- VITE_SUPABASE_URL"
    echo "- VITE_SUPABASE_ANON_KEY"
    echo "- VITE_APP_URL"
    echo ""
    echo "Run: nano .env.production"
    echo ""
fi

echo "✅ Deployment package ready!"
echo ""
echo "Next steps:"
echo "1. Edit configuration: nano /opt/secure-messenger/.env.production"
echo "2. Run deployment: cd /opt/secure-messenger && sudo ./deployment/scripts/deploy.sh"
echo "3. Set up SSL: sudo certbot --nginx -d your-domain.com"
echo ""
echo "Current location: /opt/secure-messenger"
echo ""
