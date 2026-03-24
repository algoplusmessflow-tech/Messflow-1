import { useState } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useSecurityLogs } from '@/hooks/useSecurityLogger';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDate } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Lock,
  KeyRound,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  LOGIN: { label: 'Login', variant: 'default' },
  FAILED_LOGIN: { label: 'Failed Login', variant: 'destructive' },
  LOGOUT: { label: 'Logout', variant: 'secondary' },
  SIGNUP: { label: 'Signup', variant: 'default' },
  PASSWORD_RESET: { label: 'Password Reset', variant: 'outline' },
  BULK_DELETE: { label: 'Bulk Delete', variant: 'destructive' },
  PLAN_CHANGE: { label: 'Plan Change', variant: 'outline' },
  INVOICE_GENERATED: { label: 'Invoice', variant: 'secondary' },
  MEMBER_ADDED: { label: 'Member Added', variant: 'secondary' },
  MEMBER_DELETED: { label: 'Member Deleted', variant: 'destructive' },
  RECEIPT_UPLOADED: { label: 'Receipt Upload', variant: 'secondary' },
  RECEIPT_DELETED: { label: 'Receipt Delete', variant: 'outline' },
  SETTINGS_CHANGED: { label: 'Settings', variant: 'outline' },
  RATE_LIMIT_HIT: { label: 'Rate Limit', variant: 'destructive' },
};

export default function SuperAdminSecurity() {
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: securityLogs, isLoading: logsLoading, refetch } = useSecurityLogs();
  const { allProfiles } = useSuperAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">Access Denied</p>
            <p className="text-muted-foreground mt-2">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBlockUser = async (userId: string) => {
    setBlockingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User has been blocked');
      refetch();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to block user: ' + error.message);
      } else {
        toast.error('Failed to block user');
      }
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to send reset email: ' + error.message);
      } else {
        toast.error('Failed to send reset email');
      }
    }
  };

  const getProfileByUserId = (userId: string | null) => {
    if (!userId) return null;
    return allProfiles.find((p) => p.user_id === userId);
  };

  // Safely extract email from log.details if possible
  const getEmailFromDetails = (details: unknown): string | undefined => {
    if (typeof details === 'object' && details !== null && 'email' in details) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      // The cast is safe after the runtime check above
      return (details as { email?: string }).email;
    }
    return undefined;
  };

  // Filter logs based on search
  const filteredLogs = securityLogs?.filter((log) => {
    if (!searchQuery) return true;
    const profile = getProfileByUserId(log.user_id);
    const searchLower = searchQuery.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      profile?.owner_email?.toLowerCase().includes(searchLower) ||
      profile?.business_name?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
    );
  }) ?? [];

  // Threat indicators
  const failedLogins = securityLogs?.filter((l) => l.event_type === 'FAILED_LOGIN') ?? [];
  const rateLimitHits = securityLogs?.filter((l) => l.event_type === 'RATE_LIMIT_HIT') ?? [];
  const bulkDeletes = securityLogs?.filter((l) => l.event_type === 'BULK_DELETE') ?? [];

  const threatLevel =
    failedLogins.length > 10 || rateLimitHits.length > 5
      ? 'HIGH'
      : failedLogins.length > 5 || rateLimitHits.length > 2
      ? 'MEDIUM'
      : 'LOW';

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/super-admin">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Security Dashboard
              </h1>
              <p className="text-muted-foreground">Monitor security events and threats</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Threat Level Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={`${
              threatLevel === 'HIGH'
                ? 'border-destructive bg-destructive/5'
                : threatLevel === 'MEDIUM'
                ? 'border-yellow-500 bg-yellow-500/5'
                : 'border-primary/30 bg-primary/5'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`h-8 w-8 ${
                    threatLevel === 'HIGH'
                      ? 'text-destructive'
                      : threatLevel === 'MEDIUM'
                      ? 'text-yellow-500'
                      : 'text-primary'
                  }`}
                />
                <div>
                  <p className="text-sm text-muted-foreground">Threat Level</p>
                  <p
                    className={`text-2xl font-bold ${
                      threatLevel === 'HIGH'
                        ? 'text-destructive'
                        : threatLevel === 'MEDIUM'
                        ? 'text-yellow-500'
                        : 'text-primary'
                    }`}
                  >
                    {threatLevel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed Logins</p>
                  <p className="text-2xl font-bold">{failedLogins.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limits Hit</p>
                  <p className="text-2xl font-bold">{rateLimitHits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Bulk Deletes</p>
                  <p className="text-2xl font-bold">{bulkDeletes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Security Event Log</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No security events found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const profile = getProfileByUserId(log.user_id);
                      const eventConfig =
                        EVENT_TYPE_CONFIG[log.event_type] || {
                          label: log.event_type,
                          variant: 'secondary' as const,
                        };
                      const isFailedLogin = log.event_type === 'FAILED_LOGIN';
                      const isRateLimitHit = log.event_type === 'RATE_LIMIT_HIT';
                      const isThreat = isFailedLogin || isRateLimitHit;

                      return (
                        <TableRow
                          key={log.id}
                          className={isThreat ? 'bg-destructive/10 hover:bg-destructive/20' : ''}
                        >
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(new Date(log.created_at))}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={eventConfig.variant}>{eventConfig.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {profile ? (
                              <div>
                                <p className="font-medium">{profile.business_name}</p>
                                <p className="text-xs text-muted-foreground">{profile.owner_email}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {getEmailFromDetails(log.details) || 'Unknown'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <pre className="text-xs bg-muted/50 p-1 rounded overflow-hidden text-ellipsis">
                              {JSON.stringify(log.details || {}, null, 0).slice(0, 50)}
                            </pre>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {log.user_agent?.slice(0, 30)}...
                          </TableCell>
                          <TableCell className="text-right">
                            {log.user_id && profile && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleBlockUser(log.user_id!)}
                                  disabled={blockingUserId === log.user_id}
                                >
                                  {blockingUserId === log.user_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Lock className="h-3 w-3" />
                                  )}
                                  <span className="ml-1 hidden lg:inline">Block</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetPassword(profile.owner_email)}
                                >
                                  <KeyRound className="h-3 w-3" />
                                  <span className="ml-1 hidden lg:inline">Reset</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}