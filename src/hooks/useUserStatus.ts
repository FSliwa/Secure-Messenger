// Hook for automatic user status management
import { useEffect, useRef } from 'react';
import { updateUserStatus } from '@/lib/supabase';

interface UseUserStatusOptions {
  userId: string;
  enabled?: boolean;
  heartbeatInterval?: number; // in seconds
}

/**
 * Automatically manages user online/offline/away status
 * 
 * Features:
 * - Sets status to "online" when component mounts
 * - Sets status to "offline" when component unmounts
 * - Sets status to "away" after 5 minutes of inactivity
 * - Periodic heartbeat to keep status updated
 * - Handles visibility change (tab focus/blur)
 */
export function useUserStatus({ 
  userId, 
  enabled = true,
  heartbeatInterval = 30 // 30 seconds default
}: UseUserStatusOptions) {
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(true);

  // Set status to online
  const setOnline = async () => {
    if (!enabled || !userId) return;
    
    try {
      await updateUserStatus(userId, 'online');
      isActiveRef.current = true;
      console.log('👤 User status: online');
    } catch (error) {
      console.error('Failed to set online status:', error);
    }
  };

  // Set status to away
  const setAway = async () => {
    if (!enabled || !userId || !isActiveRef.current) return;
    
    try {
      await updateUserStatus(userId, 'away');
      isActiveRef.current = false;
      console.log('👤 User status: away');
    } catch (error) {
      console.error('Failed to set away status:', error);
    }
  };

  // Set status to offline
  const setOffline = async () => {
    if (!enabled || !userId) return;
    
    try {
      await updateUserStatus(userId, 'offline');
      isActiveRef.current = false;
      console.log('👤 User status: offline');
    } catch (error) {
      console.error('Failed to set offline status:', error);
    }
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // If user was away, set back to online
    if (!isActiveRef.current && enabled && userId) {
      setOnline();
    }

    // Set new timeout for 5 minutes (300000ms)
    inactivityTimeoutRef.current = setTimeout(() => {
      setAway();
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    if (!enabled || !userId) return;

    // Set initial status to online
    setOnline();

    // Start heartbeat to keep status updated
    heartbeatIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        setOnline(); // Refresh online status
      }
    }, heartbeatInterval * 1000);

    // Setup inactivity detection with comprehensive event coverage
    const activityEvents = [
      // Mouse events (reduced from multiple to essential)
      'mousedown',
      
      // Keyboard events (reduced)
      'keydown',
      
      // Touch events (mobile)
      'touchstart',
      
      // Scroll
      'scroll'
    ];

    // Reset timer on any activity
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Start initial inactivity timer
    resetInactivityTimer();

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - set status to away after brief delay (30 seconds)
        // This prevents immediate offline status when user briefly switches tabs
        setTimeout(() => {
          if (document.hidden) {
            setAway();
          }
        }, 30000); // 30 seconds delay
        
        // Stop the heartbeat to conserve resources
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } else {
        // Tab is visible again - set online and restart heartbeat
        setOnline();
        heartbeatIntervalRef.current = setInterval(() => {
          if (isActiveRef.current) {
            setOnline();
          }
        }, heartbeatInterval * 1000);
        resetInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload/close
    const handleBeforeUnload = () => {
      // Use synchronous method for immediate status update
      // Note: This might not always work due to browser restrictions
      navigator.sendBeacon && navigator.sendBeacon('/api/status', JSON.stringify({ 
        userId, 
        status: 'offline' 
      }));
      
      // Also try regular update
      setOffline();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      // Clear timers
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Set status to offline
      setOffline();
    };
  }, [userId, enabled, heartbeatInterval]);

  return {
    setOnline,
    setAway,
    setOffline,
    resetActivity: resetInactivityTimer
  };
}

