# SecureChat - End-to-End Encrypted Messaging Platform

A modern, secure messaging application built with React, TypeScript, and Supabase. Features military-grade end-to-end encryption with a zero-knowledge architecture.

## 🔒 Security Features

- **End-to-End Encryption**: All messages encrypted with RSA-OAEP 2048-bit keys
- **Zero-Knowledge Architecture**: Server cannot read your messages
- **Client-Side Key Generation**: Keys generated and stored locally
- **Real-Time Messaging**: Instant encrypted message delivery
- **Web Crypto API**: Browser-native cryptographic operations

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
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Update `src/lib/supabase.ts` with your credentials:

   ```typescript
   const supabaseUrl = 'YOUR_SUPABASE_URL'
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
   ```

4. **Set up the database**
   - Run the SQL commands from `database-schema.sql` in your Supabase SQL editor
   - This creates all necessary tables and security policies

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🛠️ Configuration

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema

The application requires these tables:
- `profiles` - User information and public keys
- `contacts` - User contact relationships  
- `messages` - Encrypted messages
- `conversations` - Group chat support (optional)

See `database-schema.sql` for the complete schema.

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
2. **Add Contacts**: Find users by email address
3. **Start Chatting**: Send encrypted messages in real-time
4. **Verify Keys**: Check contact key fingerprints for security

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