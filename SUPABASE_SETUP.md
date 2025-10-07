# 🔒 SecureChat - Supabase Configuration Guide

This comprehensive guide addresses all common Supabase authentication and email configuration issues based on real-world troubleshooting experience.

## 🚀 Quick Start

### 1. Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy your Project URL and anon/public key

3. **Update your `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_APP_URL=http://localhost:5173
   VITE_REDIRECT_URL=http://localhost:5173
   ```

4. **Restart your development server:**
   ```bash
   npm run dev
   ```

## ⚙️ Supabase Dashboard Configuration

### 1. Authentication Providers

**Location:** `Dashboard → Authentication → Providers`

1. ✅ **Enable Email Provider**
2. ⚠️ **Email Confirmation Setting:**
   - **If ENABLED:** Users must confirm email before logging in
   - **If DISABLED:** Users can log in immediately
   - Choose based on your security requirements

### 2. URL Configuration

**Location:** `Dashboard → Authentication → URL Configuration`

**Site URL:**
```
http://localhost:5173
```

**Redirect URLs (Add ALL of these):**
```
http://localhost:5173/**
http://localhost:5173/reset-password
http://localhost:5173/auth/callback
http://localhost:5173/dashboard
```

**For Production, also add:**
```
https://your-domain.com/**
https://your-domain.com/reset-password
https://your-domain.com/auth/callback
https://your-domain.com/dashboard
```

### 3. Email Templates

**Location:** `Dashboard → Authentication → Email Templates`

**Verify these templates contain the confirmation URL:**

1. **Confirm Signup Template:**
   ```html
   <h2>Confirm your signup</h2>
   <p>Follow this link to confirm your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
   ```

2. **Reset Password Template:**
   ```html
   <h2>Reset Password</h2>
   <p>Follow this link to reset the password for your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   ```

## 🐛 Common Issues & Solutions

### Issue 1: Emails Not Being Sent

**Symptoms:**
- Password reset doesn't send email
- Signup confirmation doesn't arrive
- No errors in browser console

**Causes & Solutions:**

1. **📧 Check Spam Folder**
   - Add `noreply@mail.supabase.io` to contacts
   - Check spam/junk folder

2. **⏰ Rate Limiting**
   - Supabase free tier: 3-4 emails per hour per user
   - **Check:** Dashboard → Logs → Auth Logs for "rate_limit_exceeded"
   - **Solution:** Wait 1 hour between email attempts

3. **❌ Email Provider Not Enabled**
   - **Check:** Dashboard → Authentication → Providers → Email
   - **Solution:** Enable the Email provider

4. **🔗 Wrong Redirect URLs**
   - **Check:** Dashboard → Authentication → URL Configuration
   - **Solution:** Ensure URLs match exactly (including http/https and port)

### Issue 2: Registration/Login Failures

**Symptoms:**
- "Invalid login credentials" errors
- "Email not confirmed" messages
- Users can't access dashboard after signup

**Causes & Solutions:**

1. **✉️ Email Confirmation Required**
   - **Check:** Authentication → Providers → Email → "Confirm email" setting
   - **If Enabled:** Users MUST click email confirmation link before login
   - **Solution:** Inform users to check email before attempting login

2. **🔑 Environment Variables**
   - **Check:** Browser Console → `console.log(import.meta.env.VITE_SUPABASE_URL)`
   - **Should show:** Your Supabase URL, not `undefined`
   - **Solution:** Verify `.env` file has correct values with `VITE_` prefix

3. **🗄️ Database Connection Issues**
   - **Check:** Use Admin Config Panel in dashboard
   - **Solution:** Run database initialization if tables are missing

### Issue 3: Redirect URL Mismatches

**Symptoms:**
- "Invalid redirect URL" errors
- Users redirected to wrong pages after email clicks
- Authentication callbacks fail

**Causes & Solutions:**

1. **🌐 URL Protocol Mismatch**
   - **Issue:** Code uses `http://` but Supabase configured for `https://`
   - **Solution:** Ensure consistent protocol in both places

2. **🔢 Port Number Issues**
   - **Issue:** Development server port changes
   - **Solution:** Add wildcard URLs like `http://localhost:5173/**`

3. **📍 Environment-Specific URLs**
   - **Issue:** Hardcoded `window.location.origin` in production
   - **Solution:** Use environment variables (`VITE_APP_URL`)

## 🧪 Testing & Debugging

### Built-in Diagnostic Tools

1. **Admin Config Panel**
   - Available in dashboard for authenticated users
   - Tests email system, database connectivity
   - Shows environment variable status

2. **Supabase Config Checker**
   - Automated diagnostics
   - Verifies all configuration requirements
   - Provides fix recommendations

### Manual Testing

1. **Environment Variables Check:**
   ```javascript
   // In browser console
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Environment:', import.meta.env.MODE)
   ```

2. **Database Connection Test:**
   ```javascript
   // In browser console
   const { data, error } = await supabase.from('users').select('*').limit(1)
   console.log('Database test:', { data, error })
   ```

3. **Email Test:**
   ```javascript
   // In browser console (replace with test email)
   const { error } = await supabase.auth.resetPasswordForEmail('test@example.com')
   console.log('Email test:', error)
   ```

### Supabase Dashboard Logs

**Location:** `Dashboard → Logs → Auth Logs`

**Look for:**
- ✅ `sent confirmation email to: user@email.com`
- ✅ `sent password recovery email to: user@email.com`
- ❌ `failed to send email`
- ❌ `rate limit exceeded`
- ❌ `User not found`

## 📋 Pre-Launch Checklist

- [ ] `.env` file created with correct Supabase credentials
- [ ] Environment variables start with `VITE_` prefix
- [ ] Email provider enabled in Supabase Dashboard
- [ ] Redirect URLs configured for all environments (dev + production)
- [ ] Email templates contain `{{ .ConfirmationURL }}`
- [ ] Database tables exist and are accessible
- [ ] Authentication flow tested end-to-end
- [ ] Password reset functionality tested
- [ ] Error handling implemented for edge cases
- [ ] Rate limiting considerations documented for users
- [ ] Spam folder instructions provided to users
- [ ] Auth logs monitored for errors

## 🆘 Emergency Troubleshooting

If everything seems broken:

1. **Clear Everything:**
   ```bash
   # Clear browser data
   # Go to Developer Tools → Application → Storage → Clear storage
   
   # Restart dev server
   npm run dev
   ```

2. **Verify Basic Connection:**
   ```javascript
   // Browser console - test basic Supabase connection
   console.log('Testing Supabase...')
   const { data } = await supabase.from('users').select('count').limit(1)
   console.log('Connection result:', data)
   ```

3. **Check Auth State:**
   ```javascript
   // Browser console
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Current session:', session)
   ```

4. **Manual Email Test:**
   - Use a real email address you control
   - Try password reset from the UI
   - Check both inbox and spam folder
   - Look for emails from `noreply@mail.supabase.io`

## 🔗 Helpful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Community Discord](https://discord.supabase.com)
- [Email Provider Configuration](https://supabase.com/docs/guides/auth/auth-smtp)

## 📞 Support

If you're still experiencing issues:

1. Check the Auth Logs in your Supabase Dashboard
2. Use the built-in diagnostic tools in the application
3. Review this troubleshooting guide step-by-step
4. Join the Supabase Discord community for help

---

**Remember:** After making any configuration changes, always:
1. Restart your development server
2. Clear browser cache/cookies
3. Test with a fresh browser tab/incognito mode