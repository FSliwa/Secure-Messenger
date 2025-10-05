import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { testSupabaseConnection } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  ArrowClockwise, 
  Database,
  ArrowSquareOut 
} from '@phosphor-icons/react';

interface ConnectionStatus {
  connected: boolean;
  error: string | null;
  message: string;
  needsSetup?: boolean;
}

export function SupabaseStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testSupabaseConnection();
      setStatus(result);
    } catch (error) {
      setStatus({
        connected: false,
        error: 'Connection test failed',
        message: 'Unable to test Supabase connection',
        needsSetup: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    if (isLoading) {
      return <ArrowClockwise className="w-5 h-5 animate-spin text-muted-foreground" />;
    }
    
    if (!status) return null;
    
    if (status.connected) {
      return <CheckCircle className="w-5 h-5 text-success" />;
    } else if (status.needsSetup) {
      return <Warning className="w-5 h-5 text-warning" />;
    } else {
      return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Testing...</Badge>;
    }
    
    if (!status) return null;
    
    if (status.connected) {
      return <Badge variant="default" className="bg-success text-success-foreground">Connected</Badge>;
    } else if (status.needsSetup) {
      return <Badge variant="destructive" className="bg-warning text-warning-foreground">Setup Required</Badge>;
    } else {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Supabase Connection</CardTitle>
              <CardDescription>Database and authentication status</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={isLoading}
            >
              <ArrowClockwise className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Test
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status && (
          <Alert className={
            status.connected 
              ? "border-success bg-success/5" 
              : status.needsSetup 
                ? "border-warning bg-warning/5"
                : "border-destructive bg-destructive/5"
          }>
            <div className="flex items-start gap-3">
              {getStatusIcon()}
              <div className="flex-1">
                <AlertDescription className="text-sm">
                  <div className="font-medium mb-1">
                    {status.connected ? 'Connection Successful' : 'Setup Required'}
                  </div>
                  <div className="text-muted-foreground">
                    {status.message}
                  </div>
                  {status.error && (
                    <div className="text-xs mt-2 font-mono bg-muted/50 p-2 rounded">
                      Error: {status.error}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {status?.needsSetup && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Quick Setup Steps:</div>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Create a free account at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">supabase.com <ArrowSquareOut className="w-3 h-3" /></a></li>
              <li>Create a new project and copy your URL and API key</li>
              <li>Create a <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file with your credentials</li>
              <li>Run the SQL setup script from the setup guide</li>
            </ol>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/SUPABASE_SETUP.md', '_blank')}
              className="w-full"
            >
              <ArrowSquareOut className="w-4 h-4 mr-2" />
              View Complete Setup Guide
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="text-sm text-success bg-success/5 p-3 rounded-md border border-success/20">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle className="w-4 h-4" />
              Ready to use!
            </div>
            <div className="text-success/80">
              Your SecureChat app is fully connected to Supabase. You can now register accounts, send messages, and use all features.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}