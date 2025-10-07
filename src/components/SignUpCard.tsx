import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Spinner, ArrowClockwise } from "@phosphor-icons/react";
import { generateKeyPair, storeKeys, EncryptionProgress } from "@/lib/crypto";
import { signUp, checkUsernameAvailability } from "@/lib/supabase";
import { SimpleRetryIndicator } from './RetryStatusDisplay'
import { NetworkStatusIndicator } from './NetworkStatusIndicator'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  executeWithNetworkAwareRetry, 
  RetryResult
} from '@/lib/auth-retry'
import { 
  AUTH_RETRY_CONFIG, 
  getErrorMessage, 
  shouldRetryError 
} from '@/lib/auth-config'

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

interface SignUpProps {
  onSuccess?: (user: User) => void;
  onSwitchToLogin?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  birthday: {
    day: string;
    month: string;
    year: string;
  };
  gender: string;
  acceptTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  birthday?: string;
  gender?: string;
  acceptTerms?: string;
}

export function SignUpCard({ onSuccess, onSwitchToLogin }: SignUpProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    birthday: { day: '', month: '', year: '' },
    gender: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [keyGenerationStep, setKeyGenerationStep] = useState<'idle' | 'generating' | 'complete'>('idle');
  const [encryptionProgress, setEncryptionProgress] = useState<EncryptionProgress | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  const validateField = (name: string, value: any) => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.length < 2) return 'First name must be at least 2 characters';
        break;
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.length < 2) return 'Last name must be at least 2 characters';
        break;
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        break;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        break;
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        break;
      case 'acceptTerms':
        if (!value) return 'You must accept the terms and conditions';
        break;
    }
    return '';
  };

  const validateUsernameAvailability = async (username: string) => {
    if (!username.trim() || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return // Don't check availability if basic validation fails
    }

    setIsCheckingUsername(true)
    try {
      const { available } = await checkUsernameAvailability(username)
      if (!available) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }))
      } else {
        // Clear username error if it was about availability
        setErrors(prev => {
          const newErrors = { ...prev }
          if (newErrors.username === 'Username is already taken') {
            delete newErrors.username
          }
          return newErrors
        })
      }
    } catch (error) {
      console.error('Failed to check username availability:', error)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Check username availability with debounce effect
    if (name === 'username' && value.trim().length >= 3) {
      // Clear previous timeout
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      
      // Set new timeout
      const timeoutId = setTimeout(() => {
        validateUsernameAvailability(value);
      }, 500); // 500ms debounce
      
      setUsernameCheckTimeout(timeoutId);
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    newErrors.firstName = validateField('firstName', formData.firstName);
    newErrors.lastName = validateField('lastName', formData.lastName);
    newErrors.username = validateField('username', formData.username);
    newErrors.email = validateField('email', formData.email);
    newErrors.password = validateField('password', formData.password);
    newErrors.acceptTerms = validateField('acceptTerms', formData.acceptTerms);

    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof FormErrors]) {
        delete newErrors[key as keyof FormErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submission started');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      toast.error('Please fix the errors in the form');
      return;
    }

    console.log('✅ Form validation passed');

    // Final check for username availability
    try {
      console.log('🔍 Checking username availability...');
      const { available } = await checkUsernameAvailability(formData.username);
      if (!available) {
        console.log('❌ Username not available');
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        toast.error('Username is already taken');
        return;
      }
      console.log('✅ Username is available');
    } catch (error) {
      console.error('❌ Username check error:', error);
      toast.error('Failed to verify username availability');
      return;
    }

    setIsSubmitting(true);
    setLastError(null);
    setRetryCount(0);
    setIsRetrying(false);
    
    try {
      const displayName = `${formData.firstName} ${formData.lastName}`;
      
      // Generate encryption keys first
      setKeyGenerationStep('generating');
      toast.loading('Generating your post-quantum encryption keys...', { id: 'signup-process' });
      
      const keyPair = await generateKeyPair((progress) => {
        setEncryptionProgress(progress);
        toast.loading(`${progress.message} (${Math.round(progress.progress)}%)`, { id: 'signup-process' });
      });
      
      // Store keys locally
      await storeKeys(keyPair);
      setKeyGenerationStep('complete');
      
      // Create signup operation with retry mechanism
      const signupOperation = async () => {
        return await signUp(formData.email, formData.password, displayName, keyPair.publicKey, formData.username);
      };

      // Execute signup with retry mechanism
      toast.loading('Creating your account...', { id: 'signup-process' });
      
      const result: RetryResult<any> = await executeWithNetworkAwareRetry(
        signupOperation,
        AUTH_RETRY_CONFIG.AUTHENTICATION,
        'Account Creation'
      );

      if (!result.success) {
        console.log('❌ Signup failed after all retries');
        setLastError(result.error?.message || 'Account creation failed');
        setRetryCount(result.attempts.length);
        
        const userMessage = getErrorMessage(result.error!);
        toast.error(userMessage, {
          id: 'signup-process',
          description: shouldRetryError(result.error!) 
            ? `Failed after ${result.attempts.length} attempts`
            : 'Please try again with different information'
        });
        return;
      }

      const user = result.data?.user;
      const session = result.data?.session;

      // Show success message if retries were needed
      if (result.attempts.length > 0) {
        toast.success(`Account created after ${result.attempts.length + 1} attempts!`, { id: 'signup-process' });
      }

      if (user && !user.email_confirmed_at) {
        toast.success('Account created successfully! Please check your email to verify your account.', { 
          id: 'signup-process',
          description: 'You must verify your email before you can sign in. Check your inbox and spam folder.',
          duration: 10000 
        });

        console.log('✅ Account created, email confirmation required:', {
          userId: user.id,
          email: user.email,
          emailConfirmed: false
        });
      } else if (user && user.email_confirmed_at) {
        // Email was automatically confirmed (e.g., in development)
        toast.success('Account created and verified successfully!', { 
          id: 'signup-process',
          description: 'You can now sign in to your account.',
          duration: 6000 
        });

        console.log('✅ Account created and automatically confirmed:', {
          userId: user.id,
          email: user.email,
          emailConfirmed: true
        });
      } else {
        toast.warning('Account created but verification status unclear.', {
          id: 'signup-process',
          description: 'Please check your email for verification instructions.',
          duration: 8000
        });
      }

      // Reset form
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        birthday: { day: '', month: '', year: '' },
        gender: '',
        acceptTerms: false,
      });
      setErrors({});
      setRetryCount(0);
      setLastError(null);
      
      // Switch to login view instead of calling onSuccess
      onSwitchToLogin?.();

    } catch (error: any) {
      console.error('Signup error:', error);
      setLastError(error.message);
      const userMessage = getErrorMessage(error);
      toast.error(userMessage, { 
        id: 'signup-process' 
      });
    } finally {
      setIsSubmitting(false);
      setIsRetrying(false);
      setKeyGenerationStep('idle');
    }
  }

  const inputClassName = (hasError: boolean) => `
    ${hasError ? 'border-destructive focus:ring-destructive' : ''}
  `;

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <Card className="facebook-card">
        <CardContent className="p-4 sm:p-6 md:p-8">


          {/* Network Status */}
          <div className="mb-6 sm:mb-8">
            <NetworkStatusIndicator className="justify-center" />
          </div>

          {/* Retry Status Banner */}
          {(retryCount > 0 || lastError || isRetrying) && (
            <div className="mb-6 sm:mb-8">
              <SimpleRetryIndicator
                isRetrying={isRetrying}
                retryCount={retryCount}
                operation="signup"
                error={lastError || undefined}
                className="p-4 bg-muted/30 rounded-lg border text-sm"
              />
            </div>
          )}

          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">{t.createNewAccount}</h2>
            <p className="text-sm sm:text-base text-foreground/80">{t.quickAndEasy}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Input
                  placeholder={t.firstName}
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`facebook-input h-12 ${inputClassName(!!errors.firstName)}`}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-xs sm:text-sm text-destructive mt-2 px-2 font-medium">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Input
                  placeholder={t.lastName}
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`facebook-input h-12 ${inputClassName(!!errors.lastName)}`}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-xs sm:text-sm text-destructive mt-2 px-2 font-medium">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder={t.username}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`facebook-input h-12 ${inputClassName(!!errors.username)}`}
                  disabled={isSubmitting}
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Spinner className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.username && (
                <p className="text-xs sm:text-sm text-destructive px-2 font-medium">{errors.username}</p>
              )}
              <p className="text-xs sm:text-sm text-foreground/70 px-2">
                {t.usernameHelper}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t.email}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`facebook-input h-12 ${inputClassName(!!errors.email)}`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs sm:text-sm text-destructive px-2 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Input
                type="password"
                placeholder={t.newPassword}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`facebook-input h-12 ${inputClassName(!!errors.password)}`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-xs sm:text-sm text-destructive px-2 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="pt-2">
              <div className="flex items-start space-x-3 px-2">
                <Checkbox
                  id="accept-terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => handleInputChange('acceptTerms', checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 min-h-[20px] min-w-[20px]"
                />
                <Label htmlFor="accept-terms" className="text-sm sm:text-base text-foreground/90 leading-relaxed cursor-pointer">
                  {t.acceptTerms}
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-xs sm:text-sm text-destructive mt-2 px-2 font-medium">{errors.acceptTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 sm:pt-4">
              <Button
                type="submit"
                className="w-full facebook-button btn-primary-enhanced bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 sm:py-4 text-base sm:text-lg h-12 sm:h-14"
                disabled={isSubmitting || isRetrying}
              >
                {isSubmitting || isRetrying ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="w-4 h-4 animate-spin" />
                    {isRetrying ? (
                      'Reconnecting...'
                    ) : keyGenerationStep === 'generating' ? (
                      <div className="flex flex-col">
                        <span>Securing Account...</span>
                        {encryptionProgress && (
                          <span className="text-xs opacity-75">
                            {encryptionProgress.message}
                          </span>
                        )}
                      </div>
                    ) : (
                      'Creating Account...'
                    )}
                  </div>
                ) : retryCount > 0 ? (
                  <>
                    <ArrowClockwise className="mr-2 h-5 w-5" />
                    Try Again
                  </>
                ) : (
                  t.signUp
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 md:mt-10 text-center">
            <Separator className="mb-6 sm:mb-8" />
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              <span className="font-semibold">{t.createPage}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}