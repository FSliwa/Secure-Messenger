#!/bin/bash

echo "🚀 FINAL DEPLOYMENT ATTEMPT"
echo "=========================="
echo ""
echo "Server: 5.22.223.49"
echo "User: admin"
echo "Password: MIlik112"
echo ""

# Final connectivity test
echo "🔍 Testing connectivity..."
if ping -c 1 -W 2 5.22.223.49 >/dev/null 2>&1; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable"
    exit 1
fi

# Try SSH
echo "🔐 Attempting SSH connection..."
echo "If prompted for password, enter: MIlik112"
echo ""

ssh -v -o ConnectTimeout=30 -o StrictHostKeyChecking=no admin@5.22.223.49 "echo 'SSH WORKS!'" || {
    echo ""
    echo "❌ SSH CONNECTION FAILED"
    echo ""
    echo "📋 TO FIX THIS:"
    echo "1. Login to your VPS web console"
    echo "2. Run: sudo ufw disable"
    echo "3. Run: sudo systemctl restart ssh"
    echo "4. Try this script again"
    echo ""
    echo "OR use alternative deployment:"
    echo "- Deploy locally: docker-compose up"
    echo "- Deploy to Vercel: npx vercel"
    echo "- Clone on server: git clone https://github.com/FSliwa/Secure-Messenger"
    exit 1
}

echo "✅ SSH is working! Proceeding with deployment..."
scp secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/
ssh admin@5.22.223.49 "cd /tmp && tar -xzf secure-messenger-deploy.tar.gz server-deploy.sh && chmod +x server-deploy.sh && sudo ./server-deploy.sh"
