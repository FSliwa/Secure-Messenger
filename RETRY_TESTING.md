# Testing the Network Retry Mechanism

This document explains how to test SecureChat's automatic retry mechanism for failed login attempts when network issues occur.

## Overview

SecureChat implements a robust retry mechanism that automatically handles:
- Network connection failures
- Server timeouts
- Temporary service unavailability
- Database connection issues

The retry system uses:
- **Exponential backoff** with jitter
- **Smart network detection**
- **Retryable vs non-retryable error classification**
- **User-friendly status updates**

## Available Testing Tools

### 1. Development Mode Testing Controls

When running in development mode, you'll see additional testing panels on the login page:

#### Network Test Controls
- **Enable Test Mode**: Activates network simulation capabilities
- **Disconnect/Reconnect**: Manually control network connectivity
- **Network Status**: Shows current connection state

#### Retry Test Runner
- **Run All Tests**: Executes comprehensive retry scenarios
- **Progress Tracking**: Shows test progress and results
- **Test Results**: Detailed pass/fail status for each scenario

### 2. Browser Developer Console

Access advanced testing tools via the browser console:

```javascript
// Quick network disconnection (10 seconds)
networkTest.disconnect(10)

// Restore connection immediately
networkTest.reconnect()

// Check if simulation is active
networkTest.isOffline()
```

## Testing Scenarios

### Scenario 1: Quick Network Interruption
**Duration**: 5 seconds
**Purpose**: Test basic retry functionality

1. Enable Test Mode on the login page
2. Click "Start Test" in the Retry Test Runner
3. Enter login credentials
4. Click "Disconnect" during login attempt
5. Observe retry attempts in real-time
6. Network automatically reconnects after 5 seconds
7. Login should complete successfully

**Expected Behavior**:
- Login button shows "Reconnecting..." status
- Retry indicator displays attempt count
- Toast notifications show retry progress
- Login completes automatically when connection is restored

### Scenario 2: Medium Network Outage
**Duration**: 15 seconds
**Purpose**: Test persistence through longer outages

1. Follow steps 1-4 from Scenario 1
2. Wait for multiple retry attempts
3. Observe exponential backoff delays
4. Login should eventually succeed

**Expected Behavior**:
- Multiple retry attempts with increasing delays
- User-friendly status messages
- No loss of form data
- Successful completion after reconnection

### Scenario 3: Manual Network Control
**Purpose**: Test user-controlled network scenarios

1. Enable Test Mode
2. Click "Disconnect" without time limit
3. Attempt login
4. Observe retry attempts
5. Manually click "Reconnect" when ready
6. Verify login completion

### Scenario 4: Browser Network Disconnection
**Purpose**: Test with real network conditions

1. Open browser DevTools (F12)
2. Go to Network tab
3. Set throttling to "Offline"
4. Attempt login
5. Restore network connection
6. Verify retry behavior

## Real Network Testing

### Using Browser DevTools
1. **F12** → **Network tab** → **Throttling dropdown**
2. Select "Offline" or custom slow connection
3. Attempt login operations
4. Restore normal connection
5. Observe retry behavior

### Using System Network
1. Disconnect from WiFi/Ethernet
2. Attempt login
3. Reconnect network
4. Verify automatic retry and completion

## Expected Results

### Successful Retry Sequence
```
🔐 Login attempt started
❌ Network error detected (attempt 1)
⏳ Waiting 1s before retry...
❌ Network error detected (attempt 2) 
⏳ Waiting 2s before retry...
❌ Network error detected (attempt 3)
⏳ Waiting 4s before retry...
🔌 Network connection restored
✅ Login successful after 4 attempts
```

### User Interface During Retries
- **Login Button**: Shows "Reconnecting..." with spinner
- **Retry Indicator**: Displays attempt count and last error
- **Network Status**: Shows offline/online state
- **Toast Notifications**: Provide real-time feedback

## Error Classification

### Retryable Errors
- Network connection failures
- DNS lookup failures
- Server timeout (5xx errors)
- Database connection issues
- Rate limiting (temporary)

### Non-Retryable Errors
- Invalid credentials (401)
- Account disabled/locked
- Email not verified
- Malformed requests (400)

## Configuration

Retry behavior is configured in `src/lib/auth-config.ts`:

```typescript
AUTH_RETRY_CONFIG = {
  AUTHENTICATION: {
    maxRetries: 3,
    baseDelay: 1000,     // 1 second
    maxDelay: 10000,     // 10 seconds max
    exponentialFactor: 2,
    jitterRange: 0.3     // 30% randomization
  }
}
```

## Troubleshooting

### Tests Not Working
- Ensure you're in development mode (`NODE_ENV=development`)
- Clear browser cache and refresh
- Check browser console for errors

### Network Simulation Not Active
- Enable Test Mode first
- Check that fetch interceptor is initialized
- Verify no other network tools are interfering

### Retries Not Triggering
- Confirm error is classified as retryable
- Check network status monitor
- Verify retry configuration

## Performance Considerations

- Retry mechanism adds minimal overhead when network is stable
- Exponential backoff prevents server overload
- Jitter reduces thundering herd effects
- User can always cancel/retry manually

## Production Behavior

In production:
- Testing controls are hidden
- Network monitoring remains active
- Retry mechanism functions identically
- Error messages are user-friendly
- Technical details logged to console only

## Best Practices

1. **Test Multiple Scenarios**: Use both simulated and real network conditions
2. **Verify User Experience**: Ensure UI remains responsive during retries
3. **Check Error Handling**: Confirm appropriate messages for different error types
4. **Monitor Performance**: Verify retries don't cause excessive delays
5. **Validate Recovery**: Ensure successful completion after network restoration

---

For additional testing capabilities, see the `networkTest` object available in the browser console during development.