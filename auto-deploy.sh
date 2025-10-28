#!/bin/bash

# Automated deployment script
echo "🚀 Starting automated deployment to 5.22.223.49"
echo "================================================"
echo ""
echo "This script will:"
echo "1. Upload deployment package"
echo "2. Install server components"
echo "3. Deploy the application"
echo ""
echo "You will need to enter the server password when prompted."
echo ""

# Upload package and deploy
cat << 'REMOTE_SCRIPT' | ssh admin@5.22.223.49 'cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh && sudo /tmp/deploy.sh'
#!/bin/bash
set -e

echo "📦 Starting server deployment..."

# Create directory
sudo mkdir -p /opt/secure-messenger
sudo chown $USER:$USER /opt/secure-messenger

# Wait for file upload
echo "Waiting for deployment package..."
sleep 2

cd /opt/secure-messenger

# Check if package exists
if [ ! -f /tmp/secure-messenger-deploy.tar.gz ]; then
    echo "❌ Deployment package not found!"
    echo "Please run: scp secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/"
    exit 1
fi

# Extract
echo "📂 Extracting files..."
tar -xzf /tmp/secure-messenger-deploy.tar.gz
rm /tmp/secure-messenger-deploy.tar.gz

# Make scripts executable
chmod +x deployment/scripts/*.sh

# Install server components if needed
if ! command -v docker &> /dev/null; then
    echo "🔧 Installing server components..."
    sudo ./deployment/scripts/install-server.sh
fi

# Setup environment
if [ ! -f .env.production ]; then
    cp env.production.example .env.production
    echo ""
    echo "⚠️  IMPORTANT: Configure your environment!"
    echo "Edit: nano /opt/secure-messenger/.env.production"
fi

echo ""
echo "✅ Deployment prepared!"
echo ""
echo "Next steps:"
echo "1. Configure: nano /opt/secure-messenger/.env.production"
echo "2. Deploy: cd /opt/secure-messenger && sudo ./deployment/scripts/deploy.sh"
echo ""
REMOTE_SCRIPT

# Upload the package in parallel
echo ""
echo "📤 Uploading deployment package..."
scp secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/

echo ""
echo "✅ Deployment package uploaded and extracted!"
echo ""
echo "Now connect to the server to complete setup:"
echo "ssh admin@5.22.223.49"
echo "cd /opt/secure-messenger"
echo "nano .env.production  # Configure your settings"
echo "sudo ./deployment/scripts/deploy.sh  # Run deployment"
