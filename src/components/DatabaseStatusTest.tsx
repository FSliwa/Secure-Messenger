import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testDatabaseConnection, getDatabaseStatus } from '@/lib/database-setup';
import { CheckCircle, X, Database, Warning } from '@phosphor-icons/react';

export function DatabaseStatusTest() {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    try {
      const [connectionResult, dbStatus] = await Promise.all([
        testDatabaseConnection(),
        getDatabaseStatus()
      ]);
      
      setStatus({
        connection: connectionResult,
        database: dbStatus
      });
      setLastChecked(new Date());
    } catch (error) {
      setStatus({
        connection: {
          connected: false,
          databaseReady: false,
          message: 'Test failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        database: { allExist: false, noneExist: true, tables: {} }
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    runTest();
  }, []);

  const getStatusIcon = (connected: boolean, ready: boolean) => {
    if (connected && ready) return <CheckCircle className="w-5 h-5 text-success" />;
    if (connected && !ready) return <Warning className="w-5 h-5 text-warning" />;
    return <X className="w-5 h-5 text-destructive" />;
  };

  const getStatusColor = (connected: boolean, ready: boolean) => {
    if (connected && ready) return 'border-success bg-success/5';
    if (connected && !ready) return 'border-warning bg-warning/5';
    return 'border-destructive bg-destructive/5';
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-6 h-6" />
          Database Status Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Button onClick={runTest} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Run Test'}
          </Button>
          {lastChecked && (
            <span className="text-sm text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        {status && (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className={`p-4 rounded-lg border ${getStatusColor(status.connection.connected, status.connection.databaseReady)}`}>
              <div className="flex items-start gap-3">
                {getStatusIcon(status.connection.connected, status.connection.databaseReady)}
                <div className="flex-1">
                  <h3 className="font-medium">
                    Connection Status: {status.connection.status || 'unknown'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {status.connection.message}
                  </p>
                  {status.connection.error && (
                    <p className="text-xs text-destructive mt-2 font-mono">
                      Error: {status.connection.error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Database Tables Status */}
            <div className="p-4 rounded-lg border bg-muted/5">
              <h3 className="font-medium mb-3">Database Tables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(status.database.tables || {}).map(([table, exists]) => (
                  <div key={table} className="flex items-center gap-2">
                    {exists ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm">{table}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm">
                  <span className="font-medium">Summary: </span>
                  {status.database.allExist && (
                    <span className="text-success">All tables exist ✓</span>
                  )}
                  {status.database.noneExist && (
                    <span className="text-destructive">No tables found - setup required</span>
                  )}
                  {status.database.partialSetup && (
                    <span className="text-warning">Partial setup - some tables missing</span>
                  )}
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            {!status.connection.databaseReady && (
              <div className="p-4 rounded-lg border border-info bg-info/5">
                <h3 className="font-medium mb-2">Setup Required</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Navigate to SQL Editor</li>
                  <li>Run the SQL from <code>src/database/schema.sql</code></li>
                  <li>Refresh this test to verify setup</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}