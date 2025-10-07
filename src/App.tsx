import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SignUpCard } from "@/components/SignUpCard";
import { LoginCard } from "@/components/LoginCard";
import { SecurityCallout } from "@/components/SecurityCallout";
import { Footer } from "@/components/Footer";
import { Dashboard } from "@/components/Dashboard";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { DatabaseInit } from "@/components/DatabaseInit";
import { PasswordResetHandler } from "@/components/PasswordResetHandler";
import { supabase, signOut } from "@/lib/supabase";
import { safeGetCurrentUser } from "@/lib/database-setup";
import { checkDatabaseReadiness } from "@/lib/database-init";
import { requireAuthentication, validateDashboardAccess } from "@/lib/auth-guards";

type AppState = 'database-init' | 'landing' | 'login' | 'dashboard' | 'reset-password';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

// Authentication states
type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

function App() {
  const [appState, setAppState] = useState<AppState>('database-init');
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if we're on the reset password page
    if (window.location.pathname === '/reset-password') {
      setAppState('reset-password');
      setIsLoading(false);
      return;
    }
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // First check if database is ready
      const dbStatus = await checkDatabaseReadiness();
      
      if (!dbStatus.ready) {
        setAppState('database-init');
        setIsLoading(false);
        return;
      }

      // Database is ready, proceed with auth check
      await checkAuthState();
    } catch (error) {
      console.error('App initialization error:', error);
      setAppState('database-init');
      setIsLoading(false);
    }
  };

  const handleDatabaseReady = async () => {
    await checkAuthState();
  };

  const checkAuthState = async () => {
    try {
      setAuthState('checking');
      
      // First check authentication
      const isAuthenticated = await requireAuthentication(false);
      
      if (!isAuthenticated) {
        setCurrentUser(null);
        setAuthState('unauthenticated');
        setAppState('landing');
        setIsLoading(false);
        return;
      }
      
      // Get user profile
      const user = await safeGetCurrentUser();
      
      if (!user) {
        setCurrentUser(null);
        setAuthState('unauthenticated');
        setAppState('landing');
        setIsLoading(false);
        return;
      }

      // Validate dashboard access permissions
      const hasAccess = await validateDashboardAccess(user.id);
      
      if (!hasAccess) {
        console.error('User does not have dashboard access');
        await signOut();
        setCurrentUser(null);
        setAuthState('unauthenticated');
        setAppState('login');
        setIsLoading(false);
        return;
      }

      // Create user object and set authenticated state
      const userObject: User = {
        id: user.id,
        username: user.profile?.username || user.email?.split('@')[0] || 'user',
        email: user.email || '',
        displayName: user.profile?.display_name || user.email?.split('@')[0] || 'User'
      };
      
      setCurrentUser(userObject);
      setAuthState('authenticated');
      setAppState('dashboard');
      
    } catch (error) {
      console.error('Error checking auth state:', error);
      setCurrentUser(null);
      setAuthState('unauthenticated');
      setAppState('landing');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appState === 'database-init') return;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setAuthState('unauthenticated');
        setAppState('login');
      } else if (event === 'SIGNED_IN' && session) {
        try {
          setAuthState('checking');
          
          // Validate the signed-in user
          const isAuthenticated = await requireAuthentication(false);
          
          if (!isAuthenticated) {
            setCurrentUser(null);
            setAuthState('unauthenticated');
            setAppState('login');
            return;
          }
          
          const user = await safeGetCurrentUser();
          if (!user) {
            setCurrentUser(null);
            setAuthState('unauthenticated');
            setAppState('login');
            return;
          }

          // Check dashboard access
          const hasAccess = await validateDashboardAccess(user.id);
          if (!hasAccess) {
            await signOut();
            setCurrentUser(null);
            setAuthState('unauthenticated');
            setAppState('login');
            return;
          }

          const userObject: User = {
            id: user.id,
            username: user.profile?.username || user.email?.split('@')[0] || 'user',
            email: user.email || '',
            displayName: user.profile?.display_name || user.email?.split('@')[0] || 'User'
          };
          
          setCurrentUser(userObject);
          setAuthState('authenticated');
          setAppState('dashboard');
          
        } catch (error) {
          console.error('Error handling auth state change:', error);
          setCurrentUser(null);
          setAuthState('unauthenticated');
          setAppState('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [appState]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthState('authenticated');
    setAppState('dashboard');
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setAuthState('checking');
      
      // Sign out from Supabase (includes database cleanup)
      await signOut();
      
      // Clear local state
      setCurrentUser(null);
      setAuthState('unauthenticated');
      
      // Redirect to login screen
      setAppState('login');
      
      // Clear any cached data (optional)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if there's an error
      setCurrentUser(null);
      setAuthState('unauthenticated');
      setAppState('login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    setAppState('login');
  };

  const handleSwitchToSignUp = () => {
    setAppState('landing');
  };

  // Database initialization screen
  if (appState === 'database-init') {
    return (
      <>
        <DatabaseInit onComplete={handleDatabaseReady} />
        <Toaster position="top-center" />
      </>
    );
  }

  // Password reset screen
  if (appState === 'reset-password') {
    return (
      <>
        <PasswordResetHandler />
        <Toaster position="top-center" />
      </>
    );
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading SecureChat...</p>
        </div>
      </div>
    );
  }

  // Dashboard screen - Only accessible when authenticated
  if (appState === 'dashboard' && authState === 'authenticated' && currentUser) {
    return (
      <>
        <Dashboard onLogout={handleLogout} currentUser={currentUser} />
        <Toaster position="top-center" />
      </>
    );
  }

  // Redirect to login if trying to access dashboard without authentication
  if (appState === 'dashboard' && authState !== 'authenticated') {
    // Force redirect to login
    setTimeout(() => setAppState('login'), 0);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Landing/Login screens
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Connection Status Banner */}
        <div className="container mx-auto max-w-screen-xl px-6 pt-4">
          <ConnectionBanner />
        </div>
        
        {/* Hero and Registration/Login Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto max-w-screen-xl px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
              {/* Left Column - Hero */}
              <div className="order-2 lg:order-1">
                <Hero />
                <div className="mt-10">
                  <SecurityCallout />
                </div>
              </div>
              
              {/* Right Column - Authentication Forms */}
              <div className="order-1 lg:order-2 flex flex-col items-center lg:items-end">
                {appState === 'login' ? (
                  <LoginCard 
                    onSuccess={handleLoginSuccess}
                    onSwitchToSignUp={handleSwitchToSignUp}
                  />
                ) : (
                  <SignUpCard 
                    onSuccess={handleLoginSuccess}
                    onSwitchToLogin={handleSwitchToLogin}
                  />
                )}

                {/* Switch between login and signup */}
                {appState === 'landing' && (
                  <div className="mt-6 text-center w-full max-w-md">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={handleSwitchToLogin}
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

export default App;