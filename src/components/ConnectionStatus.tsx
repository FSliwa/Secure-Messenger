import { useState, useEffect } from 'react';
import { testSupabaseConnection } from '@/lib/supabase';
import { CheckCircle, XCircle, Spinner } from '@phosphor-icons/react';

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [status, setStatus] = useState<{
    connected: boolean;
    error: string | null;
    message: string;
  } | null>(null);
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
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Connection test failed'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking connection...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${
      status.connected ? 'text-success' : 'text-destructive'
    }`}>
      {status.connected ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {status.connected ? 'Connected' : 'Disconnected'}
      </span>
      {showDetails && (
        <span className="text-xs text-muted-foreground">
          {status.message}
        </span>
      )}
    </div>
  );
}