# Monitoring & Observability Guide

## Overview

This guide covers monitoring, logging, and observability for the Secure-Messenger application in production.

---

## 🎯 Key Metrics to Monitor

### 1. Application Metrics
- **Response Time**: Average, P95, P99
- **Request Rate**: Requests per second
- **Error Rate**: 4xx and 5xx errors
- **Success Rate**: Successful requests percentage
- **Active Users**: Concurrent users
- **Message Throughput**: Messages sent/received per minute

### 2. Infrastructure Metrics
- **CPU Usage**: Per container and host
- **Memory Usage**: RAM utilization
- **Disk I/O**: Read/write operations
- **Network I/O**: Bandwidth usage
- **Container Health**: Running/stopped containers
- **Load Average**: System load

### 3. Business Metrics
- **User Registrations**: New users per day
- **User Engagement**: Daily active users (DAU)
- **Message Volume**: Total messages sent
- **File Uploads**: Number and size
- **Feature Usage**: Biometric auth, 2FA adoption
- **Session Duration**: Average session length

---

## 📊 Monitoring Setup

### 1. Application Monitoring Script

The built-in monitoring script tracks:
```bash
# Start monitoring
npm run monitor

# Output includes:
# - Health status
# - Response times
# - CPU/Memory usage
# - System uptime
```

### 2. Docker Monitoring

```bash
# Real-time container stats
docker stats

# Container logs
docker logs -f secure-messenger-app

# Container health
docker ps --filter "health=healthy"
```

### 3. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# CPU and Memory
htop

# Disk I/O
iotop

# Network usage
nethogs

# System resources
vmstat 1

# Disk usage
df -h
watch -n 1 df -h
```

---

## 📝 Logging Strategy

### 1. Log Locations

```bash
/var/log/secure-messenger/
├── deploy.log          # Deployment logs
├── rollback.log        # Rollback operations
├── backup.log          # Backup operations
├── app.log             # Application logs
└── security.log        # Security events

/var/log/nginx/
├── access.log          # HTTP access logs
└── error.log           # Nginx errors
```

### 2. Log Rotation

Create `/etc/logrotate.d/secure-messenger`:
```
/var/log/secure-messenger/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### 3. Centralized Logging (ELK Stack)

```bash
# Install Elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
sudo apt install elasticsearch

# Install Logstash
sudo apt install logstash

# Install Kibana
sudo apt install kibana

# Configure Logstash
cat > /etc/logstash/conf.d/secure-messenger.conf << EOF
input {
  file {
    path => "/var/log/secure-messenger/*.log"
    start_position => "beginning"
  }
}

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "secure-messenger-%{+YYYY.MM.dd}"
  }
}
EOF
```

---

## 🔍 Health Checks

### 1. Automated Health Checks

```bash
# Run health check
npm run health-check

# Cron job for automated checks
crontab -e
# Add:
*/5 * * * * /opt/secure-messenger/deployment/scripts/health-check.sh
```

### 2. Custom Health Endpoints

- `/health` - Basic health check
- `/health/detailed` - Detailed system status
- `/metrics` - Prometheus metrics

### 3. Health Check Script

```javascript
// Custom health check implementation
async function detailedHealthCheck() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
    memory: checkMemory(),
    disk: checkDisk()
  };
  
  return {
    status: Object.values(checks).every(c => c.healthy) ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
}
```

---

## 📈 Metrics Collection

### 1. Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'secure-messenger'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboards

Import dashboards for:
- Application metrics
- Docker containers
- Nginx
- System resources

### 3. Custom Metrics

```javascript
// Expose custom metrics
const promClient = require('prom-client');

// Message counter
const messageCounter = new promClient.Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent'
});

// Active users gauge
const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

// Response time histogram
const responseTime = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latencies',
  buckets: [0.1, 0.5, 1, 2, 5]
});
```

---

## 🚨 Alerting

### 1. Alert Rules

```yaml
# High CPU usage
- alert: HighCPUUsage
  expr: cpu_usage > 80
  for: 5m
  annotations:
    summary: "High CPU usage detected"
    description: "CPU usage is above 80% for 5 minutes"

# High memory usage
- alert: HighMemoryUsage
  expr: memory_usage > 85
  for: 5m
  annotations:
    summary: "High memory usage detected"
    description: "Memory usage is above 85% for 5 minutes"

# Application down
- alert: ApplicationDown
  expr: up == 0
  for: 1m
  annotations:
    summary: "Application is down"
    description: "The application has been down for 1 minute"
```

### 2. Notification Channels

- Email alerts
- Slack notifications
- PagerDuty integration
- SMS alerts (critical only)

### 3. Alert Configuration

```javascript
// Alert configuration
const alertConfig = {
  email: {
    enabled: true,
    recipients: ['ops@secure-messenger.com'],
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },
  slack: {
    enabled: true,
    webhook: process.env.SLACK_WEBHOOK,
    channel: '#alerts',
    username: 'Monitoring Bot'
  }
};
```

---

## 📊 Dashboards

### 1. Application Dashboard
- Request rate
- Response times
- Error rate
- Active users
- Message throughput
- Feature usage

### 2. Infrastructure Dashboard
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Container status
- System load

### 3. Business Dashboard
- User growth
- Engagement metrics
- Feature adoption
- Performance trends
- Error trends
- SLA compliance

---

## 🔧 Troubleshooting

### 1. Common Issues

**High CPU Usage**
```bash
# Find CPU-intensive processes
top -c
ps aux --sort=-%cpu | head

# Check container CPU
docker stats --no-stream
```

**Memory Leaks**
```bash
# Monitor memory usage
watch -n 1 free -h
vmstat 1

# Check for memory leaks
valgrind --leak-check=full node app.js
```

**Slow Response Times**
```bash
# Check network latency
ping -c 10 secure-messenger.com
traceroute secure-messenger.com

# Check database queries
# Monitor slow queries in Supabase dashboard
```

### 2. Debug Commands

```bash
# Application logs
tail -f /var/log/secure-messenger/app.log | grep ERROR

# System logs
journalctl -u docker -f
dmesg | tail

# Network connections
netstat -tulpn
ss -tulpn

# Process list
ps aux | grep node
pstree -p
```

### 3. Performance Profiling

```bash
# Node.js profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --expose-gc --inspect app.js

# CPU profiling
perf record -F 99 -p $(pgrep node)
perf report
```

---

## 📅 Maintenance Schedule

### Daily
- Review error logs
- Check disk space
- Monitor alerts
- Verify backups

### Weekly
- Security scans
- Performance review
- Update monitoring rules
- Test alerts

### Monthly
- Capacity planning
- Trend analysis
- Documentation updates
- Tool updates

### Quarterly
- Architecture review
- Monitoring strategy review
- SLA compliance check
- Disaster recovery test

---

## 🛠️ Tools and Resources

### Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log management
- **New Relic**: APM
- **Datadog**: Full-stack monitoring
- **Sentry**: Error tracking

### Performance Tools
- **Apache Bench**: Load testing
- **JMeter**: Performance testing
- **Lighthouse**: Frontend performance
- **WebPageTest**: Real-world testing

### Security Tools
- **OSSEC**: Host intrusion detection
- **Fail2ban**: Brute force protection
- **ClamAV**: Malware scanning
- **Lynis**: Security auditing

---

## 📞 Escalation Matrix

### Severity Levels

**P1 - Critical**
- Service down
- Data breach
- Complete outage
- Response: Immediate
- Escalation: CTO + Security Team

**P2 - High**
- Degraded performance
- Partial outage
- Feature failure
- Response: 30 minutes
- Escalation: Tech Lead

**P3 - Medium**
- Minor issues
- Non-critical bugs
- Performance degradation
- Response: 2 hours
- Escalation: On-call engineer

**P4 - Low**
- Cosmetic issues
- Documentation
- Minor improvements
- Response: Next business day
- Escalation: Team meeting

---

**Last Updated**: 2025-10-07  
**Version**: 1.0.0  
**Maintainer**: FSliwa
