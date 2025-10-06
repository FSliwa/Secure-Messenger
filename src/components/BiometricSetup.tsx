/**
 * Biometric Setup Component
 * Helps users set up and test biometric authentication
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BiometricLogin } from '@/lib/biometric-login';
import { BiometricStorage } from '@/lib/biometric-storage';
import { Fingerprint, CheckCircle, XCircle, Warning, Shield, DeviceMobile } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BiometricSetupProps {
  userId: string;
  userEmail: string;
  displayName: string;
  onSetupComplete?: () => void;
}

export function BiometricSetup({ userId, userEmail, displayName, onSetupComplete }: BiometricSetupProps) {
  const [step, setStep] = useState<'check' | 'setup' | 'test' | 'complete'>('check');
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    isSupported: boolean;
    isAvailable: boolean;
    type: string;
    description: string;
  }>({
    isSupported: false,
    isAvailable: false,
    type: 'none',
    description: 'Checking...'
  });
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);

  useEffect(() => {
    checkCapabilitiesAndCredentials();
  }, [userId]);

  const checkCapabilitiesAndCredentials = async () => {
    setIsLoading(true);
    try {
      // Check biometric capabilities
      const caps = await BiometricLogin.getCapabilityInfo();
      setCapabilities(caps);

      // Check for existing credentials
      const hasCredentials = await BiometricLogin.hasCredentials(userId);
      setHasExistingCredentials(hasCredentials);

      if (hasCredentials) {
        setStep('complete');
        setSetupProgress(100);
      } else if (caps.isSupported && caps.isAvailable) {
        setStep('setup');
        setSetupProgress(25);
      } else {
        setStep('check');
        setSetupProgress(0);
      }

    } catch (error) {
      console.error('Error checking capabilities:', error);
      toast.error('Failed to check biometric capabilities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    setIsLoading(true);
    setSetupProgress(50);
    
    try {
      const success = await BiometricLogin.registerForUser(userId, userEmail, displayName);
      
      if (success) {
        setSetupProgress(75);
        setStep('test');
        toast.success('Biometric setup completed! Now test your authentication.');
      } else {
        setSetupProgress(25);
        toast.error('Biometric setup failed. Please try again.');
      }

    } catch (error: any) {
      console.error('Setup error:', error);
      setSetupProgress(25);
      toast.error(error.message || 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    
    try {
      const result = await BiometricLogin.login();
      
      if (result.success) {
        setSetupProgress(100);
        setStep('complete');
        toast.success('Biometric authentication test successful!');
        onSetupComplete?.();
      } else {
        toast.error(result.error || 'Biometric test failed');
      }

    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(error.message || 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCredentials = async () => {
    setIsLoading(true);
    
    try {
      await BiometricLogin.removeCredentials(userId);
      setHasExistingCredentials(false);
      setStep('setup');
      setSetupProgress(25);
      
    } catch (error: any) {
      console.error('Remove credentials error:', error);
      toast.error(error.message || 'Failed to remove credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (capabilities.type.includes('Face ID') || capabilities.type.includes('Windows Hello')) {
      return <DeviceMobile className="w-8 h-8" />;
    }
    return <Fingerprint className="w-8 h-8" />;
  };

  const getStepIcon = () => {
    switch (step) {
      case 'check':
        return capabilities.isSupported && capabilities.isAvailable ? 
          <CheckCircle className="w-6 h-6 text-success" /> :
          <XCircle className="w-6 h-6 text-destructive" />;
      case 'setup':
        return <Shield className="w-6 h-6 text-primary" />;
      case 'test':
        return <Warning className="w-6 h-6 text-warning" />;
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-success" />;
      default:
        return <Shield className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {getBiometricIcon()}
          <div>
            <div className="flex items-center gap-2">
              Biometric Authentication Setup
              {step === 'complete' && <Badge variant="secondary" className="text-success">✓ Active</Badge>}
            </div>
            <CardDescription className="mt-1">
              {capabilities.description}
            </CardDescription>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Setup Progress</span>
            <span className="font-medium">{setupProgress}%</span>
          </div>
          <Progress value={setupProgress} className="h-2" />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          {getStepIcon()}
          <div>
            <p className="font-medium">
              {step === 'check' && 'Checking Compatibility'}
              {step === 'setup' && 'Ready to Set Up'}
              {step === 'test' && 'Test Authentication'}
              {step === 'complete' && 'Setup Complete'}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === 'check' && 'Verifying your device supports biometric authentication'}
              {step === 'setup' && 'Register your biometric authentication'}
              {step === 'test' && 'Verify your biometric authentication works'}
              {step === 'complete' && 'Biometric authentication is active and ready to use'}
            </p>
          </div>
        </div>

        {/* Device Compatibility Check */}
        {step === 'check' && (
          <Alert className={capabilities.isSupported && capabilities.isAvailable ? '' : 'border-destructive'}>
            <Warning className="h-4 w-4" />
            <AlertDescription>
              {capabilities.isSupported && capabilities.isAvailable ? (
                <div className="space-y-2">
                  <p className="font-medium text-success">✓ Your device supports biometric authentication</p>
                  <ul className="text-sm space-y-1">
                    <li>• Type: <strong>{capabilities.type}</strong></li>
                    <li>• Browser supports WebAuthn API</li>
                    <li>• Platform authenticator available</li>
                  </ul>
                  <Button onClick={() => setStep('setup')} className="mt-4">
                    Continue Setup
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">✗ Biometric authentication not available</p>
                  <ul className="text-sm space-y-1">
                    {!capabilities.isSupported && <li>• Browser doesn't support WebAuthn</li>}
                    {capabilities.isSupported && !capabilities.isAvailable && <li>• No platform authenticator found</li>}
                  </ul>
                  <p className="text-sm mt-2">
                    Please ensure you're using a modern browser and your device has biometric authentication enabled.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Ready to set up {capabilities.type}</strong></p>
                  <p className="text-sm">
                    When you click "Set Up", your browser will prompt you to use your biometric authentication.
                    Follow the on-screen instructions to complete the setup.
                  </p>
                  
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-medium mb-2">What to expect:</p>
                    <ul className="space-y-1">
                      <li>• Browser security prompt</li>
                      <li>• Biometric authentication request</li>
                      <li>• Secure credential storage</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleSetup} 
              disabled={isLoading}
              className="w-full h-12"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
                  Setting up {capabilities.type}...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Set Up {capabilities.type}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Test Step */}
        {step === 'test' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p><strong>Setup complete! Now test your authentication.</strong></p>
                  <p className="text-sm">
                    Click "Test Authentication" to verify your biometric login works correctly.
                    This will simulate the login process.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleTest} 
              disabled={isLoading}
              className="w-full h-12"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  {getBiometricIcon()}
                  <span className="ml-2">Test {capabilities.type}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-4">
            <Alert className="border-success">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium text-success">✓ Biometric authentication is ready!</p>
                  <p className="text-sm">
                    You can now use {capabilities.type} to sign in to your account quickly and securely.
                    Look for the biometric login option on the sign-in page.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                onClick={handleTest} 
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {getBiometricIcon()}
                    <span className="ml-2">Test Again</span>
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleRemoveCredentials} 
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                Remove Setup
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}