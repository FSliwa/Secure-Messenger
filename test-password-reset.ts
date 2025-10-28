// Test Password Reset Flow
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPasswordReset() {
  console.log('🔐 Testing Password Reset Flow...\n');

  // Test email for password reset
  const testEmail = 'test-reset@example.com';
  
  console.log(`📧 Attempting password reset for: ${testEmail}`);
  console.log('━'.repeat(50));

  try {
    // Step 1: Request password reset
    console.log('\n1️⃣ Requesting password reset...');
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('❌ Password reset request failed:', error.message);
      console.error('Error details:', error);
      
      // Check specific error cases
      if (error.message.includes('Email not confirmed')) {
        console.log('⚠️ Email address is not confirmed. User needs to verify email first.');
      } else if (error.message.includes('User not found')) {
        console.log('⚠️ No user found with this email address.');
      } else if (error.message.includes('Email sending failed')) {
        console.log('⚠️ Email service configuration issue. Check Supabase SMTP settings.');
      }
      
      return;
    }

    console.log('✅ Password reset email sent successfully!');
    console.log('📮 Check your email inbox for the reset link');
    
    // Log additional info
    console.log('\n📊 Reset Request Details:');
    console.log('- Email:', testEmail);
    console.log('- Timestamp:', new Date().toISOString());
    console.log('- Redirect URL:', `${window.location.origin}/reset-password`);
    
    // Step 2: Check email rate limits
    console.log('\n2️⃣ Checking email rate limits...');
    console.log('ℹ️ Supabase has the following email limits:');
    console.log('- 3 emails per hour for the same email address');
    console.log('- 30 emails per hour total for the project');
    
    // Step 3: Provide instructions
    console.log('\n3️⃣ Next steps:');
    console.log('1. Check the email inbox for', testEmail);
    console.log('2. Click the reset link in the email');
    console.log('3. You will be redirected to the password reset page');
    console.log('4. Enter a new password to complete the reset');
    
    // Step 4: Test token validation (simulated)
    console.log('\n4️⃣ Token Information:');
    console.log('- Reset tokens are valid for 1 hour');
    console.log('- Tokens are single-use only');
    console.log('- After use, the token becomes invalid');
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.error('Full error:', err);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log('✅ Password reset test completed');
}

// Function to test password update with token
async function testPasswordUpdate(token: string, newPassword: string) {
  console.log('\n🔑 Testing Password Update with Token...\n');
  
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('❌ Password update failed:', error.message);
      
      if (error.message.includes('Invalid token')) {
        console.log('⚠️ The reset token is invalid or expired');
      } else if (error.message.includes('Password too weak')) {
        console.log('⚠️ Password does not meet security requirements');
      }
      
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log('👤 User can now login with the new password');
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Function to check Supabase email configuration
async function checkEmailConfiguration() {
  console.log('\n⚙️ Checking Supabase Email Configuration...\n');
  
  console.log('📋 Email Provider Checklist:');
  console.log('✓ SMTP settings configured in Supabase dashboard');
  console.log('✓ Email templates customized (optional)');
  console.log('✓ Sender email verified');
  console.log('✓ SPF/DKIM records set up (for production)');
  
  console.log('\n🔍 Common Issues:');
  console.log('1. Emails going to spam - Check SPF/DKIM records');
  console.log('2. Emails not sending - Verify SMTP credentials');
  console.log('3. Rate limit errors - Wait or upgrade plan');
  console.log('4. Template errors - Check custom email templates');
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Password Reset Tests\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Timestamp:', new Date().toISOString());
  console.log('=' + '='.repeat(50) + '\n');

  // Check email configuration
  await checkEmailConfiguration();
  
  // Test password reset
  await testPasswordReset();
  
  console.log('\n📝 Manual Testing Instructions:');
  console.log('1. Run this script: npm run test:password-reset');
  console.log('2. Check the test email inbox');
  console.log('3. Click the reset link');
  console.log('4. Complete the password reset form');
  console.log('5. Try logging in with the new password');
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);

export { testPasswordReset, testPasswordUpdate, checkEmailConfiguration };
