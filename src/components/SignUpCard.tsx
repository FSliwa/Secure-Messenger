import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Spinner, CheckCircle, Key } from "@phosphor-icons/react";
import { signUp, testSupabaseConnection } from "@/lib/supabase";
import { generateKeyPair, storeKeys, isCryptoSupported } from "@/lib/crypto";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

export function SignUpCard() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyGenerationStep, setKeyGenerationStep] = useState<'idle' | 'generating' | 'complete'>('idle');

  const validateField = (name: keyof FormData, value: string | boolean): string | undefined => {
    switch (name) {
      case 'firstName':
        return !value ? 'First name is required' : undefined;
      case 'lastName':
        return !value ? 'Last name is required' : undefined;
      case 'email':
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value as string) ? 'Please enter a valid email address' : undefined;
      case 'password':
        if (!value) return 'Password is required';
        if ((value as string).length < 8) return 'Password must be at least 8 characters';
        return undefined;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        return value !== formData.password ? 'Passwords do not match' : undefined;
      case 'acceptTerms':
        return !value ? 'You must accept the terms and conditions' : undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (name: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    
    // Also validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors above');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // First check if Supabase connection is working
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.connected) {
        throw new Error('Service is currently unavailable. Please try again later or contact support.');
      }

      // Step 1: Generate encryption keys
      setKeyGenerationStep('generating');
      toast.loading('Generating your encryption keys...', { id: 'signup-process' });
      
      const keyPair = await generateKeyPair();
      
      // Step 2: Create user account with Supabase
      toast.loading('Creating your account...', { id: 'signup-process' });
      
      // Create username from first name (sanitized)
      const username = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!username) {
        throw new Error('Please enter a valid first name using only letters and numbers.');
      }
      const displayName = `${formData.firstName} ${formData.lastName}`.trim();
      
      console.log('Attempting signup with:', { email: formData.email, username, displayName });
      
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        username,
        displayName
      );
      
      console.log('Signup response:', { data, error });

      if (error) {
        throw new Error(error);
      }

      // Step 3: Store keys locally
      storeKeys(keyPair.publicKey, keyPair.privateKey);
      setKeyGenerationStep('complete');
      
      toast.success('Account created successfully! Check your email to verify your account.', { 
        id: 'signup-process',
        duration: 5000 
      });

      // Show crypto support info
      if (!isCryptoSupported()) {
        toast.warning('Advanced encryption features limited on this browser', {
          duration: 4000
        });
      }
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
      });
      setErrors({});
      
      // Reset key generation step after delay
      setTimeout(() => setKeyGenerationStep('idle'), 3000);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // The error message should already be user-friendly from the supabase module
      const errorMessage = error.message || 'Failed to create account. Please try again.';
      
      toast.error(errorMessage, { 
        id: 'signup-process' 
      });
      setKeyGenerationStep('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = (hasError: boolean) => `
    ${hasError ? 'border-destructive focus:ring-destructive' : ''}
  `;

  return (
    <Card className="w-full max-w-md animate-fade-in-up [animation-delay:300ms]">
      <CardHeader className="space-y-2 pb-4">
        <h2 className="text-xl font-semibold text-center">Create a new account</h2>
        <p className="text-sm text-muted-foreground text-center">It's quick and easy.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium">
                First name
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={inputClassName(!!errors.firstName)}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              />
              {errors.firstName && (
                <p id="firstName-error" className="mt-1 text-xs text-destructive" role="alert">
                  {errors.firstName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={inputClassName(!!errors.lastName)}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              />
              {errors.lastName && (
                <p id="lastName-error" className="mt-1 text-xs text-destructive" role="alert">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={inputClassName(!!errors.email)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-destructive" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={inputClassName(!!errors.password)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-destructive" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={inputClassName(!!errors.confirmPassword)}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1 text-xs text-destructive" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptTerms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => handleInputChange('acceptTerms', !!checked)}
              aria-invalid={!!errors.acceptTerms}
              aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="acceptTerms"
                className="text-xs font-normal leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => console.log('Open terms')}
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => console.log('Open privacy')}
                >
                  Privacy Policy
                </button>
              </Label>
              {errors.acceptTerms && (
                <p id="terms-error" className="text-xs text-destructive" role="alert">
                  {errors.acceptTerms}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
            disabled={isSubmitting}
            aria-describedby="submit-status"
          >
            {isSubmitting ? (
              <>
                {keyGenerationStep === 'generating' ? (
                  <>
                    <Key className="mr-2 h-4 w-4 animate-pulse" />
                    Generating keys...
                  </>
                ) : keyGenerationStep === 'complete' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Keys generated!
                  </>
                ) : (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                )}
              </>
            ) : (
              'Sign Up'
            )}
          </Button>
          
          {isSubmitting && (
            <div className="text-xs text-center text-muted-foreground space-y-1" aria-live="polite">
              {keyGenerationStep === 'generating' && (
                <p id="submit-status">
                  🔐 Generating your unique encryption keys...
                </p>
              )}
              {keyGenerationStep === 'complete' && (
                <p className="text-accent font-medium">
                  ✅ Encryption keys created successfully!
                </p>
              )}
              {keyGenerationStep === 'idle' && isSubmitting && (
                <p id="submit-status">
                  📧 Setting up your secure account...
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}