/**
 * Secure Messenger Cryptography Module
 * Implements Hybrid Encryption (AES-256-GCM + RSA-OAEP)
 * and Secure Key Storage via IndexedDB.
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  algorithm: string;
  created: number;
  bitLength: number;
}

export interface EncryptedMessage {
  // Hybrid Encryption Structure
  ciphertext: string; // AES-GCM encrypted message content (Base64)
  iv: string; // AES-GCM Initialization Vector (Base64)
  encryptedKey: string; // AES session key encrypted with recipient's RSA Public Key (Base64)

  // Metadata
  keyId: string; // ID of the key used (for rotation support)
  algorithm: string; // "AES-GCM-256+RSA-OAEP-2048"
  integrity?: string; // Optional integrity hash
  timestamp: number;
}

// Legacy interface support for smooth migration (optional)
export interface EncryptionProgress {
  phase: string;
  progress: number;
  message: string;
}

/**
 * Browser Compatibility Check
 */
export function checkBrowserCompatibility(): {
  compatible: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!window.crypto || !window.crypto.subtle) {
    issues.push("WebCrypto API is not supported in this browser.");
  }

  if (!window.indexedDB) {
    issues.push("IndexedDB is not supported in this browser.");
  }

  return {
    compatible: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * IndexedDB Key Storage Wrapper
 */
const DB_NAME = "SecureMessengerKeys";
const STORE_NAME = "keys";
const DB_VERSION = 1;

async function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function storeKeys(keyPair: KeyPair): Promise<void> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: "user_keypair", ...keyPair });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to store keys in IndexedDB:", error);
    throw new Error("Secure storage failure");
  }
}

export async function getStoredKeys(): Promise<KeyPair | null> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("user_keypair");

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Could not retrieve keys from IndexedDB:", error);
    return null;
  }
}

/**
 * Cryptographic Primitives
 */

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateSecureId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Key Generation (RSA-OAEP 2048)
 */
export async function generateKeyPair(
  onProgress?: (p: EncryptionProgress) => void
): Promise<KeyPair> {
  onProgress?.({
    phase: "init",
    progress: 0,
    message: "Initializing key generation...",
  });

  const startTime = Date.now();

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  onProgress?.({ phase: "export", progress: 50, message: "Exporting keys..." });

  const publicKeyBuffer = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  onProgress?.({
    phase: "done",
    progress: 100,
    message: "Key generation complete.",
  });

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
    keyId: generateSecureId(),
    algorithm: "RSA-OAEP-2048",
    created: startTime,
    bitLength: 2048,
  };
}

/**
 * Hybrid Encryption (AES-GCM + RSA-OAEP)
 */
export async function encryptMessage(
  message: string,
  recipientPublicKeyBase64: string,
  senderKeyPair: KeyPair, // Kept for interface compatibility, though sender key not strictly needed for encryption in this scheme
  onProgress?: (p: EncryptionProgress) => void
): Promise<EncryptedMessage> {
  onProgress?.({
    phase: "encrypt",
    progress: 10,
    message: "Generating session key...",
  });

  // 1. Generate AES-256 Session Key
  const sessionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  // 2. Encrypt Message with Session Key
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encodedMessage = new TextEncoder().encode(message);

  onProgress?.({
    phase: "encrypt",
    progress: 40,
    message: "Encrypting content...",
  });

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    encodedMessage
  );

  // 3. Encrypt Session Key with Recipient's Public Key
  const recipientPublicKey = await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(recipientPublicKeyBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // Export session key as raw bytes to encrypt it
  const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);

  onProgress?.({
    phase: "encrypt",
    progress: 70,
    message: "Securing session key...",
  });

  const encryptedSessionKeyBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawSessionKey
  );

  onProgress?.({
    phase: "done",
    progress: 100,
    message: "Encryption complete.",
  });

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
    encryptedKey: arrayBufferToBase64(encryptedSessionKeyBuffer),
    keyId: senderKeyPair.keyId,
    algorithm: "AES-GCM-256+RSA-OAEP-2048",
    timestamp: Date.now(),
  };
}

/**
 * Hybrid Decryption
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage | any, // Allow 'any' to handle potential legacy formats gracefully
  recipientKeyPair: KeyPair,
  onProgress?: (p: EncryptionProgress) => void
): Promise<string> {
  try {
    // Legacy format check (if message is just a string or missing fields)
    if (
      typeof encryptedMessage === "string" ||
      !encryptedMessage.encryptedKey
    ) {
      console.warn(
        "Legacy message format detected. Attempting legacy decryption or returning raw."
      );
      // Fallback for old messages (assuming they were just base64 encoded or using the old scheme)
      // Since we removed the old scheme, we can't easily decrypt them if they were truly encrypted.
      // But if they were just the "fake" encryption from before, they might be recoverable if we knew the logic.
      // For now, we fail safe.
      throw new Error("Legacy message format not supported.");
    }

    onProgress?.({
      phase: "decrypt",
      progress: 20,
      message: "Decrypting session key...",
    });

    // 1. Import User's Private Key
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(recipientKeyPair.privateKey),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );

    // 2. Decrypt Session Key
    const rawSessionKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(encryptedMessage.encryptedKey)
    );

    // 3. Import Session Key
    const sessionKey = await window.crypto.subtle.importKey(
      "raw",
      rawSessionKeyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    onProgress?.({
      phase: "decrypt",
      progress: 60,
      message: "Decrypting content...",
    });

    // 4. Decrypt Message Content
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(encryptedMessage.iv) },
      sessionKey,
      base64ToArrayBuffer(encryptedMessage.ciphertext)
    );

    onProgress?.({
      phase: "done",
      progress: 100,
      message: "Decryption complete.",
    });

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      "Failed to decrypt message. It may be corrupted or encrypted with a different key."
    );
  }
}

// Helper for generating secure codes (e.g. for access codes)
export function generateSecureCode(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const randomArray = new Uint8Array(length);
  window.crypto.getRandomValues(randomArray);

  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }

  return result;
}

// Re-export for compatibility if needed
export const generatePostQuantumKeyPair = generateKeyPair;
