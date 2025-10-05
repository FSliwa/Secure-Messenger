import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { testSupabaseConnection } from '@/lib/supabase';
import { Warning, CheckCircle, X, Info } from '@phosphor-icons/react';

export function ConnectionBanner() {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      try {
        const result = await testSupabaseConnection();
        setStatus(result);
      } catch (error) {
        setStatus({
          connected: false,
          error: 'Connection test failed',
          message: 'Unable to test connection. Please refresh and try again.',
          needsSetup: true
        });
      }
      setIsLoading(false);
    };
    
    checkConnection();
  }, []);

  // Don't show banner if connected or user dismissed it
  if (!isVisible || isLoading || (status && status.connected)) {
    return null;
  }

  return (
    <Alert className="border-warning bg-warning/5 mb-4">
      <div className="flex items-start gap-3">
        <Warning className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertDescription>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-2 text-warning">
                  {status?.error || 'Supabase Setup Required'}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {status?.message || 'To enable full messaging functionality, please configure your Supabase database connection.'}
                </div>
                
                {/* Show specific troubleshooting steps */}
                {status?.error?.includes('Invalid API key') && (
                  <div className="text-xs bg-muted p-3 rounded border-l-2 border-warning">
                    <div className="font-medium mb-1">Quick Fix:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Check your .env file contains valid VITE_SUPABASE_ANON_KEY</li>
                      <li>Verify the API key from your Supabase project dashboard</li>
                      <li>Restart the development server after making changes</li>
                    </ol>
                  </div>
                )}
                
                {status?.error?.includes('environment variables') && (
                  <div className="text-xs bg-muted p-3 rounded border-l-2 border-warning">
                    <div className="font-medium mb-1">Environment Setup:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Create a .env file in your project root</li>
                      <li>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                )}
                
                {status?.error?.includes('Database tables') && (
                  <div className="text-xs bg-muted p-3 rounded border-l-2 border-warning">
                    <div className="font-medium mb-1">Database Setup:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to your Supabase project → SQL Editor</li>
                      <li>Run the SQL script from SUPABASE_SETUP.md</li>
                      <li>Refresh this page to test the connection</li>
                    </ol>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}