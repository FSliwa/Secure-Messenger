#!/bin/bash

# ============================================
# Health Check Script
# ============================================

set -euo pipefail

APP_URL="${1:-http://localhost}"
MAX_RETRIES=3
TIMEOUT=5

check_endpoint() {
    local endpoint=$1
    local expected_status=$2
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" \
                   --max-time $TIMEOUT \
                   "${APP_URL}${endpoint}")
    
    if [ "$status" == "$expected_status" ]; then
        echo "✅ $endpoint: OK ($status)"
        return 0
    else
        echo "❌ $endpoint: FAILED (got $status, expected $expected_status)"
        return 1
    fi
}

# Check main endpoints
echo "Running health checks..."
echo "========================"

check_endpoint "/health" "200"
check_endpoint "/" "200"
check_endpoint "/index.html" "200"

# Check Docker containers
echo ""
echo "Docker Container Status:"
echo "========================"
docker ps --filter "name=secure-messenger" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Health check completed"
