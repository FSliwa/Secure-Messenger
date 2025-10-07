import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeSlash, Lock, Shield, Key } from '@phosphor-icons/react';
import { ConversationPasswordManager } from '@/lib/enhanced-security';

interface ConversationPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'set' | 'verify';
  conversationId: string;
  conversationName?: string;
  onSuccess?: () => void;
  passwordHint?: string;
}

export function ConversationPasswordDialog({
  isOpen,
  onClose,
  mode,
  conversationId,
  conversationName,
  onSuccess,
  passwordHint
}: ConversationPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Please enter a password');
      return;
    }

    if (mode === 'set' && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (mode === 'set' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'set') {
        const success = await ConversationPasswordManager.setConversationPassword(
          conversationId,
          password,
          hint || undefined
        );

        if (success) {
          toast.success('Conversation password set successfully');
          onSuccess?.();
          onClose();
          resetForm();
        } else {
          toast.error('Failed to set conversation password');
        }
      } else {
        const success = await ConversationPasswordManager.verifyConversationPassword(
          conversationId,
          password
        );

        if (success) {
          toast.success('Conversation unlocked');
          onSuccess?.();
          onClose();
          resetForm();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          toast.error(`Incorrect password (${newAttempts}/3 attempts)`);
          
          if (newAttempts >= 3) {
            toast.error('Too many failed attempts. Please try again later.');
            onClose();
            resetForm();
          }
        }
      }
    } catch (error: any) {
      console.error('Password operation error:', error);
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setHint('');
    setAttempts(0);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {mode === 'set' ? (
              <Shield className="h-6 w-6 text-primary" />
            ) : (
              <Lock className="h-6 w-6 text-primary" />
            )}
            <DialogTitle>
              {mode === 'set' ? 'Protect Conversation' : 'Enter Password'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === 'set' 
              ? 'Set a password to protect this conversation. Only users with the password can access messages.'
              : `Enter the password to access ${conversationName || 'this conversation'}.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Hint (for verification mode) */}
          {mode === 'verify' && passwordHint && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Password Hint</Label>
              </div>
              <p className="text-sm text-muted-foreground">{passwordHint}</p>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === 'set' ? 'New Password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'set' ? 'Enter a strong password' : 'Enter password'}
                className="pr-12"
                disabled={isLoading}
                minLength={mode === 'set' ? 6 : undefined}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeSlash className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (for set mode) */}
          {mode === 'set' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {/* Password Hint (for set mode) */}
          {mode === 'set' && (
            <div className="space-y-2">
              <Label htmlFor="hint">Password Hint (Optional)</Label>
              <Input
                id="hint"
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Enter a hint to help remember the password"
                disabled={isLoading}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This hint will be shown to users when they need to enter the password.
              </p>
            </div>
          )}

          {/* Attempt Counter (for verify mode) */}
          {mode === 'verify' && attempts > 0 && (
            <div className="text-center">
              <p className="text-sm text-destructive">
                {attempts}/3 failed attempts
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (mode === 'verify' && attempts >= 3)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {mode === 'set' ? 'Setting...' : 'Verifying...'}
                </>
              ) : (
                mode === 'set' ? 'Set Password' : 'Unlock'
              )}
            </Button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {mode === 'set' 
              ? '🔒 Your conversation will be protected with end-to-end encryption'
              : '🔐 Enter the correct password to access encrypted messages'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}