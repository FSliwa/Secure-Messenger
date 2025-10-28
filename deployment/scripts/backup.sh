#!/bin/bash

# ============================================
# Backup Script
# ============================================

set -euo pipefail

PROJECT_NAME="secure-messenger"
BACKUP_DIR="/opt/${PROJECT_NAME}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/${PROJECT_NAME}/backup.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
log "Starting backup..."
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Backup application files
tar -czf "$BACKUP_FILE" \
    -C /opt/${PROJECT_NAME} \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='backups' \
    .

log "✅ Backup created: $BACKUP_FILE"

# Clean old backups (keep last 10)
log "Cleaning old backups..."
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz | tail -n +11 | xargs -r rm --

log "✅ Backup completed successfully"
