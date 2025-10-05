import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { testSupabaseConnection } from '@/lib/supabase';
import { Warning, CheckCircle, X } from '@phosphor-icons/react';

export function ConnectionBanner() {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      const result = await testSupabaseConnection();
      setStatus(result);
    };
    
    checkConnection();
  }, []);

  // Don't show banner if connected or user dismissed it
  if (!isVisible || !status || status.connected) {
    return null;
  }

  return (
    <Alert className="border-warning bg-warning/5 mb-4">
      <div className="flex items-start gap-3">
        <Warning className="w-5 h-5 text-warning mt-0.5" />
        <div className="flex-1">
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium mb-1">Supabase Setup Required</div>
                <div className="text-sm text-muted-foreground">
                  To enable full messaging functionality, please configure your Supabase database connection.
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
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