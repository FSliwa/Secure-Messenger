# 🔐 Secure-Messenger

> Enterprise-grade encrypted messaging platform with post-quantum cryptography

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/FSliwa/Secure-Messenger)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-A+-brightgreen.svg)](docs/SECURITY.md)

## 🌟 Features

- 🔒 **End-to-End Encryption** - Military-grade encryption for all messages
- 🔑 **Two-Factor Authentication** - Enhanced security with 2FA
- 🤳 **Biometric Authentication** - Fingerprint and Face ID support
- 💬 **Real-time Messaging** - Instant message delivery
- 📁 **Encrypted File Sharing** - Secure file transfers
- 🎤 **Voice Messages** - Encrypted voice recordings
- 🔍 **Message Search** - Search through encrypted messages
- 🌓 **Dark/Light Theme** - Customizable interface
- 📱 **PWA Support** - Install as mobile/desktop app

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/FSliwa/Secure-Messenger.git
cd Secure-Messenger
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 🐳 Docker Development

```bash
# Build and run with Docker Compose
docker-compose -f deployment/docker/docker-compose.yml up

# Stop containers
docker-compose -f deployment/docker/docker-compose.yml down
```

## 🏭 Production Deployment

### Server Requirements

- Ubuntu 24.04 LTS or similar
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Docker & Docker Compose
- Nginx
- SSL certificate

### Deployment Steps

1. **SSH to your server**
```bash
ssh admin@your-server-ip
```

2. **Clone and setup**
```bash
git clone https://github.com/FSliwa/Secure-Messenger.git
cd Secure-Messenger
cp env.production.example .env.production
# Edit .env.production with production values
```

3. **Run deployment**
```bash
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📁 Project Structure

```
secure-messenger/
├── src/               # Source code
│   ├── components/    # React components
│   ├── lib/          # Utilities and helpers
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript types
├── public/           # Static assets
├── deployment/       # Deployment configurations
│   ├── docker/       # Docker files
│   ├── nginx/        # Nginx configuration
│   ├── scripts/      # Deployment scripts
│   └── kubernetes/   # K8s manifests
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── tests/            # Test files
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks
npm run test            # Run tests
npm run deploy:production # Deploy to production
```

### Testing Email Flows

```bash
npm run test:registration   # Test registration flow
npm run test:password-reset # Test password reset
npm run test:email-flows    # Open browser test page
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` for development:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# App
VITE_APP_URL=http://localhost:5173
VITE_ENVIRONMENT=development

# Features
VITE_ENABLE_BIOMETRIC_AUTH=true
VITE_ENABLE_FILE_SHARING=true
```

See `.env.example` for all available options.

### Supabase Setup

1. Create a new Supabase project
2. Run the database migrations
3. Configure authentication settings
4. Set up Row Level Security policies
5. Configure email templates

## 🔐 Security

- All messages are end-to-end encrypted
- Passwords are hashed with bcrypt
- Row Level Security (RLS) on all tables
- Rate limiting on API endpoints
- Security headers configured
- Regular security audits

See [SECURITY.md](docs/SECURITY.md) for details.

## 📊 Monitoring

- Health checks at `/health`
- Prometheus metrics at `/metrics`
- Built-in monitoring scripts
- Docker health checks
- Comprehensive logging

See [MONITORING.md](docs/MONITORING.md) for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

- 📧 Email: support@secure-messenger.com
- 💬 Discord: [Join our server](https://discord.gg/secure-messenger)
- 🐛 Issues: [GitHub Issues](https://github.com/FSliwa/Secure-Messenger/issues)

---

**Made with ❤️ by FSliwa**

[Website](https://secure-messenger.com) • [Documentation](https://docs.secure-messenger.com) • [API](docs/API.md)