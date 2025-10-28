#!/bin/bash

# ============================================
# Secure-Messenger Rollback Script
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_NAME="secure-messenger"
BACKUP_DIR="/opt/${PROJECT_NAME}/backups"
LOG_FILE="/var/log/${PROJECT_NAME}/rollback.log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# List available backups
list_backups() {
    log "Available backups:"
    ls -lht "$BACKUP_DIR"/backup_*.tar.gz | head -10
}

# Rollback to specific backup
rollback() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Rolling back to: $backup_file"
    
    # Stop current containers
    docker-compose -f deployment/docker/docker-compose.production.yml down
    
    # Restore backup
    tar -xzf "$backup_file" -C /opt/${PROJECT_NAME}/
    
    # Restart containers
    docker-compose -f deployment/docker/docker-compose.production.yml up -d
    
    log "✅ Rollback completed"
}

# Main
if [ $# -eq 0 ]; then
    list_backups
    echo ""
    read -p "Enter backup filename to rollback: " backup_name
    rollback "${BACKUP_DIR}/${backup_name}"
else
    rollback "$1"
fi
