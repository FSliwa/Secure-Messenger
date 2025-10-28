#!/bin/bash

# ============================================
# Secure-Messenger Production Deployment
# Version: 1.0.0
# Author: FSliwa
# Date: 2025-10-07
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="secure-messenger"
DEPLOY_DIR="/opt/${PROJECT_NAME}"
BACKUP_DIR="/opt/${PROJECT_NAME}/backups"
LOG_FILE="/var/log/${PROJECT_NAME}/deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
    
    # Check required commands
    for cmd in docker docker-compose git node npm; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is not installed"
        fi
    done
    
    # Check environment file
    if [ ! -f ".env.production" ]; then
        error ".env.production file not found"
    fi
    
    # Validate environment variables
    source .env.production
    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "VITE_APP_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "✅ Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if docker ps | grep -q "${PROJECT_NAME}"; then
        # Backup current deployment
        BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
        tar -czf "$BACKUP_FILE" \
            -C "$DEPLOY_DIR" \
            --exclude='node_modules' \
            --exclude='dist' \
            .
        
        log "✅ Backup created: $BACKUP_FILE"
    else
        warn "No running containers found, skipping backup"
    fi
}

# Build application
build_app() {
    log "Building application..."
    
    # Install dependencies
    npm ci --production
    
    # Run tests
    log "Running tests..."
    npm run test || error "Tests failed"
    
    # Build production bundle
    log "Building production bundle..."
    npm run build || error "Build failed"
    
    # Verify build
    if [ ! -d "dist" ]; then
        error "Build directory not found"
    fi
    
    log "✅ Application built successfully"
}

# Build Docker image
build_docker() {
    log "Building Docker image..."
    
    docker build \
        -f deployment/docker/Dockerfile.production \
        -t ${PROJECT_NAME}:${TIMESTAMP} \
        -t ${PROJECT_NAME}:latest \
        . || error "Docker build failed"
    
    log "✅ Docker image built: ${PROJECT_NAME}:${TIMESTAMP}"
}

# Deploy application
deploy() {
    log "Deploying application..."
    
    # Stop existing containers
    if docker ps | grep -q "${PROJECT_NAME}"; then
        log "Stopping existing containers..."
        docker-compose -f deployment/docker/docker-compose.production.yml down
    fi
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f deployment/docker/docker-compose.production.yml up -d
    
    # Wait for containers to be healthy
    log "Waiting for containers to be healthy..."
    sleep 10
    
    # Check container health
    if docker ps | grep -q "${PROJECT_NAME}"; then
        log "✅ Containers started successfully"
    else
        error "Containers failed to start"
    fi
}

# Run database migrations
migrate_database() {
    log "Running database migrations..."
    
    node scripts/migrate-database.js || error "Database migration failed"
    
    log "✅ Database migrations completed"
}

# Health check
health_check() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost/health > /dev/null; then
            log "✅ Application is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    error "Application failed health checks"
}

# Post-deployment tasks
post_deploy() {
    log "Running post-deployment tasks..."
    
    # Clear old Docker images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    # Clear old backups (keep last 10)
    log "Cleaning up old backups..."
    cd "$BACKUP_DIR"
    ls -t backup_*.tar.gz | tail -n +11 | xargs -r rm --
    
    # Log deployment info
    cat >> "$LOG_FILE" << EOF

========================================
Deployment completed successfully
========================================
Timestamp: $(date)
Version: ${TIMESTAMP}
User: $(whoami)
========================================

EOF
    
    log "✅ Post-deployment tasks completed"
}

# Main deployment flow
main() {
    log "================================================"
    log "Starting Secure-Messenger Deployment"
    log "================================================"
    
    pre_deploy_checks
    create_backup
    build_app
    build_docker
    deploy
    migrate_database
    health_check
    post_deploy
    
    log "================================================"
    log "🎉 Deployment completed successfully!"
    log "================================================"
    log "Application URL: ${VITE_APP_URL}"
    log "Deployed version: ${TIMESTAMP}"
    log "Log file: ${LOG_FILE}"
}

# Run deployment
main "$@"
