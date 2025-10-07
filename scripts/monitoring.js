/**
 * Application Monitoring Script
 * Tracks key metrics and sends alerts
 */

import os from 'os';
import http from 'http';

const config = {
  appUrl: process.env.VITE_APP_URL || 'http://localhost',
  checkInterval: 60000, // 1 minute
  alertThresholds: {
    cpuUsage: 80, // percent
    memoryUsage: 85, // percent
    responseTime: 3000 // ms
  }
};

// Check application health
async function checkHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    http.get(`${config.appUrl}/health`, (res) => {
      const responseTime = Date.now() - startTime;
      
      resolve({
        status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        statusCode: res.statusCode
      });
    }).on('error', (err) => {
      resolve({
        status: 'unhealthy',
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });
  });
}

// Check system resources
function checkResources() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;
  
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;
  
  return {
    cpuUsage: cpuUsage.toFixed(2),
    memUsage: memUsage.toFixed(2),
    loadAverage: os.loadavg()
  };
}

// Main monitoring loop
async function monitor() {
  const health = await checkHealth();
  const resources = checkResources();
  
  const report = {
    timestamp: new Date().toISOString(),
    health,
    resources,
    uptime: os.uptime()
  };
  
  console.log(JSON.stringify(report, null, 2));
  
  // Check thresholds and alert
  if (resources.cpuUsage > config.alertThresholds.cpuUsage) {
    console.error(`⚠️  HIGH CPU USAGE: ${resources.cpuUsage}%`);
  }
  
  if (resources.memUsage > config.alertThresholds.memoryUsage) {
    console.error(`⚠️  HIGH MEMORY USAGE: ${resources.memUsage}%`);
  }
  
  if (health.responseTime > config.alertThresholds.responseTime) {
    console.error(`⚠️  SLOW RESPONSE TIME: ${health.responseTime}ms`);
  }
  
  if (health.status === 'unhealthy') {
    console.error(`🚨 APPLICATION UNHEALTHY: ${health.error || health.statusCode}`);
  }
}

// Start monitoring
console.log('Starting Secure-Messenger monitoring...');
console.log(`Checking ${config.appUrl} every ${config.checkInterval}ms`);

monitor(); // Initial check
setInterval(monitor, config.checkInterval);
