import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, CheckCircle, Warning, Clock } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';

interface SecurityInitStep {
  name: string;
  description: string;
  sql: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export function EnhancedSecurityInitializer() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SecurityInitStep[]>([
    {
      name: 'Create Account Lockouts Table',
      description: 'Set up account lockout tracking system',
      sql: `
        CREATE TABLE IF NOT EXISTS account_lockouts (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
          lockout_reason TEXT NOT NULL CHECK (lockout_reason IN ('failed_login', 'suspicious_activity', 'admin_action', 'security_violation')),
          locked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          unlocks_at TIMESTAMP WITH TIME ZONE,
          unlock_attempts INTEGER DEFAULT 0,
          is_permanent BOOLEAN DEFAULT FALSE,
          locked_by UUID REFERENCES auth.users ON DELETE SET NULL,
          unlock_token TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb
        );
        ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view own lockouts" ON account_lockouts FOR SELECT USING (user_id = auth.uid());
        CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
      `,
      status: 'pending'
    },
    {
      name: 'Create Login Attempts Table',
      description: 'Set up login attempt tracking',
      sql: `
        CREATE TABLE IF NOT EXISTS login_attempts (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          email TEXT NOT NULL,
          user_id UUID REFERENCES auth.users ON DELETE CASCADE,
          attempt_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          success BOOLEAN NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          failure_reason TEXT,
          device_fingerprint TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view own login attempts" ON login_attempts FOR SELECT USING (user_id = auth.uid());
        CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
      `,
      status: 'pending'
    },
    {
      name: 'Create Password History Table',
      description: 'Set up password history tracking',
      sql: `
        CREATE TABLE IF NOT EXISTS password_history (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year')
        );
        ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view own password history" ON password_history FOR SELECT USING (user_id = auth.uid());
        CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
      `,
      status: 'pending'
    },
    {
      name: 'Create Conversation Passwords Table',
      description: 'Set up conversation password protection',
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_passwords (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          password_hint TEXT,
          max_attempts INTEGER DEFAULT 3,
          lockout_duration INTEGER DEFAULT 300
        );
        ALTER TABLE conversation_passwords ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_conversation_passwords_conversation_id ON conversation_passwords(conversation_id);
      `,
      status: 'pending'
    },
    {
      name: 'Create Conversation Access Sessions',
      description: 'Set up conversation access session management',
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_access_sessions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
          user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
          unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
          device_fingerprint TEXT,
          session_token TEXT UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(conversation_id, user_id, device_fingerprint)
        );
        ALTER TABLE conversation_access_sessions ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_conversation_access_sessions_conversation_user ON conversation_access_sessions(conversation_id, user_id);
      `,
      status: 'pending'
    },
    {
      name: 'Create Security Audit Log',
      description: 'Set up comprehensive security event logging',
      sql: `
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users ON DELETE CASCADE,
          event_type TEXT NOT NULL CHECK (event_type IN (
            'login_success', 'login_failure', 'account_locked', 'account_unlocked',
            'password_changed', '2fa_enabled', '2fa_disabled', 'device_trusted',
            'device_untrusted', 'biometric_enrolled', 'biometric_removed',
            'conversation_password_set', 'conversation_unlocked', 'suspicious_activity'
          )),
          event_data JSONB DEFAULT '{}'::jsonb,
          ip_address TEXT,
          user_agent TEXT,
          device_fingerprint TEXT,
          severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view own audit log" ON security_audit_log FOR SELECT USING (user_id = auth.uid());
        CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
      `,
      status: 'pending'
    },
    {
      name: 'Create Security Functions',
      description: 'Set up security management functions',
      sql: `
        CREATE OR REPLACE FUNCTION is_account_locked(user_uuid UUID)
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM account_lockouts 
            WHERE user_id = user_uuid 
            AND (unlocks_at IS NULL OR unlocks_at > NOW())
            AND NOT is_permanent = FALSE
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE OR REPLACE FUNCTION lock_account(
          user_uuid UUID,
          reason TEXT,
          duration_minutes INTEGER DEFAULT NULL,
          permanent BOOLEAN DEFAULT FALSE
        ) RETURNS UUID AS $$
        DECLARE
          lockout_id UUID;
          unlock_time TIMESTAMP WITH TIME ZONE;
        BEGIN
          IF duration_minutes IS NOT NULL AND NOT permanent THEN
            unlock_time := NOW() + (duration_minutes || ' minutes')::INTERVAL;
          END IF;

          INSERT INTO account_lockouts (user_id, lockout_reason, unlocks_at, is_permanent)
          VALUES (user_uuid, reason, unlock_time, permanent)
          RETURNING id INTO lockout_id;

          RETURN lockout_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE OR REPLACE FUNCTION has_conversation_access(
          conversation_uuid UUID,
          user_uuid UUID
        ) RETURNS BOOLEAN AS $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM conversation_passwords WHERE conversation_id = conversation_uuid) THEN
            RETURN TRUE;
          END IF;

          RETURN EXISTS (
            SELECT 1 FROM conversation_access_sessions 
            WHERE conversation_id = conversation_uuid 
            AND user_id = user_uuid 
            AND is_active = TRUE
            AND expires_at > NOW()
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
      status: 'pending'
    }
  ]);

  const executeStep = async (stepIndex: number): Promise<boolean> => {
    const step = steps[stepIndex];
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'running' } : s
    ));

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: step.sql });
      
      if (error) {
        console.error(`Step ${stepIndex + 1} error:`, error);
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'error', error: error.message } : s
        ));
        return false;
      }

      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' } : s
      ));
      return true;
    } catch (error: any) {
      console.error(`Step ${stepIndex + 1} error:`, error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'error', error: error.message } : s
      ));
      return false;
    }
  };

  const runInitialization = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    // Reset all steps to pending
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const, error: undefined })));

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      const success = await executeStep(i);
      
      if (!success) {
        toast.error(`Failed at step ${i + 1}: ${steps[i].name}`);
        setIsRunning(false);
        return;
      }

      // Small delay between steps for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    toast.success('Enhanced security features initialized successfully!');
  };

  const getStatusIcon = (status: SecurityInitStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <Warning className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: SecurityInitStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Enhanced Security Initialization</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Initialize advanced security features including account lockouts, password protection, and audit logging.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedSteps}/{steps.length} steps completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`p-3 border rounded-lg transition-colors ${
                currentStep === index && isRunning ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{step.name}</h4>
                    {getStatusBadge(step.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                  {step.error && (
                    <p className="text-xs text-red-600 mt-2">
                      Error: {step.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={runInitialization}
            disabled={isRunning || completedSteps === steps.length}
            className="px-8"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Initializing...
              </>
            ) : completedSteps === steps.length ? (
              'Initialization Complete'
            ) : (
              'Initialize Enhanced Security'
            )}
          </Button>
        </div>

        {/* Warning */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Warning className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">Important:</p>
              <p>This will modify your database schema. Make sure you have proper backups before proceeding.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}