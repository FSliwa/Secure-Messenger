import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { testDatabaseConnection } from '@/lib/database-setup';
import { Warning, CheckCircle, X, Info, Database } from '@phosphor-icons/react';

export function ConnectionBanner() {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      try {
        const result = await testDatabaseConnection();
        setStatus(result);
      } catch (error) {
        setStatus({
          connected: false,
          databaseReady: false,
          error: 'Connection test failed',
          message: 'Unable to test connection. Please refresh and try again.',
          status: 'connection_failed'
        });
      }
      setIsLoading(false);
    };
    
    checkConnection();
  }, []);

  // Don't show banner if database is ready or user dismissed it
  if (!isVisible || isLoading || (status && status.databaseReady)) {
    return null;
  }

  // Show success banner briefly for connected state
  if (status && status.connected && status.status === 'ready') {
    return (
      <Alert className="border-success bg-success/5 mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div className="flex-1">
            <AlertDescription className="text-success">
              ✅ Supabase connected successfully - All systems ready
            </AlertDescription>
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
      </Alert>
    );
  }

  return (
    <Alert className="border-warning bg-warning/5 mb-4">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertDescription>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-2 text-warning">
                  {status?.status === 'schema_missing' && 'Database Schema Setup Required'}
                  {status?.status === 'schema_partial' && 'Database Schema Incomplete'}
                  {status?.status === 'connection_failed' && 'Supabase Connection Failed'}
                  {!status?.status && 'Database Setup Required'}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {status?.message || 'Database tables are missing. Follow the setup instructions below.'}
                </div>
                
                {/* Show specific setup instructions based on status */}
                {(status?.status === 'schema_missing' || status?.status === 'schema_partial') && (
                  <div className="text-xs bg-muted p-3 rounded border-l-2 border-warning">
                    <div className="font-medium mb-2">Database Setup Instructions:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to your <strong>Supabase Dashboard</strong> → SQL Editor</li>
                      <li>Copy and run the SQL from <code>src/database/schema.sql</code></li>
                      <li>Ensure all tables are created successfully</li>
                      <li>Refresh this page to verify the setup</li>
                    </ol>
                    {status?.missingTables && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="font-medium mb-1">Missing tables:</div>
                        <div className="text-muted-foreground">
                          {status.missingTables.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {status?.status === 'connection_failed' && (
                  <div className="text-xs bg-muted p-3 rounded border-l-2 border-warning">
                    <div className="font-medium mb-2">Connection Troubleshooting:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Verify your Supabase project URL and API key</li>
                      <li>Check that your project is active and not paused</li>
                      <li>Ensure network connectivity to Supabase</li>
                      <li>Check browser console for additional error details</li>
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