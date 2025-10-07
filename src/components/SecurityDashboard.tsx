import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Smartphone, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserSecurityStatus } from '@/lib/enhanced-auth';
import { getTrustedDevices, revokeTrustedDevice, cleanupOldDevices } from '@/lib/trusted-devices';
import { is2FAEnabled, generateTotpSetup, enable2FA, disable2FA, generateNewBackupCodes } from '@/lib/two-factor-auth';
import { getAccountLockoutHistory, unlockAccount } from '@/lib/account-lockout';
import { supabase } from '@/lib/supabase';

interface SecurityDashboardProps {
  userId: string;
  userEmail: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  resolved: boolean;
  metadata: Record<string, any>;
}

interface TrustedDevice {
  id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  last_used_at: string;
  created_at: string;
}

export function SecurityDashboard({ userId, userEmail }: SecurityDashboardProps) {
  const [securityStatus, setSecurityStatus] = useState({
    has2FA: false,
    trustedDevicesCount: 0,
    recentAlertsCount: 0,
    passwordAge: 0,
    securityScore: 0,
    recommendations: [] as string[]
  });
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlert[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [twoFASetup, setTwoFASetup] = useState<any>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, [userId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load security status
      const status = await getUserSecurityStatus(userId);
      setSecurityStatus(status);

      // Load recent security alerts
      const { data: alerts } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentAlerts(alerts || []);

      // Load trusted devices
      const { devices } = await getTrustedDevices(userId);
      setTrustedDevices(devices);

    } catch (error) {
      console.error('Failed to load security data:', error);
      toast.error('Failed to load security information');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const result = await generateTotpSetup(userEmail);
      if (result.success && result.setup) {
        setTwoFASetup(result.setup);
      } else {
        toast.error(result.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('Failed to setup 2FA');
    }
  };

  const handleEnable2FA = async (verificationCode: string) => {
    if (!twoFASetup) return;

    try {
      const result = await enable2FA(
        userId,
        twoFASetup.secret,
        twoFASetup.backupCodes,
        verificationCode
      );

      if (result.success) {
        toast.success('Two-factor authentication enabled successfully');
        setTwoFASetup(null);
        setBackupCodes(twoFASetup.backupCodes);
        setShowBackupCodes(true);
        loadSecurityData();
      } else {
        toast.error(result.error || 'Failed to enable 2FA');
      }
    } catch (error) {
      console.error('2FA enable error:', error);
      toast.error('Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    try {
      const result = await disable2FA(userId);
      if (result.success) {
        toast.success('Two-factor authentication disabled');
        loadSecurityData();
      } else {
        toast.error(result.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const result = await revokeTrustedDevice(userId, deviceId);
      if (result.success) {
        toast.success('Device revoked successfully');
        loadSecurityData();
      } else {
        toast.error(result.error || 'Failed to revoke device');
      }
    } catch (error) {
      console.error('Device revoke error:', error);
      toast.error('Failed to revoke device');
    }
  };

  const handleCleanupOldDevices = async () => {
    try {
      const result = await cleanupOldDevices(userId);
      if (result.removedCount > 0) {
        toast.success(`Removed ${result.removedCount} old devices`);
        loadSecurityData();
      } else {
        toast.info('No old devices to remove');
      }
    } catch (error) {
      console.error('Device cleanup error:', error);
      toast.error('Failed to cleanup old devices');
    }
  };

  const handleGenerateNewBackupCodes = async () => {
    try {
      const result = await generateNewBackupCodes(userId);
      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setShowBackupCodes(true);
        toast.success('New backup codes generated');
      } else {
        toast.error(result.error || 'Failed to generate backup codes');
      }
    } catch (error) {
      console.error('Backup codes generation error:', error);
      toast.error('Failed to generate backup codes');
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading security information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Score
          </CardTitle>
          <CardDescription>
            Your overall security status and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Security Score</span>
                <span className={`text-2xl font-bold ${getSecurityScoreColor(securityStatus.securityScore)}`}>
                  {securityStatus.securityScore}/100
                </span>
              </div>
              <Progress value={securityStatus.securityScore} className="h-3" />
            </div>
            <div className="text-center">
              {securityStatus.securityScore >= 80 ? (
                <ShieldCheck className="w-12 h-12 text-green-600 mx-auto" />
              ) : (
                <ShieldAlert className="w-12 h-12 text-yellow-600 mx-auto" />
              )}
            </div>
          </div>

          {securityStatus.recommendations.length > 0 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Recommendations:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {securityStatus.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
          <TabsTrigger value="devices">Trusted Devices</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {securityStatus.has2FA ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Two-Factor Auth</p>
                    <p className="text-xs text-muted-foreground">
                      {securityStatus.has2FA ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Trusted Devices</p>
                    <p className="text-xs text-muted-foreground">
                      {securityStatus.trustedDevicesCount} devices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Password Age</p>
                    <p className="text-xs text-muted-foreground">
                      {securityStatus.passwordAge} days old
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Recent Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      {securityStatus.recentAlertsCount} in 7 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityStatus.has2FA ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm">Two-factor authentication is enabled</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerateNewBackupCodes}
                    >
                      Generate New Backup Codes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisable2FA}
                    >
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm">Two-factor authentication is disabled</span>
                  </div>
                  <Button onClick={handleSetup2FA}>
                    <Plus className="w-4 h-4 mr-2" />
                    Enable 2FA
                  </Button>
                </div>
              )}

              {showBackupCodes && backupCodes.length > 0 && (
                <Alert className="mt-4">
                  <Key className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Backup Codes</strong>
                    <p className="text-sm mt-2 mb-4">
                      Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded">
                      {backupCodes.map((code, index) => (
                        <div key={index}>{code}</div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowBackupCodes(false)}
                    >
                      I've saved these codes
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Trusted Devices
                </div>
                <Button variant="outline" size="sm" onClick={handleCleanupOldDevices}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cleanup Old
                </Button>
              </CardTitle>
              <CardDescription>
                Devices that don't require additional verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trustedDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trusted devices found</p>
              ) : (
                <div className="space-y-4">
                  {trustedDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{device.device_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.browser} on {device.os} • Last used {new Date(device.last_used_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeDevice(device.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Security Alerts
              </CardTitle>
              <CardDescription>
                Recent security events and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent security alerts</p>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={getAlertSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {alert.alert_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Modal */}
      {twoFASetup && (
        <TwoFactorSetupModal
          setup={twoFASetup}
          onEnable={handleEnable2FA}
          onCancel={() => setTwoFASetup(null)}
        />
      )}
    </div>
  );
}

// Two-Factor Authentication Setup Modal Component
interface TwoFactorSetupModalProps {
  setup: any;
  onEnable: (code: string) => void;
  onCancel: () => void;
}

function TwoFactorSetupModal({ setup, onEnable, onCancel }: TwoFactorSetupModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      onEnable(verificationCode);
    } else {
      toast.error('Please enter a 6-digit verification code');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Setup Two-Factor Authentication</CardTitle>
          <CardDescription>
            Secure your account with an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'qr' && (
            <>
              <div className="text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.qrCode)}`}
                  alt="QR Code"
                  className="mx-auto mb-4"
                />
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  Manual entry key: {setup.manualEntryKey}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => setStep('verify')} className="flex-1">
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div>
                <label className="text-sm font-medium">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleVerify} 
                  className="flex-1"
                  disabled={verificationCode.length !== 6}
                >
                  Enable 2FA
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}