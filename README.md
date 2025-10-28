# 🔐 Secure-Messenger

> Enterprise-grade encrypted messaging platform with post-quantum cryptography

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/FSliwa/Secure-Messenger)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-A+-brightgreen.svg)](docs/SECURITY.md)

- **End-to-End Encryption**: All messages encrypted with RSA-OAEP 2048-bit keys
- **Zero-Knowledge Architecture**: Server cannot read your messages
- **Client-Side Key Generation**: Keys generated and stored locally
- **Biometric Verification**: Touch ID/Face ID/Windows Hello for sensitive actions
- **Real-Time Messaging**: Instant encrypted message delivery with real-time presence
- **User Presence System**: Real-time status tracking (Online/Away/Offline)
- **Web Crypto API**: Browser-native cryptographic operations
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes
- **Device Trust Management**: Track and manage trusted devices
- **Conversation Password Protection**: Additional encryption layer for sensitive conversations

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

## 🔐 How Encryption Works

1. **Key Generation**: 2048-bit RSA key pairs generated client-side
2. **Message Encryption**: Messages encrypted with recipient's public key
3. **Secure Storage**: Private keys stored locally in browser storage
4. **Zero Knowledge**: Server only stores encrypted content

## 🎯 Features

### Authentication
- ✅ User registration with email verification
- ✅ Secure login/logout
- ✅ Demo mode for testing

### Messaging
- ✅ Real-time encrypted messaging
- ✅ Contact management
- ✅ Message history
- ✅ Typing indicators
- ✅ Read receipts

### Security
- ✅ End-to-end encryption
- ✅ Key fingerprint verification
- ✅ Crypto API feature detection
- ✅ Security status dashboard
- ✅ Biometric verification for sensitive actions
- ✅ Two-factor authentication (2FA/TOTP)
- ✅ Trusted device management
- ✅ Account lockout protection

### UI/UX
- ✅ Responsive design
- ✅ Dark/light theme ready
- ✅ Smooth animations
- ✅ Accessibility support
- ✅ Professional design

## 🧪 Testing

### Connection Test

The app includes a built-in connection test that verifies:
- Supabase database connectivity
- Web Crypto API support
- Authentication functionality

Access the test via the Dashboard → Database tab.

### Demo Mode

The application works in demo mode with mock credentials:
- Any email/password combination works for login
- Messages are encrypted but not persisted
- All features are functional for testing

## 📱 Usage

1. **Sign Up**: Create an account with email verification
2. **Set Up Security**: Enable 2FA and biometric authentication in Security Settings
3. **Add Contacts**: Find users by email address or username
4. **Start Chatting**: Send encrypted messages in real-time
5. **Verify Keys**: Check contact key fingerprints for security
6. **Monitor Presence**: See real-time status (Online/Away/Offline) of your contacts

### User Presence System

SecureChat features an advanced real-time presence system that shows the availability status of users:

- **🟢 Online**: User is active and available for immediate conversation
- **🟡 Away**: User is inactive for more than 5 minutes (may respond with delay)
- **⚪ Offline**: User has logged out or closed the application

The system automatically:
- Updates status based on user activity
- Switches to "Away" after 5 minutes of inactivity
- Sets status to "Offline" when user logs out or closes the app
- Syncs status across all devices in real-time
- Preserves last seen timestamp for offline users

**Technical Details**: See `USER_PRESENCE_SYSTEM.md` for implementation details.
**User Guide**: See `USER_STATUS_GUIDE.md` for end-user documentation.

### Biometric Verification

SecureChat uses biometric authentication (Touch ID, Face ID, Windows Hello) for sensitive actions:

- **Joining Conversations**: Verify identity before joining secure conversations
- **Creating Conversations**: Authenticate when creating new encrypted channels
- **First Messages**: Secure cryptographic key exchange with biometric verification

**Setup**: Go to Security Settings → Biometric tab to register your biometric credentials.

**Requirements**: 
- Supported browser (Chrome 67+, Firefox 60+, Safari 14+, Edge 18+)
- Compatible device with biometric hardware

## 🔧 Development

### Project Structure

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