/**
 * Post-deployment Script
 * Runs after deployment to verify and notify
 */

import http from 'http';
import https from 'https';
import { execSync } from 'child_process';

const appUrl = process.env.VITE_APP_URL || 'http://localhost';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function checkEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      resolve({
        status: res.statusCode,
        success: res.statusCode === 200
      });
    }).on('error', (err) => {
      resolve({
        status: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function runPostDeployChecks() {
  log('🚀 Running post-deployment checks...', 'info');
  
  const checks = [];
  
  // Check health endpoint
  log('Checking health endpoint...');
  const healthCheck = await checkEndpoint(`${appUrl}/health`);
  checks.push({
    name: 'Health endpoint',
    ...healthCheck
  });
  
  // Check main page
  log('Checking main page...');
  const mainCheck = await checkEndpoint(appUrl);
  checks.push({
    name: 'Main page',
    ...mainCheck
  });
  
  // Check Docker containers
  log('Checking Docker containers...');
  try {
    const containers = execSync('docker ps --filter "name=secure-messenger" --format "{{.Names}}:{{.Status}}"', { encoding: 'utf8' });
    const runningContainers = containers.trim().split('\n').filter(c => c);
    checks.push({
      name: 'Docker containers',
      success: runningContainers.length > 0,
      containers: runningContainers
    });
  } catch (error) {
    checks.push({
      name: 'Docker containers',
      success: false,
      error: error.message
    });
  }
  
  // Generate deployment report
  console.log('\n========================================');
  console.log('Deployment Verification Report');
  console.log('========================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Application URL: ${appUrl}`);
  console.log('\nCheck Results:');
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.success) {
      log(`✅ ${check.name}: OK`, 'success');
      if (check.containers) {
        check.containers.forEach(c => log(`   - ${c}`, 'info'));
      }
    } else {
      log(`❌ ${check.name}: FAILED`, 'error');
      if (check.error) {
        log(`   Error: ${check.error}`, 'error');
      }
      allPassed = false;
    }
  }
  
  console.log('========================================\n');
  
  if (allPassed) {
    log('✅ Deployment verified successfully!', 'success');
    
    // Create deployment notification
    const notification = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      url: appUrl,
      status: 'success',
      checks: checks.length,
      passed: checks.filter(c => c.success).length
    };
    
    console.log('\n📧 Deployment Notification:');
    console.log(JSON.stringify(notification, null, 2));
    
  } else {
    log('❌ Deployment verification failed!', 'error');
    process.exit(1);
  }
}

// Run post-deployment checks
runPostDeployChecks().catch(error => {
  log(`❌ Post-deployment script error: ${error.message}`, 'error');
  process.exit(1);
});
