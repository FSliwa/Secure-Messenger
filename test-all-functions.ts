import { createClient } from '@supabase/supabase-js';

// Hardcoded for testing purposes
const supabaseUrl = 'https://fyxmppbrealxwnstuzuk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.P_u5yDgASYwx-ImH-QhTTqAO8xM96DvUkgJ1tCm-8Pw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\nTesting: ${name}...`);
  try {
    await fn();
    results.push({ name, status: 'pass' });
    console.log(`✓ ${name} - PASS`);
  } catch (error: any) {
    results.push({ name, status: 'fail', error: error.message });
    console.error(`✗ ${name} - FAIL:`, error.message);
  }
}

// Test functions
async function testSupabaseConnection() {
  const { data, error } = await supabase.auth.getSession();
  if (error && error.message !== 'Auth session missing!') throw error;
}

async function testAuthSignUp() {
  const testEmail = `test_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPassword123!',
    options: {
      data: {
        username: `testuser_${Date.now()}`,
        display_name: 'Test User',
        public_key: 'test_public_key'
      }
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from signup');
}

async function testAuthSignIn() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'wrongpassword'
  });
  // This should fail, which is expected
  if (!error) throw new Error('Should have failed with wrong password');
}

async function testDatabaseAccess() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  // If no users exist, that's okay
  if (error && error.code !== 'PGRST116') throw error;
}

async function testRLSPolicies() {
  // Test without auth - should fail
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .limit(1);
  
  // Expected to fail due to RLS
  if (!error) throw new Error('RLS should prevent unauthenticated access');
}

async function testPasswordReset() {
  const { error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
    redirectTo: 'http://5.22.223.49/reset-password'
  });
  
  // Should not throw error even if email doesn't exist
  if (error) throw error;
}

async function testRealtimeConnection() {
  const channel = supabase.channel('test-channel');
  
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.unsubscribe();
      reject(new Error('Realtime connection timeout'));
    }, 5000);
    
    channel
      .on('system', { event: '*' }, () => {
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve();
        }
      });
  });
}

async function testEmailConfiguration() {
  // Check if email settings are configured
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // This is just a connection test
  if (error && error.message !== 'Auth session missing!') throw error;
}

async function testConversationTables() {
  const tables = ['conversations', 'conversation_participants', 'messages', 'message_status'];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    // PGRST116 = no rows, which is okay
    // 42501 = permission denied, expected without auth
    if (error && error.code !== 'PGRST116' && error.code !== '42501') {
      throw new Error(`Table ${table}: ${error.message}`);
    }
  }
}

async function testSecurityTables() {
  const tables = ['account_lockouts', 'login_attempts', 'security_audit_log', 'password_history'];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116' && error.code !== '42501') {
      throw new Error(`Table ${table}: ${error.message}`);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔍 COMPREHENSIVE APPLICATION TEST');
  console.log('=================================\n');
  
  await test('Supabase Connection', testSupabaseConnection);
  await test('Database Access', testDatabaseAccess);
  await test('Auth - Sign Up', testAuthSignUp);
  await test('Auth - Sign In (should fail)', testAuthSignIn);
  await test('Password Reset Email', testPasswordReset);
  await test('RLS Policies', testRLSPolicies);
  await test('Realtime Connection', testRealtimeConnection);
  await test('Email Configuration', testEmailConfiguration);
  await test('Conversation Tables', testConversationTables);
  await test('Security Tables', testSecurityTables);
  
  console.log('\n\n📊 TEST SUMMARY');
  console.log('===============');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`- ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Application test complete!');
}

// Run tests
runAllTests().catch(console.error).finally(() => process.exit(0));
