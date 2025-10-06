# 🔧 SecureChat Database Setup Instructions

Your SecureChat application is showing "Missing tables" because the database schema hasn't been created yet. Follow these simple steps to fix this:

## 📋 Quick Setup (5 minutes)

### Step 1: Copy the SQL Schema
Copy all the text from this file: [`src/lib/supabase-schema.sql`](src/lib/supabase-schema.sql)

### Step 2: Execute in Supabase
1. Go to your Supabase project: **https://fyxmppbrealxwnstuzuk.supabase.co**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Paste the entire SQL schema
5. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify Setup
1. Go to **"Table Editor"** in your Supabase dashboard
2. You should see 10 new tables created:
   - ✅ users
   - ✅ two_factor_auth
   - ✅ trusted_devices
   - ✅ biometric_credentials
   - ✅ login_sessions
   - ✅ security_alerts
   - ✅ conversations
   - ✅ conversation_participants
   - ✅ messages
   - ✅ message_status

### Step 4: Test Your App
1. Refresh your SecureChat application
2. The database initialization screen should now pass
3. You can now register and use the app!

## 🔍 Troubleshooting

### "Permission denied" errors
- Make sure you're logged into the correct Supabase project
- Verify you have admin access to the project

### "Table already exists" errors
- The SQL includes `DROP TABLE IF EXISTS` statements
- This is normal and will recreate tables with the correct structure

### Still showing missing tables?
1. Check that all 10 tables appear in your Table Editor
2. Try refreshing your browser
3. Check the browser console for any error messages

## 📊 What These Tables Do

- **users**: User profiles and status
- **conversations**: Chat rooms and group conversations  
- **messages**: Encrypted message content
- **message_status**: Message delivery and read receipts
- **login_sessions**: User session tracking for security
- **security_alerts**: Security notifications
- **two_factor_auth**: 2FA settings and backup codes
- **trusted_devices**: Device management
- **biometric_credentials**: Fingerprint/Face ID login

## 🔐 Security Features Included

- Row Level Security (RLS) enabled on all tables
- Proper foreign key relationships
- Indexes for performance
- User privacy protection
- Message encryption support

---

**Need Help?** Check the browser console (F12) for detailed error messages, or refer to the database initialization screen in your app for step-by-step guidance.