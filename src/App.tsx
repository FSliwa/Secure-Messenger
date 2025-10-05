import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SignUpCard } from "@/components/SignUpCard";
import { LoginCard } from "@/components/LoginCard";
import { SecurityCallout } from "@/components/SecurityCallout";
import { Footer } from "@/components/Footer";
import { Dashboard } from "@/components/Dashboard";
import { getCurrentUser } from "@/lib/supabase";

type AppState = 'landing' | 'login' | 'dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthState = async () => {
      const user = await getCurrentUser();
      if (user) {
        setAppState('dashboard');
      }
      setIsLoading(false);
    };
    
    checkAuthState();
  }, []);

  const handleLoginSuccess = () => {
    setAppState('dashboard');
  };

  const handleLogout = () => {
    setAppState('landing');
  };

  const handleSwitchToLogin = () => {
    setAppState('login');
  };

  const handleSwitchToSignUp = () => {
    setAppState('landing');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse-gentle mb-4">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading SecureChat...</p>
        </div>
      </div>
    );
  }

  if (appState === 'dashboard') {
    return (
      <>
        <Dashboard onLogout={handleLogout} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero and Registration/Login Section */}
        <section className="py-12 sm:py-20 lg:py-24">
          <div className="container mx-auto max-w-screen-xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              {/* Left Column - Hero */}
              <div className="order-2 lg:order-1">
                <Hero />
              </div>
              
              {/* Right Column - Authentication Forms */}
              <div className="order-1 lg:order-2 flex flex-col items-center lg:items-end">
                {appState === 'login' ? (
                  <LoginCard 
                    onSuccess={handleLoginSuccess}
                    onSwitchToSignUp={handleSwitchToSignUp}
                  />
                ) : (
                  <SignUpCard />
                )}
                
                <div className="mt-6 w-full max-w-md">
                  <SecurityCallout />
                </div>

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