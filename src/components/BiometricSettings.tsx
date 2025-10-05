import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { BiometricAuthService, BiometricCredential } from '@/lib/biometric-auth';
import { Fingerprint, Shield, Plus, Trash, CheckCircle, Warning, DeviceMobile } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BiometricSettingsProps {
  userId: string;
  userName: string;
  displayName: string;
}

export function BiometricSettings({ userId, userName, displayName }: BiometricSettingsProps) {
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    isSupported: boolean;
    isPlatformAvailable: boolean;
    type: string;
    description: string;
  }>({
    isSupported: false,
    isPlatformAvailable: false,
    type: 'none',
    description: 'Checking biometric capabilities...'
  });

  useEffect(() => {
    checkCapabilities();
    loadCredentials();
  }, [userId]);

  const checkCapabilities = async () => {
    try {
      const caps = await BiometricAuthService.getBiometricCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({
        isSupported: false,
        isPlatformAvailable: false,
        type: 'none',
        description: 'Error checking biometric capabilities'
      });
    }
  };

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const creds = await BiometricAuthService.getBiometricCredentials(userId);
      setCredentials(creds);
    } catch (error) {
      console.error('Error loading biometric credentials:', error);
      toast.error('Failed to load biometric credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBiometric = async () => {
    setIsRegistering(true);
    try {
      await BiometricAuthService.registerBiometric(userId, userName, displayName);
      await loadCredentials();
      toast.success('Biometric authentication registered successfully!');
    } catch (error: any) {
      console.error('Error registering biometric:', error);
      toast.error(error.message || 'Failed to register biometric authentication');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    try {
      await BiometricAuthService.removeBiometricCredential(credentialId);
      await loadCredentials();
    } catch (error: any) {
      console.error('Error removing credential:', error);
      toast.error(error.message || 'Failed to remove biometric credential');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBiometricIcon = (type: string) => {
    switch (type) {
      case 'faceId':
        return <DeviceMobile className="w-5 h-5" />;
      case 'touchId':
        return <Fingerprint className="w-5 h-5" />;
      default:
        return <Fingerprint className="w-5 h-5" />;
    }
  };

  if (!capabilities.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with fingerprint or face recognition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Warning className="h-4 w-4" />
            <AlertDescription>
              Biometric authentication is not supported on this device or browser. 
              Please use a modern browser with WebAuthn support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!capabilities.isPlatformAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with fingerprint or face recognition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Warning className="h-4 w-4" />
            <AlertDescription>
              Platform authenticator (Touch ID, Face ID, Windows Hello) is not available on this device.
              Please ensure your device supports biometric authentication and it's enabled in system settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          {capabilities.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Available: {capabilities.type}</h4>
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Supported
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {credentials.length} registered credential{credentials.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={handleRegisterBiometric}
            disabled={isRegistering}
            size="sm"
            className="flex items-center gap-2"
          >
            {isRegistering ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Biometric
              </>
            )}
          </Button>
        </div>

        {credentials.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Registered Biometrics</h4>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                  Loading credentials...
                </div>
              ) : (
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {getBiometricIcon(cred.type)}
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{cred.name}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Added: {formatDate(cred.createdAt)}</span>
                            {cred.lastUsed && (
                              <span>Last used: {formatDate(cred.lastUsed)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCredential(cred.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Security Note:</strong> Biometric data is stored securely on your device and never transmitted to our servers. 
            Only cryptographic keys are stored for authentication purposes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}