# SecureChat - End-to-End Encrypted Messaging Platform

A modern, secure messaging application built with React, TypeScript, and Supabase. Features military-grade end-to-end encryption with a zero-knowledge architecture.

## 🔒 Security Features

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

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Encryption**: Web Crypto API (RSA-OAEP)
- **Icons**: Phosphor Icons
- **Animations**: Custom CSS animations

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd securechat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   Follow the detailed setup guide in `SUPABASE_SETUP.md` or:
   
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key from Settings → API
   - Copy `.env.example` to `.env` and add your credentials:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Set up the database**
   - Copy the SQL from `SUPABASE_SETUP.md` 
   - Run it in your Supabase project's SQL Editor
   - This creates all necessary tables, policies, and triggers

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Check connection status**
   - Open the app and go to Dashboard → Database tab
   - The app will test your Supabase connection automatically
   - Follow any setup instructions if needed

## 🛠️ Configuration

### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Then edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Database Schema

The application requires these tables:
- `profiles` - User information and public keys
- `contacts` - User contact relationships  
- `messages` - Encrypted messages
- `conversations` - Group chat support (optional)

See `SUPABASE_SETUP.md` for the complete schema and setup instructions.

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
src/
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   ├── ChatInterface.tsx
│   ├── Dashboard.tsx
│   └── ...
├── lib/                # Utilities and services
│   ├── supabase.ts     # Database client
│   ├── crypto.ts       # Encryption utilities
│   └── utils.ts        # Helper functions
├── App.tsx             # Main application
└── main.tsx           # Entry point
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🛡️ Security Considerations

### Production Deployment

1. **Use HTTPS only** for all connections
2. **Implement key backup** mechanisms
3. **Add key recovery** options
4. **Regular security audits** of dependencies
5. **Monitor for vulnerabilities**

### Known Limitations

- Private keys stored in localStorage (consider more secure alternatives)
- No forward secrecy (keys don't rotate)
- Basic RSA encryption (consider modern alternatives like Signal Protocol)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](https://github.com/your-repo/issues) page
- Review the [Documentation](https://your-docs-url)
- Contact the development team

## 🏗️ Roadmap

- [ ] Group messaging support
- [ ] File sharing with encryption
- [ ] Voice/video calls
- [ ] Mobile app (React Native)
- [ ] Advanced key management
- [ ] Message threading
- [ ] Push notifications

---

**⚠️ Security Notice**: This is a demonstration application. For production use, conduct a thorough security audit and consider additional security measures.