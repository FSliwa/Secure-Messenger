import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Shield, 
  Lock, 
  Eye, 
  DeviceMobile, 
  Fingerprint, 
  Clock,
  Warning,
  CheckCircle,
  XCircle,
  Key,
  Monitor,
  Calendar
} from '@phosphor-icons/react';
import {
  AccountLockoutManager,
  EnhancedBiometricManager,
  EnhancedTrustedDeviceManager,
  SecurityAuditManager,
  type AccountLockout,
  type SecurityAuditEntry
} from '@/lib/enhanced-security';

interface EnhancedSecuritySettingsProps {
  userId: string;
}

export function EnhancedSecuritySettings({ userId }: EnhancedSecuritySettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [accountLockouts, setAccountLockouts] = useState<AccountLockout[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [biometricCredentials, setBiometricCredentials] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<SecurityAuditEntry[]>([]);
  const [isAccountLocked, setIsAccountLocked] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, [userId]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      const [lockouts, devices, biometrics, audit, locked] = await Promise.all([
        AccountLockoutManager.getAccountLockouts(userId),
        EnhancedTrustedDeviceManager.getTrustedDevices(),
        EnhancedBiometricManager.getBiometricCredentials(),
        SecurityAuditManager.getSecurityAuditLog(userId, 20),
        AccountLockoutManager.checkAccountLocked(userId)
      ]);

      setAccountLockouts(lockouts);
      setTrustedDevices(devices);
      setBiometricCredentials(biometrics);
      setAuditLog(audit);
      setIsAccountLocked(locked);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockAccount = async () => {
    try {
      const success = await AccountLockoutManager.unlockAccount(userId);
      if (success) {
        toast.success('Account unlocked successfully');
        await loadSecurityData();
      } else {
        toast.error('Failed to unlock account');
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast.error('Failed to unlock account');
    }
  };

  const handleRevokeTrustedDevice = async (deviceId: string, deviceName: string) => {
    try {
      const success = await EnhancedTrustedDeviceManager.revokeTrustedDevice(
        deviceId, 
        'User revoked from security settings'
      );
      if (success) {
        toast.success(`${deviceName} is no longer trusted`);
        await loadSecurityData();
      } else {
        toast.error('Failed to revoke device trust');
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device trust');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'login_failure': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'account_locked': return <Lock className="h-4 w-4 text-red-500" />;
      case 'account_unlocked': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'device_trusted': return <DeviceMobile className="h-4 w-4 text-blue-500" />;
      case 'device_untrusted': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'biometric_enrolled': return <Fingerprint className="h-4 w-4 text-green-500" />;
      case 'conversation_unlocked': return <Key className="h-4 w-4 text-blue-500" />;
      default: return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isAccountLocked ? (
              <>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <Badge variant="destructive">Account Locked</Badge>
                </div>
                <Button 
                  onClick={handleUnlockAccount}
                  size="sm"
                  variant="outline"
                >
                  Unlock Account
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Account Active
                </Badge>
              </div>
            )}
          </div>

          {accountLockouts.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Recent Lockouts</Label>
              <div className="mt-2 space-y-2">
                {accountLockouts.slice(0, 3).map((lockout) => (
                  <div key={lockout.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <p className="text-sm font-medium">{lockout.lockout_reason.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(lockout.locked_at)}
                        {lockout.unlocks_at && ` - ${formatDate(lockout.unlocks_at)}`}
                      </p>
                    </div>
                    <Badge variant={lockout.is_permanent ? 'destructive' : 'secondary'}>
                      {lockout.is_permanent ? 'Permanent' : 'Temporary'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DeviceMobile className="h-5 w-5" />
            Trusted Devices
            <Badge variant="secondary">{trustedDevices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trustedDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trusted devices configured.</p>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{device.device_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Trust Level: {device.trust_level}/5</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>Added: {formatDate(device.trusted_at)}</span>
                      </div>
                      {device.expires_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Expires: {formatDate(device.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevokeTrustedDevice(device.id, device.device_name)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Biometric Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
            <Badge variant="secondary">{biometricCredentials.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {biometricCredentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No biometric credentials enrolled.</p>
          ) : (
            <div className="space-y-3">
              {biometricCredentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {credential.device_id || 'Biometric Credential'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Used: {credential.usage_count} times</span>
                        {credential.last_used && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>Last: {formatDate(credential.last_used)}</span>
                          </>
                        )}
                      </div>
                      {credential.expires_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Expires: {formatDate(credential.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={credential.is_active ? 'default' : 'secondary'}>
                    {credential.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Security Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent security activity.</p>
          ) : (
            <div className="space-y-3">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getEventIcon(entry.event_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {entry.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <Badge variant={getSeverityColor(entry.severity)}>
                        {entry.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </p>
                    {entry.event_data && Object.keys(entry.event_data).length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Event Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                              {JSON.stringify(entry.event_data, null, 2)}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}