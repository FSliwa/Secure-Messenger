# Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SECURE-MESSENGER                             │
│                    Production Architecture                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Internet Users                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Cloudflare (Optional)                           │
│                  DDoS Protection | CDN | WAF                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Ubuntu Server 24.04 LTS                           │
│                       IP: 5.22.223.49                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        Nginx Reverse Proxy                    │   │
│  │                    SSL/TLS | Rate Limiting                    │   │
│  │                         Ports: 80, 443                        │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                    │
│                                 │ HTTP (internal)                    │
│                                 ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Docker Container                          │   │
│  │                   secure-messenger:latest                     │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │                 React Application                       │ │   │
│  │  │              Static Files (Nginx)                       │ │   │
│  │  │                   Port: 8080                            │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    System Services                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ UFW      │  │ Fail2ban │  │ Systemd  │  │ Logrotate│   │   │
│  │  │ Firewall │  │ IPS      │  │ Service  │  │ Logs     │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS API Calls
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase Cloud                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │   PostgreSQL   │  │  Auth Service  │  │ Realtime       │        │
│  │   Database     │  │  JWT Tokens    │  │ WebSockets     │        │
│  │   + RLS        │  │  2FA/Biometric │  │ Subscriptions  │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │   Storage      │  │  Edge          │  │ Email          │        │
│  │   Files/Media  │  │  Functions     │  │ Service        │        │
│  │   Encrypted    │  │  Serverless    │  │ SMTP           │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Monitoring Stack                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  Health Check  │  │  Monitoring    │  │  Alerting      │        │
│  │  /health       │  │  Scripts       │  │  Email/Slack   │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Data Flow                                    │
├─────────────────────────────────────────────────────────────────────┤
│ 1. User → Nginx → Docker → React App                                │
│ 2. React App → Supabase API (HTTPS)                                 │
│ 3. Supabase → Database Operations (RLS)                              │
│ 4. Real-time: WebSocket → Supabase Realtime                         │
│ 5. Files: Upload → Supabase Storage (Encrypted)                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Security Layers                                 │
├─────────────────────────────────────────────────────────────────────┤
│ • Layer 1: Cloudflare - DDoS, WAF (Optional)                        │
│ • Layer 2: UFW Firewall - Port restrictions                         │
│ • Layer 3: Fail2ban - Brute force protection                        │
│ • Layer 4: Nginx - Rate limiting, security headers                  │
│ • Layer 5: SSL/TLS - Encrypted transport                            │
│ • Layer 6: Application - Input validation, CSRF                     │
│ • Layer 7: Supabase RLS - Database access control                   │
│ • Layer 8: E2E Encryption - Message encryption                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Commands

```bash
# Quick Deploy (from local machine)
./quick-deploy.sh

# Server Installation (on server)
sudo ./deployment/scripts/install-server.sh

# Deploy Application (on server)
./deployment/scripts/deploy.sh

# Health Check
./deployment/scripts/health-check.sh

# Monitoring
npm run monitor

# Rollback
./deployment/scripts/rollback.sh
```

## Port Configuration

- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS (main application)
- **8080**: Internal Docker port
- **22**: SSH (restricted)
