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
import { supabase, signOut } from "@/lib/supabase";
import { safeGetCurrentUser } from "@/lib/database-setup";
import { checkDatabaseReadiness } from "@/lib/database-init";

type AppState = 'database-init' | 'landing' | 'login' | 'dashboard';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

function App() {
  const [appState, setAppState] = useState<AppState>('database-init');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
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
      const user = await safeGetCurrentUser();
      if (user) {
        const userObject: User = {
          id: user.id,
          username: user.profile?.username || user.email?.split('@')[0] || 'user',
          email: user.email || '',
          displayName: user.profile?.display_name || user.email?.split('@')[0] || 'User'
        };
        setCurrentUser(userObject);
        setAppState('dashboard');
      } else {
        setAppState('landing');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
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
        setAppState('login'); // Always redirect to login, not landing
      } else if (event === 'SIGNED_IN' && session) {
        try {
          const user = await safeGetCurrentUser();
          if (user) {
            const userObject: User = {
              id: user.id,
              username: user.profile?.username || user.email?.split('@')[0] || 'user',
              email: user.email || '',
              displayName: user.profile?.display_name || user.email?.split('@')[0] || 'User'
            };
            setCurrentUser(userObject);
            setAppState('dashboard');
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [appState]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAppState('dashboard');
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Sign out from Supabase (includes database cleanup)
      await signOut();
      
      // Clear local state
      setCurrentUser(null);
      
      // Redirect to login screen (not landing page)
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

  // Dashboard screen
  if (appState === 'dashboard') {
    return (
      <>
        <Dashboard onLogout={handleLogout} currentUser={currentUser || null} />
        <Toaster position="top-center" />
      </>
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
        <section className="py-8 sm:py-12 lg:py-16">
          <div className="container mx-auto max-w-screen-xl px-6">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
              {/* Left Column - Hero */}
              <div className="order-2 lg:order-1">
                <Hero />
                <div className="mt-8">
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
                  <div className="mt-4 text-center w-full max-w-md">
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