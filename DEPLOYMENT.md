# 🚀 Production Deployment Package - Secure-Messenger

**Complete Enterprise-Grade Deployment Guide**

---

## 📦 Package Structure

```
secure-messenger-deployment/
├── README.md
├── DEPLOYMENT.md (this file)
├── CHANGELOG.md
├── .env.example
├── .env.production.example
├── package.json
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.production
│   │   ├── docker-compose.yml
│   │   └── docker-compose.production.yml
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── rollback.sh
│   │   ├── health-check.sh
│   │   └── backup.sh
│   └── kubernetes/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── scripts/
│   ├── pre-deploy.js
│   ├── post-deploy.js
│   └── migrate-database.js
└── docs/
    ├── API.md
    ├── SECURITY.md
    └── MONITORING.md
```

---

## 🎯 Phase 1: Pre-Deployment Checklist

### 1.1 Code Quality & Security Audit

```bash
# Run all checks
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run audit:security
```

### 1.2 Environment Configuration

Create `.env.production`:

```bash
cp env.production.example .env.production
# Edit with your actual values
nano .env.production
```

---

## 🚀 Phase 2: Deployment Execution

### 2.1 Server Information

```
Server: Ubuntu Server 24.04 LTS (Noble Numbat)
IP: 5.22.223.49
UUID: 00f9a499-fba6-4a47-b9a9-3e4561102edb
Login: admin
```

### 2.2 Step-by-Step Deployment

```bash
# 1. Connect to server
ssh admin@5.22.223.49

# 2. Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose git nodejs npm nginx certbot python3-certbot-nginx

# 3. Clone repository
git clone https://github.com/FSliwa/Secure-Messenger.git
cd Secure-Messenger

# 4. Checkout production branch
git checkout main  # or create production branch

# 5. Copy environment template
cp env.production.example .env.production

# 6. Edit environment variables
nano .env.production

# 7. Make scripts executable
chmod +x deployment/scripts/*.sh

# 8. Run pre-deployment checks
npm run pre-deploy

# 9. Build application
npm run build:production

# 10. Run deployment script
sudo ./deployment/scripts/deploy.sh

# 11. Verify deployment
./deployment/scripts/health-check.sh https://5.22.223.49

# 12. Monitor logs
docker-compose -f deployment/docker/docker-compose.production.yml logs -f
```

### 2.3 SSL Certificate Setup

```bash
# Get SSL certificate with Let's Encrypt
sudo certbot --nginx -d secure-messenger.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 📊 Phase 3: Post-Deployment Verification

```bash
# Check application status
curl https://5.22.223.49/health

# Check Docker containers
docker ps | grep secure-messenger

# Check logs
tail -f /var/log/secure-messenger/deploy.log

# Run monitoring
npm run monitor
```

---

## 🔄 Phase 4: Maintenance Operations

### 4.1 Update Application

```bash
# Pull latest changes
git pull origin main

# Run deployment
sudo ./deployment/scripts/deploy.sh
```

### 4.2 Rollback if Needed

```bash
# List backups
./deployment/scripts/rollback.sh

# Or rollback to specific backup
./deployment/scripts/rollback.sh /opt/secure-messenger/backups/backup_20251007_141841.tar.gz
```

### 4.3 Create Manual Backup

```bash
./deployment/scripts/backup.sh
```

---

## 🐳 Phase 5: Docker Commands

### Common Docker Operations

```bash
# View running containers
docker ps

# View logs
docker logs secure-messenger-app

# Enter container
docker exec -it secure-messenger-app sh

# Restart containers
docker-compose -f deployment/docker/docker-compose.production.yml restart

# Stop containers
docker-compose -f deployment/docker/docker-compose.production.yml down

# Start containers
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

---

## ☸️ Phase 6: Kubernetes Deployment (Optional)

If using Kubernetes instead of Docker Compose:

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic secure-messenger-secrets \
  --from-literal=supabase-url=$VITE_SUPABASE_URL \
  --from-literal=supabase-anon-key=$VITE_SUPABASE_ANON_KEY \
  -n production

# Apply configurations
kubectl apply -f deployment/kubernetes/deployment.yaml
kubectl apply -f deployment/kubernetes/service.yaml
kubectl apply -f deployment/kubernetes/ingress.yaml

# Check status
kubectl get pods -n production
kubectl get services -n production
```

---

## 📈 Phase 7: Monitoring & Logs

### 7.1 Application Monitoring

```bash
# Start monitoring
npm run monitor

# Check system resources
htop

# Check disk usage
df -h

# Check network connections
netstat -tulpn
```

### 7.2 Log Locations

- Application logs: `/var/log/secure-messenger/`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker logs secure-messenger-app`

---

## 🔐 Phase 8: Security Hardening

### 8.1 Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8.2 Fail2ban Setup

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## ✅ Final Deployment Checklist

```markdown
# Deployment Checklist

## Before Deployment
- [ ] All code reviewed and approved
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Backup strategy in place

## During Deployment
- [ ] Backup current production
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify health checks pass
- [ ] Monitor error logs

## After Deployment
- [ ] Send deployment notification
- [ ] Monitor application metrics
- [ ] Verify user access
- [ ] Update status page
- [ ] Document any issues
```

---

## 🎉 Congratulations!

Your Secure-Messenger application is now deployed to production!

**Server Details:**
- IP: 5.22.223.49
- OS: Ubuntu 24.04 LTS
- Access: ssh admin@5.22.223.49

**Need help?** Contact: FSliwa
**Documentation:** See `/docs` directory
**Support:** GitHub Issues

---

**Generated:** 2025-10-07  
**Version:** 1.0.0  
**Maintainer:** FSliwa
