import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BiometricLogin } from '@/lib/biometric-login';
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
      const capabilities = await BiometricLogin.getCapabilityInfo();
      setIsAvailable(capabilities.isSupported && capabilities.isAvailable);
      setBiometricType(capabilities.type);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔐 Starting biometric login...');
      
      const result = await BiometricLogin.login();
      
      if (result.success && result.user) {
        console.log('✅ Biometric login successful');
        
        // Create user object for callback
        const userObject = {
          id: result.user.id,
          username: result.user.profile?.username || result.user.email?.split('@')[0] || 'user',
          email: result.user.email || '',
          displayName: result.user.profile?.display_name || result.user.email?.split('@')[0] || 'User'
        };
        
        onSuccess(userObject);
      } else {
        console.log('❌ Biometric login failed:', result.error);
        toast.error(result.error || 'Biometric login failed');
      }
      
    } catch (error: any) {
      console.error('Biometric login error:', error);
      
      if (error.message?.includes('cancelled')) {
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