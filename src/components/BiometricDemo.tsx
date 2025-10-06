/**
 * Biometric Demo Component
 * Demonstrates all biometric authentication features for testing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BiometricLogin } from '@/lib/biometric-login';
import { BiometricStorage } from '@/lib/biometric-storage';
import { BiometricSessionAuth } from '@/lib/biometric-session-auth';
import { BiometricSetup } from './BiometricSetup';
import { 
  Fingerprint, 
  DeviceMobile, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Info,
  TestTube,
  Trash,
  Clock
} from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BiometricDemoProps {
  currentUser?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

export function BiometricDemo({ currentUser }: BiometricDemoProps) {
  const [capabilities, setCapabilities] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [lastLoginResult, setLastLoginResult] = useState<any>(null);

  useEffect(() => {
    loadBiometricData();
  }, [currentUser]);

  const loadBiometricData = async () => {
    setIsLoading(true);
    try {
      // Load capabilities
      const caps = await BiometricLogin.getCapabilityInfo();
      setCapabilities(caps);

      if (currentUser) {
        // Load credentials
        const creds = await BiometricStorage.getUserCredentials(currentUser.id);
        setCredentials(creds);

        // Load sessions (mock data since we don't have the sessions table access in this demo)
        const sessionInfo = await BiometricSessionAuth.getCurrentSessionInfo();
        setSessions(sessionInfo.hasSession ? [sessionInfo.sessionInfo] : []);
      }

    } catch (error) {
      console.error('Error loading biometric data:', error);
      toast.error('Failed to load biometric data');
    } finally {
      setIsLoading(false);
    }
  };

  const testBiometricLogin = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing biometric login...');
      const result = await BiometricLogin.login();
      setLastLoginResult(result);
      
      if (result.success) {
        toast.success('Biometric login test successful!');
        await loadBiometricData(); // Refresh data
      } else {
        toast.error(result.error || 'Biometric login test failed');
      }

    } catch (error: any) {
      console.error('Test error:', error);
      setLastLoginResult({ success: false, error: error.message });
      toast.error('Test failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testSessionValidation = async () => {
    setIsLoading(true);
    try {
      const result = await BiometricLogin.validateExistingSession();
      
      if (result.valid) {
        toast.success('Valid session found!');
      } else {
        toast.info('No valid session found');
      }

    } catch (error: any) {
      console.error('Session validation error:', error);
      toast.error('Session validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllSessions = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await BiometricSessionAuth.terminateSession();
      await loadBiometricData();
      toast.success('All sessions cleared');

    } catch (error: any) {
      console.error('Clear sessions error:', error);
      toast.error('Failed to clear sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const removeAllCredentials = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await BiometricLogin.removeCredentials(currentUser.id);
      await loadBiometricData();
      toast.success('All credentials removed');

    } catch (error: any) {
      console.error('Remove credentials error:', error);
      toast.error('Failed to remove credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getBiometricIcon = (type?: string) => {
    if (type?.includes('face') || type?.includes('Face') || type?.includes('Hello')) {
      return <DeviceMobile className="w-5 h-5" />;
    }
    return <Fingerprint className="w-5 h-5" />;
  };

  if (!capabilities) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-r-transparent rounded-full mx-auto mb-4" />
          <p>Loading biometric demo...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Component */}
      {showSetup && currentUser && (
        <BiometricSetup
          userId={currentUser.id}
          userEmail={currentUser.email}
          displayName={currentUser.displayName || 'User'}
          onSetupComplete={() => {
            setShowSetup(false);
            loadBiometricData();
          }}
        />
      )}

      {!showSetup && (
        <>
          {/* Device Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Device Capabilities
              </CardTitle>
              <CardDescription>
                Biometric authentication support on this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {capabilities.isSupported ? 
                    <CheckCircle className="w-5 h-5 text-success" /> :
                    <XCircle className="w-5 h-5 text-destructive" />
                  }
                  <span className="text-sm">WebAuthn Supported</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {capabilities.isAvailable ? 
                    <CheckCircle className="w-5 h-5 text-success" /> :
                    <XCircle className="w-5 h-5 text-destructive" />
                  }
                  <span className="text-sm">Platform Available</span>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Type:</strong> {capabilities.type}</p>
                    <p><strong>Description:</strong> {capabilities.description}</p>
                  </div>
                </AlertDescription>
              </Alert>

              {capabilities.isSupported && capabilities.isAvailable && (
                <Button 
                  onClick={() => setShowSetup(true)}
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Open Setup Wizard
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Test Functions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Functions
              </CardTitle>
              <CardDescription>
                Test biometric authentication functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  onClick={testBiometricLogin}
                  disabled={isLoading || !capabilities.isAvailable}
                  variant="outline"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Fingerprint className="w-4 h-4 mr-2" />
                  )}
                  Test Login
                </Button>

                <Button 
                  onClick={testSessionValidation}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Validate Session
                </Button>
              </div>

              {lastLoginResult && (
                <Alert className={lastLoginResult.success ? 'border-success' : 'border-destructive'}>
                  {lastLoginResult.success ? 
                    <CheckCircle className="h-4 w-4 text-success" /> :
                    <XCircle className="h-4 w-4 text-destructive" />
                  }
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Last Test Result:</strong> {lastLoginResult.success ? '✓ Success' : '✗ Failed'}</p>
                      {lastLoginResult.error && <p><strong>Error:</strong> {lastLoginResult.error}</p>}
                      {lastLoginResult.sessionToken && <p><strong>Session:</strong> Created</p>}
                      {lastLoginResult.user && <p><strong>User:</strong> {lastLoginResult.user.email}</p>}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Current User Info */}
          {currentUser && (
            <>
              {/* Stored Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5" />
                    Biometric Credentials
                    <Badge variant="outline">{credentials.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Registered biometric credentials for {currentUser.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {credentials.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No biometric credentials registered. Use the setup wizard to add biometric authentication.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {credentials.map((cred) => (
                        <div key={cred.credential_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getBiometricIcon(cred.type)}
                            <div>
                              <p className="font-medium">{cred.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Added: {formatDate(cred.created_at)}
                                {cred.last_used && ` • Last used: ${formatDate(cred.last_used)}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant={cred.is_active ? 'default' : 'secondary'}>
                            {cred.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {credentials.length > 0 && (
                    <Button 
                      onClick={removeAllCredentials}
                      disabled={isLoading}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Remove All Credentials
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Active Sessions
                    <Badge variant="outline">{sessions.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Current biometric authentication sessions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessions.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No active biometric sessions found.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Session {session.id.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">
                              Created: {formatDate(session.created_at)} • 
                              Expires: {formatDate(session.expires_at)}
                            </p>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {sessions.length > 0 && (
                    <Button 
                      onClick={clearAllSessions}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Clear All Sessions
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!currentUser && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please log in to view your biometric credentials and sessions.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}