# API Documentation

## Overview

Secure-Messenger uses Supabase as the backend, providing a RESTful API and real-time subscriptions. All API endpoints require authentication unless specified otherwise.

---

## Authentication

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
apikey: YOUR_ANON_KEY
Content-Type: application/json
```

### Login
```http
POST /auth/v1/token?grant_type=password
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Register
```http
POST /auth/v1/signup
{
  "email": "user@example.com",
  "password": "password123",
  "data": {
    "username": "johndoe",
    "display_name": "John Doe"
  }
}
```

### Logout
```http
POST /auth/v1/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## User Management

### Get Current User
```http
GET /auth/v1/user
Authorization: Bearer YOUR_JWT_TOKEN
```

### Update User Profile
```http
PATCH /rest/v1/users?id=eq.USER_ID
{
  "display_name": "New Name",
  "bio": "Updated bio",
  "avatar_url": "https://..."
}
```

### Get User by Username
```http
GET /rest/v1/users?username=eq.johndoe
```

---

## Messaging

### Send Message
```http
POST /rest/v1/messages
{
  "conversation_id": "uuid",
  "encrypted_content": "encrypted_string",
  "encryption_metadata": {
    "algorithm": "AES-256-GCM",
    "key_id": "uuid"
  }
}
```

### Get Messages
```http
GET /rest/v1/messages?conversation_id=eq.UUID&order=sent_at.desc&limit=50
```

### Update Message Status
```http
POST /rest/v1/message_status
{
  "message_id": "uuid",
  "status": "read"
}
```

### Delete Message
```http
PATCH /rest/v1/messages?id=eq.MESSAGE_ID
{
  "is_deleted": true
}
```

---

## Conversations

### Create Conversation
```http
POST /rest/v1/conversations
{
  "name": "Group Chat",
  "is_group": true,
  "access_code": "optional_code"
}
```

### Get User Conversations
```http
GET /rest/v1/conversation_participants?user_id=eq.USER_ID&is_active=eq.true
```

### Add Participant
```http
POST /rest/v1/conversation_participants
{
  "conversation_id": "uuid",
  "user_id": "uuid"
}
```

### Leave Conversation
```http
PATCH /rest/v1/conversation_participants?id=eq.PARTICIPANT_ID
{
  "is_active": false,
  "left_at": "2025-10-07T12:00:00Z"
}
```

---

## File Management

### Upload File
```http
POST /storage/v1/object/chat-files/CONVERSATION_ID/FILE_NAME
Content-Type: multipart/form-data
Body: [Binary File Data]
```

### Download File
```http
GET /storage/v1/object/chat-files/CONVERSATION_ID/FILE_NAME
Authorization: Bearer YOUR_JWT_TOKEN
```

### Delete File
```http
DELETE /storage/v1/object/chat-files/CONVERSATION_ID/FILE_NAME
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Security Features

### Enable 2FA
```http
POST /rest/v1/two_factor_auth
{
  "user_id": "uuid",
  "secret": "generated_secret",
  "backup_codes": ["code1", "code2", "..."]
}
```

### Verify 2FA
```http
POST /auth/v1/verify
{
  "token": "123456",
  "type": "totp"
}
```

### Register Biometric
```http
POST /rest/v1/biometric_credentials
{
  "credential_id": "base64_credential_id",
  "public_key": "base64_public_key",
  "type": "fingerprint",
  "name": "My Fingerprint"
}
```

### Check Account Lockout
```http
GET /rest/v1/account_lockouts?user_id=eq.USER_ID&is_active=eq.true
```

---

## Real-time Subscriptions

### Subscribe to Messages
```javascript
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, 
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

### Subscribe to User Status
```javascript
const presenceChannel = supabase
  .channel('online-users')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    console.log('Online users:', state);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ 
        user_id: userId,
        online_at: new Date().toISOString() 
      });
    }
  });
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "invalid_request",
  "error_description": "The request is missing required parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "error_description": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "error_description": "The requested resource was not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "error_description": "An unexpected error occurred"
}
```

---

## Rate Limits

### API Rate Limits
- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **File Upload**: 10 requests per minute
- **Real-time**: 100 concurrent connections

### Response Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696687200
```

---

## Pagination

### Request
```http
GET /rest/v1/messages?conversation_id=eq.UUID&limit=20&offset=40
```

### Response Headers
```http
Content-Range: 40-60/200
```

### Link Header
```http
Link: </rest/v1/messages?limit=20&offset=60>; rel="next",
      </rest/v1/messages?limit=20&offset=20>; rel="prev"
```

---

## Filtering and Sorting

### Operators
- `eq` - equals
- `neq` - not equals
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `like` - LIKE operator
- `ilike` - ILIKE operator
- `in` - IN operator
- `is` - IS operator

### Examples
```http
# Get unread messages
GET /rest/v1/messages?is_read=eq.false

# Get messages from last 24 hours
GET /rest/v1/messages?sent_at=gte.2025-10-06T00:00:00Z

# Search messages
GET /rest/v1/messages?encrypted_content=ilike.*search_term*

# Sort by date descending
GET /rest/v1/messages?order=sent_at.desc

# Multiple filters
GET /rest/v1/messages?conversation_id=eq.UUID&is_deleted=eq.false&order=sent_at.desc
```

---

## Webhooks

### Message Sent
```json
{
  "event": "message.sent",
  "timestamp": "2025-10-07T12:00:00Z",
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid"
  }
}
```

### User Registered
```json
{
  "event": "user.registered",
  "timestamp": "2025-10-07T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

---

## SDK Usage

### JavaScript/TypeScript
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Example: Send message
async function sendMessage(conversationId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      encrypted_content: encrypt(content),
      encryption_metadata: {
        algorithm: 'AES-256-GCM'
      }
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

### Python
```python
from supabase import create_client, Client

url = "https://your-project.supabase.co"
key = "your-anon-key"
supabase: Client = create_client(url, key)

# Example: Get messages
def get_messages(conversation_id: str, limit: int = 50):
    response = supabase.table('messages') \
        .select("*") \
        .eq('conversation_id', conversation_id) \
        .order('sent_at', desc=True) \
        .limit(limit) \
        .execute()
    
    return response.data
```

---

## Testing

### Test Endpoints
```bash
# Health check
curl https://api.secure-messenger.com/health

# Test authentication
curl -X POST https://api.secure-messenger.com/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Postman Collection
Import the Postman collection from: `/docs/postman-collection.json`

---

## Best Practices

1. **Always use HTTPS** for API calls
2. **Cache responses** when appropriate
3. **Implement exponential backoff** for retries
4. **Handle rate limits** gracefully
5. **Validate input** on client side
6. **Encrypt sensitive data** before sending
7. **Use pagination** for large datasets
8. **Subscribe to real-time** updates for live data
9. **Handle errors** appropriately
10. **Keep authentication tokens** secure

---

**API Version**: 1.0.0  
**Last Updated**: 2025-10-07  
**Base URL**: `https://api.secure-messenger.com`  
**Documentation**: [https://docs.secure-messenger.com](https://docs.secure-messenger.com)
