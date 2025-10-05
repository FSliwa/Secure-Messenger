import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Spinner } from "@phosphor-icons/react";
import { generateKeyPair, storeKeys, EncryptionProgress } from "@/lib/crypto";
import { signUp, checkUsernameAvailability } from "@/lib/supabase";

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
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    // Final check for username availability
    try {
      const { available } = await checkUsernameAvailability(formData.username);
      if (!available) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        toast.error('Username is already taken');
        return;
      }
    } catch (error) {
      toast.error('Failed to verify username availability');
      return;
    }

    setIsSubmitting(true);
    
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
      
      // Sign up with Supabase and public key
      const { user } = await signUp(formData.email, formData.password, displayName, keyPair.publicKey, formData.username);
      
      if (!user) {
        throw new Error('Failed to create user account');
      }

      toast.success('Account created successfully! Please check your email to verify your account.', { 
        id: 'signup-process',
        description: 'You must verify your email before you can sign in.',
        duration: 8000 
      });

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
      
      // Switch to login view instead of calling onSuccess
      onSwitchToLogin?.();

    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.', { 
        id: 'signup-process' 
      });
    } finally {
      setIsSubmitting(false);
      setKeyGenerationStep('idle');
    }
  };

  const inputClassName = (hasError: boolean) => `
    ${hasError ? 'border-destructive focus:ring-destructive' : ''}
  `;

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="facebook-card">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Create a new account</h2>
            <p className="text-sm text-muted-foreground">It's quick and easy.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`facebook-input ${inputClassName(!!errors.firstName)}`}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Input
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`facebook-input ${inputClassName(!!errors.lastName)}`}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <div className="relative">
                <Input
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`facebook-input ${inputClassName(!!errors.username)}`}
                  disabled={isSubmitting}
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Spinner className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.username && (
                <p className="text-xs text-destructive mt-1">{errors.username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Others will find you by this username to start conversations
              </p>
            </div>

            {/* Email */}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`facebook-input ${inputClassName(!!errors.email)}`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <Input
                type="password"
                placeholder="New password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`facebook-input ${inputClassName(!!errors.password)}`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="accept-terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <Label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed">
                By clicking Sign Up, you agree to our Terms, Data Policy and Cookies Policy.
                You may receive SMS Notifications from us and can opt out any time.
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-destructive">{errors.acceptTerms}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full facebook-button btn-primary-enhanced bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner className="w-4 h-4 animate-spin" />
                  {keyGenerationStep === 'generating' ? (
                    <div className="flex flex-col">
                      <span>Securing Account...</span>
                      {encryptionProgress && (
                        <span className="text-xs opacity-75">
                          {encryptionProgress.message}
                        </span>
                      )}
                    </div>
                  ) : 'Creating Account...'}
                </div>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Separator className="mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}