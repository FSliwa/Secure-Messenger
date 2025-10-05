import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BiometricAuthService } from '@/lib/biometric-auth';
import { supabase } from '@/lib/supabase';
import { Fingerprint, DeviceMobile } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BiometricLoginButtonProps {
  onSuccess: (user: any) => void;
  className?: string;
}

export function BiometricLoginButton({ onSuccess, className }: BiometricLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await BiometricAuthService.getBiometricCapabilities();
      setIsAvailable(capabilities.isSupported && capabilities.isPlatformAvailable);
      setBiometricType(capabilities.type);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    
    try {
      // For now, show a demo message since full biometric integration requires
      // more complex server-side implementation
      toast.info('Biometric authentication is in development. Please use regular login for now.');
      
    } catch (error: any) {
      console.error('Biometric login error:', error);
      
      if (error.message.includes('cancelled')) {
        toast.error('Biometric authentication was cancelled');
      } else {
        toast.error(error.message || 'Biometric login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return null;
  }

  const getBiometricIcon = () => {
    if (biometricType.includes('Face ID') || biometricType.includes('face')) {
      return <DeviceMobile className="w-5 h-5" />;
    }
    return <Fingerprint className="w-5 h-5" />;
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBiometricLogin}
      disabled={isLoading}
      className={`w-full flex items-center gap-2 ${className || ''}`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-r-transparent rounded-full animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          {getBiometricIcon()}
          Sign in with {biometricType || 'Biometric'}
        </>
      )}
    </Button>
  );
}