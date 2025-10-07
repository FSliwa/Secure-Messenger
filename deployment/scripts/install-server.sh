#!/bin/bash

# ============================================
# Server Installation Script
# Secure-Messenger v1.0.0
# For Ubuntu 24.04 LTS
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "================================================"
log "Secure-Messenger Server Installation"
log "================================================"

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
log "Installing required packages..."
apt install -y \
    curl \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop \
    iotop \
    nethogs

# Install Docker
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    usermod -aG docker $SUDO_USER || true
else
    log "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose already installed"
fi

# Install Node.js 20
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    log "Node.js $(node -v) already installed"
fi

# Configure firewall
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
log "Configuring fail2ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
log "Creating application directory..."
mkdir -p /opt/secure-messenger
mkdir -p /var/log/secure-messenger
chown -R $SUDO_USER:$SUDO_USER /opt/secure-messenger
chown -R $SUDO_USER:$SUDO_USER /var/log/secure-messenger

# Create systemd service
log "Creating systemd service..."
cat > /etc/systemd/system/secure-messenger.service << EOF
[Unit]
Description=Secure Messenger Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=/opt/secure-messenger
ExecStart=/usr/local/bin/docker-compose -f deployment/docker/docker-compose.production.yml up
ExecStop=/usr/local/bin/docker-compose -f deployment/docker/docker-compose.production.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Create nginx site config
log "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/secure-messenger << 'EOF'
server {
    listen 80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL will be configured by certbot
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/secure-messenger /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/secure-messenger << EOF
/var/log/secure-messenger/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $SUDO_USER adm
    sharedscripts
    postrotate
        docker-compose -f /opt/secure-messenger/deployment/docker/docker-compose.production.yml kill -s USR1
    endscript
}
EOF

# System optimizations
log "Applying system optimizations..."
cat >> /etc/sysctl.conf << EOF

# Secure Messenger Optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.core.netdev_max_backlog = 65535
fs.file-max = 65535
EOF

sysctl -p

# Create deployment user
log "Setting up deployment..."
if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    usermod -aG sudo deploy
fi

log "================================================"
log "✅ Server installation completed!"
log "================================================"
log ""
log "Next steps:"
log "1. Clone your repository to /opt/secure-messenger"
log "   cd /opt/secure-messenger"
log "   git clone https://github.com/FSliwa/Secure-Messenger.git ."
log ""
log "2. Configure environment variables"
log "   cp env.production.example .env.production"
log "   nano .env.production"
log ""
log "3. Set up SSL certificate"
log "   certbot --nginx -d your-domain.com"
log ""
log "4. Run deployment"
log "   ./deployment/scripts/deploy.sh"
log ""
log "5. Start the service"
log "   systemctl start secure-messenger"
log "   systemctl enable secure-messenger"
log ""
log "Server Information:"
log "- IP: $(curl -s https://api.ipify.org)"
log "- OS: $(lsb_release -d | cut -f2)"
log "- Docker: $(docker --version)"
log "- Node.js: $(node --version)"
log ""
log "Security:"
log "- Firewall: ✅ Enabled (UFW)"
log "- Fail2ban: ✅ Active"
log "- SSL: ⚠️  Configure with certbot"
log ""
