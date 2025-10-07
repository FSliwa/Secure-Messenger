import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Key, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Settings,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { SecurityDashboard } from './SecurityDashboard';
import { enhancedChangePassword } from '@/lib/enhanced-auth';
import { clearPasswordHistory } from '@/lib/password-history';
import { supabase } from '@/lib/supabase';

interface SecurityManagementProps {
  userId: string;
  userEmail: string;
  onBack: () => void;
}

export function SecurityManagement({ userId, userEmail, onBack }: SecurityManagementProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const result = await enhancedChangePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        toast.success('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleClearPasswordHistory = async () => {
    try {
      const result = await clearPasswordHistory(userId);
      if (result.success) {
        toast.success('Password history cleared');
      } else {
        toast.error(result.error || 'Failed to clear password history');
      }
    } catch (error) {
      console.error('Clear password history error:', error);
      toast.error('Failed to clear password history');
    }
  };

  const handleExportSecurityData = async () => {
    try {
      // Get user's security data
      const { data: securityAlerts } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data: trustedDevices } = await supabase
        .from('trusted_devices')
        .select('device_name, device_type, browser, os, created_at, last_used_at')
        .eq('user_id', userId)
        .eq('is_trusted', true);

      const { data: loginSessions } = await supabase
        .from('login_sessions')
        .select('device_info, location, created_at, last_activity')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const securityData = {
        exportDate: new Date().toISOString(),
        userEmail,
        securityAlerts: securityAlerts || [],
        trustedDevices: trustedDevices || [],
        recentSessions: loginSessions || []
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(securityData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Security data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export security data');
    }
  };

  const handleDeleteSecurityData = async () => {
    if (!confirm('Are you sure you want to delete all security data? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete security alerts
      await supabase
        .from('security_alerts')
        .delete()
        .eq('user_id', userId);

      // Revoke all trusted devices
      await supabase
        .from('trusted_devices')
        .update({ is_trusted: false })
        .eq('user_id', userId);

      // Deactivate all sessions except current
      await supabase
        .from('login_sessions')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Clear password history
      await clearPasswordHistory(userId);

      toast.success('Security data deleted successfully');
    } catch (error) {
      console.error('Delete security data error:', error);
      toast.error('Failed to delete security data');
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ];

    strength = checks.filter(Boolean).length;
    
    if (strength <= 2) return { score: strength, label: 'Weak', color: 'bg-red-500' };
    if (strength === 3) return { score: strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength === 4) return { score: strength, label: 'Good', color: 'bg-blue-500' };
    return { score: strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Management</h1>
          <p className="text-muted-foreground">
            Manage your account security settings and monitor activity
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Security Dashboard</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard userId={userId} userEmail={userEmail} />
        </TabsContent>

        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password with a strong, unique password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <Badge variant="outline">{passwordStrength.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Password should contain:</p>
                        <ul className="list-disc list-inside">
                          <li className={passwordForm.newPassword.length >= 8 ? 'text-green-600' : ''}>
                            At least 8 characters
                          </li>
                          <li className={/[a-z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                            Lowercase letters
                          </li>
                          <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                            Uppercase letters
                          </li>
                          <li className={/\d/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                            Numbers
                          </li>
                          <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                            Special characters
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.confirmPassword && 
                   passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                  className="w-full"
                >
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Password Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Clear Password History</p>
                    <p className="text-xs text-muted-foreground">
                      Remove all stored password history for GDPR compliance
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClearPasswordHistory}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    SecureChat Pro is designed with privacy-first principles. All messages are end-to-end encrypted,
                    and we collect minimal data necessary for the service to function.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Online Status Visibility</p>
                      <p className="text-xs text-muted-foreground">
                        Allow others to see when you're online
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enabled
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Read Receipts</p>
                      <p className="text-xs text-muted-foreground">
                        Let others know when you've read their messages
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enabled
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Security Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive alerts about security events
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enabled
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export or delete your account data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Export Security Data</p>
                    <p className="text-xs text-muted-foreground">
                      Download your security alerts, device history, and session data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportSecurityData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete All Security Data</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete all security alerts, trusted devices, and session history
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSecurityData}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Data Retention Policy:</strong> Security alerts are automatically deleted after 1 year.
                    Inactive trusted devices are removed after 90 days. Session data is kept for 30 days.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}