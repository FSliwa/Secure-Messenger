// Script to generate JWT keys from Legacy JWT secret
const crypto = require('crypto');

// Your Legacy JWT secret
const jwtSecret = '+BoPqNRZPQsifPjy9CqtZe03lr3TS1+Vnfq1h0DW870UzMH2BKuPqBwQYkorSzOofveum7FPkg/9y6q8N7OFEQ==';
const projectRef = 'fyxmppbrealxwnstuzuk';

// Function to base64url encode
function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Generate JWT
function generateJWT(role) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

  const payload = {
    iss: 'supabase',
    ref: projectRef,
    role: role,
    iat: iat,
    exp: exp
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', Buffer.from(jwtSecret, 'base64'))
    .update(message)
    .digest('base64url');

  return `${message}.${signature}`;
}

console.log('Generating JWT keys for Supabase project:', projectRef);
console.log('');
console.log('ANON KEY (public):');
console.log(generateJWT('anon'));
console.log('');
console.log('SERVICE_ROLE KEY (secret):');
console.log(generateJWT('service_role'));
console.log('');
console.log('Copy these keys to your .env files!');
