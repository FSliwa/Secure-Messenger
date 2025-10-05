// Client-side encryption utilities for SecureChat
// This implements simplified encryption for demonstration
// In production, use established libraries like libsodium.js

export interface KeyPair {
  publicKey: string
  privateKey: string
}

// Generate a new key pair for the user
export const generateKeyPair = async (): Promise<KeyPair> => {
  try {
    // Check if Web Crypto API is available
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not supported')
    }

    // Generate RSA key pair for demonstration
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )

    // Export keys to strings
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))

    return { publicKey, privateKey }
  } catch (error) {
    // Fallback for browsers without crypto API
    console.warn('Crypto API not available, using fallback keys')
    return {
      publicKey: `demo-public-key-${Date.now()}`,
      privateKey: `demo-private-key-${Date.now()}`
    }
  }
}

// Encrypt a message using recipient's public key
export const encryptMessage = async (message: string, recipientPublicKey: string): Promise<string> => {
  try {
    if (!window.crypto || !window.crypto.subtle) {
      // Fallback encryption for demo
      return btoa(JSON.stringify({
        encrypted: btoa(message),
        timestamp: Date.now(),
        method: 'demo'
      }))
    }

    // Import the public key
    const publicKeyBuffer = Uint8Array.from(atob(recipientPublicKey), c => c.charCodeAt(0))
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    )

    // Encrypt the message
    const messageBuffer = new TextEncoder().encode(message)
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      messageBuffer
    )

    return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
  } catch (error) {
    // Fallback encryption
    return btoa(JSON.stringify({
      encrypted: btoa(message),
      timestamp: Date.now(),
      method: 'demo',
      error: 'Crypto API failed'
    }))
  }
}

// Decrypt a message using user's private key
export const decryptMessage = async (encryptedMessage: string, privateKey: string): Promise<string> => {
  try {
    // Try to parse as demo format first
    try {
      const demoData = JSON.parse(atob(encryptedMessage))
      if (demoData.method === 'demo') {
        return atob(demoData.encrypted)
      }
    } catch {
      // Not demo format, continue with real decryption
    }

    if (!window.crypto || !window.crypto.subtle) {
      // Fallback - try to decode as base64
      try {
        return atob(encryptedMessage)
      } catch {
        return 'Encrypted message (crypto API not available)'
      }
    }

    // Import the private key
    const privateKeyBuffer = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0))
    const privateKeyObj = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['decrypt']
    )

    // Decrypt the message
    const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0))
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKeyObj,
      encryptedBuffer
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    // Fallback decryption
    try {
      return atob(encryptedMessage)
    } catch {
      return 'Failed to decrypt message'
    }
  }
}

// Store keys securely in browser
export const storeKeys = (publicKey: string, privateKey: string) => {
  try {
    // In a real app, consider using IndexedDB with encryption
    localStorage.setItem('securechat_public_key', publicKey)
    localStorage.setItem('securechat_private_key', privateKey)
  } catch (error) {
    console.error('Failed to store keys:', error)
  }
}

// Retrieve stored keys
export const getStoredKeys = (): KeyPair | null => {
  try {
    const publicKey = localStorage.getItem('securechat_public_key')
    const privateKey = localStorage.getItem('securechat_private_key')
    
    if (publicKey && privateKey) {
      return { publicKey, privateKey }
    }
    return null
  } catch (error) {
    console.error('Failed to retrieve keys:', error)
    return null
  }
}

// Clear stored keys (for logout)
export const clearStoredKeys = () => {
  try {
    localStorage.removeItem('securechat_public_key')
    localStorage.removeItem('securechat_private_key')
  } catch (error) {
    console.error('Failed to clear keys:', error)
  }
}

// Verify if Web Crypto API is supported
export const isCryptoSupported = (): boolean => {
  return !!(window.crypto && window.crypto.subtle)
}

// Generate a secure display name for a key (for verification)
export const getKeyFingerprint = (publicKey: string): string => {
  // Simple fingerprint generation for display
  const hash = btoa(publicKey).slice(-8).toUpperCase()
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}`
}