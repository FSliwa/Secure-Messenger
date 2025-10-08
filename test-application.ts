import { supabase } from './src/lib/supabase'
import { generatePostQuantumKeyPair, encryptMessage, decryptMessage } from './src/lib/crypto'
import { initializeDatabaseTables } from './src/lib/database-init'
import { isAccountLocked, trackFailedLoginAttempt } from './src/lib/account-lockout'

async function testApplication() {
  console.log('🧪 TESTOWANIE APLIKACJI SECURE-MESSENGER\n')
  console.log('=====================================\n')

  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  }

  // Test 1: Połączenie z Supabase
  console.log('1️⃣ Test połączenia z Supabase...')
  try {
    const { data, error } = await supabase.from('users').select('count').single()
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    console.log('✅ Połączenie z Supabase działa')
    testResults.passed++
  } catch (error) {
    console.log('❌ Błąd połączenia z Supabase:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'Supabase Connection', error: error.message })
  }

  // Test 2: Sprawdzenie tabel
  console.log('\n2️⃣ Test dostępności tabel...')
  try {
    const result = await initializeDatabaseTables()
    if (result.success) {
      console.log('✅ Wszystkie tabele są dostępne')
      testResults.passed++
    } else {
      console.log('❌ Brakujące tabele:', result.missing?.join(', '))
      console.log('Błędy:', result.errors)
      testResults.failed++
      testResults.errors.push({ test: 'Database Tables', error: result.message })
    }
  } catch (error) {
    console.log('❌ Błąd sprawdzania tabel:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'Database Tables', error: error.message })
  }

  // Test 3: Generowanie kluczy
  console.log('\n3️⃣ Test generowania kluczy kryptograficznych...')
  try {
    const keyPair = await generatePostQuantumKeyPair()
    if (keyPair.publicKey && keyPair.privateKey) {
      console.log('✅ Generowanie kluczy działa')
      console.log(`   - Długość klucza: ${keyPair.bitLength} bit`)
      console.log(`   - Algorytm: ${keyPair.algorithm}`)
      testResults.passed++
      
      // Test 4: Szyfrowanie/Deszyfrowanie
      console.log('\n4️⃣ Test szyfrowania i deszyfrowania...')
      try {
        const testMessage = 'Test message for encryption'
        const encrypted = await encryptMessage(testMessage, keyPair.publicKey)
        const decrypted = await decryptMessage(encrypted, keyPair.privateKey)
        
        if (decrypted === testMessage) {
          console.log('✅ Szyfrowanie i deszyfrowanie działa poprawnie')
          testResults.passed++
        } else {
          console.log('❌ Deszyfrowana wiadomość nie zgadza się z oryginałem')
          testResults.failed++
          testResults.errors.push({ test: 'Encryption/Decryption', error: 'Message mismatch' })
        }
      } catch (error) {
        console.log('❌ Błąd szyfrowania/deszyfrowania:', error.message)
        testResults.failed++
        testResults.errors.push({ test: 'Encryption/Decryption', error: error.message })
      }
    } else {
      throw new Error('Invalid key pair generated')
    }
  } catch (error) {
    console.log('❌ Błąd generowania kluczy:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'Key Generation', error: error.message })
  }

  // Test 5: Rejestracja użytkownika
  console.log('\n5️⃣ Test rejestracji użytkownika...')
  try {
    const testEmail = `test_${Date.now()}@example.com`
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          username: `testuser_${Date.now()}`
        }
      }
    })
    
    if (error) {
      throw error
    }
    
    console.log('✅ Rejestracja użytkownika działa')
    testResults.passed++
    
    // Cleanup
    if (data.user) {
      await supabase.auth.admin.deleteUser(data.user.id).catch(() => {})
    }
  } catch (error) {
    console.log('❌ Błąd rejestracji:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'User Registration', error: error.message })
  }

  // Test 6: Blokada konta
  console.log('\n6️⃣ Test mechanizmu blokady konta...')
  try {
    const testUserId = 'test-user-' + Date.now()
    
    // Symuluj nieudane próby logowania
    for (let i = 0; i < 3; i++) {
      await trackFailedLoginAttempt(testUserId, 'test@example.com')
    }
    
    const lockStatus = await isAccountLocked(testUserId)
    if (lockStatus.locked) {
      console.log('✅ Mechanizm blokady konta działa')
      console.log(`   - Powód: ${lockStatus.reason}`)
      testResults.passed++
    } else {
      console.log('⚠️  Konto nie zostało zablokowane po 3 próbach')
      testResults.failed++
      testResults.errors.push({ test: 'Account Lockout', error: 'Account not locked after failed attempts' })
    }
  } catch (error) {
    console.log('❌ Błąd testowania blokady konta:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'Account Lockout', error: error.message })
  }

  // Test 7: Test RLS policies
  console.log('\n7️⃣ Test Row Level Security...')
  try {
    // Test as anonymous user (should fail)
    const { data: anonData, error: anonError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)
    
    if (anonError && anonError.code === 'PGRST301') {
      console.log('✅ RLS policies działają (odmowa dostępu dla niezalogowanych)')
      testResults.passed++
    } else {
      console.log('⚠️  RLS może nie działać poprawnie')
      testResults.failed++
      testResults.errors.push({ test: 'RLS Policies', error: 'Unexpected access granted' })
    }
  } catch (error) {
    console.log('❌ Błąd testowania RLS:', error.message)
    testResults.failed++
    testResults.errors.push({ test: 'RLS Policies', error: error.message })
  }

  // Podsumowanie
  console.log('\n=====================================')
  console.log('📊 PODSUMOWANIE TESTÓW:')
  console.log(`✅ Zaliczone: ${testResults.passed}`)
  console.log(`❌ Niezaliczone: ${testResults.failed}`)
  
  if (testResults.errors.length > 0) {
    console.log('\n🔴 BŁĘDY DO NAPRAWIENIA:')
    testResults.errors.forEach(err => {
      console.log(`   - ${err.test}: ${err.error}`)
    })
  }
  
  return testResults
}

// Uruchom testy
testApplication().then(results => {
  process.exit(results.failed > 0 ? 1 : 0)
}).catch(error => {
  console.error('💥 Krytyczny błąd:', error)
  process.exit(1)
})
