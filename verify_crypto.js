
import { generateKeyPair, encryptMessage, decryptMessage, storeKeys, getStoredKeys, EncryptedMessage } from './src/lib/crypto';

async function runVerification() {
  console.log('🔒 Starting Crypto Verification...');

  try {
    // 1. Key Generation
    console.log('1. Generating Key Pair...');
    const startKeyGen = performance.now();
    const keyPair = await generateKeyPair();
    const endKeyGen = performance.now();
    console.log(`✅ Key Pair Generated in ${(endKeyGen - startKeyGen).toFixed(2)}ms`);
    console.log(`   Public Key Length: ${keyPair.publicKey.length}`);

    // 2. Key Storage
    console.log('2. Testing Key Storage (IndexedDB)...');
    await storeKeys(keyPair);
    const retrievedKeys = await getStoredKeys();
    if (retrievedKeys && retrievedKeys.keyId === keyPair.keyId) {
      console.log('✅ Keys Stored and Retrieved Successfully');
    } else {
      console.error('❌ Key Storage Failed');
    }

    // 3. Encryption
    console.log('3. Testing Encryption...');
    const message = "Hello, Secure World! 🌍";
    const startEncrypt = performance.now();
    const encrypted: EncryptedMessage = await encryptMessage(message, keyPair.publicKey, keyPair);
    const endEncrypt = performance.now();
    console.log(`✅ Message Encrypted in ${(endEncrypt - startEncrypt).toFixed(2)}ms`);
    console.log(`   Ciphertext: ${encrypted.ciphertext.substring(0, 20)}...`);
    console.log(`   Algorithm: ${encrypted.algorithm}`);

    if (encrypted.algorithm !== 'AES-GCM-256+RSA-OAEP-2048') {
      console.error('❌ Wrong Algorithm Identifier');
    }

    // 4. Decryption
    console.log('4. Testing Decryption...');
    const startDecrypt = performance.now();
    const decrypted = await decryptMessage(encrypted, keyPair);
    const endDecrypt = performance.now();
    console.log(`✅ Message Decrypted in ${(endDecrypt - startDecrypt).toFixed(2)}ms`);
    console.log(`   Decrypted Content: "${decrypted}"`);

    if (decrypted === message) {
      console.log('🎉 Verification SUCCESS: Full Cycle Complete');
    } else {
      console.error('❌ Verification FAILED: Decrypted message does not match original');
    }

  } catch (error) {
    console.error('❌ Verification Error:', error);
  }
}

// Mock window/browser APIs for Node.js environment if needed, 
// but this is intended to run in the browser console or via a test runner that supports Web Crypto.
// Since we are in an agent environment, we might not be able to run this directly with `node` 
// because `window.crypto` and `indexedDB` are browser APIs.
// We will assume the user (or I) can run this in the browser console.
