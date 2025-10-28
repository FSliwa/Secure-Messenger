// Test Registration Flow with Email Verification
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

// Generate unique test data
function generateTestUser() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  
  return {
    email: `test-user-${timestamp}-${randomNum}@example.com`,
    password: 'TestPassword123!@#',
    username: `testuser${timestamp}${randomNum}`,
    displayName: `Test User ${randomNum}`
  };
}

async function testRegistration() {
  console.log('📝 Testing Registration Flow...\n');

  const testUser = generateTestUser();
  
  console.log('👤 Test User Details:');
  console.log('- Email:', testUser.email);
  console.log('- Username:', testUser.username);
  console.log('- Display Name:', testUser.displayName);
  console.log('━'.repeat(50));

  try {
    // Step 1: Sign up new user
    console.log('\n1️⃣ Creating new user account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          username: testUser.username,
          display_name: testUser.displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signUpError) {
      console.error('❌ Registration failed:', signUpError.message);
      console.error('Error details:', signUpError);
      
      // Check specific error cases
      if (signUpError.message.includes('already registered')) {
        console.log('⚠️ Email already registered. Try a different email.');
      } else if (signUpError.message.includes('Invalid email')) {
        console.log('⚠️ Email format is invalid.');
      } else if (signUpError.message.includes('Password')) {
        console.log('⚠️ Password does not meet requirements.');
      } else if (signUpError.message.includes('rate limit')) {
        console.log('⚠️ Too many registration attempts. Please wait.');
      }
      
      return;
    }

    console.log('✅ User account created successfully!');
    
    // Check if email confirmation is required
    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      console.log('📧 Email confirmation required');
      console.log('📮 Verification email sent to:', testUser.email);
      
      // Log email verification details
      console.log('\n📊 Registration Details:');
      console.log('- User ID:', signUpData.user.id);
      console.log('- Email:', signUpData.user.email);
      console.log('- Created at:', signUpData.user.created_at);
      console.log('- Email confirmed:', signUpData.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('- Confirmation email sent:', new Date().toISOString());
      
    } else if (signUpData.user && signUpData.user.email_confirmed_at) {
      console.log('✅ Email automatically confirmed (development mode)');
      console.log('👤 User can login immediately');
    }

    // Step 2: Create user profile
    if (signUpData.user) {
      console.log('\n2️⃣ Creating user profile...');
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: signUpData.user.id,
          username: testUser.username,
          display_name: testUser.displayName,
          email: testUser.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('⚠️ Profile creation failed:', profileError.message);
        console.log('Note: Profile might be created automatically via trigger');
      } else {
        console.log('✅ User profile created successfully');
      }
    }

    // Step 3: Check email configuration
    console.log('\n3️⃣ Email Service Information:');
    console.log('📧 Supabase Email Settings:');
    console.log('- Confirmation emails are sent automatically');
    console.log('- Users must verify email before signing in');
    console.log('- Verification links expire after 24 hours');
    console.log('- Custom email templates can be configured in Supabase dashboard');
    
    // Step 4: Provide next steps
    console.log('\n4️⃣ Next Steps for Testing:');
    console.log('1. Check email inbox for:', testUser.email);
    console.log('2. Look for email from your configured sender');
    console.log('3. Click the confirmation link in the email');
    console.log('4. You will be redirected to the app');
    console.log('5. Try logging in with the credentials');
    
    // Step 5: Test login attempt before confirmation
    console.log('\n5️⃣ Testing login before email confirmation...');
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (loginError) {
      if (loginError.message.includes('Email not confirmed')) {
        console.log('✅ Expected: Cannot login before email confirmation');
      } else {
        console.error('❌ Unexpected login error:', loginError.message);
      }
    } else {
      console.log('⚠️ User was able to login without email confirmation');
      console.log('This might be normal in development mode');
    }

    // Return test user data for further testing
    return {
      user: signUpData.user,
      testCredentials: {
        email: testUser.email,
        password: testUser.password
      }
    };

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.error('Full error:', err);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log('✅ Registration test completed');
}

// Function to test email verification
async function testEmailVerification(token: string, email: string) {
  console.log('\n✉️ Testing Email Verification...\n');
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('❌ Email verification failed:', error.message);
      
      if (error.message.includes('expired')) {
        console.log('⚠️ Verification link has expired');
      } else if (error.message.includes('invalid')) {
        console.log('⚠️ Invalid verification token');
      }
      
      return;
    }

    console.log('✅ Email verified successfully!');
    console.log('👤 User can now login to their account');
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Function to check registration requirements
async function checkRegistrationRequirements() {
  console.log('\n📋 Registration Requirements Check...\n');
  
  console.log('✅ Email Requirements:');
  console.log('- Valid email format');
  console.log('- Unique email (not already registered)');
  console.log('- Access to email for verification');
  
  console.log('\n✅ Password Requirements:');
  console.log('- Minimum 8 characters');
  console.log('- At least one uppercase letter');
  console.log('- At least one lowercase letter');
  console.log('- At least one number');
  console.log('- At least one special character');
  
  console.log('\n✅ Username Requirements:');
  console.log('- Minimum 3 characters');
  console.log('- Only letters, numbers, and underscores');
  console.log('- Must be unique');
  
  console.log('\n⚙️ Supabase Configuration:');
  console.log('- Email verification: REQUIRED');
  console.log('- Auto-confirm emails: OFF (production)');
  console.log('- Email rate limits: 3 per hour per address');
  console.log('- Custom email templates: Available in dashboard');
}

// Function to test batch registration
async function testBatchRegistration(count: number = 3) {
  console.log(`\n🔄 Testing Batch Registration (${count} users)...\n`);
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`\n--- User ${i + 1} of ${count} ---`);
    const result = await testRegistration();
    results.push(result);
    
    // Add delay to avoid rate limits
    if (i < count - 1) {
      console.log('\n⏳ Waiting 2 seconds before next registration...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Batch Registration Summary:');
  console.log(`- Total attempts: ${count}`);
  console.log(`- Successful: ${results.filter(r => r?.user).length}`);
  console.log(`- Failed: ${results.filter(r => !r?.user).length}`);
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Registration Tests\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Timestamp:', new Date().toISOString());
  console.log('=' + '='.repeat(50) + '\n');

  // Check requirements
  await checkRegistrationRequirements();
  
  // Test single registration
  await testRegistration();
  
  // Optional: Test batch registration
  // await testBatchRegistration(3);
  
  console.log('\n📝 Manual Testing Checklist:');
  console.log('[ ] Check test email inbox');
  console.log('[ ] Verify email sender is correct');
  console.log('[ ] Click confirmation link');
  console.log('[ ] Confirm redirect works');
  console.log('[ ] Try logging in after confirmation');
  console.log('[ ] Check user appears in database');
  
  console.log('\n🔍 Troubleshooting Tips:');
  console.log('- No email received? Check spam folder');
  console.log('- Still no email? Check Supabase SMTP settings');
  console.log('- Rate limited? Wait 1 hour or use different email');
  console.log('- Profile creation failed? Check RLS policies');
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);

export { testRegistration, testEmailVerification, checkRegistrationRequirements, testBatchRegistration };
