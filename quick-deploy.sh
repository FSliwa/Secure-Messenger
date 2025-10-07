#!/bin/bash

# ============================================
# Quick Deploy Script for Secure-Messenger
# One-line deployment for your server
# ============================================

set -euo pipefail

echo "🚀 Secure-Messenger Quick Deploy"
echo "================================"
echo ""
echo "This script will deploy Secure-Messenger to your server."
echo "Server IP: 5.22.223.49"
echo "Login: admin"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Server details
SERVER_IP="5.22.223.49"
SERVER_USER="admin"

echo ""
echo "📦 Preparing deployment package..."

# Create deployment archive
tar -czf secure-messenger-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env*' \
    .

echo "📤 Uploading to server..."
scp secure-messenger-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "🔧 Connecting to server and deploying..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    echo "📂 Creating application directory..."
    sudo mkdir -p /opt/secure-messenger
    sudo chown $USER:$USER /opt/secure-messenger
    
    echo "📦 Extracting files..."
    cd /opt/secure-messenger
    tar -xzf /tmp/secure-messenger-deploy.tar.gz
    rm /tmp/secure-messenger-deploy.tar.gz
    
    echo "🔧 Running installation script..."
    chmod +x deployment/scripts/install-server.sh
    sudo ./deployment/scripts/install-server.sh
    
    echo "📝 Setting up environment..."
    if [ ! -f .env.production ]; then
        cp env.production.example .env.production
        echo ""
        echo "⚠️  Please edit .env.production with your configuration:"
        echo "nano .env.production"
    fi
    
    echo ""
    echo "✅ Deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.production with your Supabase credentials"
    echo "2. Set up SSL: sudo certbot --nginx -d your-domain.com"
    echo "3. Run: ./deployment/scripts/deploy.sh"
    echo "4. Start service: sudo systemctl start secure-messenger"
ENDSSH

# Cleanup
rm -f secure-messenger-deploy.tar.gz

echo ""
echo "🎉 Deployment package delivered!"
echo ""
echo "SSH to your server to complete setup:"
echo "ssh ${SERVER_USER}@${SERVER_IP}"
echo "cd /opt/secure-messenger"
echo ""
