# SecureChat Pro - Supabase Setup Guide

This guide will help you set up Supabase for your SecureChat Pro application.

## Prerequisites

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project in your Supabase dashboard

## Database Setup

### Step 1: Run the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab
3. Copy the contents of `src/database/schema.sql`
4. Paste it into the SQL Editor and click **Run**

This will create all necessary tables, indexes, and security policies.

### Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings:
- Go to **Settings** → **API**
- Copy the **Project URL** and **anon public** key

### Step 3: Update Supabase Configuration

Open `src/lib/supabase.ts` and verify that the configuration uses your environment variables:

```typescript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project-ref.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'
```

## Authentication Setup

### Enable Email Authentication

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Ensure **Enable email confirmations** is configured according to your needs
3. Set up your email templates if needed

### Configure Site URL (for production)

1. Go to **Authentication** → **Settings**
2. Add your production domain to **Site URL**
3. Add your domain to **Redirect URLs** if using OAuth

## Security Configuration

### Row Level Security (RLS)

The schema includes comprehensive RLS policies that ensure:
- Users can only see their own data
- Messages are only visible to room participants
- Encryption keys are private to each user

### Real-time Subscriptions

The application uses Supabase real-time features for instant messaging. Make sure:
1. Real-time is enabled in your project settings
2. The tables are configured for real-time updates

## Database Tables Overview

### Core Tables

1. **profiles** - User profile information
2. **chat_rooms** - Chat room metadata
3. **chat_room_participants** - Room membership
4. **messages** - Encrypted messages
5. **encryption_keys** - User encryption keys

### Key Features

- **End-to-end encryption** - All messages are encrypted client-side
- **Post-quantum cryptography** - Future-proof encryption algorithms
- **Real-time messaging** - Instant message delivery
- **File sharing** - Secure file uploads and sharing
- **Voice messages** - Audio message support

## Testing the Connection

The application includes built-in connection testing components:
- `SupabaseTest` - Basic connection test
- `SupabaseStatus` - Real-time connection status
- `ConnectionBanner` - Connection status indicator

## Production Considerations

### Performance
- Indexes are included for optimal query performance
- Consider adding more indexes based on your usage patterns

### Backup
- Enable automated backups in Supabase dashboard
- Consider point-in-time recovery for critical data

### Monitoring
- Set up alerts for database performance
- Monitor authentication metrics
- Track real-time connection usage

### Scaling
- Monitor database size and connections
- Consider upgrading to paid plan for higher limits
- Implement connection pooling if needed

## Troubleshooting

### Common Issues

1. **Connection errors**: Verify environment variables
2. **Authentication failures**: Check email configuration
3. **Permission errors**: Review RLS policies
4. **Real-time issues**: Ensure real-time is enabled

### Debug Mode

To enable debug logging, add to your environment:

```env
REACT_APP_DEBUG=true
```

## Support

For additional help:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- Check the application logs for specific error messages