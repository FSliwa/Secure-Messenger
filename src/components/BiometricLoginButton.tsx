import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BiometricLogin } from '@/lib/biometric-login';
import { Fingerprint, DeviceMobile, FaceMask, Eye } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BiometricLoginButtonProps {
  onSuccess: (user: any) => void;
  className?: string;
}

export function BiometricLoginButton({ onSuccess, className }: BiometricLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [supportedTypes, setSupportedTypes] = useState<string[]>([]);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await BiometricLogin.getCapabilityInfo();
      setIsAvailable(capabilities.isSupported && capabilities.isAvailable);
      setBiometricType(capabilities.type);
      
      // Check for multiple biometric types
      const types: string[] = [];
      if (capabilities.type.includes('fingerprint') || capabilities.type.includes('touch')) {
        types.push('fingerprint');
      }
      if (capabilities.type.includes('face') || capabilities.type.includes('Face ID')) {
        types.push('face');
      }
      if (capabilities.type.includes('iris') || capabilities.type.includes('eye')) {
        types.push('iris');
      }
      
      setSupportedTypes(types);
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
        
        toast.success('Biometric authentication successful!');
        onSuccess(userObject);
      } else {
        console.log('❌ Biometric login failed:', result.error);
        toast.error(result.error || 'Biometric login failed');
      }
      
    } catch (error: any) {
      console.error('Biometric login error:', error);
      
      if (error.message?.includes('cancelled')) {
        toast.error('Biometric authentication was cancelled');
      } else if (error.message?.includes('not available')) {
        toast.error('Biometric authentication is not available on this device');
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
    // Show multiple icons if multiple types are supported
    if (supportedTypes.length > 1) {
      return (
        <div className="flex items-center gap-2">
          {supportedTypes.includes('fingerprint') && <Fingerprint className="w-5 h-5 icon-enhanced" />}
          {supportedTypes.includes('face') && <FaceMask className="w-5 h-5 icon-enhanced" />}
          {supportedTypes.includes('iris') && <Eye className="w-5 h-5 icon-enhanced" />}
        </div>
      );
    }
    
    // Single icon based on primary type
    if (biometricType.includes('Face ID') || biometricType.includes('face')) {
      return <FaceMask className="w-5 h-5 icon-enhanced" />;
    }
    if (biometricType.includes('iris') || biometricType.includes('eye')) {
      return <Eye className="w-5 h-5 icon-enhanced" />;
    }
    return <Fingerprint className="w-5 h-5 icon-enhanced" />;
  };

  const getButtonText = () => {
    return 'Sign in with Auth';
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBiometricLogin}
      disabled={isLoading}
      className={`w-full flex items-center gap-3 border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-foreground font-semibold facebook-button transition-all ${className || ''}`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-r-transparent rounded-full animate-spin" />
          <span className="font-medium">Authenticating...</span>
        </>
      ) : (
        <>
          {getBiometricIcon()}
          <span className="font-medium">{getButtonText()}</span>
        </>
      )}
    </Button>
  );
}