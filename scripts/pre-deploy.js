/**
 * Pre-deployment Script
 * Runs checks before deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = {
  passed: 0,
  failed: 0
};

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

function runCheck(name, fn) {
  try {
    log(`🔍 Checking ${name}...`);
    fn();
    log(`✅ ${name} passed`, 'success');
    checks.passed++;
  } catch (error) {
    log(`❌ ${name} failed: ${error.message}`, 'error');
    checks.failed++;
  }
}

// Check Node version
runCheck('Node.js version', () => {
  const nodeVersion = process.version;
  const requiredVersion = 'v20.0.0';
  if (nodeVersion < requiredVersion) {
    throw new Error(`Node.js ${requiredVersion} or higher is required (current: ${nodeVersion})`);
  }
});

// Check environment file
runCheck('Environment configuration', () => {
  const envFile = path.join(__dirname, '..', '.env.production');
  if (!fs.existsSync(envFile)) {
    throw new Error('.env.production file not found');
  }
  
  // Check required variables
  const envContent = fs.readFileSync(envFile, 'utf8');
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_URL'
  ];
  
  for (const key of required) {
    if (!envContent.includes(`${key}=`)) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
});

// Check dependencies
runCheck('Dependencies', () => {
  execSync('npm audit --production', { stdio: 'ignore' });
});

// Check TypeScript
runCheck('TypeScript compilation', () => {
  execSync('npm run type-check', { stdio: 'ignore' });
});

// Check ESLint
runCheck('Code quality (ESLint)', () => {
  execSync('npm run lint', { stdio: 'ignore' });
});

// Check build
runCheck('Production build', () => {
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    log('Building application...', 'warning');
    execSync('npm run build', { stdio: 'inherit' });
  }
});

// Check Docker
runCheck('Docker', () => {
  execSync('docker --version', { stdio: 'ignore' });
  execSync('docker-compose --version', { stdio: 'ignore' });
});

// Summary
console.log('\n========================================');
console.log('Pre-deployment Check Summary:');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log('========================================\n');

if (checks.failed > 0) {
  log('❌ Pre-deployment checks failed. Please fix the issues before deploying.', 'error');
  process.exit(1);
} else {
  log('✅ All pre-deployment checks passed! Ready to deploy.', 'success');
}
