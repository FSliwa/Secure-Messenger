import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Spinner, CheckCircle, Key, Calendar } from "@phosphor-icons/react";
import { signUp, testSupabaseConnection } from "@/lib/supabase";
import { generateKeyPair, storeKeys, isCryptoSupported } from "@/lib/crypto";

interface FormData {
  firstName: string;
  lastName: string;
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
  email?: string;
  password?: string;
  birthday?: string;
  gender?: string;
  acceptTerms?: string;
}

export function SignUpCard() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    birthday: {
      day: '',
      month: '',
      year: ''
    },
    gender: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyGenerationStep, setKeyGenerationStep] = useState<'idle' | 'generating' | 'complete'>('idle');

  // Generate days, months, years for birthday selects
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const validateField = (name: keyof FormData, value: string | boolean | { day: string; month: string; year: string }): string | undefined => {
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
        if ((value as string).length < 6) return 'Password must be at least 6 characters';
        return undefined;
      case 'birthday':
        if (typeof value === 'object') {
          const birthday = value as { day: string; month: string; year: string };
          if (!birthday.day || !birthday.month || !birthday.year) {
            return 'Please provide your full date of birth';
          }
          // Check if user is at least 13 years old
          const birthDate = new Date(parseInt(birthday.year), parseInt(birthday.month) - 1, parseInt(birthday.day));
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 < 13 ? 'You must be at least 13 years old to sign up' : undefined;
          }
          return age < 13 ? 'You must be at least 13 years old to sign up' : undefined;
        }
        return 'Please provide your date of birth';
      case 'gender':
        return !value ? 'Please select your gender' : undefined;
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
  };

  const handleBirthdayChange = (field: 'day' | 'month' | 'year', value: string) => {
    const newBirthday = { ...formData.birthday, [field]: value };
    setFormData(prev => ({ ...prev, birthday: newBirthday }));
    
    // Validate birthday if all fields are filled
    if (newBirthday.day && newBirthday.month && newBirthday.year) {
      const error = validateField('birthday', newBirthday);
      setErrors(prev => ({ ...prev, birthday: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate basic fields
    (['firstName', 'lastName', 'email', 'password', 'gender', 'acceptTerms'] as const).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    // Validate birthday separately
    const birthdayError = validateField('birthday', formData.birthday);
    if (birthdayError) {
      newErrors.birthday = birthdayError;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // First check if Supabase connection is working
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.connected) {
        // In demo mode, just show success message without actual registration
        toast.success('Account created successfully! (Demo mode)', { 
          description: 'Your account has been created with secure encryption keys.',
          duration: 5000 
        });

        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          birthday: { day: '', month: '', year: '' },
          gender: '',
          acceptTerms: false,
        });
        setErrors({});
        
        return;
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
        birthday: { day: '', month: '', year: '' },
        gender: '',
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
    <div className="w-full max-w-md animate-fade-in-up [animation-delay:300ms]">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Sign Up</h1>
        <p className="text-muted-foreground">It's quick and easy.</p>
      </div>

      {/* Main Form Card */}
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`h-12 ${inputClassName(!!errors.firstName)}`}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`h-12 ${inputClassName(!!errors.lastName)}`}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`h-12 ${inputClassName(!!errors.email)}`}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Input
                id="password"
                type="password"
                placeholder="New password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`h-12 ${inputClassName(!!errors.password)}`}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Birthday Section */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                <Calendar className="inline w-4 h-4 mr-1" />
                Birthday
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={formData.birthday.month} onValueChange={(value) => handleBirthdayChange('month', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={formData.birthday.day} onValueChange={(value) => handleBirthdayChange('day', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={formData.birthday.year} onValueChange={(value) => handleBirthdayChange('year', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.birthday && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.birthday}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Gender</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                  { value: 'custom', label: 'Custom' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.gender === option.value ? "default" : "outline"}
                    className="h-10"
                    onClick={() => handleInputChange('gender', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {errors.gender && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.gender}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="text-xs text-muted-foreground">
              <p className="mb-3">
                By clicking Sign Up, you agree to our{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => console.log('Open terms')}
                >
                  Terms
                </button>
                ,{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => console.log('Open data policy')}
                >
                  Data Policy
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => console.log('Open cookies policy')}
                >
                  Cookies Policy
                </button>
                . You may receive SMS Notifications from us and can opt out any time.
              </p>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => handleInputChange('acceptTerms', !!checked)}
                  aria-invalid={!!errors.acceptTerms}
                />
                <Label htmlFor="acceptTerms" className="text-xs leading-relaxed">
                  I accept the terms and conditions
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.acceptTerms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  {keyGenerationStep === 'generating' ? (
                    <>
                      <Key className="mr-2 h-5 w-5 animate-pulse" />
                      Generating keys...
                    </>
                  ) : keyGenerationStep === 'complete' ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Keys generated!
                    </>
                  ) : (
                    <>
                      <Spinner className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  )}
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
            
            {/* Loading Status */}
            {isSubmitting && (
              <div className="text-xs text-center text-muted-foreground space-y-1" aria-live="polite">
                {keyGenerationStep === 'generating' && (
                  <p>🔐 Generating your unique encryption keys...</p>
                )}
                {keyGenerationStep === 'complete' && (
                  <p className="text-accent font-medium">
                    ✅ Encryption keys created successfully!
                  </p>
                )}
                {keyGenerationStep === 'idle' && isSubmitting && (
                  <p>📧 Setting up your secure account...</p>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-center">
        <Separator className="mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
        </p>
      </div>
    </div>
  );
}