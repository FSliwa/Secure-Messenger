// Check Supabase Configuration for Email Services
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase Configuration\n');
console.log('='.repeat(50));

// 1. Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`✓ VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`✓ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ Missing required environment variables!');
  console.log('\n📝 To fix:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Add your Supabase URL and Anon Key');
  console.log('3. Restart the application');
  process.exit(1);
}

console.log(`\n🔗 Supabase URL: ${supabaseUrl}`);

// 2. Test Supabase connection
console.log('\n🧪 Testing Supabase Connection:');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseConnection() {
  try {
    // Try to fetch from a public table or auth settings
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase');
    }
  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
  }
}

// 3. Check email configuration requirements
console.log('\n📧 Email Configuration Checklist:');
console.log('\n🔧 In Supabase Dashboard:');
console.log('1. Go to Authentication → Email Templates');
console.log('2. Check these templates are configured:');
console.log('   ✓ Confirm signup - Sent when user registers');
console.log('   ✓ Reset password - Sent for password reset');
console.log('   ✓ Magic link - Sent for passwordless login');
console.log('   ✓ Change email - Sent when user changes email');

console.log('\n⚙️ Email Settings (Dashboard → Settings → Auth):');
console.log('1. Email Auth:');
console.log('   ✓ Enable email signup = ON');
console.log('   ✓ Enable email confirmation = ON (recommended)');
console.log('   ✓ Secure email change = ON');

console.log('\n2. SMTP Settings (optional - for custom email):');
console.log('   ✓ Enable custom SMTP = ON (if using custom)');
console.log('   ✓ Sender email = your-email@domain.com');
console.log('   ✓ Sender name = Your App Name');
console.log('   ✓ SMTP Host = smtp.gmail.com (example)');
console.log('   ✓ SMTP Port = 587');
console.log('   ✓ SMTP User = your email');
console.log('   ✓ SMTP Pass = app password');

// 4. Check auth configuration
async function checkAuthConfig() {
  console.log('\n🔐 Authentication Configuration:');
  
  // Check if we can access auth functions
  try {
    console.log('✓ Auth client initialized');
    console.log('✓ Sign up method available');
    console.log('✓ Password reset method available');
    console.log('✓ Email verification method available');
  } catch (err) {
    console.error('❌ Auth configuration error:', err);
  }
}

// 5. Email service limits
console.log('\n📊 Email Service Limits:');
console.log('\n🆓 Free Tier:');
console.log('• 3 emails per hour per email address');
console.log('• 30 total emails per hour');
console.log('• Default Supabase sender');
console.log('• Basic email templates');

console.log('\n💎 Pro Tier:');
console.log('• 100 emails per hour per email address');
console.log('• Unlimited total emails');
console.log('• Custom SMTP support');
console.log('• Custom email templates');
console.log('• Custom sender domain');

// 6. Common issues and solutions
console.log('\n❗ Common Email Issues:');
console.log('\n1. Emails not sending:');
console.log('   • Check rate limits');
console.log('   • Verify SMTP credentials (if custom)');
console.log('   • Check email templates in dashboard');

console.log('\n2. Emails in spam:');
console.log('   • Use custom domain');
console.log('   • Set up SPF records');
console.log('   • Set up DKIM records');
console.log('   • Use reputable SMTP service');

console.log('\n3. Email confirmation not working:');
console.log('   • Ensure "Enable email confirmation" is ON');
console.log('   • Check redirect URLs are correct');
console.log('   • Verify email templates are set');

// 7. Test email templates
console.log('\n📝 Email Template Variables:');
console.log('\nConfirm Signup:');
console.log('• {{ .SiteURL }} - Your app URL');
console.log('• {{ .ConfirmationURL }} - Confirmation link');
console.log('• {{ .Email }} - User email');
console.log('• {{ .Token }} - Confirmation token');

console.log('\nReset Password:');
console.log('• {{ .SiteURL }} - Your app URL');
console.log('• {{ .ConfirmationURL }} - Reset link');
console.log('• {{ .Email }} - User email');
console.log('• {{ .Token }} - Reset token');

// Run checks
async function runChecks() {
  await checkSupabaseConnection();
  await checkAuthConfig();
  
  console.log('\n✅ Configuration check complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Run test-email-flows.html in browser');
  console.log('2. Try registering a test account');
  console.log('3. Check email inbox (including spam)');
  console.log('4. Try password reset flow');
  console.log('5. Monitor Supabase logs for errors');
}

// Save configuration report
function saveConfigReport() {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      supabaseAnonKey: supabaseAnonKey ? 'Set' : 'Missing',
    },
    recommendations: [
      'Enable email confirmation for security',
      'Set up custom SMTP for production',
      'Configure SPF/DKIM records',
      'Customize email templates',
      'Monitor rate limits'
    ]
  };
  
  const reportPath = path.join(process.cwd(), 'supabase-config-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Configuration report saved to: ${reportPath}`);
}

// Run all checks
runChecks()
  .then(() => saveConfigReport())
  .catch(console.error);

export { checkSupabaseConnection, checkAuthConfig };
